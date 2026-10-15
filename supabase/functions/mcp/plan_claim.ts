// Phase 6.5: claim/lease/failure facade. Phase 5 RPCs own locks, expiry, replay and rate limits.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { planItem, planSummary } from './page_plan.ts';

const uuid = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const timestamp = z.string().datetime({ offset: true });
const common = {
  request_schema_version: z.literal(1),
  workspace_public_id: uuid,
  operation_key: uuid,
};
const claimInput = z.strictObject({
  ...common,
  plan_public_id: uuid,
  limit: z.number().int().min(1).max(3).optional(),
  lease_minutes: z.literal(30),
});
const tokenInput = { ...common, plan_item_public_id: uuid, claim_token: uuid };
const renewInput = z.strictObject(tokenInput);
const failureCode = z.enum([
  'VALIDATION_FAILED',
  'CONFIG_INVALID',
  'FACT_SOURCE_INSUFFICIENT',
  'FACT_NOT_ELIGIBLE',
  'FACT_FRESHNESS_EXPIRED',
  'FACT_REUSE_BLOCKED',
  'FACT_RESERVATION_CONFLICT',
  'FACT_RESERVATION_EXPIRED',
  'FACT_RESERVATION_CONTEXT_CHANGED',
  'QUALITY_SYSTEM_CHECK_FAILED',
  'SCHEDULE_CONFLICT',
  'DATABASE_BUSY',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
]);
// Match the Phase 5 safe-reason validator before transmitting a failure
// detail. Never allow tokens, UUIDs, SQL or secret-like text as failure data.
export const safeDetail = z
  .string()
  .min(1)
  .max(500)
  .refine(
    (s) =>
      s === s.trim() &&
      !Array.from(s).some((c) => c.charCodeAt(0) < 32 || c.charCodeAt(0) === 127) &&
      !/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(s) &&
      !/(bearer\s|eyJ[A-Za-z0-9_-]+\.|(token|secret|password|authorization|api[_-]?key)\s*[:=]|SQLSTATE|CONTEXT:|DETAIL:|stack[\s_-]*trace|select\s.*from\s|insert\s+into|update\s.*set\s|delete\s+from)/i.test(
        s,
      ),
    'failure_detail must be safe and must not contain credentials or SQL',
  );
const failureInput = z.strictObject({
  ...tokenInput,
  failure_code: failureCode,
  failure_detail: safeDetail,
  retry_recommended: z.boolean(),
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: z.literal(1), data });
const claimOutput = envelope(
  z.strictObject({
    plan_public_id: uuid,
    claimed_items: z
      .array(
        z.strictObject({
          item: planItem,
          claim_token: uuid,
          claimed_at: timestamp,
          claim_expires_at: timestamp,
          claim_renewal_count: z.number().int().min(0).max(1),
        }),
      )
      .max(3),
    remaining_claimable_count: z.number().int().min(0),
    replayed: z.boolean(),
  }),
);
const renewOutput = envelope(
  z.strictObject({
    plan_item_public_id: uuid,
    claim_expires_at: timestamp,
    claim_renewal_count: z.literal(1),
    replayed: z.boolean(),
  }),
);
const failureOutput = envelope(
  z.strictObject({
    item: planItem,
    plan: planSummary,
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const annotations = { readOnlyHint: false, destructiveHint: false, openWorldHint: false };

export const PLAN_CLAIM_TOOL_NAMES = [
  'claim_content_plan_items',
  'renew_content_plan_claim',
  'report_content_plan_item_failure',
] as const;

export function registerPlanClaimTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'claim_content_plan_items',
    {
      title: 'Claim content plan items',
      description:
        'Use this immediately before processing the next plan items. It atomically leases up to three pending or reclaimable items to this connection and may reclaim expired leases.',
      inputSchema: claimInput,
      outputSchema: claimOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'claim_content_plan_items',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_public_id: args.plan_public_id,
          p_limit: args.limit ?? 1,
          p_lease_minutes: args.lease_minutes,
        },
        claimOutput,
      ),
  );
  server.registerTool(
    'renew_content_plan_claim',
    {
      title: 'Renew a content plan claim',
      description:
        'Use this only when a claimed item needs more processing time. It extends one active lease once, never beyond 60 minutes from the original claim.',
      inputSchema: renewInput,
      outputSchema: renewOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'renew_content_plan_claim',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_item_public_id: args.plan_item_public_id,
          p_claim_token: args.claim_token,
        },
        renewOutput,
      ),
  );
  server.registerTool(
    'report_content_plan_item_failure',
    {
      title: 'Report content plan item failure',
      description:
        'Use this when the current attempt cannot safely produce a saved post. It marks only the claimed item failed, stores a safe error summary, and releases its lease.',
      inputSchema: failureInput,
      outputSchema: failureOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'report_content_plan_item_failure',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_plan_item_public_id: args.plan_item_public_id,
          p_claim_token: args.claim_token,
          p_failure_code: args.failure_code,
          p_failure_detail: args.failure_detail,
          p_retry_recommended: args.retry_recommended,
        },
        failureOutput,
      ),
  );
}
