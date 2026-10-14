// Phase 6.9: owner-scoped draft save and read-only post retrieval.
// All reservation, plan-claim, quality, scheduling and ledger rules remain in Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { planSummary } from './page_plan.ts';
import { triviaConfig } from './schemas.ts';

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const key = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const version = z.literal(1);
const status = z.enum(['draft', 'ready', 'posted', 'discarded', 'archived']);
const quality = z.enum(['pending', 'failed', 'passed']);
const format = z.enum([
  'single_subject_fast',
  'themed_utility',
  'emotional_animal_collection',
  'comparison',
  'myth_vs_fact',
]);
const topic = z.enum([
  'animals',
  'pet_safety',
  'food_science',
  'food_storage_home',
  'practical_utility',
  'human_body',
  'nature_science',
  'geography',
  'history_origins',
  'inventions_everyday',
  'general_trivia',
]);
const goal = z.enum(['share', 'save', 'comment', 'follow']);
const cursor = z.string().min(1).max(512);
const common = { request_schema_version: version, workspace_public_id: uuid };
const readAnnotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const writeAnnotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });

// Nested server-calculated evidence remains an opaque bounded JSON object, never
// something the caller may set directly. The public RPC validates its contracts;
// invoke() also enforces 256 KiB response size and forbidden private output keys.
const serverEvidence = z.record(z.string(), z.unknown());
const contentPayload = z.strictObject({
  schema_version: version,
  hook: z.string().min(1).max(120),
  body: z.strictObject({
    subject: z.string().min(1).max(120).optional(),
    facts: z
      .array(
        z.strictObject({
          position: z.number().int().min(1).max(9),
          text: z.string().min(1).max(90),
        }),
      )
      .min(1)
      .max(9),
  }),
  cta: z.string().min(1).max(120),
  canva_copy: z.string().min(1).max(3000),
  caption: z.string().max(500),
  hashtags: z.array(z.string().min(1).max(80)).max(5),
  render_style: z.enum(['plain_lines', 'numbered']),
  text_metrics: serverEvidence,
});
const generationSnapshot = z.strictObject({
  schema_version: version,
  module_version: version,
  config_schema_version: version,
  content_schema_version: version,
  renderer_version: version,
  quality_gate_version: version,
  editorial_rubric_version: version,
  source_policy_version: version,
  dedup_contract_version: version,
  config_public_id: uuid,
  config_updated_at: timestamp,
  fact_count: triviaConfig.shape.fact_count,
  fact_count_applied: z.number().int().min(1).max(9),
  fact_count_override: z.boolean(),
  text_budget: triviaConfig.shape.text_budget,
  fact_reuse_scope: triviaConfig.shape.fact_reuse_scope,
  profile_key: z.enum(['fast_trivia', 'practical_utility']),
  render_style: triviaConfig.shape.render_style,
  target_markets: z
    .array(z.string().regex(/^[A-Z]{2}$/))
    .min(1)
    .max(8),
  locale: z.literal('en-US'),
  line_width_chars: z.literal(34),
  target_video_seconds: z.literal(13),
  override_reason: z.string().min(1).max(500).nullable(),
});
const bindingInput = z.strictObject({
  position: z.number().int().min(1).max(9),
  fact_public_id: uuid,
  fact_role: z.enum([
    'general',
    'myth_reversal',
    'numeric_comparison',
    'emotional',
    'practical',
    'scientific',
    'visual',
  ]),
  rendered_text: z.string().min(1).max(90),
});
const editorialInput = z.strictObject({
  rubric_version: version,
  evaluator_label: z.string().min(1).max(120).optional(),
  overall_status: z.enum(['pass', 'fail', 'needs_review']),
  criteria: z
    .array(
      z.strictObject({
        id: z.string().regex(/^trivia\.[a-z_]+$/),
        severity: z.enum(['critical', 'noncritical']),
        status: z.enum(['pass', 'fail', 'needs_review']),
        note: z.string().min(1).max(500),
        evidence_paths: z.array(z.string().min(1).max(200)).max(20),
      }),
    )
    .min(1)
    .max(30),
  risk_flags: z
    .array(
      z.enum([
        'safety',
        'time_sensitive',
        'source_uncertainty',
        'meaning_uncertainty',
        'copying_risk',
        'caption_claim_risk',
      ]),
    )
    .max(20),
});
const saveInput = z
  .strictObject({
    ...common,
    operation_key: uuid,
    page_public_id: uuid,
    niche_key: z.literal('trivia'),
    reservation_token: uuid,
    expected_config_updated_at: timestamp,
    plan_item: z
      .strictObject({
        plan_item_public_id: uuid,
        claim_token: uuid,
      })
      .nullable()
      .optional(),
    scheduled_at: timestamp.nullable(),
    content_schema_version: version,
    format_key: format,
    topic_key: topic,
    interaction_goal: goal,
    content_payload: contentPayload,
    generation_snapshot: generationSnapshot,
    fact_bindings: z.array(bindingInput).min(1).max(9),
    editorial_checks: editorialInput,
  })
  .superRefine((value, ctx) => {
    const facts = value.content_payload.body.facts;
    if (
      facts.length !== value.fact_bindings.length ||
      facts.some(
        (f, i) =>
          f.position !== i + 1 ||
          value.fact_bindings[i]?.position !== i + 1 ||
          f.text !== value.fact_bindings[i]?.rendered_text,
      ) ||
      new Set(value.fact_bindings.map((b) => b.fact_public_id)).size !== value.fact_bindings.length
    ) {
      ctx.addIssue({
        code: 'custom',
        message: 'Ordered fact bindings must match the rendered body',
      });
    }
  });
