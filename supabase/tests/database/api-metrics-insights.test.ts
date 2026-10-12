import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  metricsFixture,
  cleanup,
  record,
  metricRpc,
  metricSource,
  history,
  insights,
  published,
  row,
  sql,
  fixture,
} from './helpers/metrics-rpc.js';
type Group = {
  sample_size: number;
  evidence_strength: string;
  metric_summary: { median: number; mean: number; min: number; max: number } | null;
  dimension_values: Record<string, unknown>;
  age_distribution: { min_days: number; median_days: number; max_days: number };
  caveats: string[];
};
describe('5.8 RPC-METRIC-002 / RPC-INSIGHT-001', () => {
  it('paginates adjacent deltas across pages, incompatible/null sources, totals versus point averages and period bounds', () => {
    const { f, p } = metricsFixture();
    try {
      expect(history(f, p).snapshots).toEqual([]);
      for (const [hour, metrics, type] of [
        [2, { views: 100, watch_time_seconds: 100, average_watch_time_seconds: 10 }, 'facebook_ui'],
        [3, { views: 50, watch_time_seconds: 90, average_watch_time_seconds: 5 }, 'facebook_ui'],
        [4, { views: 70 }, 'facebook_export'],
        [5, { likes: 0, watch_time_seconds: 100 }, 'facebook_export'],
      ] as const)
        metricRpc(
          f,
          record(f, p, metrics, `2026-10-12T0${hour}:00:00Z`, randomUUID(), metricSource(type)),
        );
      let page = history(f, p, 1);
      expect(page.latest_snapshot!.metrics.views).toBeNull();
      expect(page.compatible_deltas[0]!.delta).toMatchObject({
        views: null,
        watch_time_seconds: null,
      });
      const ids: string[] = [];
      const pairs: string[] = [];
      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        ids.push(...page.snapshots.map((s) => s.metric_snapshot_public_id));
        pairs.push(...page.compatible_deltas.map((d) => d.to_captured_at));
        expect(page.latest_snapshot!.captured_at).toBe('2026-10-12T05:00:00.000000Z');
        if (!page.next_cursor) break;
        page = history(f, p, 1, page.next_cursor);
      }
      expect(new Set(ids).size).toBe(4);
      expect(pairs).toEqual(['2026-10-12T05:00:00.000000Z', '2026-10-12T03:00:00.000000Z']);
      const full = history(f, p, 100);
      expect(full.compatible_deltas[1]).toMatchObject({
        negative_delta: true,
        delta: { views: -50, watch_time_seconds: -10, average_watch_time_seconds: -5 },
      });
      expect(full.snapshots[1]!.anomaly_flags).toContain('source_incompatible');
      const bounded = history(f, p, 100, null, '2026-10-12T03:00:00Z', '2026-10-12T04:00:00Z');
      expect(bounded.snapshots).toHaveLength(2);
      expect(bounded.compatible_deltas).toEqual([]);
      const other = published(f);
      metricRpc(f, record(f, other, { views: 1 }));
      expect(() => history(f, other, 1, history(f, p, 1).next_cursor)).toThrow(
        /^VALIDATION_FAILED$/,
      );
      const cursor = JSON.parse(Buffer.from(history(f, p, 1).next_cursor!, 'base64').toString());
      cursor.sort = '2026-10-01T00:00:00Z';
      expect(() =>
        history(f, p, 1, Buffer.from(JSON.stringify(cursor)).toString('base64')),
      ).toThrow(/^VALIDATION_FAILED$/);
      expect(() => history(f, p, 101)).toThrow(/^VALIDATION_FAILED$/);
    } finally {
      cleanup(f);
    }
  }, 25_000);
  it('negative total watch time is anomalous while average-only decrease remains descriptive and legacy source is unknown', () => {
    const { f, p } = metricsFixture();
    try {
      metricRpc(f, record(f, p, { watch_time_seconds: 100, average_watch_time_seconds: 10 }));
      metricRpc(
        f,
        record(
          f,
          p,
          { watch_time_seconds: 90, average_watch_time_seconds: 12 },
          '2026-10-12T04:00:00Z',
        ),
      );
      metricRpc(
        f,
        record(
          f,
          p,
          { watch_time_seconds: 90, average_watch_time_seconds: 5 },
          '2026-10-12T05:00:00Z',
        ),
      );
      const h = history(f, p);
      expect(h.compatible_deltas[0]!.negative_delta).toBe(false);
      expect(h.compatible_deltas[1]!.negative_delta).toBe(true);
      sql(
        `insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views) select workspace_id,page_id,id,'2026-10-12T06:00:00Z',200 from public.posts where public_id='${p.post_public_id}'`,
      );
      const legacy = history(f, p);
      expect(legacy.snapshots[0]!.source.metric_definition_version).toBeNull();
      expect(legacy.snapshots[0]!.anomaly_flags).toContain('source_metadata_missing');
      expect(legacy.compatible_deltas).toHaveLength(2);
      const i = insights(f);
      expect(i.eligible_post_count).toBe(0);
      expect(i.excluded_reasons).toMatchObject({ unknown_source_or_definition: 1 });
      expect(i.groups).toEqual([]);
    } finally {
      cleanup(f);
    }
  }, 20_000);
  it('counts latest distinct posts, disjoint exclusions, numeric median/outliers and cautious thresholds without causation', () => {
    const { f, p } = metricsFixture();
    try {
      metricRpc(f, record(f, p, { views: 100 }));
      metricRpc(f, record(f, p, { views: 200 }, '2026-10-12T04:00:00Z'));
      const b = published(f);
      metricRpc(f, record(f, b, { views: 0 }));
      const c = published(f);
      metricRpc(f, record(f, c, { likes: 1 })); // views unknown, not zero
      const d = published(f);
      metricRpc(f, record(f, d, { views: 999999 }));
      const early = published(f);
      metricRpc(f, record(f, early, { views: 50 }, '2026-10-11T00:00:00Z'));
      published(f); // no snapshot
      let i = insights(f, 'views', 5, [
        'format',
        'profile',
        'fact_count',
        'hook_pattern',
        'cta_pattern',
      ]);
      expect(i.eligible_post_count).toBe(3);
      expect(i.excluded_post_count).toBe(3);
      expect(i.excluded_reasons).toMatchObject({
        no_snapshot_in_period: 1,
        missing_metric: 1,
        invalid_observation_age: 1,
      });
      const g = (i.groups as Group[])[0]!;
      expect(g.sample_size).toBe(3);
      expect(g.evidence_strength).toBe('insufficient');
      expect(g.metric_summary!.median).toBe(200);
      expect(g.metric_summary!.min).toBe(0);
      expect(g.age_distribution.min_days).toBeGreaterThanOrEqual(0);
      expect(g.dimension_values).toMatchObject({
        profile: 'fast_trivia',
        fact_count: 5,
        hook_pattern: 'did_you_know',
        cta_pattern: 'share',
      });
      i = insights(f, 'views', 3);
      expect((i.groups as Group[])[0]!.evidence_strength).toBe('exploratory');
      expect((i.groups as Group[])[0]!.caveats.join(' ')).toContain('not a causal conclusion');
      metricRpc(
        f,
        record(
          f,
          b,
          { views: 10 },
          '2026-10-12T04:00:00Z',
          randomUUID(),
          metricSource('user_reported'),
        ),
      );
      const mixed = (insights(f, 'views', 1).groups as Group[])[0]!;
      expect(mixed.sample_size).toBe(3);
      expect(mixed.evidence_strength).toBe('insufficient');
      expect(mixed.metric_summary).toBeNull();
      expect(mixed.caveats.join(' ')).toContain('Mixed sources');
      const scoped = row<{ n: number }>(
        `select count(*) n from public.posts where page_id=(select id from public.pages where public_id='${f.page}')`,
      ).n;
      expect(Number(i.eligible_post_count) + Number(i.excluded_post_count)).toBe(scoped);
      const before = row(
        `select (select count(*) from internal.operation_ledger) ledgers,(select count(*) from public.post_metrics) metrics`,
      );
      insights(f);
      history(f, p);
      expect(
        row(
          `select (select count(*) from internal.operation_ledger) ledgers,(select count(*) from public.post_metrics) metrics`,
        ),
      ).toEqual(before);
    } finally {
      cleanup(f);
    }
  }, 45_000);
  it('returns empty successful evidence and rejects invalid dimensions/metrics/periods/null bounds through public reads', () => {
    const f = fixture();
    try {
      expect(insights(f).groups).toEqual([]);
      const base = `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['format'],'views',5,20)`;
      for (const invalid of [
        base.replace("'views'", 'null'),
        base.replace("array['format']", "array['format',null]"),
        base.replace("array['format']", "array['format','format']"),
        base.replace(',5,20)', ',0,20)'),
        base.replace(',5,20)', ',5,51)'),
        base.replace('null,null', "'infinity',null"),
        base.replace('null,null', "'2026-10-13','2026-10-12'"),
      ])
        expect(() => metricRpc(f, invalid)).toThrow(/^VALIDATION_FAILED$/);
    } finally {
      cleanup(f);
    }
  }, 15_000);
});
