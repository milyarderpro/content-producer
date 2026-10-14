// Phase 6.8: exact-CAS trivia evidence refresh and explicit lineage correction.
// Meaning, reuse, publication immutability, and cross-Page transitions belong to Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';
import { candidate, source } from './trivia_fact.ts';

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const timestamp = z.string().datetime({ offset: true });
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const common = {
  request_schema_version: z.literal(1),
  workspace_public_id: uuid,
  operation_key: uuid,
  fact_public_id: uuid,
  expected_fact_updated_at: timestamp,
};
const freshness = {
  sources: z.array(source).min(1).max(8),
  freshness_class: z.enum(['stable', 'periodic', 'volatile']),
  as_of_date: date.nullable(),
  requested_expires_at: timestamp,
  risk_class: z.enum(['standard', 'sensitive']),
};
const reverifyInput = z.strictObject({
  ...common,
  confirmed_claim_text: z.string().trim().min(1).max(500),
  ...freshness,
  review_note: z.string().trim().min(1).max(1000),
});
const successor = z.strictObject({
  candidate,
  dedup_reviews: z.array(
    z.strictObject({
      candidate_fact_public_id: uuid.optional(),
      decision: z.enum(['same', 'distinct']),
      reason: z.string().trim().min(1).max(500),
      material_differences: z.array(
        z.enum([
          'relation',
          'negation',
          'number',
          'unit',
          'time',
          'location',
          'population',
          'condition',
          'comparison_direction',
          'method',
          'scope',
          'other',
        ]),
      ).max(10),
    }).refine((r) => r.decision !== 'same' || r.candidate_fact_public_id !== undefined),
  ),
  ...freshness,
  verification_note: z.string().trim().min(1).max(1000),
});
const correctInput = z
  .strictObject({
    ...common,
    action: z.enum(['invalidate', 'supersede']),
    correction_reason: safeDetail,
    successor: successor.optional(),
    explicit_correction: z.literal(true),
  })
  .refine((x) => (x.action === 'supersede') === (x.successor !== undefined));
const affectedPost = z.strictObject({
  post_public_id: uuid,
  status: z.enum(['draft', 'ready', 'posted', 'archived']),
  revision: z.number().int().min(1),
});
const affectedGroup = z.strictObject({
  count: z.number().int().min(0),
  items: z.array(affectedPost).max(50),
  truncated: z.boolean(),
});
const affectedPosts = z.strictObject({
  draft: affectedGroup,
  ready: affectedGroup,
  posted: affectedGroup,
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: z.literal(1), data });
const reverifyOutput = envelope(
  z.strictObject({
    fact_public_id: uuid,
    verification_status: z.literal('verified'),
    verified_at: timestamp,
    expires_at: timestamp,
    fact_updated_at: timestamp,
    affected_posts: affectedPosts,
    replayed: z.boolean(),
  }),
);
const correctOutput = envelope(
  z.strictObject({
    fact_public_id: uuid,
    old_status: z.enum(['invalidated', 'superseded']),
    successor_public_id: uuid.nullable(),
    affected_posts: affectedPosts,
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const TRIVIA_CORRECTION_TOOL_NAMES = [
  'trivia_reverify_fact',
  'trivia_correct_fact',
] as const;

export function registerTriviaCorrectionTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'trivia_reverify_fact',
    {
      title: 'Reverify a trivia fact',
      description:
        "Use this after fresh research confirms the same atomic proposition. It replaces current verification evidence and freshness metadata without changing the fact's meaning or identity.",
      inputSchema: reverifyInput,
      outputSchema: reverifyOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'trivia_reverify_fact',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_fact_public_id: args.fact_public_id,
          p_expected_fact_updated_at: args.expected_fact_updated_at,
          p_confirmed_claim_text: args.confirmed_claim_text,
          p_sources: args.sources,
          p_freshness_class: args.freshness_class,
          p_as_of_date: args.as_of_date,
          p_requested_expires_at: args.requested_expires_at,
          p_risk_class: args.risk_class,
          p_review_note: args.review_note,
        },
        reverifyOutput,
      ),
  );
  server.registerTool(
    'trivia_correct_fact',
    {
      title: 'Correct or invalidate a trivia fact',
      description:
        'Use this after evidence shows a canonical fact is wrong or materially changed. It either invalidates the fact or creates one corrected successor, and may return affected ready posts to draft.',
      inputSchema: correctInput,
      outputSchema: correctOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'trivia_correct_fact',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_fact_public_id: args.fact_public_id,
          p_expected_fact_updated_at: args.expected_fact_updated_at,
          p_action: args.action,
          p_correction_reason: args.correction_reason,
          p_successor: args.successor ?? null,
          p_explicit_correction: args.explicit_correction,
        },
        correctOutput,
      ),
  );
}
