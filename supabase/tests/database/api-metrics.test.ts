import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  metricsFixture,
  cleanup,
  record,
  metricRpc,
  metricSource,
  metricState,
  controlledFault,
  history,
  insights,
  archive,
  lifecycleRpc,
  get,
  evidence,
  usages,
  row,
  sql,
  replayDigest,
  fixture,
  published,
  save,
  request,
  rpc,
  ready,
  discard,
  rpcClaims,
} from './helpers/metrics-rpc.js';

describe('5.8 RPC-METRIC public append and replay', () => {
  it('QUALITY-006 preserves null/zero, subset, UTC/source, unchanged post and immutable historical replay', () => {
    const { f, p } = metricsFixture();
    try {
      const before = { post: evidence(p), usage: usages(p), revision: p.revision };
      const key = randomUUID();
      const call = record(
        f,
        p,
        { likes: 0, views: 100, watch_time_seconds: 20.5 },
        '2026-10-12T10:00:00+07:00',
        key,
        {
          ...metricSource(),
          source_reported_at: '2026-10-12T09:00:00+07:00',
          timezone: 'Asia/Jakarta',
          note: ' Observed in UI. ',
        },
      );
      const r = metricRpc(f, call);
      expect(r.data.metrics).toMatchObject({
        likes: 0,
        reactions: null,
        views: 100,
        reach: null,
        watch_time_seconds: 20.5,
      });
      expect(r.data.captured_at).toBe('2026-10-12T03:00:00.000000Z');
      metricRpc(f, record(f, p, { views: 150 }, '2026-10-12T04:00:00Z'));
      metricRpc(f, record(f, p, { views: 120 }, '2026-10-12T02:00:00Z'));
      lifecycleRpc(f, archive(f, p));
      expect(replayDigest(metricRpc(f, call))).toBe(replayDigest(r));
      expect(metricRpc(f, call).data.replayed).toBe(true);
      expect(history(f, p).latest_snapshot!.metrics.views).toBe(150);
      expect(
        history(f, p).snapshots.find((s) => s.captured_at.includes('03:00'))!.anomaly_flags,
      ).toContain('negative_cumulative_delta');
      expect(r.data.anomaly_flags).toEqual([]);
      expect(() => metricRpc(f, record(f, p, { views: 101 }, '2026-10-12T03:00:00Z', key))).toThrow(
        /^OPERATION_KEY_REUSED$/,
      );
      expect(() => metricRpc(f, record(f, p, { views: 100 }))).toThrow(
        /^METRIC_SNAPSHOT_CONFLICT$/,
      );
      metricRpc(
        f,
        record(f, get(f, p.post_public_id), { reactions: 2, likes: 1 }, '2026-10-12T05:00:00Z'),
      );
      expect(evidence(p).content_hash).toBe(before.post.content_hash);
      expect(evidence(p).approval_snapshot).toEqual(before.post.approval_snapshot);
      expect(usages(p)).toEqual(before.usage);
      expect(get(f, p.post_public_id).revision).toBe(before.revision + 1); // archive only
      const snapshot = history(f, p).snapshots.find((s) => s.captured_at.includes('03:00'))!;
      expect(snapshot.source).toMatchObject({
        source_reported_at: '2026-10-12T02:00:00.000000Z',
        note: 'Observed in UI.',
      });
      expect(() =>
        sql(
          `update public.post_metrics set views=999 where public_id='${r.data.metric_snapshot_public_id}'`,
        ),
      ).toThrow(/^METRIC_SNAPSHOT_CONFLICT$/);
      expect(JSON.stringify(r)).not.toMatch(/workspace_id|post_id|operation_id|source|token/);
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('RPC-METRIC validates closed metrics/source, numeric range and timestamp boundaries with atomic denial', () => {
    const { f, p } = metricsFixture();
    try {
      const before = metricState(f);
      for (const bad of [
        {},
        { views: null },
        { views: -1 },
        { likes: 3, reactions: 2 },
        { views: 1.5 },
        { views: '1' },
        { views: true },
        { views: 1, extra: 2 },
        [],
        null,
      ]) {
        expect(() => metricRpc(f, record(f, p, bad))).toThrow(/^VALIDATION_FAILED$/);
        expect(metricState(f)).toEqual(before);
      }
      for (const bad of [
        {},
        { ...metricSource(), metric_definition_version: 2 },
        { ...metricSource(), timezone: 'Mars/Crater' },
        { ...metricSource(), source_reported_at: '2026-10-12' },
        { ...metricSource(), note: '' },
        { ...metricSource(), note: 'x'.repeat(501) },
        { ...metricSource(), note: 'bearer secret' },
        { ...metricSource(), extra: true },
        { ...metricSource(), timezone: 3 },
      ]) {
        expect(() =>
          metricRpc(f, record(f, p, { views: 1 }, '2026-10-12T03:00:00Z', randomUUID(), bad)),
        ).toThrow(/^VALIDATION_FAILED$/);
      }
      expect(() => metricRpc(f, record(f, p, { views: 1 }, 'infinity'))).toThrow(
        /^VALIDATION_FAILED$/,
      );
      const overflow = record(f, p).replace('{"views":100}', '{"views":9223372036854775808}');
      expect(() => metricRpc(f, overflow)).toThrow(/^VALIDATION_FAILED$/);
      const exact = record(f, p).replace('{"views":100}', '{"views":9223372036854775807}');
      metricRpc(f, exact);
      expect(
        row(
          `select views::text n from public.post_metrics where post_id=(select id from public.posts where public_id='${p.post_public_id}')`,
        ).n,
      ).toBe('9223372036854775807');
      metricRpc(f, record(f, p, { views: 0 }, '2026-10-11T00:00:00Z'));
      const future = metricRpc(
        f,
        record(f, p, { average_watch_time_seconds: 0 }, '2099-01-01T00:00:00Z'),
      );
      expect(future.data.anomaly_flags).toContain('capture_in_future');
    } finally {
      cleanup(f);
    }
  }, 30_000);

  it('SEC-RLS denies missing identity/client, foreign scope, unpublished states and caller tables/helpers', () => {
    const { f, p } = metricsFixture();
    const other = fixture();
    try {
      const call = record(f, p);
      expect(() => metricRpc(f, call, f.other)).toThrow(/^OWNER_ACCESS_REQUIRED$/);
      expect(() => rpcClaims(call, { role: 'authenticated', client_id: 'test' })).toThrow(
        /^AUTH_REQUIRED$/,
      );
      expect(() => rpcClaims(call, { sub: f.owner, role: 'authenticated' })).toThrow(
        /^OAUTH_CLIENT_REQUIRED$/,
      );
      expect(() => metricRpc(f, record(f, published(other)))).toThrow(/^POST_NOT_FOUND$/);
      let draft = rpc(f, save(f, request(f))).data.post;
      expect(() => metricRpc(f, record(f, draft))).toThrow(/^POST_NOT_PUBLISHED$/);
      draft = ready(f, draft);
      expect(() => metricRpc(f, record(f, draft))).toThrow(/^POST_NOT_PUBLISHED$/);
      lifecycleRpc(f, discard(f, draft));
      expect(() => metricRpc(f, record(f, draft))).toThrow(/^POST_NOT_PUBLISHED$/);
      for (const expression of [
        'select * from public.post_metrics',
        "select nextval('public.post_metrics_id_seq')",
        'select internal.metric_replay_v8(1)',
      ])
        expect(() => sql(`begin;set local role authenticated;${expression};rollback;`)).toThrow();
      expect(
        row(`select has_table_privilege('content_producer_api_owner','public.post_metrics','UPDATE,DELETE,TRUNCATE') mutable,
        (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='api') api`)
          .api,
      ).toBe(33);
    } finally {
      cleanup(f);
      cleanup(other);
    }
  }, 30_000);

  it('CORE-001 insert/completion faults rollback and corrupted v8 envelopes fail closed', () => {
    const { f, p } = metricsFixture();
    try {
      for (const target of ['insert', 'complete'] as const) {
        const call = record(
          f,
          p,
          { views: 1 },
          target === 'insert' ? '2026-10-12T03:00:00Z' : '2026-10-12T04:00:00Z',
        );
        const before = metricState(f);
        controlledFault(target, () => {
          expect(() => metricRpc(f, call)).toThrow(/^INTERNAL_ERROR$/);
          expect(metricState(f)).toEqual(before);
        });
        const r = metricRpc(f, call);
        expect(replayDigest(metricRpc(f, call))).toBe(replayDigest(r));
      }
      const key = randomUUID(),
        call = record(f, p, { views: 2 }, '2026-10-12T05:00:00Z', key);
      metricRpc(f, call);
      const original = row<{ s: unknown }>(
        `select response_snapshot s from internal.operation_ledger where operation_key='${key}'`,
      ).s;
      for (const patch of [
        "jsonb_set(response_snapshot,'{schema_version}','7')",
        "jsonb_set(response_snapshot,'{response_hash}','\"bad\"')",
        'response_snapshot||\'{"extra":true}\'::jsonb',
        `jsonb_set(response_snapshot,'{post_public_id}','"${randomUUID()}"')`,
      ]) {
        sql(
          `update internal.operation_ledger set response_snapshot=${patch} where operation_key='${key}'`,
        );
        expect(() => metricRpc(f, call)).toThrow(/^INTERNAL_ERROR$/);
        sql(
          `update internal.operation_ledger set response_snapshot='${JSON.stringify(original)}'::jsonb where operation_key='${key}'`,
        );
      }
      expect(metricRpc(f, call).data.replayed).toBe(true);
    } finally {
      cleanup(f);
    }
  }, 25_000);

  it('CORE-008 enforces write/read/expensive-read limits without mutation and exposes cautious insufficient', () => {
    const { f, p } = metricsFixture();
    try {
      for (const [group, limit, expression] of [
        ['write', 30, record(f, p)],
        ['read', 120, `api.get_post_performance(1,'${f.workspace}','${p.post_public_id}')`],
        [
          'expensive_read',
          20,
          `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['format'],'views')`,
        ],
      ] as const) {
        const client = randomUUID();
        // Saturate the current AND next minute for this disposable client. The
        // RPC limiter uses clock_timestamp(), so CI may cross a minute boundary
        // between seeding and the call. This keeps every production threshold
        // unchanged and still requires denial for all three exact rate groups.
        sql(
          `insert into internal.rate_limit_buckets
            (actor_user_id, oauth_client_id, limit_group, window_start, request_count, updated_at)
            select '${f.owner}', '${client}', '${group}',
              date_trunc('minute', clock_timestamp() at time zone 'UTC') at time zone 'UTC'
                + (minute_offset * interval '1 minute'),
              ${limit}, clock_timestamp()
            from generate_series(0, 1) as windows(minute_offset)`,
        );
        const before = metricState(f);
        expect(() => metricRpc(f, expression, f.owner, client), group).toThrow(/^RATE_LIMITED$/);
        expect(metricState(f)).toEqual(before);
        // A rejected RPC must roll back the attempted bucket increment, too.
        expect(
          row<{ count: number; minimum: number; maximum: number }>(
            `select count(*)::integer as count, min(request_count) as minimum,
              max(request_count) as maximum from internal.rate_limit_buckets
              where actor_user_id='${f.owner}' and oauth_client_id='${client}'
                and limit_group='${group}'`,
          ),
        ).toEqual({ count: 2, minimum: limit, maximum: limit });
      }
      metricRpc(f, record(f, p));
      const i = insights(f);
      expect((i.groups as { evidence_strength: string }[])[0]!.evidence_strength).toBe(
        'insufficient',
      );
    } finally {
      cleanup(f);
    }
  }, 20_000);
});
