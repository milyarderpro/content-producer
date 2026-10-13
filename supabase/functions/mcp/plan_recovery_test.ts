import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { PLAN_RECOVERY_TOOL_NAMES } from './plan_recovery.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const itemId = '88888888-8888-4888-8888-888888888888';
const planId = '77777777-7777-4777-8777-777777777777';
const postId = '66666666-6666-4666-8666-666666666666';
const stamp = '2026-10-13T12:00:00Z';
const context: RequestContext = {
  requestId: '6.6-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-user-jwt-fixture',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const common = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: '99999999-9999-4999-8999-999999999999',
  reason: 'The user requested recovery.',
};
const args: Record<string, Record<string, unknown>> = {
  retry_content_plan_item: { ...common, plan_item_public_id: itemId },
  replace_discarded_plan_item: {
    ...common,
    plan_item_public_id: itemId,
    discarded_post_public_id: postId,
    explicit_replacement: true,
  },
  cancel_content_plan: { ...common, plan_public_id: planId, explicit_cancellation: true },
};
const item = {
  plan_item_public_id: itemId,
  plan_public_id: planId,
  position: 1,
  status: 'pending',
  scheduled_at: null,
  topic_key: 'animals',
  format_key: 'single_subject_fast',
  interaction_goal: 'share',
  item_config: {},
  attempt_count: 3,
  claim_expires_at: null,
  active_post_public_id: null,
  last_error: null,
  created_at: stamp,
  updated_at: stamp,
};
const plan = {
  plan_public_id: planId,
  name: 'Batch',
  page_public_id: postId,
  niche_key: 'trivia',
  status: 'pending',
  requested_count: 2,
  progress: { pending: 1, in_progress: 0, completed: 1, failed: 0, cancelled: 0 },
  created_at: stamp,
  updated_at: stamp,
};
const data: Record<string, Record<string, unknown>> = {
  retry_content_plan_item: { item, plan, replayed: false },
  replace_discarded_plan_item: {
    item,
    plan,
    replacement_history_public_id: 'aaaa1111-aaaa-4aaa-8aaa-aaaa1111aaaa',
    replayed: false,
  },
  cancel_content_plan: {
    plan: {
      ...plan,
      status: 'cancelled',
      progress: { ...plan.progress, pending: 0, cancelled: 1 },
    },
    changed_count: 1,
    preserved_completed_count: 1,
    replayed: false,
  },
};
function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
async function mcp(method: string, params?: object) {
  const response = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 66, method, ...(params ? { params } : {}) }),
    }),
  );
  assert(response.status === 200, 'HTTP MCP status');
  const raw = await response.text();
  const frame = raw.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : raw);
}
async function call(name: string, input = args[name]) {
  return (await mcp('tools/call', { name, arguments: input })).result;
}
const envelope = (value: object) => ({ response_schema_version: 1, data: value });

Deno.test(
  '6.6 exactly fifteen OAuth tools; recovery schemas and destructive cancellation metadata',
  async () => {
    const tools = (await mcp('tools/list')).result.tools;
    assert(MCP_TOOL_COUNT === 15 && tools.length === 15, 'exact fifteen tools');
    for (const name of PLAN_RECOVERY_TOOL_NAMES) {
      const tool = tools.find((t: { name: string }) => t.name === name);
      assert(tool && tool._meta.securitySchemes[0].type === 'oauth2', 'OAuth');
      assert(tool._meta.securitySchemes[0].scopes.join(' ') === 'openid email', 'scopes');
      assert(
        tool.annotations.readOnlyHint === false && tool.annotations.openWorldHint === false,
        'write annotations',
      );
      assert(
        tool.annotations.destructiveHint === (name === 'cancel_content_plan'),
        'cancel destructive',
      );
      assert(
        tool.inputSchema.additionalProperties === false &&
          tool.outputSchema.additionalProperties === false,
        'closed schemas',
      );
      assert(!Object.hasOwn(tool._meta, 'openai/profile'), 'profile metadata');
    }
  },
);

