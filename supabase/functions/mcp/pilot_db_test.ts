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
Deno.test('10.1 noauth pilot advertises exactly 33 tools without OAuth descriptors', async () => {
  const response = await createAuthenticatedTransport(context).fetch(request('tools/list'));
  assert(response.status === 200, 'catalog must succeed');
  const listed = responseJson(await response.text());
  const tools = (listed.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(MCP_TOOL_COUNT === 33 && tools.length === 33, 'exact 33 tools');
  assert(new Set(tools.map((tool) => tool.name)).size === 33, 'duplicate tool names');
  assert(tools.some((tool) => tool.name === 'create_page'), 'missing create_page');
  for (const tool of tools) {
    assert(!('securitySchemes' in tool), 'noauth tool must not declare OAuth at top level');
    const meta = tool._meta as Record<string, unknown> | undefined;
    assert(!meta || !('securitySchemes' in meta), 'noauth tool must not advertise OAuth metadata');
  }
});
Deno.test('10.1 default pilot write latch blocks business RPC before database access', async () => {
  const result = await invoke(
    'create_page', context, { p_request_schema_version: 1,
      p_workspace_public_id: context.workspacePublicId }, z.unknown(),
  );
  assert('isError' in result, 'business write must be blocked');
  assert(JSON.stringify(result).includes('PILOT_WRITE_LOCKED'), 'write latch error code');
});
Deno.test('10.1 foreign workspace must be rejected before SQL connection', async () => {
  const result = await invoke(
    'list_pages', context, {
      p_request_schema_version: 1,
      p_workspace_public_id: '55555555-5555-4555-8555-555555555555',
    }, z.unknown(),
  );
  assert('isError' in result, 'foreign workspace must fail');
  assert(JSON.stringify(result).includes('OWNER_ACCESS_REQUIRED'), 'wrong workspace error');
});
Deno.test('10.1 SQL statement builder allows only named parameters, never free SQL', () => {
  assert(
    buildPilotRpcStatement('list_pages', { p_request_schema_version: 1,
      p_workspace_public_id: context.workspacePublicId }) ===
      'select api."list_pages"("p_request_schema_version" => $1, "p_workspace_public_id" => $2) as result',
    'named parameter binding changed',
  );
  for (const [name, params] of [
    ['list_pages;drop table public.workspaces', {}],
    ['list_pages', { 'p_limit); drop table x --': 1 }],
    ['public.workspaces', {}],
  ] as Array<[string, Record<string, unknown>]>) {
    let rejected = false;
    try { buildPilotRpcStatement(name, params); } catch { rejected = true; }
    assert(rejected, 'unsafe dynamic identifier accepted');
  }
});
