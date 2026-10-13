import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { PLAN_CLAIM_TOOL_NAMES } from './plan_claim.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const foreign = '55555555-5555-4555-8555-555555555555';
const planId = '77777777-7777-4777-8777-777777777777';
const itemId = '88888888-8888-4888-8888-888888888888';
const claimToken = 'aaaa1111-aaaa-4aaa-8aaa-aaaa1111aaaa';
const operation = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-13T12:00:00Z';
const expiry = '2026-10-13T12:30:00Z';
const renewedExpiry = '2026-10-13T13:00:00Z';
const context: RequestContext = {
  requestId: '6.5-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'signed-user-jwt-fixture',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-anon-key',
};
const item = {
  plan_item_public_id: itemId,
  plan_public_id: planId,
  position: 1,
  status: 'in_progress',
  scheduled_at: null,
  topic_key: 'animals',
  format_key: 'single_subject_fast',
  interaction_goal: 'share',
  item_config: {},
  attempt_count: 1,
  claim_expires_at: expiry,
  active_post_public_id: null,
  last_error: null,
  created_at: stamp,
  updated_at: stamp,
};
const plan = {
  plan_public_id: planId,
  name: 'Batch',
  page_public_id: '66666666-6666-4666-8666-666666666666',
  niche_key: 'trivia',
  status: 'failed',
  requested_count: 1,
  progress: { pending: 0, in_progress: 0, completed: 0, failed: 1, cancelled: 0 },
  created_at: stamp,
  updated_at: stamp,
};
const shared = { request_schema_version: 1, workspace_public_id: workspace, operation_key: operation };
const claimArgs = { ...shared, plan_public_id: planId, lease_minutes: 30 };
const renewArgs = { ...shared, plan_item_public_id: itemId, claim_token: claimToken };
const failArgs = {
  ...renewArgs,
  failure_code: 'FACT_SOURCE_INSUFFICIENT',
  failure_detail: 'Viable sources were insufficient.',
  retry_recommended: true,
};
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
function envelope(data: object) {
  return { response_schema_version: 1, data };
}
const claimData = {
  plan_public_id: planId,
  claimed_items: [{
    item,
    claim_token: claimToken,
    claimed_at: stamp,
    claim_expires_at: expiry,
    claim_renewal_count: 0,
  }],
  remaining_claimable_count: 0,
  replayed: false,
};
const reply: Record<string, object> = {
  claim_content_plan_items: envelope(claimData),
  renew_content_plan_claim: envelope({
    plan_item_public_id: itemId,
    claim_expires_at: renewedExpiry,
    claim_renewal_count: 1,
    replayed: false,
  }),
  report_content_plan_item_failure: envelope({
    item: {
      ...item,
      status: 'failed',
      claim_expires_at: null,
      last_error: { code: 'FACT_SOURCE_INSUFFICIENT', detail: failArgs.failure_detail },
    },
    plan,
    replayed: false,
  }),
};
async function mcp(method: string, params?: object) {
  const res = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 65, method, ...(params ? { params } : {}) }),
    }),
  );
  assert(res.status === 200, 'MCP HTTP status');
  return await res.json() as {
    result?: {
      content?: Array<{ type: string; text: string }>;
      structuredContent?: Record<string, unknown>;
      isError?: boolean;
      tools?: Array<Record<string, unknown>>;
    };
    error?: unknown;
  };
}
async function call(name: string, args: object) {
  const response = await mcp('tools/call', { name, arguments: args });
  return response.result;
}

