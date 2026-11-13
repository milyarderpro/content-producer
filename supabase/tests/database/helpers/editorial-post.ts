import { randomUUID } from 'node:crypto';
import { fixture, rpc, sql, json, quote, row, type TriviaFixture } from './trivia-rpc.js';
import { cleanup } from './trivia-v2.js';
export { rpc, sql, json, quote, row, cleanup };
export type Ref = { public_id: string; version: number; hash: string };
export type Definition = { key: string; reference: Ref; payload: Record<string, unknown> };
export type EditorialContext = { editorial_profile_ref: Ref; format_ref: Ref; topic_ref: Ref;
  architecture: string; profile_key: string | null; effective_rules_hash: string; cta_actions?: unknown };
export type Content = { schema_version: number; hook: string; body: { facts: Array<{ position: number; text: string }> };
  cta: string; canva_copy: string; caption: string; hashtags: string[]; render_style: string;
  text_metrics: Record<string, unknown>; cta_placement?: { kind: string; position?: number } };
export type Fact = { position: number; candidate_key: string; claim_text: string; source_url: string;
  dedup: { complete: boolean; decision: string; fact_public_id: string | null;
    reviews: Array<{ fact_public_id: string; decision: string }> } };
export type Input = { key: string; config: string; time: string; catalog: string; format: string; topic: string;
  goal?: string | null; context?: EditorialContext | null; facts: Fact[]; content: Content;
  editorial: { meaning_preserved: string; caption_no_new_claim: string; no_known_substantive_issue: string } };
export type Snapshot = { schema_version: number; config_schema_version: number; config_public_id: string;
  config_updated_at: string; profile_key: string | null; editorial_context: EditorialContext;
  effective_rules_hash: string; effective_rules: Record<string, unknown>;
  editorial_definitions: Record<'profile' | 'format' | 'topic', { key: string; reference: Ref }>;
  cta: { text: string; placement: { kind: string; position?: number }; actions: unknown } };
export type Post = { post_public_id: string; page_public_id: string; status: string; revision: number;
  content_hash: string; interaction_goal: string | null; format_key: string; topic_key: string;
  quality_status: string; content_payload: Content; generation_snapshot: Snapshot;
  fact_bindings: Array<{ fact_public_id: string; position: number; rendered_text: string;
    source_snapshot: { canonical_claim: string; source_url: string } }> };
export type Context = { config_public_id: string; config: Record<string, unknown>;
  generation_rules: { format_reference: Ref }; editorial_context: { effective_rules_hash: string; editorial_profile_ref: Ref };
  context_version: { page_updated_at: string; config_updated_at: string } };
