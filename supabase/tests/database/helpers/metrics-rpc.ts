import { randomUUID } from 'node:crypto';
import {
  fixture,
  cleanup,
  save,
  request,
  rpc as postRpc,
  ready,
  posted,
  type Fixture,
  type Post,
  json,
  quote,
  row,
  sql,
} from './post-lifecycle.js';
import { rpc } from './trivia-rpc.js';
export * from './post-lifecycle.js';
export { rpc as metricRpc } from './trivia-rpc.js';
export type Snapshot = {
  metric_snapshot_public_id: string;
  post_public_id: string;
  captured_at: string;
  metrics: Record<string, number | null>;
  anomaly_flags: string[];
  source: Record<string, unknown>;
  replayed: boolean;
};
export type History = {
  snapshots: Snapshot[];
  latest_snapshot: Snapshot | null;
  compatible_deltas: {
    delta: Record<string, number | null>;
    negative_delta: boolean;
    to_captured_at: string;
  }[];
  next_cursor: string | null;
  has_more: boolean;
};
export function published(f: Fixture): Post {
  return posted(f, ready(f, postRpc(f, save(f, request(f))).data.post));
}
export function metricSource(source_type = 'facebook_ui'): Record<string, unknown> {
  return { source_type, metric_definition_version: 1 };
}
export function record(
  f: Fixture,
  p: Post,
  metrics: unknown = { views: 100 },
  at = '2026-10-12T03:00:00Z',
  key = randomUUID(),
  source: unknown = metricSource(),
): string {
  return `api.record_post_performance(1,'${f.workspace}','${key}','${p.post_public_id}',${quote(at)},${json(metrics)},${json(source)})`;
}
export function history(
  f: Fixture,
  p: Post,
  limit = 20,
  cursor: string | null = null,
  from: string | null = null,
  to: string | null = null,
): History {
  return rpc(
    f,
    `api.get_post_performance(1,'${f.workspace}','${p.post_public_id}',${from ? quote(from) : 'null'},${to ? quote(to) : 'null'},${limit},${cursor ? quote(cursor) : 'null'})`,
  ).data as unknown as History;
}
export function insights(
  f: Fixture,
  metric = 'views',
  min = 5,
  dimensions = ['format'],
  limit = 20,
) {
  return rpc(
    f,
    `api.get_performance_insights(1,'${f.workspace}','${f.page}','trivia',null,null,array[${dimensions.map(quote).join(',')}]::text[],${quote(metric)},${min},${limit})`,
  ).data;
}
export function metricState(f: Fixture): unknown {
  return row(`select (select coalesce(jsonb_agg(to_jsonb(m) order by id),'[]') from public.post_metrics m where workspace_id=w.id) metrics,
    (select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from internal.operation_ledger l where workspace_id=w.id) ledger
    from public.workspaces w where public_id='${f.workspace}'`);
}
export function metricsFixture() {
  const f = fixture();
  try {
    return { f, p: published(f) };
  } catch (error) {
    cleanup(f);
    throw error;
  }
}
export function controlledFault(target: 'insert' | 'complete', body: () => void): void {
  const table = target === 'insert' ? 'public.post_metrics' : 'internal.operation_ledger';
  const event = target === 'insert' ? 'after insert' : 'before update';
  const predicate =
    target === 'complete' ? "if new.operation_name='record_post_performance' then" : 'if true then';
  sql(`create function internal.p58_fault() returns trigger language plpgsql as $$begin ${predicate}
    raise exception 'controlled failure'; end if; return new;end$$;
    create trigger p58_fault ${event} on ${table} for each row execute function internal.p58_fault();`);
  try {
    body();
  } finally {
    sql(`drop trigger p58_fault on ${table};drop function internal.p58_fault();`);
  }
}
