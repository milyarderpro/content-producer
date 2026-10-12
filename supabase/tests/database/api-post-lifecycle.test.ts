import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { record, metricRpc } from './helpers/metrics-rpc.js';
import {
  approve,
  archive,
  claim,
  cleanup,
  createPlan,
  discard,
  evidence,
  fixture,
  get,
  json,
  lifecycleRpc,
  posted,
  publish,
  ready,
  replayDigest,
  request,
  reschedule,
  revoke,
  revise,
  row,
  rpc,
  rpcClaims,
  save,
  sql,
  state,
  usages,
} from './helpers/post-lifecycle.js';

describe('Checkpoint 5.7 public explicit lifecycle', () => {
  it('RATE-LIMIT exact lifecycle groups reject every write before mutation', () => {
    const f = fixture();
    try {
      for (const builder of [approve, revoke, discard, publish, archive]) {
        let p = rpc(f, save(f, request(f))).data.post;
        if (builder === revoke || builder === publish || builder === archive) p = ready(f, p);
        if (builder === archive) p = posted(f, p);
        const group = builder === discard || builder === publish ? 'contention_write' : 'write';
        const client = randomUUID();
        sql(`insert into internal.rate_limit_buckets(actor_user_id,oauth_client_id,limit_group,window_start,request_count)
          values('${f.owner}','${client}','${group}',date_trunc('minute',now()),${group === 'write' ? 30 : 20})`);
        const before = state(f);
        const call = builder(f, p);
        expect(() => lifecycleRpc(f, call, f.owner, client)).toThrow(/^RATE_LIMITED$/);
        expect(state(f)).toBe(before);
        expect(lifecycleRpc(f, call).data.revision).toBe(p.revision + 1);
      }
    } finally {
      cleanup(f);
    }
  }, 40_000);
  it('CORE-007 null transition metadata injected at completion must fail closed and roll back', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      const before = state(f);
      sql(`create function internal.p57_null_history_fault() returns trigger language plpgsql as $$begin new.prior_status:=null;new.prior_revision:=null;return new;end$$;
        create trigger p57_null_history_fault before insert on internal.post_write_history for each row execute function internal.p57_null_history_fault();`);
      try {
        expect(() => lifecycleRpc(f, approve(f, p))).toThrow(/^INTERNAL_ERROR$/);
        expect(state(f)).toBe(before);
      } finally {
        sql(
          'drop trigger p57_null_history_fault on internal.post_write_history;drop function internal.p57_null_history_fault();',
        );
      }
    } finally {
      cleanup(f);
    }
  }, 20_000);
  it('RPC-LIFE / RPC-APPROVAL every binding, provenance and immutable v6/v7 replay survives later transitions', () => {
    const f = fixture();
    try {
      const r = request(f);
      const saveCall = save(f, r);
      const saved = rpc(f, saveCall);
      let p = saved.data.post;
      const revisionCall = revise(f, p, r);
      const revised = rpc(f, revisionCall);
      p = revised.data.post;
      const before = evidence(p);
      const approvalCall = approve(f, p);
      const approved = lifecycleRpc(f, approvalCall);
      p = get(f, p.post_public_id);
      const approvedEvidence = evidence(p);
      expect(p.revision).toBe(3);
      expect(p.content_hash).toBe(saved.data.post.content_hash);
      expect(p.editorial_checks).toEqual({
        ...(before.editorial_checks as object),
        post_revision: 3,
      });
      expect(approved.data.recomputed_checks.post_revision).toBe(3);
      expect(approved.data.approval.approved_revision).toBe(3);
      const scheduleCall = reschedule(f, p, '2026-11-01T12:00:00Z');
      const scheduled = rpc(f, scheduleCall);
      p = get(f, p.post_public_id);
      expect(p.status).toBe('ready');
      expect(evidence(p).approval_snapshot).toEqual({
        ...(approvedEvidence.approval_snapshot as object),
        approved_revision: 4,
      });
      const revokeCall = revoke(f, p);
      const revoked = lifecycleRpc(f, revokeCall);
      p = get(f, p.post_public_id);
      expect(p.status).toBe('draft');
      expect(p.quality_status).toBe('pending');
      expect(evidence(p).approval_snapshot).toBeNull();
      expect(evidence(p).ready_at).toBeNull();
      expect(p.editorial_checks).toEqual({
        ...(before.editorial_checks as object),
        post_revision: 5,
      });
      p = ready(f, p);
      const prePublish = evidence(p);
      const originalUsage = usages(p);
      const publishCall = publish(
        f,
        p,
        randomUUID(),
        'true',
        '2026-10-12T01:02:03.123456Z',
        'manual-id',
      );
      const published = lifecycleRpc(f, publishCall);
      p = get(f, p.post_public_id);
      expect(p.revision).toBe(7);
      expect(p.status).toBe('posted');
      expect(p.editorial_checks).toEqual({
        ...(prePublish.editorial_checks as object),
        post_revision: 7,
      });
      expect(evidence(p).approval_snapshot).toEqual({
        ...(prePublish.approval_snapshot as object),
        approved_revision: 7,
      });
      const newUsage = usages(p).junctions as Record<string, unknown>[];
      const oldUsage = originalUsage.junctions as Record<string, unknown>[];
      expect(newUsage.map((x) => x.source_snapshot)).toEqual(
        oldUsage.map((x) => x.source_snapshot),
      );
      expect(newUsage.every((x) => x.allocation_state === 'published')).toBe(true);
      expect(
        row(
          `select bool_and(j.published_at=p.published_at) same from public.trivia_post_facts j join public.posts p on p.id=j.post_id where p.public_id='${p.post_public_id}'`,
        ).same,
      ).toBe(true);
      const publishedEvidence = evidence(p),
        publishedUsage = usages(p);
      // Complete Phase 5 retention now records observations through the public writer.
      metricRpc(f, record(f, p, { views: 12 }, '2026-10-12T03:00:00Z'));
      const metrics = row(
        `select to_jsonb(m) metric from public.post_metrics m where post_id=(select id from public.posts where public_id='${p.post_public_id}')`,
      );
      const archiveCall = archive(f, p);
      const archived = lifecycleRpc(f, archiveCall);
      p = get(f, p.post_public_id);
      expect(p.status).toBe('archived');
      expect(p.revision).toBe(8);
      expect(evidence(p)).toEqual(publishedEvidence);
      expect(usages(p)).toEqual(publishedUsage);
      expect(
        row(
          `select to_jsonb(m) metric from public.post_metrics m where post_id=(select id from public.posts where public_id='${p.post_public_id}')`,
        ),
      ).toEqual(metrics);
      const unchanged = state(f);
      for (const [call, response] of [
        [saveCall, saved],
        [revisionCall, revised],
        [scheduleCall, scheduled],
        [approvalCall, approved],
        [revokeCall, revoked],
        [publishCall, published],
        [archiveCall, archived],
      ] as const) {
        const replay = lifecycleRpc(f, call);
        expect(replay.data.replayed).toBe(true);
        expect(replayDigest(replay)).toBe(replayDigest(response as never));
      }
      expect(state(f)).toBe(unchanged);
      for (const call of [approve(f, p), revoke(f, p), discard(f, p), publish(f, p), archive(f, p)])
        expect(() => lifecycleRpc(f, call)).toThrow(/^INVALID_STATUS_TRANSITION$/);
      for (const call of [approvalCall, revokeCall, publishCall, archiveCall])
        expect(() => lifecycleRpc(f, call.replace(p.post_public_id, randomUUID()))).toThrow(
          /^OPERATION_KEY_REUSED$/,
        );
    } finally {
      cleanup(f);
    }
  }, 60_000);

  it('SEC-OWN / explicit constants and all five non-owner/missing-context paths leave no mutation', () => {
    const f = fixture();
    const other = fixture();
    try {
      let p = rpc(f, save(f, request(f))).data.post;
      const foreign = rpc(other, save(other, request(other))).data.post;
      for (const builder of [approve, revoke, discard, publish, archive]) {
        const call = builder(f, p);
        const before = state(f);
        expect(() => lifecycleRpc(f, call, f.other)).toThrow(/^OWNER_ACCESS_REQUIRED$/);
        expect(() => rpcClaims(call, { role: 'authenticated', client_id: 'test' })).toThrow(
          /^AUTH_REQUIRED$/,
        );
        expect(() => rpcClaims(call, { sub: f.owner, role: 'authenticated' })).toThrow(
          /^OAUTH_CLIENT_REQUIRED$/,
        );
        expect(state(f)).toBe(before);
        expect(() => lifecycleRpc(f, builder(f, foreign))).toThrow(/^POST_NOT_FOUND$/);
        expect(state(f)).toBe(before);
      }
      for (const explicit of ['false', 'null']) {
        const before = state(f);
        expect(() =>
          lifecycleRpc(
            f,
            approve(
              f,
              p,
              randomUUID(),
              ['trivia.profile.preferred_band'],
              'Accept preference.',
              explicit,
            ),
          ),
        ).toThrow(/^APPROVAL_REQUIRED$/);
        for (const call of [
          revoke(f, p, randomUUID(), explicit),
          discard(f, p, randomUUID(), explicit),
          publish(f, p, randomUUID(), explicit),
          archive(f, p, randomUUID(), explicit),
        ])
          expect(() => lifecycleRpc(f, call)).toThrow(/^VALIDATION_FAILED$/);
        expect(state(f)).toBe(before);
      }
      expect(() => lifecycleRpc(f, approve(f, { ...p, revision: 2 }))).toThrow(
        /^REVISION_CONFLICT$/,
      );
      expect(() => lifecycleRpc(f, approve(f, { ...p, content_hash: 'f'.repeat(64) }))).toThrow(
        /^CONTENT_HASH_CONFLICT$/,
      );
      p = ready(f, p);
      expect(() => lifecycleRpc(f, revoke(f, { ...p, revision: 1 }))).toThrow(
        /^REVISION_CONFLICT$/,
      );
      expect(() => lifecycleRpc(f, publish(f, { ...p, content_hash: 'e'.repeat(64) }))).toThrow(
        /^CONTENT_HASH_CONFLICT$/,
      );
      for (const role of ['anon', 'authenticated', 'service_role'])
        for (const call of [
          'select * from public.posts',
          'select * from public.trivia_post_facts',
          'select * from internal.post_write_history',
          "select internal.lifecycle_replay_v7(1,'approve_post')",
          "select nextval('internal.post_write_history_id_seq')",
        ])
          expect(() => sql(`begin;set local role ${role};${call};rollback;`)).toThrow();
    } finally {
      cleanup(f);
      cleanup(other);
    }
  }, 40_000);

  it('RPC-LIFE discard releases only current allocations, retains completed plan and reports explicit replacement eligibility', () => {
    const f = fixture();
    try {
      const plan = createPlan(f, 1, ['2026-11-02T12:00:00Z']);
      const claimed = rpc(f, claim(f, plan.data.plan.plan_public_id)) as unknown as {
        data: { claimed_items: { item: { plan_item_public_id: string }; claim_token: string }[] };
      };
      const item = claimed.data.claimed_items[0]!;
      const r = request(f);
      r.plan = {
        plan_item_public_id: item.item.plan_item_public_id,
        claim_token: item.claim_token,
      };
      r.schedule = '2026-11-02T12:00:00Z';
      const p = ready(f, rpc(f, save(f, r)).data.post);
      const held = request(f);
      const beforeUsage = usages(p);
      const lease = row(
        `select jsonb_agg(to_jsonb(f) order by id) facts from public.trivia_facts f where reservation_token='${held.token}'`,
      );
      const call = discard(f, p);
      const discarded = lifecycleRpc(f, call);
      expect(discarded.data.released_fact_public_ids).toEqual(
        p.fact_bindings.map((x) => x.fact_public_id),
      );
      expect(discarded.data.plan_item).toEqual({
        plan_item_public_id: item.item.plan_item_public_id,
        replacement_eligible: true,
      });
      const current = get(f, p.post_public_id);
      expect(current.revision).toBe(p.revision + 1);
      expect(current.quality_status).toBe('pending');
      expect(
        (usages(current).junctions as Record<string, unknown>[]).map((x) => x.source_snapshot),
      ).toEqual((beforeUsage.junctions as Record<string, unknown>[]).map((x) => x.source_snapshot));
      expect(
        row(
          `select status from public.content_plan_items where public_id='${item.item.plan_item_public_id}'`,
        ).status,
      ).toBe('completed');
      expect(
        row(
          `select jsonb_agg(to_jsonb(f) order by id) facts from public.trivia_facts f where reservation_token='${held.token}'`,
        ),
      ).toEqual(lease);
      expect(() => lifecycleRpc(f, discard(f, current))).toThrow(/^INVALID_STATUS_TRANSITION$/);
      expect(() =>
        lifecycleRpc(f, call.replace('Abandon this content.', 'Changed reason.')),
      ).toThrow(/^OPERATION_KEY_REUSED$/);
      rpc(
        f,
        `api.replace_discarded_plan_item(1,'${f.workspace}','${randomUUID()}','${item.item.plan_item_public_id}','${p.post_public_id}','Create an explicit replacement.',true)`,
      );
      expect(
        row(
          `select status from public.content_plan_items where public_id='${item.item.plan_item_public_id}'`,
        ).status,
      ).toBe('pending');
      expect(replayDigest(lifecycleRpc(f, call))).toBe(replayDigest(discarded));
      // Original completed item still occupies its slot until explicitly replaced/cancelled.
      expect(() => rpc(f, save(f, { ...held, schedule: r.schedule }))).toThrow(
        /^SCHEDULE_CONFLICT$/,
      );
    } finally {
      cleanup(f);
    }
  }, 40_000);

  it('RPC-ROLLBACK every lifecycle write rolls back after mutation/history and ledger faults, then same-key retry succeeds', () => {
    const f = fixture();
    try {
      for (const stage of ['history', 'ledger'])
        for (const name of ['approve', 'revoke', 'discard', 'publish', 'archive']) {
          let p = rpc(f, save(f, request(f))).data.post;
          if (['revoke', 'publish', 'archive'].includes(name)) p = ready(f, p);
          if (name === 'archive') p = posted(f, p);
          const builders = { approve, revoke, discard, publish, archive };
          const call = builders[name as keyof typeof builders](f, p);
          const before = state(f);
          sql(`create function internal.p57_completion_fault() returns trigger language plpgsql as $$begin
          if TG_TABLE_NAME='post_write_history' then raise exception 'P57_FAULT';
          elsif new.completed_at is not null then raise exception 'P57_FAULT'; end if; return new;end$$;
          create trigger p57_completion_fault before ${stage === 'history' ? 'insert on internal.post_write_history' : 'update on internal.operation_ledger'}
          for each row execute function internal.p57_completion_fault();`);
          try {
            expect(() => lifecycleRpc(f, call)).toThrow(/^INTERNAL_ERROR$/);
            expect(state(f)).toBe(before);
          } finally {
            sql(
              `drop trigger p57_completion_fault on internal.${stage === 'history' ? 'post_write_history' : 'operation_ledger'};drop function internal.p57_completion_fault();`,
            );
          }
          const result = lifecycleRpc(f, call);
          expect(result.data.revision).toBe(p.revision + 1);
          expect(replayDigest(lifecycleRpc(f, call))).toBe(replayDigest(result));
        }
    } finally {
      cleanup(f);
    }
  }, 120_000);

  it('RPC-PUBLISH validates publication fields and duplicate platform identity atomically', () => {
    const f = fixture();
    try {
      const p = ready(f, rpc(f, save(f, request(f))).data.post);
      const before = state(f);
      for (const args of [
        ['infinity', null, null],
        ['2026-10-12T01:00:00Z', '', null],
        ['2026-10-12T01:00:00Z', 'x'.repeat(201), null],
        ['2026-10-12T01:00:00Z', null, 'http://example.test'],
        ['2026-10-12T01:00:00Z', null, 'https://'],
        ['2026-10-12T01:00:00Z', null, 'https://user:secret@example.test'],
      ] as [string, string | null, string | null][]) {
        expect(() => lifecycleRpc(f, publish(f, p, randomUUID(), 'true', ...args))).toThrow(
          /^VALIDATION_FAILED$/,
        );
        expect(state(f)).toBe(before);
      }
      const call = publish(f, p, randomUUID(), 'true', '2026-10-12T01:00:00Z', 'unique-manual');
      lifecycleRpc(f, call);
      expect(() => lifecycleRpc(f, call.replace('01:00:00Z', '02:00:00Z'))).toThrow(
        /^OPERATION_KEY_REUSED$/,
      );
      const other = ready(f, rpc(f, save(f, request(f))).data.post);
      const stable = state(f);
      expect(() =>
        lifecycleRpc(
          f,
          publish(f, other, randomUUID(), 'true', '2026-10-12T01:00:00Z', 'unique-manual'),
        ),
      ).toThrow(/^VALIDATION_FAILED$/);
      expect(state(f)).toBe(stable);
    } finally {
      cleanup(f);
    }
  }, 40_000);

  it('CORE-007 v7 corrupt envelopes/history fail closed without weakening historical v6', () => {
    const f = fixture();
    try {
      const p = rpc(f, save(f, request(f))).data.post;
      const key = randomUUID(),
        call = approve(f, p, key);
      lifecycleRpc(f, call);
      const original = row<{ s: unknown }>(
        `select response_snapshot s from internal.operation_ledger where operation_key='${key}'`,
      ).s;
      for (const patch of [
        { schema_version: 6 },
        { response_hash: '0'.repeat(64) },
        { target_public_id: randomUUID() },
        { history_public_id: randomUUID() },
        { unexpected: true },
      ]) {
        sql(
          `update internal.operation_ledger set response_snapshot=${json({ ...(original as object), ...patch })} where operation_key='${key}'`,
        );
        expect(() => lifecycleRpc(f, call)).toThrow(/^INTERNAL_ERROR$/);
      }
      sql(
        `update internal.operation_ledger set response_snapshot=${json(original)} where operation_key='${key}'`,
      );
      const history = row<{ r: unknown }>(
        `select response r from internal.post_write_history where operation_id=(select id from internal.operation_ledger where operation_key='${key}')`,
      ).r;
      sql(`begin;alter table internal.post_write_history disable trigger post_history_immutable;
        update internal.post_write_history set response=jsonb_set(response,'{data,unexpected}','true') where operation_id=(select id from internal.operation_ledger where operation_key='${key}');
        alter table internal.post_write_history enable trigger post_history_immutable;commit;`);
      sql(`update internal.operation_ledger l set response_snapshot=jsonb_set(response_snapshot,'{response_hash}',to_jsonb(encode(extensions.digest(convert_to(h.response::text,'UTF8'),'sha256'),'hex')))
        from internal.post_write_history h where h.operation_id=l.id and l.operation_key='${key}'`);
      expect(() => lifecycleRpc(f, call)).toThrow(/^INTERNAL_ERROR$/);
      sql(`begin;alter table internal.post_write_history disable trigger post_history_immutable;
        update internal.post_write_history set response=${json(history)} where operation_id=(select id from internal.operation_ledger where operation_key='${key}');
        alter table internal.post_write_history enable trigger post_history_immutable;
        update internal.operation_ledger set response_snapshot=${json(original)} where operation_key='${key}';commit;`);
      expect(lifecycleRpc(f, call).data.replayed).toBe(true);
    } finally {
      cleanup(f);
    }
  }, 40_000);
});
