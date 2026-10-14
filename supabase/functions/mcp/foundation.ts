// Phase 6.3: read-only MCP facade over the frozen Phase 5 api RPC contracts.
// No business SQL, service-role credential, identity override, or secondary rate limiter.
import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { triviaConfig, workspaceSettings } from './schemas.ts';

const publicId = z
  .string()
  .regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
const nicheKey = z.string().regex(/^[a-z][a-z0-9_]{1,49}$/);
const choiceKey = z.string().regex(/^[a-z][a-z0-9_]{1,79}$/);
const timestamp = z.string().datetime({ offset: true });
const cursor = z.string().min(1).max(512);
const version = z.literal(1);
const common = { request_schema_version: version, workspace_public_id: publicId };
const profileInput = z.strictObject({ request_schema_version: version });
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
const profileOutput = response(
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
function forbiddenOutputKeys(value: unknown, allowClaimToken = false, path = ''): boolean {
  if (!value || typeof value !== 'object') return false;
  if (Array.isArray(value))
    return value.some((entry) => forbiddenOutputKeys(entry, allowClaimToken, path + '.*'));
  return Object.entries(value).some(([key, nested]) => {
    const at = path ? path + '.' + key : key;
    // A token is intentionally returned ONLY in the authenticated claim tool's
    // closed data.claimed_items[*] output. Never echo it in content or logs.
    if (key === 'claim_token' && allowClaimToken && at === 'data.claimed_items.*.claim_token')
      return false;
    return (
      /^(access_token|refresh_token|authorization|password|secret|claim_token|reservation_token|owner_user_id|oauth_client_id|internal_id)$/i.test(
        key,
      ) || forbiddenOutputKeys(nested, allowClaimToken, at)
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
  try {
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
    let raw: unknown;
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
    const parsed = schema.safeParse(raw);
    if (!parsed.success || forbiddenOutputKeys(parsed.data, tool === 'claim_content_plan_items')) {
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
    (args) =>
      invoke(
        'get_account_profile',
        scoped,
        {
          p_request_schema_version: args.request_schema_version,
        },
        profileOutput,
      ),
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
