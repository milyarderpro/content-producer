import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { FOUNDATION_TOOL_NAMES } from './foundation.ts';

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
  get_account_profile: envelope({ profile: {
    id: owner,
    display_name: 'Owner',
    email_hint: 'o***@example.test',
    workspace_public_id: workspace,
    workspace_name: 'Owner workspace',
    account_status: 'active',
  } }),
  get_workspace_context: envelope({
    workspace: { public_id: workspace, name: 'Owner workspace', language_code: 'en',
      target_markets: ['US'], default_timezone: 'UTC',
      defaults: { schema_version: 1, reservation_ttl_minutes: 30 } },
    modules: [{ niche_key: 'trivia', display_name: 'Trivia', module_version: 1,
      status: 'active', capabilities: ['project_generation_context'],
      config_schema_versions: [1], content_schema_versions: [1] }],
    page_counts: { active: 1, inactive: 0 },
  }),
  list_pages: envelope({ items: [summary], next_cursor: 'eyJjdXJzb3IiOiIxIn0=', has_more: true }),
  get_page_generation_context: envelope({
    page: { ...summary, created_at: date },
    module: { niche_key: 'trivia', display_name: 'Trivia', module_version: 1,
      status: 'active', config_schema_version: 1, content_schema_versions: [1],
      capabilities: ['project_generation_context'] },
    config: { schema_version: 1, allowed_formats: ['single_subject_fast'] },
    generation_rules: { allowed_topics: [], allowed_formats: ['single_subject_fast'],
      allowed_profiles: ['fast_trivia'], allowed_interaction_goals: ['share'],
      fact_count: {}, profiles: {}, text_budget: {}, locale: 'en-US',
      english_variant: 'US', render_style: 'plain_lines' },
    reuse_policy: { scope: 'workspace_unique', reservation_ttl_minutes: 30,
      requires_verified_facts: true, eligible_fact_count: 0 },
    recent_variety: [], performance_signals: [],
    context_version: { page_updated_at: date, config_updated_at: date },
  }),
};
async function request(method: string, params?: object) {
  const result = await createAuthenticatedTransport(context).fetch(mcp(method, params));
  assert(result.status === 200, `${method}: HTTP ${result.status}`);
  return await result.text();
}
Deno.test('6.3 exactly four OAuth-scoped, read-only tools; profile alone has metadata', async () => {
  const listed = await request('tools/list');
  for (const name of FOUNDATION_TOOL_NAMES) assert(listed.includes(name), 'missing ' + name);
  assert((listed.match(/"readOnlyHint":true/g) || []).length === 4, 'read-only annotations');
  assert((listed.match(/"openWorldHint":false/g) || []).length === 4, 'open world must be off');
  assert(listed.split('"openai/profile":true').length === 2, 'one profile metadata');
  assert((listed.match(/"oauth2"/g) || []).length === 4, 'four OAuth security schemes');
  assert(!(listed.includes('create_page')), '6.4 tool not permitted');
});

