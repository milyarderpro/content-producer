import { randomUUID } from 'node:crypto';
import * as ep from './editorial-post.js';
import type { TriviaFixture } from './trivia-rpc.js';
import type { ClaimedItem } from './plan-lifecycle.js';
export type Item = {
  plan_item_public_id: string;
  position: number;
  status: string;
  format_key: string | null;
  topic_key: string | null;
  interaction_goal: string | null;
  scheduled_at: string | null;
  item_config: Record<string, unknown>;
  active_post_public_id: string | null;
};
export type PlanRead = {
  plan: {
    plan_public_id: string;
    requested_count: number;
    status: string;
    progress: Record<string, number>;
  };
  items: Item[];
  page_review: { requires_review: boolean; completed_historical_count: number };
};
export type Generation = ep.Context & {
  generation_rules: ep.Context['generation_rules'] & {
    profile_key: string | null;
    fact_count: Record<string, unknown>;
  };
  plan_context: {
    requires_review: boolean;
    completed_historical: boolean;
    intent_goal: string | null;
    item_config: Record<string, unknown>;
  };
};
export function create(
  f: TriviaFixture,
  count = 2,
  patches: Array<Record<string, unknown>> = [],
  key = randomUUID(),
): string {
  const items = Array.from({ length: count }, (_, i) => ({
    position: i + 1,
    scheduled_at: null,
    topic_key: 'nature_science',
    format_key: null,
    interaction_goal: null,
    item_config: {},
    ...patches[i],
  }));
  return `api.create_content_plan(1,'${f.workspace}','${key}','${f.page}','trivia',2,${ep.json(items)},'Fixture batch: preserve the theme; draft count differs from fact count.',null)`;
}
export function read(f: TriviaFixture, id: string): PlanRead {
  return ep.rpc(f, `api.get_content_plan(1,'${f.workspace}','${id}')`).data as unknown as PlanRead;
}
export function claim(f: TriviaFixture, id: string, key = randomUUID()): ClaimedItem {
  return (
    ep.rpc(f, `api.claim_content_plan_items(1,'${f.workspace}','${key}','${id}',1,30)`).data
      .claimed_items as ClaimedItem[]
  )[0]!;
}
export function context(f: TriviaFixture, item: string, format = 'themed_curiosity'): Generation {
  return ep.rpc(
    f,
    `api.get_page_generation_context(1,'${f.workspace}','${f.page}','trivia',12,null,${ep.quote(format)},null,null,'${item}')`,
  ).data as unknown as Generation;
}
export function input(
  f: TriviaFixture,
  c: ClaimedItem,
  n = 12,
  format = 'themed_curiosity',
): ep.Input {
  const v = ep.input(f, n, format);
  const g = context(f, c.item.plan_item_public_id, format);
  v.time = g.context_version.config_updated_at;
  v.context!.effective_rules_hash = g.editorial_context.effective_rules_hash;
  v.context!.profile_key = g.generation_rules.profile_key;
  return v;
}
export function save(
  f: TriviaFixture,
  v: ep.Input,
  c: ClaimedItem,
  schedule: string | null = null,
): string {
  return (
    ep.save(f, v).slice(0, -1) +
    `,p_plan_item=>${ep.json({ plan_item_public_id: c.item.plan_item_public_id, claim_token: c.claim_token })}` +
    (schedule === null ? '' : `,p_scheduled_at=>${ep.quote(schedule)}::timestamptz`) +
    ')'
  );
}
export function planId(response: ReturnType<typeof ep.rpc>): string {
  return (response.data.plan as { plan_public_id: string }).plan_public_id;
}

// Native v2 identities must clear every legacy envelope default and include evidence.
export function seedFacts(f: TriviaFixture, claims: string[]): void {
  ep.sql(`with inserted as (
  insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,has_v1_envelope,
   subject_key,relation_key,object_key,numbers,qualifiers,ontology_version,structured_key,structured_hash,
   topic_key,dedup_review_snapshot,source_data,freshness_class,risk_class)
  select w.id,c.value,'',repeat('0',64),false,null,null,null,null,null,null,null,null,null,null,null,null,null
  from public.workspaces w cross join jsonb_array_elements_text(${ep.json(claims)}) c
  where w.public_id='${f.workspace}' returning workspace_id,id
 ) insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
 select workspace_id,id,'https://example.org/fixture/plan-dedup' from inserted;`);
}
