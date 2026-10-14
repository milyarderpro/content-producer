// Phase 6.10: thin post revision and schedule facades; all mutation invariants stay in Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';
import {
  bindingInput,
  contentPayload,
  editorialInput,
  generationSnapshot,
  postPackage,
} from './post_base.ts';

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const revision = z.number().int().min(1);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const version = z.literal(1);
const common = {
  request_schema_version: version,
  workspace_public_id: uuid,
  operation_key: uuid,
  post_public_id: uuid,
  expected_revision: revision,
};
const reviseInput = z.strictObject({
  ...common,
  expected_content_hash: hash,
  reservation_token: uuid.nullable().optional(),
  content_schema_version: version,
  format_key: z.enum([
    'single_subject_fast',
    'themed_utility',
    'emotional_animal_collection',
    'comparison',
    'myth_vs_fact',
  ]),
  topic_key: z.enum([
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
  ]),
  interaction_goal: z.enum(['share', 'save', 'comment', 'follow']),
  content_payload: contentPayload,
  generation_snapshot: generationSnapshot,
  fact_bindings: z.array(bindingInput).min(1).max(9),
  editorial_checks: editorialInput,
  revision_reason: safeDetail,
}).superRefine((value, ctx) => {
  const facts = value.content_payload.body.facts;
  if (
    facts.length !== value.fact_bindings.length ||
    facts.some((fact, index) =>
      fact.position !== index + 1 ||
      value.fact_bindings[index]?.position !== index + 1 ||
      fact.text !== value.fact_bindings[index]?.rendered_text
    ) ||
    new Set(value.fact_bindings.map((fact) => fact.fact_public_id)).size !== value.fact_bindings.length
  ) {
    ctx.addIssue({ code: 'custom', message: 'Ordered fact bindings must match the rendered body' });
  }
});
const rescheduleInput = z.strictObject({
  ...common,
  scheduled_at: timestamp.nullable(),
  reason: safeDetail,
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const reviseOutput = envelope(z.strictObject({
  post: postPackage,
  released_fact_public_ids: z.array(uuid).max(200),
  replaced_fact_public_ids: z.array(uuid).max(200),
  approval_invalidated: z.boolean(),
  replayed: z.boolean(),
}));
const rescheduleOutput = envelope(z.strictObject({
  post_public_id: uuid,
  status: z.enum(['draft', 'ready']),
  revision,
  content_hash_unchanged: z.literal(true),
  scheduled_at: timestamp.nullable(),
  plan_item_schedule: timestamp.nullable(),
  replayed: z.boolean(),
}));
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const POST_EDIT_TOOL_NAMES = ['revise_post', 'reschedule_post'] as const;

export function registerPostEditTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'revise_post',
    {
      title: 'Revise a content post',
      description:
        'Use this to change the copy, format, topic, interaction goal, or fact set of a draft or ready post. It uses compare-and-swap; replacing facts requires a matching fresh reservation and ready posts return to draft.',
      inputSchema: reviseInput,
      outputSchema: reviseOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) => invoke('revise_post', scoped, {
      p_request_schema_version: args.request_schema_version,
      p_workspace_public_id: args.workspace_public_id,
      p_operation_key: args.operation_key,
      p_post_public_id: args.post_public_id,
      p_expected_revision: args.expected_revision,
      p_expected_content_hash: args.expected_content_hash,
      p_reservation_token: args.reservation_token ?? null,
      p_content_schema_version: args.content_schema_version,
      p_format_key: args.format_key,
      p_topic_key: args.topic_key,
      p_interaction_goal: args.interaction_goal,
      p_content_payload: args.content_payload,
      p_generation_snapshot: args.generation_snapshot,
      p_fact_bindings: args.fact_bindings,
      p_editorial_checks: args.editorial_checks,
      p_revision_reason: args.revision_reason,
    }, reviseOutput),
  );
  server.registerTool(
    'reschedule_post',
    {
      title: 'Reschedule a content post',
      description:
        "Use this when the user asks to move or clear a draft or ready post's planned time. It changes schedule only, checks cross-table slot conflicts, and increments revision.",
      inputSchema: rescheduleInput,
      outputSchema: rescheduleOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) => invoke('reschedule_post', scoped, {
      p_request_schema_version: args.request_schema_version,
      p_workspace_public_id: args.workspace_public_id,
      p_operation_key: args.operation_key,
      p_post_public_id: args.post_public_id,
      p_expected_revision: args.expected_revision,
      p_scheduled_at: args.scheduled_at,
      p_reason: args.reason,
    }, rescheduleOutput),
  );
}