const postSummary = z.strictObject({
  post_public_id: uuid,
  page_public_id: uuid,
  niche_key: key,
  status,
  revision: z.number().int().min(1),
  format_key: key,
  topic_key: key,
  interaction_goal: goal,
  scheduled_at: timestamp.nullable(),
  published_at: timestamp.nullable(),
  quality_status: quality,
  hook_preview: z.string().max(120),
  updated_at: timestamp,
});
const listInput = z
  .strictObject({
    ...common,
    page_public_id: uuid.optional(),
    niche_key: key.optional(),
    statuses: z.array(status).min(1).max(5).optional(),
    format_key: key.optional(),
    topic_key: key.optional(),
    scheduled_from: timestamp.optional(),
    scheduled_to: timestamp.optional(),
    created_from: timestamp.optional(),
    created_to: timestamp.optional(),
    query: z.string().trim().min(1).max(120).optional(),
    limit: z.number().int().min(1).max(50).optional(),
    cursor: cursor.optional(),
  })
  .refine(
    (p) =>
      (!p.scheduled_from || !p.scheduled_to || p.scheduled_from <= p.scheduled_to) &&
      (!p.created_from || !p.created_to || p.created_from <= p.created_to),
    'Date range start must not exceed end',
  );
const getInput = z.strictObject({
  ...common,
  post_public_id: uuid,
  include_sources: z.boolean().optional(),
  include_checks: z.boolean().optional(),
  include_latest_metrics: z.boolean().optional(),
});
const bindingOutput = bindingInput.extend({
  allocation_state: z.enum(['allocated', 'published', 'released']),
  source_snapshot: serverEvidence.optional(),
});
const postPackage = z.strictObject({
  post_public_id: uuid,
  page_public_id: uuid,
  niche_key: key,
  status,
  revision: z.number().int().min(1),
  content_hash: z.string().regex(/^[0-9a-f]{64}$/),
  format_key: key,
  topic_key: key,
  interaction_goal: goal,
  scheduled_at: timestamp.nullable(),
  published_at: timestamp.nullable(),
  content_payload: contentPayload,
  system_checks: serverEvidence,
  editorial_checks: serverEvidence,
  quality_status: quality,
  fact_bindings: z.array(bindingOutput).max(200),
  created_at: timestamp,
  updated_at: timestamp,
});
const listOutput = envelope(
  z.strictObject({
    items: z.array(postSummary).max(50),
    next_cursor: cursor.nullable(),
    has_more: z.boolean(),
  }),
);
const getOutput = envelope(
  z.strictObject({
    post: postPackage,
    approval: serverEvidence.nullable(),
    plan_item_public_id: uuid.nullable(),
    current_fact_warnings: z
      .array(
        z.strictObject({
          fact_public_id: uuid,
          code: z.string().min(1).max(80),
          message: z.string().max(500),
        }),
      )
      .max(200),
    latest_metrics: serverEvidence.nullable(),
  }),
);
const saveOutput = envelope(
  z.strictObject({
    post: postPackage,
    plan: planSummary.nullable(),
    replayed: z.boolean(),
  }),
);
export const POST_BASE_TOOL_NAMES = ['save_post', 'list_posts', 'get_post'] as const;

