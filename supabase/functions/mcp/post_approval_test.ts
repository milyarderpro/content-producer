import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { POST_APPROVAL_TOOL_NAMES } from './post_approval.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const postId = '77777777-7777-4777-8777-777777777777';
const factId = '88888888-8888-4888-8888-888888888888';
const operation = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-14T12:00:00Z';
const contentHash = 'a'.repeat(64);
const context: RequestContext = {
  requestId: '6.11-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-user-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const checks = {
  schema_version: 1,
  gate_version: 1,
  evaluated_at: stamp,
  evaluator: 'server',
  post_revision: 2,
  content_hash: contentHash,
  config_version: 1,
  renderer_version: 1,
  overall_status: 'passed',
  checks: [],
};
const response: Record<string, object> = {
  approve_post: {
    post_public_id: postId,
    status: 'ready',
    revision: 2,
    approval: {
      approved_revision: 2,
      content_hash: contentHash,
      approved_at: stamp,
      accepted_warning_ids: [],
      warning_acceptance_reason: null,
    },
    recomputed_checks: checks,
    replayed: false,
  },
  revoke_post_approval: {
    post_public_id: postId,
    status: 'draft',
    revision: 3,
    approval_revoked: true,
    replayed: false,
  },
  discard_post: {
    post_public_id: postId,
    status: 'discarded',
    revision: 4,
    released_fact_public_ids: [factId],
    plan_item: null,
    replayed: false,
  },
};
function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}
async function mcp(method: string, params?: object) {
  const res = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 611, method, ...(params ? { params } : {}) }),
    }),
  );
  check(res.status === 200, 'MCP_HTTP_STATUS');
  const raw = await res.text();
  const frame = raw.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : raw);
}
async function call(name: string, args: object) {
  return (await mcp('tools/call', { name, arguments: args })).result;
}
const common = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: operation,
  post_public_id: postId,
};
const approveArgs = {
  ...common,
  expected_revision: 1,
  expected_content_hash: contentHash,
  explicit_approval: true,
  accepted_warning_ids: [],
};
const revokeArgs = {
  ...common,
  expected_revision: 2,
  expected_content_hash: contentHash,
  reason: 'Withdraw approval after review.',
  explicit_revocation: true,
};
const discardArgs = {
  ...common,
  expected_revision: 3,
  reason: 'Abandon this pre-publication post.',
  explicit_discard: true,
};

Deno.test(
  '6.11: exactly 28 OAuth tools with closed approval/discard schemas and exact annotations',
  async () => {
    const tools = (await mcp('tools/list')).result.tools;
    check(MCP_TOOL_COUNT === 28 && tools.length === 28, 'EXACT_28');
    for (const name of POST_APPROVAL_TOOL_NAMES) {
      const tool = tools.find((entry: { name: string }) => entry.name === name);
      check(tool?.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
      check(tool?.outputSchema.additionalProperties === false, 'CLOSED_OUTPUT');
      check(tool?._meta.securitySchemes[0].type === 'oauth2', 'OAUTH');
      check(tool.annotations.readOnlyHint === false, 'WRITE_TOOL');
      check(tool.annotations.openWorldHint === false, 'CLOSED_WORLD');
      check(
        tool.annotations.destructiveHint === (name === 'discard_post'),
        'DESTRUCTIVE_HINT',
      );
      check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE');
    }
  },
);

Deno.test(
  '6.11: forwards original JWT and exact explicit lifecycle arguments to public RPCs',
  async () => {
    const oldFetch = globalThis.fetch;
    const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      const name = String(input).split('/').pop()!;
      const headers = new Headers(init?.headers);
      check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
      check(headers.get('apikey') === context.publishableKey, 'PUBLIC_KEY');
      check(headers.get('Content-Profile') === 'api', 'PUBLIC_RPC');
      calls.push({ name, params: JSON.parse(String(init?.body)) });
      return Promise.resolve(
        Response.json({ response_schema_version: 1, data: response[name] }),
      );
    }) as typeof fetch;
    try {
      const approved = await call('approve_post', approveArgs);
      check(!approved.isError && approved.structuredContent.data.status === 'ready', 'APPROVE_OK');
      const revoked = await call('revoke_post_approval', revokeArgs);
      check(!revoked.isError && revoked.structuredContent.data.approval_revoked, 'REVOKE_OK');
      const discarded = await call('discard_post', discardArgs);
      check(
        !discarded.isError &&
          discarded.structuredContent.data.released_fact_public_ids[0] === factId,
        'DISCARD_OK',
      );
      check(
        calls.map((entry) => entry.name).join(',') ===
          'approve_post,revoke_post_approval,discard_post',
        'EXACT_RPCS',
      );
      check(calls[0].params.p_explicit_approval === true, 'EXPLICIT_APPROVAL');
      check(calls[0].params.p_warning_acceptance_reason === null, 'NULL_WARNING_REASON');
      check(calls[1].params.p_explicit_revocation === true, 'EXPLICIT_REVOCATION');
      check(calls[2].params.p_explicit_discard === true, 'EXPLICIT_DISCARD');
      check(
        calls.every(
          (entry) =>
            !Object.keys(entry.params).some((key) => /^p_(actor|client|oauth|owner)/.test(key)),
        ),
        'NO_IDENTITY_OVERRIDES',
      );
      check(!JSON.stringify(approved.content).includes(context.accessToken), 'NO_TOKEN_LEAK');
    } finally {
      globalThis.fetch = oldFetch;
    }
  },
);

