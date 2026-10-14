// Phase 6.11: thin approval/revocation/discard facades; lifecycle invariants stay in Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';

const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const revision = z.number().int().min(1);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const version = z.literal(1);
const warningId = z.enum([
  'FACT_COUNT_BELOW_CONFIG_MIN',
  'trivia.profile.preferred_band',
  'trivia.variety_sufficient',
  'trivia.caption_supportive',
  'trivia.visual_rhythm_clear',
]);
const common = {
  request_schema_version: version,
  workspace_public_id: uuid,
  operation_key: uuid,
  post_public_id: uuid,
  expected_revision: revision,
};
const approvalInput = z
  .strictObject({
    ...common,
    expected_content_hash: hash,
    explicit_approval: z.literal(true),
    accepted_warning_ids: z.array(warningId).max(20),
    warning_acceptance_reason: safeDetail.nullable().optional(),
  })
  .superRefine((value, ctx) => {
    const hasWarnings = value.accepted_warning_ids.length > 0;
    const hasReason =
      value.warning_acceptance_reason !== undefined && value.warning_acceptance_reason !== null;
    if (hasWarnings !== hasReason) {
      ctx.addIssue({
        code: 'custom',
        message: 'Warning acceptance reason must match accepted warnings',
      });
    }
  });
const revokeInput = z.strictObject({
  ...common,
  expected_content_hash: hash,
  reason: safeDetail,
  explicit_revocation: z.literal(true),
});
const discardInput = z.strictObject({
  ...common,
  reason: safeDetail,
  explicit_discard: z.literal(true),
});
const checkEntry = z.strictObject({
  id: z.string().min(1).max(120),
  severity: z.enum(['blocking', 'warning']),
  status: z.enum(['passed', 'failed', 'needs_review']),
  expected: z.unknown(),
  actual: z.unknown(),
  evidence: z.array(z.string().max(200)).max(20),
});
const recomputedChecks = z.strictObject({
  schema_version: version,
  gate_version: version,
  evaluated_at: timestamp,
  evaluator: z.literal('server'),
  post_revision: revision,
  content_hash: hash,
  config_version: version,
  renderer_version: version,
  overall_status: z.enum(['passed', 'failed']),
  checks: z.array(checkEntry).max(50),
});
const approvalSummary = z.strictObject({
  approved_revision: revision,
  content_hash: hash,
  approved_at: timestamp,
  accepted_warning_ids: z.array(warningId).max(20),
  warning_acceptance_reason: safeDetail.nullable(),
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const approveOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.literal('ready'),
    revision,
    approval: approvalSummary,
    recomputed_checks: recomputedChecks,
    replayed: z.boolean(),
  }),
);
const revokeOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.literal('draft'),
    revision,
    approval_revoked: z.literal(true),
    replayed: z.boolean(),
  }),
);
const discardOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.literal('discarded'),
    revision,
    released_fact_public_ids: z.array(uuid).min(1).max(9),
    plan_item: z
      .strictObject({
        plan_item_public_id: uuid,
        replacement_eligible: z.boolean(),
      })
      .nullable(),
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const POST_APPROVAL_TOOL_NAMES = [
  'approve_post',
  'revoke_post_approval',
  'discard_post',
] as const;

export function registerPostApprovalTools(
  server: McpServer,
  context?: RequestContext,
): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'approve_post',
    {
      title: 'Approve a post for publishing',
      description:
        'Use this only after the user explicitly approves the current draft. It recomputes blocking checks and changes the exact reviewed revision from draft to ready.',
      inputSchema: approvalInput,
      outputSchema: approveOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'approve_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_expected_content_hash: args.expected_content_hash,
          p_explicit_approval: args.explicit_approval,
          p_accepted_warning_ids: args.accepted_warning_ids,
          p_warning_acceptance_reason: args.warning_acceptance_reason ?? null,
        },
        approveOutput,
      ),
  );
  server.registerTool(
    'revoke_post_approval',
    {
      title: 'Revoke post approval',
      description:
        'Use this only when the user asks to withdraw approval from a ready post. It returns the post to draft and invalidates the current approval without changing public copy.',
      inputSchema: revokeInput,
      outputSchema: revokeOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'revoke_post_approval',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_expected_content_hash: args.expected_content_hash,
          p_reason: args.reason,
          p_explicit_revocation: args.explicit_revocation,
        },
        revokeOutput,
      ),
  );
  server.registerTool(
    'discard_post',
    {
      title: 'Discard a content post',
      description:
        'Use this only when the user abandons a draft or ready post. It makes the post terminal, releases allocated trivia facts, and does not automatically create a replacement plan item.',
      inputSchema: discardInput,
      outputSchema: discardOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'discard_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_reason: args.reason,
          p_explicit_discard: args.explicit_discard,
        },
        discardOutput,
      ),
  );
}
