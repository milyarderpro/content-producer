import { createAuthenticatedTransport } from './transport.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { buildPilotRpcStatement } from './pilot_db.ts';
import type { RequestContext } from './auth.ts';

const retired = [
  'trivia_find_similar_facts', 'trivia_register_and_reserve_facts',
  'trivia_release_facts', 'save_post', 'revise_post',
];
const context: RequestContext = {
  requestId: 'v2-cutover-fixture',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: '44444444-4444-4444-8444-444444444444',
  accessToken: 'fixture-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'fixture-public-key',
};
function assert(value: unknown, detail: string): asserts value {
  if (!value) throw new Error(detail);
}
async function mcp(method: string, params?: object) {
  const response = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 81, method,
        ...(params ? { params } : {}) }),
    }),
  );
  const body = await response.text();
  const frame = body.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : body);
}

Deno.test('CR-059 catalog has exactly 31 tools and refuses v1 calls before database access', async () => {
  const original = globalThis.fetch;
  let dispatched = 0;
  globalThis.fetch = (() => {
    dispatched++;
    throw new Error('Retired operation reached database');
  }) as typeof fetch;
  try {
    const listed = await mcp('tools/list');
    const names = (listed.result.tools as Array<{ name: string }>).map(tool => tool.name);
    assert(MCP_TOOL_COUNT === 31 && names.length === 31, 'EXACT_31_TOOLS');
    assert(new Set(names).size === 31, 'DUPLICATE_TOOL');
    for (const name of [
      'get_account_profile', 'get_workspace_context', 'list_pages',
      'create_content_plan', 'claim_content_plan_items', 'list_posts',
      'get_post', 'approve_post', 'reschedule_post', 'mark_post_posted',
      'archive_post', 'record_post_performance', 'get_post_performance',
      'get_performance_insights', 'trivia_find_similar_facts_v2',
      'save_post_v2', 'revise_post_v2',
    ]) assert(names.includes(name), 'SHARED_OR_V2_TOOL_MISSING_' + name);
    for (const name of retired) {
      assert(!names.includes(name), 'RETIRED_TOOL_LISTED_' + name);
      const called = await mcp('tools/call', { name, arguments: {} });
      assert(called.error || called.result?.isError, 'RETIRED_CALL_ACCEPTED_' + name);
      let pilotDenied = false;
      try {
        buildPilotRpcStatement(name, {});
      } catch {
        pilotDenied = true;
      }
      assert(pilotDenied, 'PILOT_ALIAS_ACCEPTED_' + name);
    }
    for (const name of ['trivia_reverify_fact', 'trivia_correct_fact']) {
      assert(names.includes(name), 'V2_MAINTENANCE_MISSING_' + name);
      const result = await mcp('tools/call', { name,
        arguments: { request_schema_version: 1 } });
      assert(result.error || result.result?.isError, 'V1_MAINTENANCE_INPUT_ACCEPTED_' + name);
    }
    assert(dispatched === 0, 'RETIRED_CALL_DISPATCHED');
  } finally {
    globalThis.fetch = original;
  }
});