Deno.test('6.5 registry exposes exactly twelve OAuth tools and no profile/annotation drift', async () => {
  const listed = await mcp('tools/list');
  const tools = listed.result?.tools ?? [];
  assert(MCP_TOOL_COUNT === 12 && tools.length === 12, 'exact 12 registered tools');
  for (const name of PLAN_CLAIM_TOOL_NAMES) {
    const tool = tools.find((t) => t.name === name);
    assert(tool, 'missing claim tool ' + name);
    const meta = tool._meta as { securitySchemes?: Array<{ type: string; scopes: string[] }> };
    assert(meta?.securitySchemes?.[0]?.type === 'oauth2', 'OAuth scheme');
    assert(meta?.securitySchemes?.[0]?.scopes?.join(' ') === 'openid email', 'OAuth scopes');
    const annotations = tool.annotations as Record<string, boolean>;
    assert(annotations.readOnlyHint === false, 'claim tool must be a write');
    assert(annotations.destructiveHint === false && annotations.openWorldHint === false, 'annotations');
    assert(!Object.hasOwn(meta, 'openai/profile'), 'claim tool cannot be profile');
    assert((tool.inputSchema as { additionalProperties?: boolean }).additionalProperties === false, 'closed input');
    assert((tool.outputSchema as { additionalProperties?: boolean }).additionalProperties === false, 'closed output');
  }
  assert(!tools.some((t) => t.name === 'retry_content_plan_item'), '6.6 not yet registered');
});

