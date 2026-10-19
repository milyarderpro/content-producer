// Phase 6.3: read-only MCP facade over the frozen Phase 5 api RPC contracts.
// No business rules or service-role RPC bypass; CR-032 uses a scoped pilot DB adapter.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { triviaConfig, workspaceSettings } from './schemas.ts';
import { executePilotRpc } from './pilot_db.ts';
import { isApprovedMan02CreatePage } from './pilot_write.ts';

const publicId = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const nicheKey = z.string().regex(/^[a-z][a-z0-9_]{1,49}$/);
const choiceKey = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const timestamp = z.string().datetime({ offset: true });
const cursor = z.string().min(1).max(512);
const version = z.literal(1);
const common = { request_schema_version: version, workspace_public_id: publicId };
// ChatGPT calls the designated profile tool with {}. Keep the versioned RPC
// contract behind this MCP-only adapter.
const profileInput = z.strictObject({});
const workspaceInput = z.strictObject(common);
const pagesInput = z.strictObject({
  ...common,
  query: z.string().trim().min(1).max(120).optional(),
  active: z.boolean().optional(),
  niche_key: nicheKey.optional(),
  limit: z.number().int().min(1).max(50).optional(),
  cursor: cursor.optional(),
});
const contextInput = z.strictObject({
  ...common,
  page_public_id: publicId,
  niche_key: nicheKey,
  intent: z
    .strictObject({
      topic_key: choiceKey.optional(),
      format_key: choiceKey.optional(),
      interaction_goal: z.enum(['share', 'save', 'comment', 'follow']).optional(),
      scheduled_at: timestamp.nullable().optional(),
    })
    .optional(),
  recent_post_limit: z.number().int().min(1).max(30).optional(),
});

const response = <T extends z.ZodType>(data: T) =>
  z.strictObject({ response_schema_version: version, data });