export function registerPostBaseTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'save_post',
    {
      title: 'Save a content draft',
      description:
        'Use after facts are reserved and content has been reviewed. Atomically converts reservations to fact allocations, optionally completes a currently claimed plan item, and creates only a draft (never auto-approved).',
      inputSchema: saveInput,
      outputSchema: saveOutput,
      annotations: writeAnnotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'save_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_page_public_id: args.page_public_id,
          p_niche_key: args.niche_key,
          p_reservation_token: args.reservation_token,
          p_expected_config_updated_at: args.expected_config_updated_at,
          p_plan_item: args.plan_item ?? null,
          p_scheduled_at: args.scheduled_at,
          p_content_schema_version: args.content_schema_version,
          p_format_key: args.format_key,
          p_topic_key: args.topic_key,
          p_interaction_goal: args.interaction_goal,
          p_content_payload: args.content_payload,
          p_generation_snapshot: args.generation_snapshot,
          p_fact_bindings: args.fact_bindings,
          p_editorial_checks: args.editorial_checks,
        },
        saveOutput,
      ),
  );
  server.registerTool(
    'list_posts',
    {
      title: 'List content posts',
      description:
        'Find drafts, ready posts, publication history or calendar entries with bounded filters and pagination. Returns summaries, not full content packages.',
      inputSchema: listInput,
      outputSchema: listOutput,
      annotations: readAnnotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'list_posts',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          ...(args.page_public_id === undefined ? {} : { p_page_public_id: args.page_public_id }),
          ...(args.niche_key === undefined ? {} : { p_niche_key: args.niche_key }),
          ...(args.statuses === undefined ? {} : { p_statuses: args.statuses }),
          ...(args.format_key === undefined ? {} : { p_format_key: args.format_key }),
          ...(args.topic_key === undefined ? {} : { p_topic_key: args.topic_key }),
          ...(args.scheduled_from === undefined ? {} : { p_scheduled_from: args.scheduled_from }),
          ...(args.scheduled_to === undefined ? {} : { p_scheduled_to: args.scheduled_to }),
          ...(args.created_from === undefined ? {} : { p_created_from: args.created_from }),
          ...(args.created_to === undefined ? {} : { p_created_to: args.created_to }),
          ...(args.query === undefined ? {} : { p_query: args.query }),
          p_limit: args.limit ?? 20,
          ...(args.cursor === undefined ? {} : { p_cursor: args.cursor }),
        },
        listOutput,
      ),
  );
  server.registerTool(
    'get_post',
    {
      title: 'Get a content post',
      description:
        'Read the current content package, revision/hash, fact bindings, quality evidence and approval state before reviewing or changing a post. Optionally include source evidence, checks and latest metrics.',
      inputSchema: getInput,
      outputSchema: getOutput,
      annotations: readAnnotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'get_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_post_public_id: args.post_public_id,
          p_include_sources: args.include_sources ?? true,
          p_include_checks: args.include_checks ?? true,
          p_include_latest_metrics: args.include_latest_metrics ?? false,
        },
        getOutput,
      ),
  );
}
