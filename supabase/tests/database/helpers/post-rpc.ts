import { randomUUID } from 'node:crypto';
import {
  candidate,
  digest,
  cleanup as triviaCleanup,
  factInput,
  fixture,
  json,
  quote,
  reserved,
  reserve,
  row,
  rpc as triviaRpc,
  sql,
  state as triviaState,
  type TriviaFixture,
} from './trivia-rpc.js';
export {
  callerStatement,
  session,
  waitForSession,
  digest,
  replayDigest,
  correct,
  time,
  release,
  expire,
  secondPage,
} from './trivia-rpc.js';
export { claim, createPlan, cancel, rpcClaims } from './plan-lifecycle.js';
export { fixture, json, quote, row, sql };
export type Fixture = TriviaFixture;
export type Post = {
  post_public_id: string;
  status: string;
  revision: number;
  content_hash: string;
  scheduled_at: string | null;
  quality_status: string;
  content_payload: Record<string, unknown>;
  system_checks: Record<string, unknown>;
  editorial_checks: Record<string, unknown>;
  fact_bindings: Binding[];
};
export type Response = {
  response_schema_version: number;
  data: {
    post: Post;
    plan: { status: string; progress: Record<string, number> } | null;
    replayed: boolean;
    revision: number;
    status: string;
    approval_invalidated: boolean;
    released_fact_public_ids: string[];
    replaced_fact_public_ids: string[];
  };
};
export type Binding = {
  position: number;
  fact_public_id: string;
  fact_role: string;
  rendered_text: string;
  source_snapshot?: unknown;
};
export const rpc = (f: Fixture, expression: string, actor = f.owner, client?: string): Response =>
  triviaRpc(f, expression, actor, client) as unknown as Response;