const niche = z.strictObject({
  niche_key: nicheKey,
  is_enabled: z.boolean(),
  is_default: z.boolean(),
  config_schema_version: z.number().int().min(1),
  updated_at: timestamp,
});
const pageFields = {
  page_public_id: publicId,
  name: z.string().min(1).max(120),
  slug: z.string(),
  timezone: z.string(),
  target_markets: z.array(z.string()),
  is_active: z.boolean(),
  enabled_niches: z.array(niche),
  updated_at: timestamp,
};
const rpcProfileOutput = response(
  z.strictObject({
    profile: z.strictObject({
      id: z.string().min(1).max(200),
      display_name: z.string().min(1).max(120),
      email_hint: z.string().nullable(),
      workspace_public_id: publicId,
      workspace_name: z.string().min(1).max(120),
      account_status: z.literal('active'),
    }),
  }),
);
const profileOutput = z.strictObject({
  id: z.string().min(1).max(200).regex(/\S/),
  name: z.string().min(1).max(120).optional(),
  nickname: z.string().min(1).max(120).optional(),
  workspace_public_id: publicId, // required to pass the same workspace to subsequent reads
});
const moduleCatalog = z.strictObject({
  niche_key: nicheKey,
  display_name: z.string(),
  module_version: z.number().int().min(1),
  status: z.enum(['active', 'inactive', 'unavailable']),
  capabilities: z.array(z.string()),
  config_schema_versions: z.array(z.number().int().min(1)),
  content_schema_versions: z.array(z.number().int().min(1)),
});
// The versioned settings/config values are validated by the Phase 5 RPC and
// niche validator. Preserve those objects intact rather than creating new
// editorial rules in the facade.
const workspaceOutput = response(
  z.strictObject({
    workspace: z.strictObject({
      public_id: publicId,
      name: z.string(),
      language_code: z.string(),
      target_markets: z.array(z.string()),
      default_timezone: z.string(),
      defaults: workspaceSettings,
    }),
    modules: z.array(moduleCatalog),
    page_counts: z.strictObject({
      active: z.number().int().min(0),
      inactive: z.number().int().min(0),
    }),
  }),
);
const pagesOutput = response(
  z.strictObject({
    items: z.array(z.strictObject(pageFields)),
    next_cursor: cursor.nullable(),
    has_more: z.boolean(),
  }),
);
const contextOutput = response(
  z.strictObject({
    page: z.strictObject({ ...pageFields, created_at: timestamp }),
    module: z.strictObject({
      niche_key: nicheKey,
      display_name: z.string(),
      module_version: z.number().int().min(1),
      status: z.literal('active'),
      config_schema_version: z.number().int().min(1),
      content_schema_versions: z.array(z.number().int().min(1)),
      capabilities: z.array(z.string()),
    }),
    config: triviaConfig,
    generation_rules: z.strictObject({
      allowed_topics: triviaConfig.shape.allowed_topics,
      allowed_formats: triviaConfig.shape.allowed_formats,
      allowed_profiles: z.array(z.string()),
      allowed_interaction_goals: triviaConfig.shape.allowed_interaction_goals,
      fact_count: triviaConfig.shape.fact_count,
      profiles: triviaConfig.shape.profiles,
      text_budget: triviaConfig.shape.text_budget,
      locale: z.string(),
      english_variant: z.string().nullable(),
      render_style: triviaConfig.shape.render_style,
    }),
    reuse_policy: z.strictObject({
      scope: z.string(),
      reservation_ttl_minutes: z.number().int().min(1),
      requires_verified_facts: z.boolean(),
      eligible_fact_count: z.number().int().min(0),
    }),
    recent_variety: z.array(
      z.strictObject({
        post_public_id: publicId,
        status: z.string(),
        topic_key: z.string().optional(),
        format_key: z.string().optional(),
        interaction_goal: z.string().optional(),
        hook: z.string().max(120).optional(),
        cta: z.string().max(120).optional(),
        scheduled_at: timestamp.optional(),
        updated_at: timestamp,
      }),
    ),
    performance_signals: z.array(
      z.strictObject({
        format_key: z.string(),
        sample_size: z.number().int().min(1),
        observed_from: timestamp,
        observed_to: timestamp,
        median_views: z.number().nullable(),
        caveats: z.array(z.string()),
      }),
    ),
    context_version: z.strictObject({
      page_updated_at: timestamp,
      config_updated_at: timestamp,
    }),
  }),
);