Deno.test('6.3 MCP calls map four tools to user-JWT, api RPC, with no mutation', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
  globalThis.fetch = (async (input: Request | URL | string, init?: RequestInit) => {
    const url = String(input);
    const name = url.split('/').pop()!;
    assert(Object.prototype.hasOwnProperty.call(payloads, name), 'unexpected RPC ' + name);
    assert(init?.method === 'POST', 'only RPC POST allowed');
    assert(url.includes('/rest/v1/rpc/'), 'must use PostgREST RPC');
    assert(new Headers(init?.headers).get('Authorization') === 'Bearer ' + context.accessToken,
      'must pass original user JWT');
    assert(new Headers(init?.headers).get('Content-Profile') === 'api', 'must use api schema');
    assert(new Headers(init?.headers).get('apikey') === context.publishableKey,
      'must use publishable key, not service role');
    calls.push({ name, args: JSON.parse(String(init?.body)) });
    return Response.json(payloads[name]);
  }) as typeof fetch;
  try {
    const profile = await request('tools/call', {
      name: 'get_account_profile', arguments: { request_schema_version: 1 },
    });
    assert(profile.includes('o***@example.test'), 'masked hint must be available');
    assert(!profile.includes('access_token'), 'must not expose tokens');
    const ws = await request('tools/call', {
      name: 'get_workspace_context',
      arguments: { request_schema_version: 1, workspace_public_id: workspace },
    });
    assert(ws.includes('Owner workspace'), 'workspace read missing');
    const pages = await request('tools/call', { name: 'list_pages', arguments: {
      request_schema_version: 1, workspace_public_id: workspace,
      query: 'Owner', active: true, niche_key: 'trivia', limit: 1,
    } });
    assert(pages.includes('next_cursor'), 'pagination cursor missing');
    const generation = await request('tools/call', { name: 'get_page_generation_context',
      arguments: { request_schema_version: 1, workspace_public_id: workspace,
        page_public_id: page, niche_key: 'trivia', recent_post_limit: 2,
        intent: { topic_key: 'animals', interaction_goal: 'share', scheduled_at: null } } });
    assert(generation.includes('eligible_fact_count'), 'generation result missing');
    assert(calls.length === 4, 'all 4 RPCs must be executed');
    assert(calls[2]?.args.p_query === 'Owner' && calls[2]?.args.p_limit === 1,
      'list_pages filters and pagination lost');
    assert(calls[3]?.args.p_intent_topic_key === 'animals' &&
      calls[3]?.args.p_intent_scheduled_at === null, 'generation intent mapping lost');
    assert(calls.every((call) => !Object.keys(call.args).some((key) =>
      /^(p_actor|p_owner|p_oauth_client|p_operation_key)/.test(key))),
      'facade must not send actor or write args');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('6.3 empty pages and auth/owner/invalid input fail closed without RPC mutation', async () => {
  const original = globalThis.fetch;
  let count = 0;
  globalThis.fetch = (async () => {
    count++;
    return Response.json(envelope({ items: [], next_cursor: null, has_more: false }));
  }) as typeof fetch;
  try {
    const empty = await request('tools/call', { name: 'list_pages', arguments: {
      request_schema_version: 1, workspace_public_id: workspace, query: 'none',
    } });
    assert(empty.includes('"items":'), 'empty list must remain structured');
    const before = count;
    const denied = await request('tools/call', { name: 'list_pages', arguments: {
      request_schema_version: 1, workspace_public_id: foreign,
    } });
    assert(denied.includes('OWNER_ACCESS_REQUIRED') && !denied.includes(foreign),
      'foreign workspace must not be disclosed');
    const invalid = await request('tools/call', { name: 'list_pages', arguments: {
      request_schema_version: 1, workspace_public_id: workspace, limit: 0,
    } });
    assert(invalid.includes('error') && !invalid.includes('items'),
      'invalid pagination must not succeed');
    const unknown = await request('tools/call', { name: 'get_workspace_context', arguments: {
      request_schema_version: 1, workspace_public_id: workspace, extra: 'malicious',
    } });
    assert(unknown.includes('error'), 'additional input properties forbidden');
    assert(count === before, 'denied/invalid MCP inputs must never reach PostgREST');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('6.3 SQL and sensitive outputs are not returned in tool errors', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({
    code: 'P0001', message: 'PAGE_NOT_FOUND', details: 'private SQL detail: token',
  }, { status: 400 })) as typeof fetch;
  try {
    const answer = await request('tools/call', { name: 'get_page_generation_context',
      arguments: { request_schema_version: 1, workspace_public_id: workspace,
        page_public_id: page, niche_key: 'trivia' } });
    assert(answer.includes('PAGE_NOT_FOUND'), 'stable domain code missing');
    assert(!answer.includes('P0001') && !answer.includes('private SQL'),
      'raw database error disclosed');
  } finally {
    globalThis.fetch = original;
  }
});
