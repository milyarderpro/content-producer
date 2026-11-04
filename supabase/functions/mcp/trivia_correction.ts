// CR-059: only the v2 fact-maintenance shapes are callable.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';
import { factV2, catalogVersion, preciseTimestamp, sourceUrlV2 } from './trivia_v2.ts';

const uuid = z.string().uuid();
const common = {
  request_schema_version: z.literal(2),
  workspace_public_id: uuid,
  operation_key: uuid,
  fact_public_id: uuid,
  expected_fact_updated_at: preciseTimestamp,
};
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
const reverifyInput = z.strictObject({
  ...common,
  confirmed_claim_text: z.string().min(1).max(500),
  source_url: sourceUrlV2,
});
const correctInput = z.strictObject({
  ...common,
  action: z.enum(['invalidate', 'supersede']),
  correction_reason: safeDetail,
  explicit_correction: z.literal(true),
  successor: factV2.nullable(),
  expected_catalog_version: catalogVersion.nullable(),
}).refine((v) => v.action === 'invalidate'
  ? v.successor === null && v.expected_catalog_version === null
  : v.successor !== null && v.expected_catalog_version !== null);
const reverifyOutput = z.strictObject({
  response_schema_version: z.literal(2),
  data: z.strictObject({
    fact_public_id: uuid,
    verification_status: z.enum(['needs_review', 'verified']),
    source_url: sourceUrlV2,
    fact_updated_at: preciseTimestamp,
    affected_posts: affectedPosts,
    replayed: z.boolean(),
  }),
});
const correctOutput = z.strictObject({
  response_schema_version: z.literal(2),
  data: z.strictObject({
    fact_public_id: uuid,
    old_status: z.enum(['invalidated', 'superseded']),
    successor_public_id: uuid.nullable(),
    affected_posts: affectedPosts,
    replayed: z.boolean(),
  }),
});
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
export const TRIVIA_CORRECTION_TOOL_NAMES = [
  'trivia_reverify_fact', 'trivia_correct_fact',
] as const;

export function registerTriviaCorrectionTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  server.registerTool('trivia_reverify_fact', {
    title: 'Reverify a trivia fact',
    description: 'Confirm the same v2 fact with a fresh source URL and exact fact timestamp.',
    inputSchema: reverifyInput,
    outputSchema: reverifyOutput,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    _meta: { securitySchemes },
  }, (args) => invoke('trivia_reverify_fact', context,
    Object.fromEntries(Object.entries(args).map(([key, value]) => ['p_' + key, value])),
    reverifyOutput));
  server.registerTool('trivia_correct_fact', {
    title: 'Correct or invalidate a trivia fact',
    description: 'Invalidate a v2 fact or replace it with one reviewed successor.',
    inputSchema: correctInput,
    outputSchema: correctOutput,
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    _meta: { securitySchemes },
  }, (args) => invoke('trivia_correct_fact', context,
    Object.fromEntries(Object.entries(args).map(([key, value]) => ['p_' + key, value])),
    correctOutput));
}
