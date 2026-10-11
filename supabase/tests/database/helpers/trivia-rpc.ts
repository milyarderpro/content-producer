import { randomUUID } from 'node:crypto';

import {
  callerStatement,
  createFixture,
  createPlan,
  digest,
  insertPost,
  json,
  quote,
  row,
  session,
  sql,
  waitForSession,
  type Fixture,
} from './plan-lifecycle.js';

export { callerStatement, digest, json, quote, row, session, sql, waitForSession };
export type TriviaResponse = { response_schema_version: number; data: Record<string, unknown> };
export type TriviaFixture = Fixture & { configTime: string };
export function fixture(): TriviaFixture {
  const f = createFixture();
  return {
    ...f,
    configTime: row<{ t: string }>(
      `select internal.iso_timestamp_v1(n.updated_at) t from public.page_niche_configs n join public.pages p on p.id=n.page_id where p.public_id='${f.page}'`,
    ).t,
  };
}
export function cleanup(f: TriviaFixture): void {
  sql(`begin;
    delete from internal.trivia_reservation_sets where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from internal.content_plan_item_events where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.trivia_post_facts where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.post_metrics where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.posts where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.trivia_facts where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.content_plan_items where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.content_plans where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.page_niche_configs where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from public.pages where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where owner_user_id='${f.owner}');
    delete from internal.rate_limit_buckets where actor_user_id in ('${f.owner}','${f.other}');
    delete from public.workspaces where owner_user_id='${f.owner}';
    delete from auth.users where id in ('${f.owner}','${f.other}'); commit;`);
}
export function rpc(
  f: TriviaFixture,
  expression: string,
  actor = f.owner,
  client?: string,
): TriviaResponse {
  const output = sql(`begin; ${callerStatement(actor, expression, client)} commit;`);
  const line = output.split('\n').find((line) => line.startsWith('{"__rpc_result":'));
  if (!line) throw new Error('LOCAL_TEST_RESPONSE_MISSING');
  return (JSON.parse(line) as { __rpc_result: TriviaResponse }).__rpc_result;
}
export function source(tier = 'A', group = 'authority'): Record<string, unknown> {
  return {
    schema_version: 1,
    url: `https://example.test/${group}`,
    canonical_url: `https://example.test/${group}`,
    title: 'Ephemeral researched fixture',
    publisher: 'Fixture authority',
    tier,
    source_type: tier === 'A' ? 'official' : tier === 'B' ? 'museum' : 'other',
    accessed_at: '2026-10-11T00:00:00Z',
    published_at: null,
    updated_at: null,
    as_of: null,
    language: 'en',
    supports: 'Supports the complete test proposition.',
    independence_group: group,
  };
}
export function candidate(n = 3): Record<string, unknown> {
  const key = randomUUID().replaceAll('-', '');
  return {
    candidate_key: key,
    claim_text: key,
    subject_key: key,
    relation_key: 'has_count',
    object_key: String(n),
    numbers: [{ value: String(n), unit: 'count', role: 'count' }],
    qualifiers: { negated: false, comparison_direction: 'none' },
    topic_key: 'animals',
    normalization_version: 1,
    ontology_version: 1,
  };
}
export function factInput(c = candidate(), position = 1): Record<string, unknown> {
  return {
    position,
    candidate: c,
    dedup_reviews: [],
    sources: [source()],
    freshness_class: 'stable',
    as_of_date: null,
    requested_expires_at: '2026-12-11T00:00:00Z',
    risk_class: 'standard',
    verification_note: 'Explicit verification rationale.',
  };
}
export function reserve(
  f: TriviaFixture,
  facts: Record<string, unknown>[] = [factInput()],
  key = randomUUID(),
  token = randomUUID(),
  time = f.configTime,
  scope = 'workspace_unique',
  ttl = 30,
): string {
  return `api.trivia_register_and_reserve_facts(1,'${f.workspace}','${key}','${f.page}','${token}',${quote(time)},${quote(scope)},${ttl},${json(facts)})`;
}
export function release(
  f: TriviaFixture,
  token: string,
  key = randomUUID(),
  reason = 'Abandon this attempt.',
): string {
  return `api.trivia_release_facts(1,'${f.workspace}','${key}','${f.page}','${token}',${quote(reason)})`;
}
export type ReservedFact = {
  fact_public_id: string;
  canonical_action: string;
  canonical_claim: string;
  expires_at: string;
};
export function reserved(r: TriviaResponse): ReservedFact[] {
  return r.data.facts as ReservedFact[];
}
export function time(fact: string): string {
  return row<{ t: string }>(
    `select internal.iso_timestamp_v1(updated_at) t from public.trivia_facts where public_id='${fact}'`,
  ).t;
}
export function reverify(
  f: TriviaFixture,
  fact: string,
  claim: string,
  expected = time(fact),
  key = randomUUID(),
  sources = [source('A', 'fresh')],
): string {
  return `api.trivia_reverify_fact(1,'${f.workspace}','${key}','${fact}',${quote(expected)},${quote(claim)},${json(sources)},'stable',null,'2027-01-11T00:00:00Z','standard','Confirmed unchanged meaning.')`;
}
export function correct(
  f: TriviaFixture,
  fact: string,
  successor: Record<string, unknown> | null = null,
  expected = time(fact),
  key = randomUUID(),
  explicit = 'true',
): string {
  const value = successor ? { ...successor } : null;
  if (value) delete value.position;
  return `api.trivia_correct_fact(1,'${f.workspace}','${key}','${fact}',${quote(expected)},'${value ? 'supersede' : 'invalidate'}','Evidence requires correction.',${value ? json(value) : 'null'},${explicit})`;
}
export function replayDigest(r: TriviaResponse): string {
  return digest({ ...r, data: { ...r.data, replayed: false } });
}
export function state(f: TriviaFixture): string {
  return digest(
    row(`select
    (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.trivia_facts x where workspace_id=w.id) facts,
    (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.posts x where workspace_id=w.id) posts,
    (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from public.trivia_post_facts x where workspace_id=w.id) junctions,
    (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from internal.trivia_reservation_sets x where workspace_id=w.id) history,
    (select coalesce(jsonb_agg(to_jsonb(x) order by id),'[]') from internal.operation_ledger x where workspace_id=w.id) ledger
    from public.workspaces w where public_id='${f.workspace}'`),
  );
}
export function expire(fact: string): void {
  sql(`update public.trivia_facts set reserved_at=now()-interval '31 minutes',reserved_until=now()-interval '1 minute',
    reservation_context=jsonb_set(jsonb_set(reservation_context,'{reserved_at}',to_jsonb(internal.iso_timestamp_v1(now()-interval '31 minutes'))),
      '{reserved_until}',to_jsonb(internal.iso_timestamp_v1(now()-interval '1 minute'))) where public_id='${fact}';`);
}
export function setReuse(f: TriviaFixture, scope: string): TriviaFixture {
  sql(`update public.page_niche_configs set config=jsonb_set(config,'{fact_reuse_scope}',${quote(JSON.stringify(scope))}::jsonb)
    where page_id=(select id from public.pages where public_id='${f.page}');`);
  return {
    ...f,
    configTime: row<{ t: string }>(
      `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
    ).t,
  };
}
export function secondPage(f: TriviaFixture): TriviaFixture {
  const config = row<{ c: unknown }>('select internal.default_trivia_config_v1() c').c;
  const r = rpc(
    f,
    `api.create_page(1,'${f.workspace}','${randomUUID()}','Other Page','p55-${randomUUID().slice(0, 12)}','UTC',array['US'],'trivia',1,${json(config)},true)`,
  );
  const page = (r.data.page as { page_public_id: string }).page_public_id;
  return {
    ...f,
    page,
    configTime: row<{ t: string }>(
      `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${page}')`,
    ).t,
  };
}
// Later-phase statuses are controlled fixtures, not public save/approve/publish evidence.
export function postFixture(f: TriviaFixture, fact: string, status = 'draft'): string {
  const plan = createPlan(f, 1);
  const post = insertPost(plan.data.items[0]!.plan_item_public_id, status);
  const published = status === 'posted' || status === 'archived';
  sql(`insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,position,rendered_text,allocation_state,published_at,
    claim_hash_snapshot,source_snapshot,verified_at_snapshot)
    select p.workspace_id,p.page_id,p.id,f.id,1,'Fixture factual text.','${published ? 'published' : 'allocated'}',${published ? 'now()' : 'null'},f.claim_hash,
    jsonb_build_object('schema_version',1,'canonical_claim',f.claim_text,'normalized_claim',f.normalized_claim,'normalization_version',f.normalization_version,
      'claim_hash',f.claim_hash,'subject_key',f.subject_key,'relation_key',f.relation_key,'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers,
      'ontology_version',f.ontology_version,'structured_key',f.structured_key,'structured_hash',f.structured_hash,'structured_match_eligible',f.structured_match_eligible,
      'topic_key',f.topic_key,'risk_class',f.risk_class,'source_schema_version',1,'sources',f.source_data,'verification_status',f.verification_status,
      'verified_at',internal.iso_timestamp_v1(f.verified_at),'as_of_date',f.as_of_date,'expires_at',internal.iso_timestamp_v1(f.expires_at),'dedup_review_schema_version',1),f.verified_at
    from public.posts p join public.trivia_facts f on f.workspace_id=p.workspace_id where p.public_id='${post}' and f.public_id='${fact}';`);
  return post;
}