export function state(f: Fixture): string {
  return digest({
    trivia: triviaState(f),
    postWrites: row(`select
      (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.content_plans x where workspace_id=w.id) plans,
      (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.content_plan_items x where workspace_id=w.id) items,
      (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from internal.content_plan_item_events x where workspace_id=w.id) events,
      (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from internal.post_write_history x where workspace_id=w.id) post_history
      from public.workspaces w where public_id='${f.workspace}'`),
  });
}
export function cleanup(f: Fixture): void {
  sql(
    `delete from internal.post_write_history where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
  );
  triviaCleanup(f);
}
export const critical = [
  'meaning_preserved',
  'source_supported',
  'time_context_valid',
  'safety_appropriate',
  'caption_no_new_claim',
  'substantial_copying_absent',
];
export const noncritical = [
  'hook_honest',
  'collection_coherent',
  'fact_atomic',
  'surprise_substantive',
  'variety_sufficient',
  'english_global_clear',
  'number_context_clear',
  'cta_goal_aligned',
  'caption_supportive',
  'hashtags_relevant',
  'visual_rhythm_clear',
  'format_conformant',
];
export function editorial(): Record<string, unknown> {
  return {
    rubric_version: 1,
    overall_status: 'pass',
    criteria: [...critical, ...noncritical].map((id) => ({
      id: `trivia.${id}`,
      severity: critical.includes(id) ? 'critical' : 'noncritical',
      status: 'pass',
      note: 'Fixture evidence reviewed.',
      evidence_paths: ['content_payload.body'],
    })),
    risk_flags: [],
  };
}
export function bindings(f: Fixture, count = 5): { token: string; bindings: Binding[] } {
  const token = randomUUID();
  const result = triviaRpc(
    f,
    reserve(
      f,
      Array.from({ length: count }, (_, i) => factInput(candidate(i + 1), i + 1)),
      randomUUID(),
      token,
    ),
  );
  return {
    token,
    bindings: reserved(result).map((fact, i) => ({
      position: i + 1,
      fact_public_id: fact.fact_public_id,
      fact_role: 'general',
      rendered_text: fact.canonical_claim,
    })),
  };
}
export function content(b: Binding[], style = 'plain_lines'): Record<string, unknown> {
  const hook = 'Did you know?';
  const cta = 'Share this with a curious friend.';
  return {
    schema_version: 1,
    hook,
    body: {
      subject: 'Ephemeral test traits',
      facts: b.map((f) => ({ position: f.position, text: f.rendered_text })),
    },
    cta,
    canva_copy: [
      hook,
      ...b.map((f) => `${style === 'numbered' ? `${f.position}. ` : ''}${f.rendered_text}`),
      cta,
    ].join('\n\n'),
    caption: 'Some surprising fixture traits.',
    hashtags: ['#Trivia'],
    render_style: style,
    text_metrics: {},
  };
}
export function generation(
  f: Fixture,
  count: number,
  profile = 'fast_trivia',
): Record<string, unknown> {
  const ctx = row<{
    c: Record<string, unknown>;
    id: string;
    t: string;
    markets: string[];
  }>(`select n.config c,n.public_id id,internal.iso_timestamp_v1(n.updated_at) t,p.target_markets markets
    from public.page_niche_configs n join public.pages p on p.id=n.page_id where p.public_id='${f.page}'`);
  return {
    config_schema_version: 1,
    fact_count: ctx.c.fact_count,
    fact_count_applied: count,
    fact_count_override: false,
    text_budget: ctx.c.text_budget,
    fact_reuse_scope: ctx.c.fact_reuse_scope,
    profile_key: profile,
    render_style: ctx.c.render_style,
    target_markets: ctx.markets,
    locale: 'en-US',
    schema_version: 1,
    module_version: 1,
    content_schema_version: 1,
    renderer_version: 1,
    quality_gate_version: 1,
    editorial_rubric_version: 1,
    source_policy_version: 1,
    dedup_contract_version: 1,
    config_public_id: ctx.id,
    config_updated_at: ctx.t,
    line_width_chars: 34,
    target_video_seconds: 13,
    override_reason: null,
  };
}
export function request(f: Fixture, count = 5) {
  const b = bindings(f, count);
  return {
    ...b,
    content: content(b.bindings),
    generation: generation(f, count),
    editorial: editorial(),
    key: randomUUID(),
    plan: null as unknown,
    schedule: null as string | null,
    format: 'single_subject_fast',
    topic: 'animals',
    goal: 'share',
    configTime: f.configTime,
  };
}
export type Request = ReturnType<typeof request>;
export function save(f: Fixture, r: Request): string {
  return `api.save_post(1,'${f.workspace}','${r.key}','${f.page}','trivia','${r.token}',${quote(r.configTime)},${r.plan ? json(r.plan) : 'null'},${r.schedule ? quote(r.schedule) : 'null'},
    1,${quote(r.format)},${quote(r.topic)},${quote(r.goal)},${json(r.content)},${json(r.generation)},${json(r.bindings)},${json(r.editorial)})`;
}
export function revise(
  f: Fixture,
  p: Post,
  r: Request,
  key = randomUUID(),
  token: string | null = null,
): string {
  return `api.revise_post(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'${p.content_hash}',${token ? quote(token) : 'null'},1,
    ${quote(r.format)},${quote(r.topic)},${quote(r.goal)},${json(r.content)},${json(r.generation)},${json(r.bindings)},${json(r.editorial)},'Improve this draft.')`;
}
export function reschedule(f: Fixture, p: Post, time: string | null, key = randomUUID()): string {
  return `api.reschedule_post(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},${time ? quote(time) : 'null'},'Move the planned time.')`;
}
export function get(f: Fixture, id: string): Post {
  return rpc(f, `api.get_post(1,'${f.workspace}','${id}')`).data.post;
}
export function setReady(f: Fixture, p: Post): Post {
  // 5.7 public lifecycle replaces the earlier administrative ready fixture.
  rpc(
    f,
    `api.approve_post(1,'${f.workspace}','${randomUUID()}','${p.post_public_id}',${p.revision},'${p.content_hash}',true,
    array['trivia.profile.preferred_band'],'Accept the reviewed preferred profile warning.')`,
  );
  const current = get(f, p.post_public_id);
  return {
    ...current,
    system_checks: row<{ s: Record<string, unknown> }>(
      `select system_checks s from public.posts where public_id='${p.post_public_id}'`,
    ).s,
  };
}