Deno.test(
  '6.6 public MCP forwards original JWT, operation key, distinct retry/replacement and explicit cancellation',
  async () => {
    const original = globalThis.fetch;
    const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      const name = String(input).split('/').pop()!;
      const headers = new Headers(init?.headers);
      assert(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'original JWT');
      assert(
        headers.get('Content-Profile') === 'api' &&
          headers.get('apikey') === context.publishableKey,
        'api / public key',
      );
      const params = JSON.parse(String(init?.body));
      calls.push({ name, params });
      return Promise.resolve(Response.json(envelope(data[name])));
    }) as typeof fetch;
    try {
      for (const name of PLAN_RECOVERY_TOOL_NAMES)
        assert((await call(name))?.isError !== true, 'valid tool call');
      assert(
        calls.map((x) => x.name).join(',') === PLAN_RECOVERY_TOOL_NAMES.join(','),
        'separate RPCs',
      );
      for (const c of calls) {
        assert(
          c.params.p_operation_key === common.operation_key && c.params.p_reason === common.reason,
          'key/reason unchanged',
        );
        assert(c.params.p_workspace_public_id === workspace, 'owner scope');
        assert(
          !Object.keys(c.params).some((k) => /p_actor|p_owner|p_oauth/.test(k)),
          'no identity override',
        );
      }
      assert(
        calls[1].params.p_explicit_replacement === true &&
          calls[2].params.p_explicit_cancellation === true,
        'confirmation preserved',
      );
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test(
  '6.6 invalid confirmation, safe reason, identity override and foreign owner never reach business RPC',
  async () => {
    const original = globalThis.fetch;
    let calls = 0;
    globalThis.fetch = (() => {
      calls++;
      return Promise.resolve(Response.json({}));
    }) as typeof fetch;
    try {
      for (const name of PLAN_RECOVERY_TOOL_NAMES) {
        for (const patch of [
          { reason: '' },
          { reason: 'x'.repeat(501) },
          { reason: 'Bearer eyJSecret' },
          { reason: 'SQLSTATE 42501' },
          { reason: 'token=secret' },
          { reason: ' untrimmed' },
          { operation_key: 'invalid' },
          { actor_user_id: context.actorUserId },
          { workspace_public_id: '55555555-5555-4555-8555-555555555555' },
        ]) {
          const result = await call(name, { ...args[name], ...patch });
          assert(!result || result.isError === true, 'invalid input admitted');
        }
      }
      for (const [name, field] of [
        ['replace_discarded_plan_item', 'explicit_replacement'],
        ['cancel_content_plan', 'explicit_cancellation'],
      ]) {
        for (const value of [false, null, 'true', undefined]) {
          const input = { ...args[name], [field]: value };
          assert((await call(name, input))?.isError === true, 'confirmation required');
        }
      }
      assert(calls === 0, 'business RPC reached');
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test(
  '6.6 replay preserves attempt history, replacement reference and completed output counts',
  async () => {
    const original = globalThis.fetch;
    let replayed = false;
    globalThis.fetch = ((input: Request | URL | string) => {
      const name = String(input).split('/').pop()!;
      return Promise.resolve(Response.json(envelope({ ...data[name], replayed })));
    }) as typeof fetch;
    try {
      for (const name of PLAN_RECOVERY_TOOL_NAMES) {
        replayed = false;
        const first = (await call(name)).structuredContent.data;
        replayed = true;
        const second = (await call(name)).structuredContent.data;
        assert(second.replayed === true, 'replay marker');
        assert(
          JSON.stringify({ ...first, replayed: true }) === JSON.stringify(second),
          'historical output drift',
        );
        if (name !== 'cancel_content_plan')
          assert(second.item.attempt_count === 3, 'attempt history reset');
        else
          assert(
            second.preserved_completed_count === 1 && second.changed_count === 1,
            'completed preserved',
          );
      }
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test(
  '6.6 lifecycle denials are safe; malformed pending/cancel outputs fail closed',
  async () => {
    const original = globalThis.fetch;
    try {
      for (const code of [
        'PLAN_STATUS_CONFLICT',
        'PLAN_ITEM_REPLACEMENT_BLOCKED',
        'POST_NOT_FOUND',
        'OPERATION_KEY_REUSED',
        'DATABASE_BUSY',
        'RATE_LIMITED',
      ]) {
        globalThis.fetch = (() =>
          Promise.resolve(
            Response.json(
              { code: 'P0001', message: code, details: 'SQLSTATE internal_id=42 token=secret' },
              { status: 400 },
            ),
          )) as typeof fetch;
        const result = await call('replace_discarded_plan_item');
        assert(
          result.isError === true && result.structuredContent.error.code === code,
          'safe error mapping',
        );
        assert(
          !JSON.stringify(result).includes('SQLSTATE') &&
            !JSON.stringify(result).includes('token=secret'),
          'private error leak',
        );
      }
      globalThis.fetch = (() =>
        Promise.resolve(
          Response.json(
            envelope({ ...data.retry_content_plan_item, item: { ...item, status: 'completed' } }),
          ),
        )) as typeof fetch;
      assert((await call('retry_content_plan_item')).isError === true, 'retry only pending output');
      globalThis.fetch = (() =>
        Promise.resolve(
          Response.json(envelope({ ...data.cancel_content_plan, changed_count: -1 })),
        )) as typeof fetch;
      assert((await call('cancel_content_plan')).isError === true, 'invalid cancel count');
    } finally {
      globalThis.fetch = original;
    }
  },
);
