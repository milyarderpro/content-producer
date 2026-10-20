import { createMcpHandler } from '@modelcontextprotocol/server';
import { createAuthenticatedTransport } from './transport.ts';
import { createMcpServer } from './server.ts';
import type { RequestContext } from './auth.ts';
import { FOUNDATION_TOOL_NAMES } from './foundation.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

const owner = '11111111-1111-4111-8111-111111111111';
const workspace = '44444444-4444-4444-8444-444444444444';
const foreign = '55555555-5555-4555-8555-555555555555';
const page = '66666666-6666-4666-8666-666666666666';
const context: RequestContext = {
  requestId: '6.3-local',
  actorUserId: owner,
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'signed-user-jwt-fixture',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-anon-key',
};
function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function assertClosedObjects(schema: unknown, path = 'schema'): void {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    schema.forEach((value, index) => assertClosedObjects(value, path + '[' + index + ']'));
    return;
  }
  const value = schema as Record<string, unknown>;
  if (value.type === 'object') {
    assert(value.additionalProperties === false, 'open object schema at ' + path);
  }
  for (const [key, child] of Object.entries(value)) {
    assertClosedObjects(child, path + '.' + key);
  }
}
function mcp(method: string, params?: object) {
  return new Request('http://127.0.0.1:54321/functions/v1/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 3, method, ...(params ? { params } : {}) }),
  });
}
function envelope(data: object) {
  return { response_schema_version: 1, data };
}
const date = '2026-10-13T12:00:00Z';
const niche = {
  niche_key: 'trivia',
  is_enabled: true,
  is_default: true,
  config_schema_version: 1,
  updated_at: date,
};
const summary = {
  page_public_id: page,
  name: 'Owner Page',
  slug: 'owner-page',
  timezone: 'UTC',
  target_markets: ['US'],
  is_active: true,
  enabled_niches: [niche],
  updated_at: date,
};
const payloads: Record<string, object> = {
  get_account_profile: envelope({
    profile: {
      id: owner,
      display_name: 'Owner',
      email_hint: 'o***@example.test',
      workspace_public_id: workspace,
      workspace_name: 'Owner workspace',
      account_status: 'active',
    },
  }),
  get_workspace_context: envelope({
    workspace: {
      public_id: workspace,
      name: 'Owner workspace',
      language_code: 'en',
      target_markets: ['US'],
      default_timezone: 'UTC',
      defaults: {
        schema_version: 1,
        reservation_ttl_minutes: 30,
        default_post_status: 'draft',
        default_plan_chunk_size: 3,
      },
    },
    modules: [
      {
        niche_key: 'trivia',
        display_name: 'Trivia',
        module_version: 1,
        status: 'active',
        capabilities: ['project_generation_context'],
        config_schema_versions: [1],
        content_schema_versions: [1],
      },
    ],
    page_counts: { active: 1, inactive: 0 },
  }),
  list_pages: envelope({ items: [summary], next_cursor: 'eyJjdXJzb3IiOiIxIn0=', has_more: true }),
  get_page_generation_context: envelope({
    page: { ...summary, created_at: date },
    module: {
      niche_key: 'trivia',
      display_name: 'Trivia',
      module_version: 1,
      status: 'active',
      config_schema_version: 1,
      content_schema_versions: [1],
      capabilities: ['project_generation_context'],
    },
    config_public_id: '44444444-4444-4444-8444-444444444444',
    config: {
      allowed_formats: ['single_subject_fast'],
      format_weights: {
        single_subject_fast: 35,
        themed_utility: 20,
        emotional_animal_collection: 20,
        comparison: 15,
        myth_vs_fact: 10,
      },
      allowed_topics: ['animals'],
      topic_group_weights: {
        animals_pet_safety: 30,
        human_body_food_myth: 20,
        practical_utility: 15,
        places_geography: 15,
        nature_space: 10,
        history_inventions_people: 10,
      },
      fact_count: { mode: 'adaptive', min: 5, preferred: 5, max: 9 },
      profiles: {
        fast_trivia: {
          fact_count_min: 7,
          fact_count_max: 8,
          words_per_fact_min: 8,
          words_per_fact_max: 11,
          total_words_min: 65,
          total_words_max: 85,
        },
        practical_utility: {
          fact_count_min: 5,
          fact_count_max: 6,
          words_per_fact_min: 10,
          words_per_fact_max: 14,
          total_words_min: 65,
          total_words_max: 85,
        },
      },
      fact_reuse_scope: 'workspace_unique',
      render_style: 'plain_lines',
      allowed_interaction_goals: ['share'],
      text_budget: {
        hook_max_chars: 45,
        fact_max_chars: 90,
        facts_total_max_chars: 500,
        cta_max_chars: 50,
        canva_total_max_chars: 600,
      },
      caption: { max_chars: 500 },
      hashtags: { default_count: 3, min_count: 0, max_count: 5 },
      style: {
        english_variant: 'en-US',
        tone: 'conversational_credible',
        emoji_allowed: false,
        regional_slang_allowed: false,
      },
    },
    generation_rules: {
      allowed_topics: ['animals'],
      allowed_formats: ['single_subject_fast'],
      allowed_profiles: ['fast_trivia', 'practical_utility'],
      allowed_interaction_goals: ['share'],
      fact_count: { mode: 'adaptive', min: 5, preferred: 5, max: 9 },
      profiles: {
        fast_trivia: {
          fact_count_min: 7,
          fact_count_max: 8,
          words_per_fact_min: 8,
          words_per_fact_max: 11,
          total_words_min: 65,
          total_words_max: 85,
        },
        practical_utility: {
          fact_count_min: 5,
          fact_count_max: 6,
          words_per_fact_min: 10,
          words_per_fact_max: 14,
          total_words_min: 65,
          total_words_max: 85,
        },
      },
      text_budget: {
        hook_max_chars: 45,
        fact_max_chars: 90,
        facts_total_max_chars: 500,
        cta_max_chars: 50,
        canva_total_max_chars: 600,
      },
      locale: 'en-US',
      english_variant: 'US',
      render_style: 'plain_lines',
    },
    reuse_policy: {
      scope: 'workspace_unique',
      reservation_ttl_minutes: 30,
      requires_verified_facts: true,
      eligible_fact_count: 0,
    },
    recent_variety: [],
    performance_signals: [],
    context_version: { page_updated_at: date, config_updated_at: date },
  }),
};
async function request(method: string, params?: object) {
  const result = await createAuthenticatedTransport(context).fetch(mcp(method, params));
  assert(result.status === 200, `${method}: HTTP ${result.status}`);
  return await result.text();
}
Deno.test(
  '6.3 four foundation reads alongside five 6.4 tools; profile alone has metadata',
  async () => {
    const listed = await request('tools/list');
    for (const name of FOUNDATION_TOOL_NAMES) assert(listed.includes(name), 'missing ' + name);
    assert((listed.match(/"readOnlyHint":true/g) || []).length === 11, 'eleven read-only tools');
    assert((listed.match(/"openWorldHint":false/g) || []).length === 33, 'open world must be off');
    assert(listed.split('"openai/profile":true').length === 2, 'one profile metadata');
    assert((listed.match(/"oauth2"/g) || []).length === 66, '33 OAuth schemes with mirrors');
    assert(listed.includes('create_page'), '6.4 tool must be present');
  },
);