export function privateCall(f: TriviaFixture, expression: string): unknown {
  return JSON.parse(sql(`begin; select set_config('request.jwt.claims',${quote(JSON.stringify({ sub: f.owner, role: 'authenticated', client_id: 'editorial-post-fixture' }))},true);
    set local role content_producer_api_owner; select jsonb_build_object('value',${expression}); commit;`)
    .split('\n').find(l => l.startsWith('{"value":'))!).value as unknown;
}
export function definition(f: TriviaFixture, kind: string, key: string, version = 1): Definition {
  return (rpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}',${json({ kind, key, version })},true)`).data.definitions as Definition[])[0]!;
}
export function context(f: TriviaFixture, format = 'themed_curiosity'): Context {
  return rpc(f, `api.get_page_generation_context(1,'${f.workspace}','${f.page}','trivia',12,null,${quote(format)},null,null)`).data as unknown as Context;
}
export function editorialFixture(profile = 'dyk'): TriviaFixture {
  const f = fixture();
  try {
    privateCall(f, `internal.editorial_seed_profiles_v2((select id from public.workspaces where public_id='${f.workspace}'))`);
    const ref = definition(f, 'profile', profile).reference;
    const r = rpc(f, `api.create_page(1,'${f.workspace}','${randomUUID()}','Editorial post fixture','post-${randomUUID()}',
      'UTC',array['US','GB','CA','AU'],'trivia',2,${json({ config_schema_version: 2, editorial_profile_ref: ref })},true)`);
    f.page = (r.data.page as { page_public_id: string }).page_public_id;
    f.configTime = context(f).context_version.config_updated_at;
    return f;
  } catch (error) { cleanup(f); throw error; }
}
export function assemble(content: Content): void {
  const parts = [content.hook];
  const after = content.cta_placement?.kind === 'after_fact' ? content.cta_placement.position : content.body.facts.length;
  content.body.facts.forEach((fact, i) => {
    parts.push((content.render_style === 'numbered' ? `${i + 1}. ` : '') + fact.text);
    if (i + 1 === after) parts.push(content.cta);
  });
  content.canva_copy = parts.join('\n\n');
  content.text_metrics = {};
}
// Synthetic tokens deliberately avoid research claims and cross-fixture similarity.
export function input(f: TriviaFixture, n = 12, format = 'themed_curiosity', topic = 'nature_science'): Input {
  const c = context(f, format);
  const facts: Fact[] = Array.from({ length: n }, (_, i) => ({ position: i + 1,
    candidate_key: `fixture_${i + 1}`, claim_text: Array.from({ length: 4 }, () => randomUUID().slice(0, 8)).join(' ') + '.',
    source_url: `https://example.org/fixture/${randomUUID()}`,
    dedup: { complete: true, decision: 'distinct', fact_public_id: null, reviews: [] } }));
  const content: Content = { schema_version: 2, hook: 'Fixture notes', body: { facts: facts.map(x => ({ position: x.position, text: x.claim_text })) },
    cta: 'Like the video, save it, tag a friend and follow for more.', canva_copy: '', caption: 'Fixture only.', hashtags: [], render_style: 'plain_lines', text_metrics: {} };
  assemble(content);
  const v: Input = { key: randomUUID(), config: c.config_public_id, time: c.context_version.config_updated_at,
    catalog: '', format, topic, facts, content,
    context: { editorial_profile_ref: c.editorial_context.editorial_profile_ref, format_ref: c.generation_rules.format_reference,
      topic_ref: definition(f, 'topic', topic).reference, architecture: 'themed', profile_key: null,
      effective_rules_hash: c.editorial_context.effective_rules_hash },
    editorial: { meaning_preserved: 'pass', caption_no_new_claim: 'pass', no_known_substantive_issue: 'pass' } };
  review(f, v);
  return v;
}
export function review(f: TriviaFixture, v: Input): void {
  let catalog: string | undefined;
  for (let offset = 0; offset < v.facts.length; offset += 9) {
    const batch = v.facts.slice(offset, offset + 9);
    const read = rpc(f, `api.trivia_find_similar_facts_v2(2,'${f.workspace}','${f.page}',${json(batch.map(x => ({ candidate_key: x.candidate_key, claim_text: x.claim_text })))})`);
    if (catalog !== undefined && catalog !== read.data.catalog_version) throw new Error('FIXTURE_CATALOG_CHANGED_BETWEEN_READS');
    catalog = read.data.catalog_version as string;
    (read.data.candidates as Array<{ complete: boolean; matches: Array<{ fact_public_id: string; claim_text: string }> }>).forEach((c, i) => {
      if (!c.complete) throw new Error('FIXTURE_DEDUP_INCOMPLETE');
      const same = c.matches.find(x => x.claim_text === batch[i]!.claim_text);
      batch[i]!.dedup = { complete: true, decision: same ? 'same' : 'distinct', fact_public_id: same?.fact_public_id ?? null,
        reviews: c.matches.map(x => ({ fact_public_id: x.fact_public_id, decision: x === same ? 'same' : 'distinct' })) };
    });
  }
  v.catalog = catalog ?? '0';
}
function common(v: Input): string {
  return `p_config_public_id=>${quote(v.config)},p_expected_config_updated_at=>${quote(v.time)},
    p_expected_catalog_version=>${quote(v.catalog)},p_content_schema_version=>2,p_format_key=>${quote(v.format)},p_topic_key=>${quote(v.topic)},
    p_facts=>${json(v.facts)},p_content_payload=>${json(v.content)},p_editorial_checks=>${json(v.editorial)}
    ${v.goal === undefined ? '' : `,p_interaction_goal=>${v.goal === null ? 'null' : quote(v.goal)}`}
    ${v.context === undefined ? '' : `,p_editorial_context=>${json(v.context)}`}`;
}
export function save(f: TriviaFixture, v: Input): string {
  return `api.save_post_v2(p_request_schema_version=>2,p_workspace_public_id=>'${f.workspace}',p_operation_key=>'${v.key}',
    p_page_public_id=>'${f.page}',p_niche_key=>'trivia',${common(v)})`;
}
export function revise(f: TriviaFixture, v: Input, p: Pick<Post, 'post_public_id' | 'revision' | 'content_hash'>): string {
  return `api.revise_post_v2(p_request_schema_version=>2,p_workspace_public_id=>'${f.workspace}',p_operation_key=>'${v.key}',
    p_post_public_id=>'${p.post_public_id}',p_expected_revision=>${p.revision},p_expected_content_hash=>'${p.content_hash}',
    p_revision_reason=>'Review editorial fixture.',${common(v)})`;
}
export function get(f: TriviaFixture, id: string): Post {
  return rpc(f, `api.get_post(1,'${f.workspace}','${id}',true,true,true)`).data.post as unknown as Post;
}
export function saved(f: TriviaFixture, v: Input): Post {
  const result = rpc(f, save(f, v));
  return get(f, (result.data.post as { post_public_id: string }).post_public_id);
}
export function updateConfig(f: TriviaFixture, config: unknown): void {
  const c = context(f);
  rpc(f, `api.update_page(1,'${f.workspace}','${randomUUID()}','${f.page}',${quote(c.context_version.page_updated_at)}::timestamptz,null,
    ${json({ niche_key: 'trivia', expected_config_updated_at: c.context_version.config_updated_at, config_schema_version: 2, config, is_enabled: true, is_default: true })})`);
}
export function retire(f: TriviaFixture, ref: Ref): void {
  const c = rpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}')`);
  rpc(f, `api.update_trivia_editorial_catalog(1,'${f.workspace}','${randomUUID()}',${quote(c.data.editorial_catalog_version as string)},${json({ action: 'retire', reference: ref, reason: 'Fixture retirement.' })})`);
}
export function publishDefinition(f: TriviaFixture, kind: string, key: string, payload: unknown, previous: number | null): Ref {
  const c = rpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}')`);
  return rpc(f, `api.update_trivia_editorial_catalog(1,'${f.workspace}','${randomUUID()}',${quote(c.data.editorial_catalog_version as string)},
    ${json({ action: 'publish', kind, key, expected_previous_version: previous, payload })})`).data.reference as Ref;
}
