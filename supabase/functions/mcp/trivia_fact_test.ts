import { createAuthenticatedTransport } from './transport.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

const retired = [
  'trivia_find_similar_facts',
  'trivia_register_and_reserve_facts',
  'trivia_release_facts',
  'save_post',
  'revise_post',
] as const;
const context = {
  requestId: 'cr-059-retired-tools',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: '44444444-4444-4444-8444-444444444444',
  accessToken: 'fixture-owner-jwt',
  supabaseUrl: 'https://invalid.example',
  publishableKey: 'fixture-public-key',
};
function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}
async function mcp(method: string, params?: object) {
  const response = await createAuthenticatedTransport(context).fetch(new Request('http://localhost/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  }));
  const body = await response.text();
  const frame = body.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : body);
}

Deno.test('CR-059 owner catalog contains 33 unique tools and no retired trivia v1 name', async () => {
  const listed = (await mcp('tools/list')).result.tools as Array<{ name: string }>;
  check(MCP_TOOL_COUNT === 33 && listed.length === 33, 'ACTIVE_31_TOOLS');
  check(new Set(listed.map((tool) => tool.name)).size === 33, 'UNIQUE_TOOLS');
  for (const name of retired) check(!listed.some((tool) => tool.name === name), 'RETIRED_VISIBLE_' + name);
  for (const name of ['trivia_find_similar_facts_v2', 'save_post_v2', 'revise_post_v2']) {
    check(listed.some((tool) => tool.name === name), 'V2_MISSING_' + name);
  }
});

Deno.test('CR-059 five retired tool calls fail before business RPC dispatch', async () => {
  const old = globalThis.fetch;
  let dispatches = 0;
  globalThis.fetch = () => { dispatches++; throw new Error('business RPC must not run'); };
  try {
    for (const name of retired) {
      const result = await mcp('tools/call', { name, arguments: {
        request_schema_version: 1, workspace_public_id: context.workspacePublicId,
      } });
      check(!!result.error || result.result?.isError === true, 'RETIRED_ACCEPTED_' + name);
    }
    check(dispatches === 0, 'RETIRED_RPC_DISPATCHED');
  } finally { globalThis.fetch = old; }
});
