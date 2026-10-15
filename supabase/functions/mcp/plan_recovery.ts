// Phase 6.6: recovery/cancel facade; all lifecycle rules remain in Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { planItem, planSummary } from './page_plan.ts';
import { safeDetail } from './plan_claim.ts';

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const common = {
  request_schema_version: z.literal(1),
  workspace_public_id: uuid,
  operation_key: uuid,
  reason: safeDetail,
};
const retryInput = z.strictObject({ ...common, plan_item_public_id: uuid });
const replacementInput = z.strictObject({
  ...common,
  plan_item_public_id: uuid,
  discarded_post_public_id: uuid,
  explicit_replacement: z.literal(true),
});
const cancelInput = z.strictObject({
  ...common,
  plan_public_id: uuid,
  explicit_cancellation: z.literal(true),
});
const pendingItem = planItem.extend({ status: z.literal('pending') });
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: z.literal(1), data });
const retryOutput = envelope(
  z.strictObject({ item: pendingItem, plan: planSummary, replayed: z.boolean() }),
);
const replacementOutput = envelope(
  z.strictObject({
    item: pendingItem,
    plan: planSummary,
    replacement_history_public_id: uuid,
    replayed: z.boolean(),
  }),
);
const cancelOutput = envelope(
  z.strictObject({
    plan: planSummary.extend({ status: z.literal('cancelled') }),
    changed_count: z.number().int().min(0).max(100),
    preserved_completed_count: z.number().int().min(0).max(100),
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const PLAN_RECOVERY_TOOL_NAMES = [
  'retry_content_plan_item',
  'replace_discarded_plan_item',
  'cancel_content_plan',
] as const;

export function registerPlanRecoveryTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'retry_content_plan_item',
    {
      title: 'Retry a failed content plan item',
      description:
        'Use this after the user asks to retry, or after a recoverable failure has been explained. It changes one failed item back to pending without resetting attempt history.',
      inputSchema: retryInput,
      outputSchema: retryOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'retry_content_plan_item',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_item_public_id: args.plan_item_public_id,
          p_reason: args.reason,
        },
        retryOutput,
      ),
  );
  server.registerTool(
    'replace_discarded_plan_item',
    {
      title: 'Replace a discarded plan item',
      description:
        'Use this only after explicit user intent to create a replacement for a discarded pre-publication post. It returns the completed item to pending only when no posted or archived output exists.',
      inputSchema: replacementInput,
      outputSchema: replacementOutput,
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'replace_discarded_plan_item',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_item_public_id: args.plan_item_public_id,
          p_discarded_post_public_id: args.discarded_post_public_id,
          p_reason: args.reason,
          p_explicit_replacement: args.explicit_replacement,
        },
        replacementOutput,
      ),
  );
  server.registerTool(
    'cancel_content_plan',
    {
      title: 'Cancel a content plan',
      description:
        'Use this only when the user asks to cancel a plan. It cancels pending, failed, and in-progress items and clears their claims; completed posts are preserved.',
      inputSchema: cancelInput,
      outputSchema: cancelOutput,
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'cancel_content_plan',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_public_id: args.plan_public_id,
          p_reason: args.reason,
          p_explicit_cancellation: args.explicit_cancellation,
        },
        cancelOutput,
      ),
  );
}