Deno.test(
  '6.11: missing intent, bad CAS, warning mismatch, foreign owner and unsafe reasons fail before RPC',
  async () => {
    const oldFetch = globalThis.fetch;
    let hits = 0;
    globalThis.fetch = (() => {
      hits++;
      return Promise.resolve(Response.json({}));
    }) as typeof fetch;
    try {
      for (const [name, args] of [
        ['approve_post', { ...approveArgs, explicit_approval: false }],
        ['approve_post', { ...approveArgs, expected_revision: 0 }],
        ['approve_post', { ...approveArgs, expected_content_hash: 'bad' }],
        [
          'approve_post',
          {
            ...approveArgs,
            accepted_warning_ids: ['trivia.caption_supportive'],
            warning_acceptance_reason: null,
          },
        ],
        [
          'approve_post',
          {
            ...approveArgs,
            accepted_warning_ids: [],
            warning_acceptance_reason: 'Unneeded waiver reason.',
          },
        ],
        ['approve_post', { ...approveArgs, accepted_warning_ids: ['not.allowlisted'] }],
        ['approve_post', { ...approveArgs, owner_user_id: context.actorUserId }],
        ['revoke_post_approval', { ...revokeArgs, explicit_revocation: false }],
        ['revoke_post_approval', { ...revokeArgs, reason: 'secret=private' }],
        ['discard_post', { ...discardArgs, explicit_discard: false }],
        ['discard_post', { ...discardArgs, expected_revision: -1 }],
        ['discard_post', { ...discardArgs, workspace_public_id: postId }],
      ] as const) {
        const result = await call(name, args);
        check(result.isError === true, 'REJECT_' + name);
      }
      check(hits === 0, 'INVALID_DID_NOT_REACH_RPC');
    } finally {
      globalThis.fetch = oldFetch;
    }
  },
);

Deno.test('6.11: lifecycle outputs fail closed on backend field injection', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (() =>
    Promise.resolve(
      Response.json({
        response_schema_version: 1,
        data: { ...response.approve_post, owner_user_id: context.actorUserId },
      }),
    )) as typeof fetch;
  try {
    const result = await call('approve_post', approveArgs);
    check(
      result.isError && result.structuredContent.error.code === 'DATABASE_UNAVAILABLE',
      'BACKEND_RESPONSE_REJECTED',
    );
  } finally {
    globalThis.fetch = oldFetch;
  }
});