Deno.test('6.5 public MCP calls forward only allowlisted api RPCs with original JWT, lease, key, token and safe failure', async () => {
  const original = globalThis.fetch;
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const name = String(input).split('/').pop()!;
    const headers = new Headers(init?.headers);
    assert(String(input).endsWith('/rest/v1/rpc/' + name), 'wrong RPC endpoint');
    assert(headers.get('Content-Profile') === 'api', 'api RPC schema');
    assert(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'original user JWT');
    assert(headers.get('apikey') === context.publishableKey, 'publishable key only');
    assert(init?.method === 'POST' && init.redirect === 'error', 'RPC transport');
    const params = JSON.parse(String(init.body)) as Record<string, unknown>;
    calls.push({ name, params });
    assert(Object.hasOwn(reply, name), 'unexpected RPC call');
    return Promise.resolve(Response.json(reply[name]));
  }) as typeof fetch;
  try {
    const claimed = await call('claim_content_plan_items', claimArgs);
    assert(claimed?.isError !== true, 'claim failed');
    const data = claimed?.structuredContent as { data?: typeof claimData };
    assert(data?.data?.claimed_items[0]?.claim_token === claimToken, 'claim token required in structured content');
    assert(!JSON.stringify(claimed?.content).includes(claimToken), 'claim token exposed to text/log summary');
    assert((await call('renew_content_plan_claim', renewArgs))?.isError !== true, 'renew failed');
    assert((await call('report_content_plan_item_failure', failArgs))?.isError !== true, 'failure report failed');
    assert(calls.map((c) => c.name).join(',') === PLAN_CLAIM_TOOL_NAMES.join(','), 'RPC order/names');
    assert(calls.every((c) => c.params.p_workspace_public_id === workspace), 'workspace owner binding');
    assert(calls.every((c) => c.params.p_operation_key === operation), 'operation key preserved');
    assert(calls[0].params.p_limit === 1 && calls[0].params.p_lease_minutes === 30, 'lease/default');
    assert(calls[1].params.p_claim_token === claimToken && calls[2].params.p_claim_token === claimToken, 'claim token passed only to expected RPCs');
    assert(calls[2].params.p_failure_detail === failArgs.failure_detail &&
      calls[2].params.p_retry_recommended === true, 'safe failure untouched');
    assert(calls.every((c) => !Object.keys(c.params).some((k) => /^(p_actor|p_owner|p_oauth_client|p_service)/.test(k))), 'identity override');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('6.5 invalid or foreign claim inputs never invoke business RPC', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (() => {
    calls++;
    return Promise.resolve(Response.json(reply.claim_content_plan_items));
  }) as typeof fetch;
  try {
    const invalids: Array<[string, object]> = [
      ['claim_content_plan_items', { ...claimArgs, workspace_public_id: foreign }],
      ['claim_content_plan_items', { ...claimArgs, limit: 0 }],
      ['claim_content_plan_items', { ...claimArgs, limit: 4 }],
      ['claim_content_plan_items', { ...claimArgs, lease_minutes: 60 }],
      ['claim_content_plan_items', { ...claimArgs, operation_key: 'invalid' }],
      ['claim_content_plan_items', { ...claimArgs, invented_actor_id: context.actorUserId }],
      ['renew_content_plan_claim', { ...renewArgs, claim_token: 'not-a-uuid' }],
      ['renew_content_plan_claim', { ...renewArgs, workspace_public_id: foreign }],
      ['report_content_plan_item_failure', { ...failArgs, failure_code: 'FAKE_CODE' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: 'Bearer eyJSecret' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: 'SQLSTATE 42501' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: 'api_key=secret' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: ' invalid' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: '' }],
      ['report_content_plan_item_failure', { ...failArgs, failure_detail: 'x'.repeat(501) }],
      ['report_content_plan_item_failure', { ...failArgs, retry_recommended: 'yes' }],
      ['report_content_plan_item_failure', { ...failArgs, claim_token: claimToken, extra: true }],
    ];
    for (const [name, args] of invalids) {
      const result = await call(name, args);
      assert(result?.isError === true || result === undefined, 'invalid input admitted to ' + name);
    }
    assert(calls === 0, 'invalid/foreign inputs must never reach RPC');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('6.5 replay claim returns identical historical token/expiry without hidden renewal', async () => {
  const original = globalThis.fetch;
  const snapshots: object[] = [
    envelope(claimData),
    envelope({ ...claimData, replayed: true }),
    envelope({ ...claimData, claimed_items: [], remaining_claimable_count: 0, replayed: false }),
  ];
  let n = 0;
  globalThis.fetch = (() => Promise.resolve(Response.json(snapshots[n++]))) as typeof fetch;
  try {
    const first = await call('claim_content_plan_items', { ...claimArgs, limit: 1 });
    const second = await call('claim_content_plan_items', { ...claimArgs, limit: 1 });
    const empty = await call('claim_content_plan_items', { ...claimArgs, limit: 3, operation_key: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' });
    const data = (r: typeof first) => (r?.structuredContent as { data: typeof claimData }).data;
    assert(data(first).claimed_items[0].claim_token === data(second).claimed_items[0].claim_token, 'replay rotated token');
    assert(data(first).claimed_items[0].claim_expires_at === data(second).claimed_items[0].claim_expires_at, 'replay extended lease');
    assert(data(second).replayed === true, 'replay marker missing');
    assert(data(empty).claimed_items.length === 0 && data(empty).remaining_claimable_count === 0, 'empty is successful');
    assert(n === 3, 'unexpected RPC call count');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test('6.5 safe error mapping, rate limit, and token privacy fail closed on malformed RPC output', async () => {
  const original = globalThis.fetch;
  const errors = [
    'PLAN_ITEM_CLAIM_MISMATCH',
    'PLAN_ITEM_CLAIM_EXPIRED',
    'PLAN_CLAIM_RENEWAL_LIMIT',
    'PLAN_STATUS_CONFLICT',
    'OPERATION_KEY_REUSED',
    'RATE_LIMITED',
  ];
  let n = 0;
  globalThis.fetch = (() => {
    const index = n++;
    if (index < errors.length)
      return Promise.resolve(Response.json({
        code: 'P0001',
        message: errors[index],
        details: 'SQLSTATE internal_id=42 authorization secret',
      }, { status: 400 }));
    return Promise.resolve(Response.json(envelope({
      ...claimData,
      claimed_items: [{ ...claimData.claimed_items[0], item: { ...item, item_config: { claim_token: claimToken } } }],
    })));
  }) as typeof fetch;
  try {
    for (const expected of errors) {
      const response = await call('claim_content_plan_items', claimArgs);
      const text = JSON.stringify(response);
      assert(response?.isError === true && text.includes(expected), 'missing safe error ' + expected);
      assert(!text.includes('SQLSTATE') && !text.includes('internal_id'), 'raw SQL leak');
      assert(!text.includes(claimToken), 'token in error');
      if (expected === 'RATE_LIMITED') assert(text.includes('retry_after_seconds'), 'rate limit recovery hint');
    }
    const malformed = await call('claim_content_plan_items', claimArgs);
    assert(malformed?.isError === true, 'unexpected nested token must be rejected');
    assert(!JSON.stringify(malformed).includes(claimToken), 'nested token leaked');
  } finally {
    globalThis.fetch = original;
  }
});