const securitySchemes = [{ type: 'oauth2', scopes: ['openid', 'email'] }];
const annotations = { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
const safeErrors = {
  AUTH_REQUIRED: ['Connection authentication is required.', false, 'Relink the account.'],
  PILOT_WRITE_LOCKED: [
    'Pilot business writes are disabled during Phase 10.1.',
    false,
    'Obtain action-specific owner approval at MAN-02 before enabling business writes.',
  ],
  OWNER_ACCESS_REQUIRED: [
    'Only the connected workspace owner may access this resource.',
    false,
    'Use the authorized owner account.',
  ],
  FORBIDDEN: ['Access to this resource is not permitted.', false, 'Stop this request.'],
  WORKSPACE_NOT_FOUND: ['Workspace is not available.', false, 'Refresh the connected profile.'],
  PAGE_NOT_FOUND: ['Page is not available.', false, 'List Pages for the active workspace.'],
  MODULE_NOT_FOUND: ['Module is not available.', false, 'Read the workspace module catalog.'],
  MODULE_DISABLED: ['Module is disabled for this Page.', false, 'Choose an enabled Page/module.'],
  CONFIG_SCHEMA_UNSUPPORTED: [
    'Page config version is unsupported.',
    false,
    'Review the Page configuration.',
  ],
  VALIDATION_FAILED: ['Input validation failed.', false, 'Correct the input fields and retry.'],
  RATE_LIMITED: ['Request rate limit reached.', true, 'Retry after the limit window.'],
  DATABASE_BUSY: ['Database is busy.', true, 'Retry with the same operation key.'],
  OPERATION_KEY_REUSED: [
    'This operation key is already bound to another request.',
    false,
    'Use a new key only for a new intent.',
  ],
  PAGE_VERSION_CONFLICT: [
    'Page configuration has changed.',
    false,
    'Read current Page settings before editing.',
  ],
  PAGE_SLUG_CONFLICT: ['Page slug is already taken.', false, 'Choose a different slug.'],
  CONFIG_INVALID: ['Module configuration is invalid.', false, 'Correct the configuration.'],
  ACTIVE_POST_CONTEXT_CONFLICT: [
    'Active content prevents this configuration change.',
    false,
    'Review current Page posts.',
  ],
  POST_NOT_FOUND: ['Post is not available.', false, 'Read current Page posts.'],
  POST_NOT_PUBLISHED: [
    'Performance snapshots require a published or archived post.',
    false,
    'Confirm manual publication before recording metrics.',
  ],
  METRIC_DEFINITION_AMBIGUOUS: [
    'Metric definition or source is ambiguous.',
    false,
    'Supply a compatible metric source and definition.',
  ],
  METRIC_SNAPSHOT_CONFLICT: [
    'A performance snapshot already exists at this capture timestamp.',
    false,
    'Read the existing snapshot and use a different observation time for new evidence.',
  ],
  REVISION_CONFLICT: [
    'The post revision has changed.',
    false,
    'Read the current post revision and review edits before retrying.',
  ],
  CONTENT_HASH_CONFLICT: [
    'The post content changed since it was reviewed.',
    false,
    'Read the current post content and hash before retrying.',
  ],
  INVALID_STATUS_TRANSITION: [
    'The current post status does not allow this action.',
    false,
    'Read the post and choose an allowed state transition.',
  ],
  QUALITY_EVIDENCE_STALE: [
    'The post quality evidence is no longer current.',
    false,
    'Refresh the post and its quality evidence.',
  ],
  CONTENT_PAYLOAD_INVALID: [
    'The content payload is invalid.',
    false,
    'Review the rendered content and required evidence.',
  ],
  CONTENT_RENDER_MISMATCH: [
    'The rendered content does not match the submitted facts.',
    false,
    'Regenerate the content package using the required renderer.',
  ],
  TEXT_BUDGET_EXCEEDED: [
    'The content exceeds its text budget.',
    false,
    'Shorten the copy to match the Page configuration.',
  ],
  READABILITY_LIMIT_EXCEEDED: [
    'The content exceeds the readability limit.',
    false,
    'Revise the content for the configured display and duration.',
  ],
  QUALITY_SYSTEM_CHECK_FAILED: [
    'Blocking system quality checks failed.',
    false,
    'Review the post quality checks and correct the content.',
  ],
  QUALITY_EDITORIAL_INCOMPLETE: [
    'The editorial quality evidence is incomplete.',
    false,
    'Complete the required editorial review.',
  ],
  MODULE_RELATION_INVALID: [
    'The linked plan or Page context is inconsistent.',
    false,
    'Refresh the linked content plan and post before retrying.',
  ],
  APPROVAL_STALE: [
    'The stored approval is no longer current.',
    false,
    'Read the current post and its approval state.',
  ],
  APPROVAL_REQUIRED: [
    'Current explicit approval is required.',
    false,
    'Review the post and request approval before proceeding.',
  ],
  WAIVER_NOT_ALLOWED: [
    'The requested quality waiver is not permitted.',
    false,
    'Resolve the blocking quality checks.',
  ],
  PLAN_ITEM_REPLACEMENT_BLOCKED: [
    'This output cannot be replaced.',
    false,
    'Review the discarded pre-publication output.',
  ],
  PLAN_NOT_FOUND: ['Content plan is not available.', false, 'List plans for this workspace.'],
  PLAN_LIMIT_EXCEEDED: ['Plan item limit exceeded.', false, 'Reduce the requested item count.'],
  PLAN_ITEM_NOT_FOUND: ['Plan item is not available.', false, 'Read current plan items.'],
  PLAN_STATUS_CONFLICT: [
    'Plan status no longer permits this action.',
    false,
    'Read current plan status.',
  ],
  PLAN_ITEM_CLAIM_MISMATCH: [
    'This item is not claimed by this attempt.',
    false,
    'Read the current item state before reclaiming.',
  ],
  PLAN_ITEM_CLAIM_EXPIRED: [
    'This claim has expired.',
    false,
    'Reclaim eligible work with a new operation key.',
  ],
  PLAN_CLAIM_RENEWAL_LIMIT: [
    'This lease has already been renewed.',
    false,
    'Complete or release the attempt before expiry.',
  ],
  SCHEDULE_CONFLICT: [
    'A requested slot is unavailable.',
    false,
    'Choose another schedule explicitly.',
  ],
  ONTOLOGY_VERSION_UNSUPPORTED: [
    'The candidate ontology version is unsupported.',
    false,
    'Use ontology version 1.',
  ],
  FACT_REVIEW_REQUIRED: [
    'Semantic deduplication needs explicit review.',
    false,
    'Review matching canonical facts before reserving.',
  ],
  FACT_RESERVATION_CONFLICT: [
    'A fact is reserved by another attempt.',
    true,
    'Search again and resolve the conflict.',
  ],
  FACT_RESERVATION_MISMATCH: [
    'The reservation token does not match this Page or operation.',
    false,
    'Do not reuse a token across attempts.',
  ],
  FACT_RESERVATION_EXPIRED: [
    'The reservation has expired.',
    false,
    'Search and reserve again using a new logical operation.',
  ],
  FACT_RESERVATION_CONTEXT_CHANGED: [
    'Page configuration changed during reservation.',
    false,
    'Refresh Page context and retry with a new operation.',
  ],
  FACT_NOT_ELIGIBLE: [
    'This canonical fact is not eligible.',
    false,
    'Choose a verified eligible fact.',
  ],
  FACT_SOURCE_INSUFFICIENT: [
    'Source evidence is insufficient.',
    false,
    'Verify evidence with acceptable independent sources.',
  ],
  FACT_FRESHNESS_EXPIRED: [
    'The fact evidence has expired.',
    false,
    'Refresh evidence before reserving.',
  ],
  FACT_REUSE_BLOCKED: [
    'The reuse policy forbids this fact.',
    false,
    'Choose another fact or Page.',
  ],
  FACT_HASH_COLLISION: [
    'The canonical identity conflicts with another record.',
    false,
    'Review the candidate identity.',
  ],
  FACT_CORRECTION_REQUIRED: [
    'This claim changes the meaning of the canonical fact.',
    false,
    'Use an explicit correction with fresh verified evidence.',
  ],
  FACT_CORRECTION_CONFLICT: [
    'The canonical fact changed since the supplied version.',
    false,
    'Read its current version and confirm the intended operation.',
  ],
  INTERNAL_ERROR: [
    'The operation could not be confirmed.',
    false,
    'Check the current resource state before retrying.',
  ],
  DATABASE_UNAVAILABLE: [
    'Database is temporarily unavailable.',
    true,
    'Retry when the service recovers.',
  ],
} as const;
type SafeError = keyof typeof safeErrors;

function failure(code: SafeError) {
  const [message, retryable, recovery] = safeErrors[code];
  return {
    isError: true as const,
    structuredContent: {
      response_schema_version: 1,
      error: {
        code,
        message,
        retryable,
        recovery,
        ...(code === 'RATE_LIMITED' ? { retry_after_seconds: 60 } : {}),
      },
    },
    content: [{ type: 'text' as const, text: code + ': ' + message }],
  };
}
function isSafeError(text: unknown): text is SafeError {
  return typeof text === 'string' && Object.prototype.hasOwnProperty.call(safeErrors, text);
}
function forbiddenOutputKeys(
  value: unknown,
  allowClaimToken = false,
  path = '',
  allowReservationToken = false,
): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value))
    return value.some((entry) =>
      forbiddenOutputKeys(entry, allowClaimToken, path + '.*', allowReservationToken),
    );
  return Object.entries(value).some(([key, nested]) => {
    const at = path ? path + '.' + key : key;
    // A token is intentionally returned ONLY in the authenticated claim tool's
    // closed data.claimed_items[*] output. Never echo it in content or logs.
    if (key === 'claim_token' && allowClaimToken && at === 'data.claimed_items.*.claim_token')
      return false;
    // Only the reserve RPC may return its supplied token, in structuredContent.
    if (key === 'reservation_token' && allowReservationToken && at === 'data.reservation_token')
      return false;
    return (
      /^(access_token|refresh_token|authorization|password|secret|claim_token|reservation_token|owner_user_id|oauth_client_id|internal_id)$/i.test(
        key,
      ) || forbiddenOutputKeys(nested, allowClaimToken, at, allowReservationToken)
    );
  });
}
export async function invoke(
  tool: string,
  context: RequestContext,
  params: Record<string, unknown>,
  schema: z.ZodType,
) {
  if (
    context.workspacePublicId !== null &&
    params.p_workspace_public_id !== undefined &&
    params.p_workspace_public_id !== context.workspacePublicId
  )
    return failure('OWNER_ACCESS_REQUIRED');
  if (
    context.pilotMode &&
    !tool.startsWith('get_') &&
    !tool.startsWith('list_') &&
    tool !== 'trivia_find_similar_facts'
  ) {
    // Default closed. Never accept a grant from tool arguments or HTTP.
    // Only the Edge Function's server-side setting may authorize the exact
    // MAN-02 create_page RPC, including the fixed workspace and operation key.
    let grant = '';
    try {
      grant = Deno.env.get('MCP_MAN02_APPROVED_SHA256') ?? '';
    } catch {
      // Deno's restricted test runtime, or an unavailable env, stays locked.
    }
    if (!(await isApprovedMan02CreatePage(tool, params, grant))) {
      return failure('PILOT_WRITE_LOCKED');
    }
  }
  try {
    let raw: unknown;
    if (context.pilotMode) {
      try {
        raw = await executePilotRpc(tool, params, context.actorUserId);
      } catch (error) {
        const safe = error instanceof Error ? error.message : '';
        return failure(isSafeError(safe) ? safe : 'DATABASE_UNAVAILABLE');
      }
    } else {
      const rpc = await fetch(context.supabaseUrl + '/rest/v1/rpc/' + tool, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        headers: {
          apikey: context.publishableKey,
          Authorization: 'Bearer ' + context.accessToken,
          'Content-Type': 'application/json',
          'Accept-Profile': 'api',
          'Content-Profile': 'api',
        },
        body: JSON.stringify(params),
      });
      const rawText = await rpc.text();
      if (new TextEncoder().encode(rawText).byteLength > 256 * 1024) {
        return failure('DATABASE_UNAVAILABLE');
      }
      try {
        raw = JSON.parse(rawText);
      } catch {
        return failure('DATABASE_UNAVAILABLE');
      }
      if (!rpc.ok) {
        const message =
          raw && typeof raw === 'object' && 'message' in raw
            ? (raw as { message: unknown }).message
            : null;
        if (isSafeError(message)) return failure(message);
        return failure(rpc.status === 401 ? 'AUTH_REQUIRED' : 'DATABASE_UNAVAILABLE');
      }
    }
    const parsed = schema.safeParse(raw);
    if (
      !parsed.success ||
      forbiddenOutputKeys(
        parsed.data,
        tool === 'claim_content_plan_items',
        '',
        tool === 'trivia_register_and_reserve_facts',
      )
    ) {
      return failure('DATABASE_UNAVAILABLE');
    }
    return {
      structuredContent: parsed.data as Record<string, unknown>,
      content: [
        {
          type: 'text' as const,
          text: tool + ': succeeded; see structuredContent for the owner-scoped result.',
        },
      ],
    };
  } catch {
    // Do not reflect SQLSTATE, URL, token, response body, or raw exception.
    return failure('DATABASE_UNAVAILABLE');
  }
}