Deno.test('All registered tool input/output object schemas are closed recursively', async () => {
  const raw = await request('tools/list');
  const frame = raw.split('\n').find((line) => line.startsWith('data: '));
  assert(frame, 'tools/list must return an MCP data frame');
  const parsed = JSON.parse(frame.slice(6));
  const tools = parsed.result?.tools ?? [];
  assert(tools.length === MCP_TOOL_COUNT && tools.length === 33, 'exact 33 schemas');
  assert(new Set(tools.map((tool: { name: string }) => tool.name)).size === 33, 'unique names');
  for (const tool of tools) {
    assertClosedObjects(tool.inputSchema, tool.name + '.input');
    if (tool.name === 'get_account_profile') {
      assertClosedObjects(tool.outputSchema, 'wire.oauth.profile.output');
    } else {
      assert(!Object.hasOwn(tool, 'outputSchema'), 'only profile publishes outputSchema');
    }
    assert(tool.securitySchemes?.[0]?.type === 'oauth2', tool.name + ' top-level OAuth');
    assert(
      JSON.stringify(tool.securitySchemes) === JSON.stringify(tool._meta?.securitySchemes),
      tool.name + ' OAuth mirror mismatch',
    );
    assert(tool.securitySchemes[0].scopes.join(' ') === 'openid email', tool.name + ' scopes');
  }
  // Registered output validators must remain closed even though the
  // ChatGPT-facing OAuth catalog omits optional outputSchema metadata.
  const sdkResponse = await createMcpHandler(() => createMcpServer(context)).fetch(
    mcp('tools/list'),
  );
  assert(sdkResponse.status === 200, 'raw SDK catalog must remain available to tests');
  const sdkBody = await sdkResponse.text();
  const sdkFrame = sdkBody.split('\n').find((line) => line.startsWith('data: '));
  assert(sdkFrame, 'SDK catalog must return a data frame');
  const sdkTools = JSON.parse(sdkFrame.slice(6)).result.tools;
  assert(sdkTools.length === 33, 'raw SDK must still have 33 output schemas');
  for (const sdkTool of sdkTools) {
    assertClosedObjects(sdkTool.outputSchema, sdkTool.name + '.output');
  }
  const sdkProfile = sdkTools.find((tool: { name: string }) => tool.name === 'get_account_profile');
  const profile = tools.find((tool: { name: string }) => tool.name === 'get_account_profile');
  assert(profile?.inputSchema?.additionalProperties === false, 'profile input must be closed');
  assert(Object.keys(profile.inputSchema.properties).length === 0, 'profile must accept {}');
  assert(sdkProfile.outputSchema.required.includes('id'), 'top-level profile id required');
  assert(
    !Object.hasOwn(sdkProfile.outputSchema.properties, 'workspace_public_id'),
    'workspace id must not appear in closed OAuth profile contract',
  );
  assert(
    JSON.stringify(profile.outputSchema) === JSON.stringify(sdkProfile.outputSchema),
    'actual MCP wire must publish the raw registered profile outputSchema',
  );
  assert(
    JSON.stringify(sdkProfile.outputSchema.required) === JSON.stringify(['id']),
    'OAuth profile requires only opaque id',
  );
  assert(sdkProfile.outputSchema.properties.id.type === 'string', 'profile id schema');
});

