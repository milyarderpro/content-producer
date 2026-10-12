import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { format } from 'prettier';
import { phaseFiveOperationMap } from './phase-5-operation-map.test.js';
import { row, sql } from './helpers/plan-lifecycle.js';
import {
  metricsFixture,
  cleanup,
  record,
  metricRpc,
  metricSource,
  history,
  insights,
  quote,
} from './helpers/metrics-rpc.js';

describe('5.9 phase-wide public surface and scope acceptance', () => {
  it('SEC-* exact 33 RPCs, owner policies/default ACL, historical replay security and no Phase 6 implementation', () => {
    const a = JSON.parse(sql(readFileSync('docs/phase-5-8-catalog-audit.sql', 'utf8'))) as Record<
      string,
      unknown
    >;
    expect(a.api_function_count).toBe(33);
    expect(a.authenticated_api_execute_count).toBe(33);
    expect(a.rls_enabled_table_count).toBe(15);
    for (const key of [
      'allowlist_difference_count',
      'overloaded_api_count',
      'unsafe_api_count',
      'caller_table_privilege_count',
      'caller_column_privilege_count',
      'caller_sequence_privilege_count',
      'caller_helper_execute_count',
      'public_helper_execute_count',
      'public_api_execute_count',
      'banned_api_execute_count',
      'unsafe_default_acl_count',
      'unsafe_update_policy_count',
    ])
      expect(a[key], key).toBe(0);
    const policies = a.policy_inventory as {
      table: string;
      command: string;
      using: string | null;
      check: string | null;
    }[];
    for (const policy of policies) {
      const expressions = [policy.using, policy.check].filter((x): x is string => x !== null);
      expect(expressions.length).toBeGreaterThan(0);
      for (const expression of expressions) {
        expect(expression).toMatch(/internal\.(current_auth_uid_v1|request_actor_user_id_v1)/);
        if (policy.table !== 'niches' && policy.table !== 'internal.rate_limit_buckets')
          expect(expression).toContain('owner_user_id');
      }
      if (policy.command === 'a') expect(policy.check).not.toBeNull();
    }
    expect(a.metrics_owner_privileges).toEqual({
      select: true,
      insert: true,
      update: false,
      delete: false,
      truncate: false,
    });
    expect(a.private_definer_inventory).toEqual([
      {
        signature: 'internal.current_auth_uid_v1()',
        owner: 'postgres',
        settings: ['search_path=""'],
      },
    ]);
    expect(
      sql(
        `select prosrc from pg_proc where oid='internal.current_auth_uid_v1()'::regprocedure`,
      ).trim(),
    ).toMatch(/^select auth\.uid\(\);?$/i);
    for (const op of phaseFiveOperationMap)
      expect(existsSync(`supabase/tests/database/${op.testOwner}`), op.name).toBe(true);
    const config = readFileSync('supabase/config.toml', 'utf8');
    expect(config).toMatch(/\[functions\.mcp\]\s*enabled = false/);
    for (const path of ['supabase/functions/mcp', 'auth-frontend/src']) {
      const files = existsSync(path) ? readdirSync(path) : [];
      expect(files.filter((x) => x !== '.gitkeep')).toEqual([]);
    }
    expect(readdirSync('plugin/.codex-plugin').filter((x) => x !== '.gitkeep')).toEqual([]);
    expect(readFileSync('supabase/seed.sql', 'utf8')).not.toMatch(/\b(insert|update|delete)\b/i);
    const allowed = new Set(phaseFiveOperationMap.map((x) => x.name));
    expect((a.api_inventory as { name: string }[]).every((x) => allowed.has(x.name))).toBe(true);
  });
  it('RPC-METRIC numeric normalization and immutable v8 preserve exact request/replay boundaries without new post revision', () => {
    const { f, p } = metricsFixture();
    try {
      const call = record(f, p, { views: 0 });
      const first = metricRpc(f, call);
      const equivalent = call
        .replace('{"views":0}', '{"views":0.0,"likes":null}')
        .replace('2026-10-12T03:00:00Z', '2026-10-12T10:00:00+07:00')
        .replace(
          JSON.stringify(metricSource()),
          JSON.stringify({
            ...metricSource(),
            source_reported_at: null,
            timezone: null,
            note: null,
          }),
        );
      expect(metricRpc(f, equivalent).data).toEqual({ ...first.data, replayed: true });
      expect(
        row(`select revision from public.posts where public_id='${p.post_public_id}'`).revision,
      ).toBe(p.revision);
      expect(history(f, p).snapshots).toHaveLength(1);
      expect((insights(f, 'views', 1).groups as { sample_size: number }[])[0]!.sample_size).toBe(1);
      expect(() =>
        metricRpc(f, call.replace('record_post_performance(1,', 'record_post_performance(2,')),
      ).toThrow(/^VALIDATION_FAILED$/);
      expect(() =>
        metricRpc(
          f,
          call.replace(quote(p.post_public_id), quote('00000000-0000-4000-8000-000000000000')),
        ),
      ).toThrow(/^OPERATION_KEY_REUSED$/);
    } finally {
      cleanup(f);
    }
  }, 15_000);
  it('PERF-READ / PERF-WRITE populated local public metrics/read p95 and normal-planner plans meet frozen targets', async () => {
    const { f, p } = metricsFixture();
    try {
      // Administrative, ephemeral volume fixture; original target came through save/approve/publish.
      sql(`insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,content_schema_version,status,
        content_payload,generation_snapshot,system_checks,editorial_checks,approval_snapshot,content_hash,quality_status,ready_at,published_at,revision)
        select p.workspace_id,p.page_id,p.niche_key,p.format_key,p.topic_key,p.interaction_goal,p.content_schema_version,p.status,
        p.content_payload,p.generation_snapshot,p.system_checks,p.editorial_checks,p.approval_snapshot,p.content_hash,p.quality_status,p.ready_at,p.published_at,p.revision
        from public.posts p cross join generate_series(1,250) where p.public_id='${p.post_public_id}';
        insert into public.post_metrics(workspace_id,page_id,post_id,captured_at,views,metrics_payload)
        select p.workspace_id,p.page_id,p.id,p.published_at+g*interval '1 hour',g*100,
        '{"source_type":"facebook_ui","metric_definition_version":1,"source_reported_at":null,"timezone":null,"note":null}'::jsonb
        from public.posts p cross join generate_series(1,40) g where workspace_id=(select id from public.workspaces where public_id='${f.workspace}');
        analyze public.posts;analyze public.post_metrics;`);
      expect(row(`select count(*) n from public.post_metrics`).n).toBe(10040);
      const expressions = {
        get_post: `api.get_post(1,'${f.workspace}','${p.post_public_id}',false,false,true)`,
        list_posts: `api.list_posts(1,'${f.workspace}','${f.page}')`,
        history: `api.get_post_performance(1,'${f.workspace}','${p.post_public_id}',null,null,100,null)`,
        context: `api.get_page_generation_context(1,'${f.workspace}','${f.page}','trivia')`,
        insights: `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array['format'],'views',5,20)`,
      };
      const timings: Record<string, { n: number; p95_ms: number; target_ms: number | null }> = {};
      for (const [name, expression] of Object.entries(expressions)) {
        metricRpc(f, expression);
        const samples: number[] = [];
        for (let i = 0; i < 12; i++) {
          const start = performance.now();
          metricRpc(f, expression);
          samples.push(performance.now() - start);
        }
        samples.sort((a, b) => a - b);
        const p95 = samples[Math.ceil(samples.length * 0.95) - 1]!;
        timings[name] = { n: 12, p95_ms: p95, target_ms: name === 'insights' ? null : 2000 };
        if (name !== 'insights') expect(p95, name).toBeLessThanOrEqual(2000);
      }
      const writes: number[] = [];
      for (let i = 0; i < 12; i++) {
        const start = performance.now();
        metricRpc(f, record(f, p, { views: i }, `2026-12-01T00:${String(i).padStart(2, '0')}:00Z`));
        writes.push(performance.now() - start);
      }
      writes.sort((a, b) => a - b);
      timings.record_post_performance = {
        n: 12,
        p95_ms: writes[Math.ceil(writes.length * 0.95) - 1]!,
        target_ms: 3000,
      };
      expect(timings.record_post_performance.p95_ms).toBeLessThanOrEqual(3000);
      expect(sql('show enable_seqscan')).toBe('on');
      const scope = `m.workspace_id=(select id from public.workspaces where public_id='${f.workspace}') and m.post_id=(select id from public.posts where public_id='${p.post_public_id}')`;
      const plans = {
        latest: sql(
          `explain(analyze,buffers) select m.* from public.post_metrics m where ${scope} order by captured_at desc,id desc limit 1`,
        ),
        history: sql(
          `explain(analyze,buffers) with history as(select m,lag(m) over(order by captured_at,id) prior from public.post_metrics m where ${scope}) select * from history order by (m).captured_at desc,(m).id desc limit 101`,
        ),
        insights:
          sql(`explain(analyze,buffers) select p.format_key,count(*),avg(m.views::numeric) from public.posts p join lateral
          (select views from public.post_metrics x where x.workspace_id=p.workspace_id and x.post_id=p.id order by captured_at desc,id desc limit 1) m on true
          where p.page_id=(select id from public.pages where public_id='${f.page}') and p.niche_key='trivia' and p.status in('posted','archived') group by p.format_key`),
      };
      for (const plan of Object.values(plans)) expect(plan).toMatch(/Buffers:|Planning Time:/);
      console.info(
        `5.9 public local p95: ${JSON.stringify(timings)}; fixture=251 posts/10040 observations; normal planner`,
      );
      const label = process.env.PHASE5_EVIDENCE_RUN;
      if (label === 'A' || label === 'B')
        writeFileSync(
          `docs/phase-5-9-performance-${label}.json`,
          await format(
            JSON.stringify({ label, fixture: { posts: 251, observations: 10040 }, timings, plans }),
            { parser: 'json' },
          ),
        );
    } finally {
      cleanup(f);
    }
  }, 60_000);
});
