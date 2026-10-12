import { randomUUID } from 'node:crypto';
import { get, json, quote, row, rpc as postRpc, type Fixture, type Post } from './post-rpc.js';
import type { TriviaResponse } from './trivia-rpc.js';
export * from './post-rpc.js';
export { reverify, source, candidate, factInput } from './trivia-rpc.js';
export type LifecycleResponse = TriviaResponse & {
  data: {
    post_public_id: string;
    status: string;
    revision: number;
    replayed: boolean;
    approval: Record<string, unknown>;
    recomputed_checks: Record<string, unknown>;
    released_fact_public_ids: string[];
    published_fact_public_ids: string[];
    plan_item: { plan_item_public_id: string; replacement_eligible: boolean } | null;
    published_at: string;
    archived_at: string;
  };
};
export const lifecycleRpc = (f: Fixture, expression: string, actor = f.owner, client?: string) =>
  postRpc(f, expression, actor, client) as unknown as LifecycleResponse;
export function approve(
  f: Fixture,
  p: Post,
  key = randomUUID(),
  ids = ['trivia.profile.preferred_band'],
  reason: string | null = ids.length ? 'Accept the reviewed preference warnings.' : null,
  explicit = 'true',
) {
  return `api.approve_post(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'${p.content_hash}',${explicit},array[${ids.map(quote).join(',')}]::text[],${reason === null ? 'null' : quote(reason)})`;
}
export function revoke(f: Fixture, p: Post, key = randomUUID(), explicit = 'true') {
  return `api.revoke_post_approval(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'${p.content_hash}','Withdraw my approval.',${explicit})`;
}
export function discard(f: Fixture, p: Post, key = randomUUID(), explicit = 'true') {
  return `api.discard_post(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'Abandon this content.',${explicit})`;
}
export function publish(
  f: Fixture,
  p: Post,
  key = randomUUID(),
  explicit = 'true',
  at = '2026-10-12T01:00:00Z',
  platform: string | null = null,
  url: string | null = 'https://example.test/manual-post',
) {
  return `api.mark_post_posted(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'${p.content_hash}',${quote(at)},${platform === null ? 'null' : quote(platform)},${url === null ? 'null' : quote(url)},${explicit})`;
}
export function archive(f: Fixture, p: Post, key = randomUUID(), explicit = 'true') {
  return `api.archive_post(1,'${f.workspace}','${key}','${p.post_public_id}',${p.revision},'Archive this published content.',${explicit})`;
}
export function ready(f: Fixture, p: Post): Post {
  lifecycleRpc(f, approve(f, p));
  return get(f, p.post_public_id);
}
export function posted(f: Fixture, p: Post): Post {
  lifecycleRpc(f, publish(f, p));
  return get(f, p.post_public_id);
}
export function evidence(p: Post): Record<string, unknown> {
  return row(`select system_checks,editorial_checks,approval_snapshot,quality_status,ready_at,
    published_at,platform_post_id,published_url,scheduled_at,content_hash,content_payload,generation_snapshot
    from public.posts where public_id='${p.post_public_id}'`);
}
export function usages(p: Post): Record<string, unknown> {
  return row(`select coalesce(jsonb_agg(to_jsonb(j) order by j.id),'[]') junctions
    from public.trivia_post_facts j where j.post_id=(select id from public.posts where public_id='${p.post_public_id}')`);
}
export function corruptEvidence(p: Post, system: unknown, editorial: unknown): string {
  return `begin; alter table public.posts disable trigger posts_validate;
    update public.posts set system_checks=${json(system)},editorial_checks=${json(editorial)} where public_id='${p.post_public_id}';
    alter table public.posts enable trigger posts_validate; commit;`;
}
export function configure(f: Fixture, patch: Record<string, unknown>): void {
  const context = row<{
    p: string;
    c: string;
    config: Record<string, unknown>;
  }>(`select internal.iso_timestamp_v1(p.updated_at) p,
    internal.iso_timestamp_v1(c.updated_at) c,c.config from public.pages p join public.page_niche_configs c on c.page_id=p.id where p.public_id='${f.page}'`);
  postRpc(
    f,
    `api.update_page(1,'${f.workspace}','${randomUUID()}','${f.page}',${quote(context.p)},null,${json(
      {
        niche_key: 'trivia',
        expected_config_updated_at: context.c,
        config_schema_version: 1,
        config: { ...context.config, ...patch },
        is_enabled: true,
        is_default: true,
      },
    )})`,
  );
  f.configTime = row<{ t: string }>(
    `select internal.iso_timestamp_v1(updated_at) t from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`,
  ).t;
}
