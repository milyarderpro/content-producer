import * as z from 'npm:zod@4.3.6';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { buildPilotRpcStatement } from './pilot_db.ts';
import { createAuthenticatedTransport } from './transport.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const context: RequestContext = {
  requestId: 'phase-10-1-fixed-pilot',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: 'phase-10-1-noauth-fixed-pilot',
  workspacePublicId: '44444444-4444-4444-8444-444444444444',
  accessToken: '',
  supabaseUrl: 'https://invalid.example',
  publishableKey: '',
  pilotMode: true,
};
function request(method: string, params?: object): Request {
  return new Request('http://localhost/functions/v1/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 11, method, ...(params ? { params } : {}) }),
  });
}
function responseJson(body: string): Record<string, unknown> {
  const line = body.split('\n').find((text) => text.startsWith('data: '));
  return JSON.parse((line ?? body).replace(/^data: /, '')) as Record<string, unknown>;
}
function normalizeExpectedWirePatterns(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeExpectedWirePatterns);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key === 'pattern' && typeof entry === 'string'
        ? entry.replaceAll('\\p{Cc}', '\\x00-\\x1F\\x7F-\\x9F')
        : normalizeExpectedWirePatterns(entry),
    ]),
  );
}
Deno.test('10.1 noauth pilot advertises exactly 33 tools without OAuth descriptors', async () => {
  const response = await createAuthenticatedTransport(context).fetch(request('tools/list'));
  assert(response.status === 200, 'catalog must succeed');
  const catalogBody = await response.text();
  assert(
    new TextEncoder().encode(catalogBody).byteLength < 100_000,
    'CR-033 pilot catalog must remain under 100 KB without changing tool count',
  );
  const listed = responseJson(catalogBody);
  const tools = (listed.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(MCP_TOOL_COUNT === 33 && tools.length === 33, 'exact 33 tools');
  assert(new Set(tools.map((tool) => tool.name)).size === 33, 'duplicate tool names');
  assert(
    tools.some((tool) => tool.name === 'create_page'),
    'missing create_page',
  );
  for (const tool of tools) {
    assert(
      JSON.stringify(tool.securitySchemes) === JSON.stringify([{ type: 'noauth' }]),
      'every pilot tool must explicitly advertise top-level noauth',
    );
    const meta = tool._meta as Record<string, unknown> | undefined;
    assert(
      JSON.stringify(meta?.securitySchemes) === JSON.stringify([{ type: 'noauth' }]),
      'every pilot tool must explicitly advertise _meta noauth',
    );
    assert(!('openai/profile' in (meta ?? {})), 'pilot tools must not advertise OAuth profiles');
    assert(!('outputSchema' in tool), 'pilot catalog must omit optional output metadata');
    assert(!('title' in tool), 'pilot catalog must omit redundant display title');
    const input = tool.inputSchema as Record<string, unknown>;
    assert(input.type === 'object', 'pilot input schema must remain object');
    assert(!('$schema' in input), 'omit optional input-schema dialect only');
  }
  const prior = await createAuthenticatedTransport({ ...context, pilotMode: false }).fetch(
    request('tools/list'),
  );
  assert(prior.status === 200, 'legacy schema listing preserved');
  const original = responseJson(await prior.text());
  const originalTools = (original.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(originalTools.length === 33, 'legacy catalog tool count must remain 33');
  for (const compact of tools) {
    const full = originalTools.find((tool) => tool.name === compact.name);
    assert(!!full && 'outputSchema' in full && 'title' in full, 'legacy full output retained');
    const expandedInput = { ...(full.inputSchema as Record<string, unknown>) };
    delete expandedInput.$schema;
    const portable = normalizeExpectedWirePatterns(expandedInput);
    assert(
      JSON.stringify(compact.inputSchema) === JSON.stringify(portable),
      'CR-034: input schema differs beyond equivalent Cc regex patterns',
    );
    assert(
      !JSON.stringify(compact.inputSchema).includes('\\\\p{Cc}'),
      'no Unicode property escape in ChatGPT pilot schema',
    );
  }
  const impactedTools = originalTools
    .filter((tool) => JSON.stringify(tool.inputSchema).includes('\\\\p{Cc}'))
    .map((tool) => tool.name);
  assert(
    JSON.stringify(impactedTools) ===
      JSON.stringify(['mark_post_posted', 'record_post_performance']),
    'unexpected tools have Python-incompatible Cc patterns',
  );
});
Deno.test('10.1 default pilot write latch blocks business RPC before database access', async () => {
  const result = await invoke(
    'create_page',
    context,
    { p_request_schema_version: 1, p_workspace_public_id: context.workspacePublicId },
    z.unknown(),
  );
  assert('isError' in result, 'business write must be blocked');
  assert(JSON.stringify(result).includes('PILOT_WRITE_LOCKED'), 'write latch error code');
});
Deno.test('10.1 foreign workspace must be rejected before SQL connection', async () => {
  const result = await invoke(
    'list_pages',
    context,
    {
      p_request_schema_version: 1,
      p_workspace_public_id: '55555555-5555-4555-8555-555555555555',
    },
    z.unknown(),
  );
  assert('isError' in result, 'foreign workspace must fail');
  assert(JSON.stringify(result).includes('OWNER_ACCESS_REQUIRED'), 'wrong workspace error');
});
Deno.test('10.1 SQL statement builder allows only named parameters, never free SQL', () => {
  assert(
    buildPilotRpcStatement('list_pages', {
      p_request_schema_version: 1,
      p_workspace_public_id: context.workspacePublicId,
    }) ===
      'select api."list_pages"("p_request_schema_version" => $1, "p_workspace_public_id" => $2) as result',
    'named parameter binding changed',
  );
  for (const [name, params] of [
    ['list_pages;drop table public.workspaces', {}],
    ['list_pages', { 'p_limit); drop table x --': 1 }],
    ['public.workspaces', {}],
  ] as Array<[string, Record<string, unknown>]>) {
    let rejected = false;
    try {
      buildPilotRpcStatement(name, params);
    } catch {
      rejected = true;
    }
    assert(rejected, 'unsafe dynamic identifier accepted');
  }
});
