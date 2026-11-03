// Phase 6.10: thin post revision and schedule facades; all mutation invariants stay in Phase 5 RPCs.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';
const uuid = z.string().uuid();
const timestamp = z.string().datetime({ offset: true });
const revision = z.number().int().min(1);
const version = z.literal(1);
const common = {
  request_schema_version: version,
  workspace_public_id: uuid,
  operation_key: uuid,
  post_public_id: uuid,
  expected_revision: revision,
};
const rescheduleInput = z.strictObject({
  ...common,
  scheduled_at: timestamp.nullable(),
  reason: safeDetail,
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const rescheduleOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.enum(['draft', 'ready']),
    revision,
    content_hash_unchanged: z.literal(true),
    scheduled_at: timestamp.nullable(),
    plan_item_schedule: timestamp.nullable(),
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const POST_EDIT_TOOL_NAMES = ['reschedule_post'] as const;

export function registerPostEditTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
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
    (args) =>
      invoke(
        'reschedule_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_scheduled_at: args.scheduled_at,
          p_reason: args.reason,
        },
        rescheduleOutput,
      ),
  );
}