export const FOUNDATION_TOOL_NAMES = [
  'get_account_profile',
  'get_workspace_context',
  'list_pages',
  'get_page_generation_context',
] as const;
export function registerFoundationTools(server: McpServer, context?: RequestContext): void {
  // Unauthenticated internal protocol harness must not list/call business tools.
  if (!context) return;
  const scoped = context;
  server.registerTool(
    'get_account_profile',
    {
      title: 'Get connected account profile',
      description:
        'Use this to identify the authenticated Content Producer account and its active workspace. It reads connection display data only and does not change content.',
      inputSchema: profileInput,
      outputSchema: profileOutput,
      annotations,
      _meta: { securitySchemes, 'openai/profile': true },
    },
    async () => {
      const result = await invoke(
        'get_account_profile',
        scoped,
        { p_request_schema_version: 1 },
        rpcProfileOutput,
      );
      if ('isError' in result) return result;
      const rpc = rpcProfileOutput.safeParse(result.structuredContent);
      if (!rpc.success) return failure('DATABASE_UNAVAILABLE');
      const profile = profileOutput.safeParse({
        id: rpc.data.data.profile.id,
        name: rpc.data.data.profile.display_name,
        nickname: rpc.data.data.profile.workspace_name,
        workspace_public_id: rpc.data.data.profile.workspace_public_id,
      });
      if (!profile.success) return failure('DATABASE_UNAVAILABLE');
      return {
        structuredContent: profile.data,
        content: [{ type: 'text' as const, text: JSON.stringify(profile.data) }],
      };
    },
  );
  server.registerTool(
    'get_workspace_context',
    {
      title: 'Get workspace context',
      description:
        "Use this before workspace-wide planning or when the active modules and defaults are unknown. It returns the authenticated owner's workspace rules and module catalog without changing state.",
      inputSchema: workspaceInput,
      outputSchema: workspaceOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'get_workspace_context',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
        },
        workspaceOutput,
      ),
  );
  server.registerTool(
    'list_pages',
    {
      title: 'List Facebook Pages',
      description:
        'Use this to find Pages in the active workspace by name, status, or enabled niche before reading context or creating content.',
      inputSchema: pagesInput,
      outputSchema: pagesOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'list_pages',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          ...(args.query === undefined ? {} : { p_query: args.query }),
          ...(args.active === undefined ? {} : { p_active: args.active }),
          ...(args.niche_key === undefined ? {} : { p_niche_key: args.niche_key }),
          p_limit: args.limit ?? 20,
          ...(args.cursor === undefined ? {} : { p_cursor: args.cursor }),
        },
        pagesOutput,
      ),
  );
  server.registerTool(
    'get_page_generation_context',
    {
      title: 'Get Page generation context',
      description:
        'Use this immediately before researching and drafting content for a Page. It returns current config, allowed choices, recent variety, reuse policy, and bounded performance signals.',
      inputSchema: contextInput,
      outputSchema: contextOutput,
      annotations,
      _meta: { securitySchemes },
    },
    (args) =>
      invoke(
        'get_page_generation_context',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
          p_workspace_public_id: args.workspace_public_id,
          p_page_public_id: args.page_public_id,
          p_niche_key: args.niche_key,
          p_recent_post_limit: args.recent_post_limit ?? 12,
          ...(args.intent?.topic_key === undefined
            ? {}
            : { p_intent_topic_key: args.intent.topic_key }),
          ...(args.intent?.format_key === undefined
            ? {}
            : { p_intent_format_key: args.intent.format_key }),
          ...(args.intent?.interaction_goal === undefined
            ? {}
            : { p_intent_interaction_goal: args.intent.interaction_goal }),
          ...(args.intent?.scheduled_at === undefined
            ? {}
            : { p_intent_scheduled_at: args.intent.scheduled_at }),
        },
        contextOutput,
      ),
  );
}