Deno.test('6.3 MCP calls map four tools to user-JWT, api RPC, with no mutation', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const url = String(input);
    const name = url.split('/').pop()!;
    assert(Object.prototype.hasOwnProperty.call(payloads, name), 'unexpected RPC ' + name);
    assert(init?.method === 'POST', 'only RPC POST allowed');
    assert(url.includes('/rest/v1/rpc/'), 'must use PostgREST RPC');
    assert(
      new Headers(init?.headers).get('Authorization') === 'Bearer ' + context.accessToken,
      'must pass original user JWT',
    );
    assert(new Headers(init?.headers).get('Content-Profile') === 'api', 'must use api schema');
    assert(
      new Headers(init?.headers).get('apikey') === context.publishableKey,
      'must use publishable key, not service role',
    );
    calls.push({ name, args: JSON.parse(String(init?.body)) });
    return Promise.resolve(Response.json(payloads[name]));
  }) as typeof fetch;
  try {
    const profile = await request('tools/call', {
      name: 'get_account_profile',
      arguments: {},
    });
    const profileFrame = profile.split('\n').find((line) => line.startsWith('data: '));
    assert(profileFrame, 'profile must return MCP data frame');
    const profileResult = JSON.parse(profileFrame.slice(6)).result;
    assert(profileResult.structuredContent.id === owner, 'top-level owner identity');
    assert(profileResult.structuredContent.name === 'Owner', 'profile display name');
    assert(profileResult.structuredContent.nickname === 'Owner workspace', 'profile label');
    assert(
      !Object.hasOwn(profileResult.structuredContent, 'workspace_public_id'),
      'OAuth profile must not expose nonstandard workspace_public_id',
    );
    assert(
      Object.keys(profileResult.structuredContent).every((key: string) =>
        ['id', 'name', 'email', 'nickname'].includes(key),
      ),
      'profile response contains nonstandard fields',
    );
    assert(
      profileResult.content[0].text === JSON.stringify(profileResult.structuredContent),
      'profile text must match structured content',
    );
    assert(!profile.includes('o***@example.test'), 'masked hint must not masquerade as email');
    assert(!profile.includes('access_token'), 'must not expose tokens');
    const ws = await request('tools/call', {
      name: 'get_workspace_context',
      arguments: {},
    });
    assert(ws.includes('Owner workspace'), 'workspace read missing');
    assert(ws.includes(workspace), 'owner-derived workspace public id must remain discoverable');
    const pages = await request('tools/call', {
      name: 'list_pages',
      arguments: {
        request_schema_version: 1,
        workspace_public_id: workspace,
        query: 'Owner',
        active: true,
        niche_key: 'trivia',
        limit: 1,
      },
    });
    assert(pages.includes('next_cursor'), 'pagination cursor missing');
    const generation = await request('tools/call', {
      name: 'get_page_generation_context',
      arguments: {
        request_schema_version: 1,
        workspace_public_id: workspace,
        page_public_id: page,
        niche_key: 'trivia',
        recent_post_limit: 2,
        intent: { topic_key: 'animals', interaction_goal: 'share', scheduled_at: null },
      },
    });
    assert(generation.includes('eligible_fact_count'), 'generation result missing');
    assert(
      generation.includes('44444444-4444-4444-8444-444444444444'),
      'actual config UUID missing from MCP generation context',
    );
    assert(calls.length === 4, 'all 4 RPCs must be executed');
    assert(
      calls[0]?.name === 'get_account_profile' && calls[0]?.args.p_request_schema_version === 1,
      'MCP profile adapter must preserve versioned RPC',
    );
    assert(
      calls[1]?.args.p_request_schema_version === 1 &&
        calls[1]?.args.p_workspace_public_id === workspace,
      'workspace bootstrap must derive owner scope from auth context',
    );
    assert(
      calls[2]?.args.p_query === 'Owner' && calls[2]?.args.p_limit === 1,
      'list_pages filters and pagination lost',
    );
    assert(
      calls[3]?.args.p_intent_topic_key === 'animals' &&
        calls[3]?.args.p_intent_scheduled_at === null,
      'generation intent mapping lost',
    );
    assert(
      calls.every(
        (call) =>
          !Object.keys(call.args).some((key) =>
            /^(p_actor|p_owner|p_oauth_client|p_operation_key)/.test(key),
          ),
      ),
      'facade must not send actor or write args',
    );
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test(
  '6.3 empty pages and auth/owner/invalid input fail closed without RPC mutation',
  async () => {
    const original = globalThis.fetch;
    let count = 0;
    globalThis.fetch = (() => {
      count++;
      return Promise.resolve(
        Response.json(envelope({ items: [], next_cursor: null, has_more: false })),
      );
    }) as typeof fetch;
    try {
      const empty = await request('tools/call', {
        name: 'list_pages',
        arguments: {
          request_schema_version: 1,
          workspace_public_id: workspace,
          query: 'none',
        },
      });
      assert(empty.includes('"items":'), 'empty list must remain structured');
      const before = count;
      const denied = await request('tools/call', {
        name: 'list_pages',
        arguments: {
          request_schema_version: 1,
          workspace_public_id: foreign,
        },
      });
      assert(
        denied.includes('OWNER_ACCESS_REQUIRED') && !denied.includes(foreign),
        'foreign workspace must not be disclosed',
      );
      const invalid = await request('tools/call', {
        name: 'list_pages',
        arguments: {
          request_schema_version: 1,
          workspace_public_id: workspace,
          limit: 0,
        },
      });
      assert(
        invalid.includes('error') && !invalid.includes('items'),
        'invalid pagination must not succeed',
      );
      const forbiddenWorkspace = await request('tools/call', {
        name: 'get_workspace_context',
        arguments: { workspace_public_id: foreign },
      });
      assert(
        forbiddenWorkspace.includes('OWNER_ACCESS_REQUIRED'),
        'OAuth workspace bootstrap must reject foreign workspace IDs',
      );
      const unknown = await request('tools/call', {
        name: 'get_workspace_context',
        arguments: {
          request_schema_version: 1,
          workspace_public_id: workspace,
          extra: 'malicious',
        },
      });
      assert(unknown.includes('error'), 'additional input properties forbidden');
      const oldProfileInput = await request('tools/call', {
        name: 'get_account_profile',
        arguments: { request_schema_version: 1 },
      });
      assert(oldProfileInput.includes('error'), 'versioned MCP profile input must be rejected');
      assert(count === before, 'denied/invalid MCP inputs must never reach PostgREST');
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test('6.3 SQL and sensitive outputs are not returned in tool errors', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json(
        {
          code: 'P0001',
          message: 'PAGE_NOT_FOUND',
          details: 'private SQL detail: token',
        },
        { status: 400 },
      ),
    )) as typeof fetch;
  try {
    const answer = await request('tools/call', {
      name: 'get_page_generation_context',
      arguments: {
        request_schema_version: 1,
        workspace_public_id: workspace,
        page_public_id: page,
        niche_key: 'trivia',
      },
    });
    assert(answer.includes('PAGE_NOT_FOUND'), 'stable domain code missing');
    assert(
      !answer.includes('P0001') && !answer.includes('private SQL'),
      'raw database error disclosed',
    );
  } finally {
    globalThis.fetch = original;
  }
});
