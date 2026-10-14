// Phase 6.12: record manual publication and archive existing history; never publish to Facebook.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { safeDetail } from './plan_claim.ts';

const uuid = z.string().uuid();
const version = z.literal(1);
const timestamp = z.string().datetime({ offset: true });
const revision = z.number().int().min(1);
const hash = z.string().regex(/^[0-9a-f]{64}$/);
const platformId = z
  .string()
  .min(1)
  .max(200)
  .regex(/^[^\p{Cc}]+$/u);
const httpsUrl = z
  .string()
  .min(9)
  .max(2048)
  .regex(/^https:\/\/[A-Za-z0-9][A-Za-z0-9.-]*(?::[0-9]{1,5})?(?:[/?#][^\s\p{Cc}]*)?$/u);
const common = {
  request_schema_version: version,
  workspace_public_id: uuid,
  operation_key: uuid,
  post_public_id: uuid,
  expected_revision: revision,
};
const publicationInput = z.strictObject({
  ...common,
  expected_content_hash: hash,
  published_at: timestamp,
  platform_post_id: platformId.nullable().optional(),
  published_url: httpsUrl.nullable().optional(),
  explicit_publication_confirmation: z.literal(true),
});
const archiveInput = z.strictObject({
  ...common,
  reason: safeDetail,
  explicit_archive: z.literal(true),
});
const envelope = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const publicationOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.literal('posted'),
    revision,
    published_at: timestamp,
    platform_post_id: platformId.nullable(),
    published_url: httpsUrl.nullable(),
    published_fact_public_ids: z.array(uuid).max(9),
    replayed: z.boolean(),
  }),
);
const archiveOutput = envelope(
  z.strictObject({
    post_public_id: uuid,
    status: z.literal('archived'),
    revision,
    archived_at: timestamp,
    replayed: z.boolean(),
  }),
);
const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const annotations = { readOnlyHint: false, destructiveHint: true, openWorldHint: false };

export const POST_PUBLICATION_TOOL_NAMES = ['mark_post_posted', 'archive_post'] as const;

export function registerPostPublicationTools(server: McpServer, context?: RequestContext): void {
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'mark_post_posted',
    {
      title: 'Mark a post as published',
      description:
        'Use this only after the user confirms the post was actually published manually. It does not contact Facebook; it records publication details and makes fact usage permanent.',
      inputSchema: publicationInput,
      outputSchema: publicationOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'mark_post_posted',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_expected_content_hash: args.expected_content_hash,
          p_published_at: args.published_at,
          p_platform_post_id: args.platform_post_id ?? null,
          p_published_url: args.published_url ?? null,
          p_explicit_publication_confirmation: args.explicit_publication_confirmation,
        },
        publicationOutput,
      ),
  );
  server.registerTool(
    'archive_post',
    {
      title: 'Archive a published post',
      description:
        'Use this only when the user asks to remove a posted item from the active workflow. It preserves publication history, fact usage, metrics, and source snapshots.',
      inputSchema: archiveInput,
      outputSchema: archiveOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'archive_post',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_operation_key: args.operation_key,
          p_post_public_id: args.post_public_id,
          p_expected_revision: args.expected_revision,
          p_reason: args.reason,
          p_explicit_archive: args.explicit_archive,
        },
        archiveOutput,
      ),
  );
}
