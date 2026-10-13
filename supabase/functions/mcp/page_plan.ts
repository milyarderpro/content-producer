// Phase 6.4: thin Page/content-plan facade; every mutation remains in Phase 5 RPC.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';

const uuid = z.string().uuid();
const version = z.literal(1);
const timestamp = z.string().datetime({ offset: true });
const key = z.string().regex(/^[a-z][a-z0-9_]{1,49}$/);
const slug = z.string().regex(/^[a-z][a-z0-9-]{1,79}$/);
const country = z.string().regex(/^[A-Z]{2}$/);
const countries = z.array(country).min(1).max(8);
const timezone = z.string().min(1).max(100);
const cursor = z.string().min(1).max(512);
const common = { request_schema_version: version, workspace_public_id: uuid };
const write = { ...common, operation_key: uuid };
const name = z.string().min(1).max(120);
const goals = z.enum(['share', 'save', 'comment', 'follow']);
const planStatus = z.enum([
  'pending', 'in_progress', 'partially_completed', 'completed', 'failed', 'cancelled',
]);
const itemStatus = z.enum(['pending', 'in_progress', 'completed', 'failed', 'cancelled']);

// Closed TriviaConfigV1 shape. The authoritative value constraints and
// supported keys also remain enforced by internal.is_valid_trivia_config_v1.
const formats = [
  'single_subject_fast', 'themed_utility', 'emotional_animal_collection',
  'comparison', 'myth_vs_fact',
] as const;
const topics = [
  'animals', 'pet_safety', 'food_science', 'food_storage_home',
  'practical_utility', 'human_body', 'nature_science', 'geography',
  'history_origins', 'inventions_everyday', 'general_trivia',
] as const;
const weights = z.number().int().min(0).max(100);
const profile = z.strictObject({
  fact_count_min: z.number().int().min(1).max(9),
  fact_count_max: z.number().int().min(1).max(9),
  words_per_fact_min: z.number().int().min(1).max(18),
  words_per_fact_max: z.number().int().min(1).max(18),
  total_words_min: z.number().int().min(1).max(500),
  total_words_max: z.number().int().min(1).max(500),
});
const triviaConfig = z.strictObject({
  allowed_formats: z.array(z.enum(formats)).min(1),
  format_weights: z.strictObject({
    single_subject_fast: weights,
    themed_utility: weights,
    emotional_animal_collection: weights,
    comparison: weights,
    myth_vs_fact: weights,
  }),
  allowed_topics: z.array(z.enum(topics)).min(1),
  topic_group_weights: z.strictObject({
    animals_pet_safety: weights,
    human_body_food_myth: weights,
    practical_utility: weights,
    places_geography: weights,
    nature_space: weights,
    history_inventions_people: weights,
  }),
  fact_count: z.discriminatedUnion('mode', [
    z.strictObject({
      mode: z.literal('adaptive'),
      min: z.number().int().min(5).max(9),
      preferred: z.number().int().min(5).max(9),
      max: z.number().int().min(5).max(9),
    }),
    z.strictObject({ mode: z.literal('fixed'), value: z.number().int().min(5).max(9) }),
  ]),
  profiles: z.strictObject({ fast_trivia: profile, practical_utility: profile }),
  fact_reuse_scope: z.enum(['workspace_unique', 'page_unique']),
  render_style: z.enum(['plain_lines', 'numbered']),
  allowed_interaction_goals: z.array(goals).min(1),
  text_budget: z.strictObject({
    hook_max_chars: z.number().int().min(1).max(90),
    fact_max_chars: z.number().int().min(1).max(90),
    facts_total_max_chars: z.number().int().min(1).max(500),
    cta_max_chars: z.number().int().min(1).max(100),
    canva_total_max_chars: z.number().int().min(1).max(600),
  }),
  caption: z.strictObject({ max_chars: z.number().int().min(1).max(500) }),
  hashtags: z.strictObject({
    default_count: z.number().int().min(0).max(5),
    min_count: z.number().int().min(0).max(5),
    max_count: z.number().int().min(0).max(5),
  }),
  style: z.strictObject({
    english_variant: z.literal('en-US'),
    tone: z.literal('conversational_credible'),
    emoji_allowed: z.literal(false),
    regional_slang_allowed: z.literal(false),
  }),
});
const nicheSummary = z.strictObject({
  niche_key: key,
  is_enabled: z.boolean(),
  is_default: z.boolean(),
  config_schema_version: z.number().int().min(1),
  updated_at: timestamp,
});
const pageSummary = z.strictObject({
  page_public_id: uuid,
  name,
  slug,
  timezone,
  target_markets: countries,
  is_active: z.boolean(),
  enabled_niches: z.array(nicheSummary),
  created_at: timestamp,
  updated_at: timestamp,
});
const configSummary = z.strictObject({
  niche_key: z.literal('trivia'),
  config_schema_version: version,
  config: triviaConfig,
  is_enabled: z.boolean(),
  is_default: z.boolean(),
  updated_at: timestamp,
});
const pageInput = z.strictObject({
  ...write,
  name,
  slug,
  timezone,
  target_markets: countries,
  niche_key: z.literal('trivia'),
  config_schema_version: version,
  config: triviaConfig,
  make_default: z.boolean().optional(),
});
const pagePatch = z.strictObject({
  name: name.optional(),
  slug: slug.optional(),
  timezone: timezone.optional(),
  target_markets: countries.optional(),
}).refine(p => Object.keys(p).length > 0, 'page_patch must not be empty');
const configPatch = z.strictObject({
  niche_key: z.literal('trivia'),
  expected_config_updated_at: timestamp,
  config_schema_version: version,
  config: triviaConfig,
  is_enabled: z.boolean(),
  is_default: z.boolean(),
});
const updateInput = z.strictObject({
  ...write,
  page_public_id: uuid,
  expected_page_updated_at: timestamp,
  page_patch: pagePatch.optional(),
  niche_config_patch: configPatch.optional(),
}).refine(p => p.page_patch !== undefined || p.niche_config_patch !== undefined,
  'at least one patch is required');

const planProgress = z.strictObject({
  pending: z.number().int().min(0),
  in_progress: z.number().int().min(0),
  completed: z.number().int().min(0),
  failed: z.number().int().min(0),
  cancelled: z.number().int().min(0),
});
const planSummary = z.strictObject({
  plan_public_id: uuid,
  name: name.nullable(),
  page_public_id: uuid,
  niche_key: key,
  status: planStatus,
  requested_count: z.number().int().min(1).max(100),
  progress: planProgress,
  created_at: timestamp,
  updated_at: timestamp,
});
const itemConfig = z.record(z.string(), z.unknown()).refine(
  value => new TextEncoder().encode(JSON.stringify(value)).length <= 8 * 1024,
  'item_config must be at most 8 KiB',
);
const planItem = z.strictObject({
  plan_item_public_id: uuid,
  plan_public_id: uuid,
  position: z.number().int().min(1).max(100),
  status: itemStatus,
  scheduled_at: timestamp.nullable(),
  topic_key: key.nullable(),
  format_key: key.nullable(),
  interaction_goal: goals.nullable(),
  item_config: itemConfig,
  attempt_count: z.number().int().min(0),
  claim_expires_at: timestamp.nullable(),
  active_post_public_id: uuid.nullable(),
  last_error: z.strictObject({
    code: z.string().min(1).max(80),
    detail: z.string().max(500),
  }).nullable(),
  created_at: timestamp,
  updated_at: timestamp,
});
const planSlot = z.strictObject({
  position: z.number().int().min(1).max(100),
  scheduled_at: timestamp.nullable(),
  topic_key: key.nullable(),
  format_key: key.nullable(),
  interaction_goal: goals.nullable(),
  item_config: itemConfig,
});
const listPlansInput = z.strictObject({
  ...common,
  page_public_id: uuid.optional(),
  niche_key: key.optional(),
  query: name.optional(),
  statuses: z.array(planStatus).min(1).optional(),
  created_from: timestamp.optional(),
  created_to: timestamp.optional(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: cursor.optional(),
});
const createPlanInput = z.strictObject({
  ...write,
  page_public_id: uuid,
  niche_key: key,
  name: name.nullable().optional(),
  config_schema_version: z.number().int().min(1),
  items: z.array(planSlot).min(1).max(100),
  plan_intent: z.string().min(1).max(1000),
}).refine(
  p => p.items.every((item, index) => item.position === index + 1),
  'positions must be unique, ascending, and contiguous from 1',
);
const getPlanInput = z.strictObject({
  ...common,
  plan_public_id: uuid,
  item_statuses: z.array(itemStatus).min(1).optional(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: cursor.optional(),
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const createPageOutput = envelope(z.strictObject({
  page: pageSummary, config: configSummary, replayed: z.boolean(),
}));
const updatePageOutput = envelope(z.strictObject({
  page: pageSummary, config: configSummary.optional(), replayed: z.boolean(),
}));
const listPlansOutput = envelope(z.strictObject({
  items: z.array(planSummary), next_cursor: cursor.nullable(), has_more: z.boolean(),
}));
const createPlanOutput = envelope(z.strictObject({
  plan: planSummary, items: z.array(planItem).min(1).max(100),
  context_version: z.strictObject({ page_updated_at: timestamp, config_updated_at: timestamp }),
  replayed: z.boolean(),
}));
const getPlanOutput = envelope(z.strictObject({
  plan: planSummary, items: z.array(planItem),
  next_cursor: cursor.nullable(), has_more: z.boolean(),
}));

const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const updateAnnotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };
const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
export const PAGE_PLAN_TOOL_NAMES = [
  'create_page', 'update_page', 'list_content_plans', 'create_content_plan', 'get_content_plan',
] as const;

export function registerPagePlanTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool('create_page', {
    title: 'Create a Facebook Page workspace',
    description: 'Use this only when the user asks to create a Page. It atomically creates the Page and its initial enabled niche configuration; it does not create Facebook assets.',
    inputSchema: pageInput, outputSchema: createPageOutput,
    annotations: writeAnnotations, _meta: { securitySchemes },
  }, args => invoke('create_page', scoped, {
    p_request_schema_version: args.request_schema_version,
    p_workspace_public_id: args.workspace_public_id,
    p_operation_key: args.operation_key,
    p_name: args.name,
    p_slug: args.slug,
    p_timezone: args.timezone,
    p_target_markets: args.target_markets,
    p_niche_key: args.niche_key,
    p_config_schema_version: args.config_schema_version,
    p_config: args.config,
    p_make_default: args.make_default ?? true,
  }, createPageOutput));
  server.registerTool('update_page', {
    title: 'Update Page settings',
    description: 'Use this after showing current settings and receiving the requested changes. It replaces only explicitly supplied Page or niche-config fields and rejects stale concurrent edits.',
    inputSchema: updateInput, outputSchema: updatePageOutput,
    annotations: updateAnnotations, _meta: { securitySchemes },
  }, args => invoke('update_page', scoped, {
    p_request_schema_version: args.request_schema_version,
    p_workspace_public_id: args.workspace_public_id,
    p_operation_key: args.operation_key,
    p_page_public_id: args.page_public_id,
    p_expected_page_updated_at: args.expected_page_updated_at,
    ...(args.page_patch === undefined ? {} : { p_page_patch: args.page_patch }),
    ...(args.niche_config_patch === undefined ? {} : { p_niche_config_patch: args.niche_config_patch }),
  }, updatePageOutput));
  server.registerTool('list_content_plans', {
    title: 'List content plans',
    description: 'Use this to find resumable batch or calendar plans by Page, niche, name, or status.',
    inputSchema: listPlansInput, outputSchema: listPlansOutput,
    annotations: readAnnotations, _meta: { securitySchemes },
  }, args => invoke('list_content_plans', scoped, {
    p_request_schema_version: args.request_schema_version,
    p_workspace_public_id: args.workspace_public_id,
    ...(args.page_public_id === undefined ? {} : { p_page_public_id: args.page_public_id }),
    ...(args.niche_key === undefined ? {} : { p_niche_key: args.niche_key }),
    ...(args.query === undefined ? {} : { p_query: args.query }),
    ...(args.statuses === undefined ? {} : { p_statuses: args.statuses }),
    ...(args.created_from === undefined ? {} : { p_created_from: args.created_from }),
    ...(args.created_to === undefined ? {} : { p_created_to: args.created_to }),
    p_limit: args.limit ?? 20,
    ...(args.cursor === undefined ? {} : { p_cursor: args.cursor }),
  }, listPlansOutput));
  server.registerTool('create_content_plan', {
    title: 'Create a content plan',
    description: 'Use this when the user asks for a batch or calendar. It atomically creates one plan and the exact ordered item slots; it does not generate posts.',
    inputSchema: createPlanInput, outputSchema: createPlanOutput,
    annotations: writeAnnotations, _meta: { securitySchemes },
  }, args => invoke('create_content_plan', scoped, {
    p_request_schema_version: args.request_schema_version,
    p_workspace_public_id: args.workspace_public_id,
    p_operation_key: args.operation_key,
    p_page_public_id: args.page_public_id,
    p_niche_key: args.niche_key,
    p_config_schema_version: args.config_schema_version,
    p_items: args.items,
    p_plan_intent: args.plan_intent,
    ...(args.name === undefined ? {} : { p_name: args.name }),
  }, createPlanOutput));
  server.registerTool('get_content_plan', {
    title: 'Get content plan progress',
    description: 'Use this to inspect or resume one plan. It returns progress, bounded item state, active post IDs, and safe failure details without claiming work.',
    inputSchema: getPlanInput, outputSchema: getPlanOutput,
    annotations: readAnnotations, _meta: { securitySchemes },
  }, args => invoke('get_content_plan', scoped, {
    p_request_schema_version: args.request_schema_version,
    p_workspace_public_id: args.workspace_public_id,
    p_plan_public_id: args.plan_public_id,
    ...(args.item_statuses === undefined ? {} : { p_item_statuses: args.item_statuses }),
    p_limit: args.limit ?? 50,
    ...(args.cursor === undefined ? {} : { p_cursor: args.cursor }),
  }, getPlanOutput));
}
