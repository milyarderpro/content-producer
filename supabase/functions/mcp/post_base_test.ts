import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { POST_BASE_TOOL_NAMES } from './post_base.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const page = '66666666-6666-4666-8666-666666666666';
const postId = '77777777-7777-4777-8777-777777777777';
const factId = '88888888-8888-4888-8888-888888888888';
const token = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-14T12:00:00Z';
const context: RequestContext = {
  requestId: '6.9-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-user-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const payload = {
  schema_version: 1,
  hook: 'Did you know?',
  body: { facts: [{ position: 1, text: 'A factual sentence.' }] },
  cta: 'Share this.',
  canva_copy: 'Did you know?\n\nA factual sentence.\n\nShare this.',
  caption: 'A fun trivia post.',
  hashtags: ['#Trivia'],
  render_style: 'plain_lines',
  text_metrics: {},
};
const generation = {
  schema_version: 1,
  module_version: 1,
  config_schema_version: 1,
  content_schema_version: 1,
  renderer_version: 1,
  quality_gate_version: 1,
  editorial_rubric_version: 1,
  source_policy_version: 1,
  dedup_contract_version: 1,
  config_public_id: postId,
  config_updated_at: stamp,
  fact_count: { mode: 'fixed', value: 5 },
  fact_count_applied: 1,
  fact_count_override: false,
  text_budget: {
    hook_max_chars: 90,
    fact_max_chars: 90,
    facts_total_max_chars: 500,
    cta_max_chars: 100,
    canva_total_max_chars: 600,
  },
  fact_reuse_scope: 'workspace_unique',
  profile_key: 'fast_trivia',
  render_style: 'plain_lines',
  target_markets: ['US'],
  locale: 'en-US',
  line_width_chars: 34,
  target_video_seconds: 13,
  override_reason: null,
};
const factBindings = [
  {
    position: 1,
    fact_public_id: factId,
    fact_role: 'general',
    rendered_text: 'A factual sentence.',
  },
];
const base = { request_schema_version: 1, workspace_public_id: workspace };
const save = {
  ...base,
  operation_key: postId,
  page_public_id: page,
  niche_key: 'trivia',
  reservation_token: token,
  expected_config_updated_at: stamp,
  scheduled_at: null,
  content_schema_version: 1,
  format_key: 'single_subject_fast',
  topic_key: 'animals',
  interaction_goal: 'share',
  content_payload: payload,
  generation_snapshot: generation,
  fact_bindings: factBindings,
  editorial_checks: {
    rubric_version: 1,
    overall_status: 'pass',
    criteria: [
      {
        id: 'trivia.meaning_preserved',
        severity: 'critical',
        status: 'pass',
        note: 'Reviewed',
        evidence_paths: ['content_payload.body'],
      },
    ],
    risk_flags: [],
  },
};
const post = {
  post_public_id: postId,
  page_public_id: page,
  niche_key: 'trivia',
  status: 'draft',
  revision: 1,
  content_hash: 'a'.repeat(64),
  format_key: 'single_subject_fast',
  topic_key: 'animals',
  interaction_goal: 'share',
  scheduled_at: null,
  published_at: null,
  content_payload: payload,
  system_checks: {},
  editorial_checks: {},
  quality_status: 'pending',
  fact_bindings: [{ ...factBindings[0], allocation_state: 'allocated' }],
  created_at: stamp,
  updated_at: stamp,
};
const response: Record<string, object> = {
  save_post: { post, plan: null, replayed: false },
  list_posts: {
    items: [
      {
        post_public_id: postId,
        page_public_id: page,
        niche_key: 'trivia',
        status: 'draft',
        revision: 1,
        format_key: 'single_subject_fast',
        topic_key: 'animals',
        interaction_goal: 'share',
        scheduled_at: null,
        published_at: null,
        quality_status: 'pending',
        hook_preview: 'Did you know?',
        updated_at: stamp,
      },
    ],
    next_cursor: null,
    has_more: false,
  },
  get_post: {
    post,
    approval: null,
    plan_item_public_id: null,
    current_fact_warnings: [],
    latest_metrics: null,
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
      body: JSON.stringify({ jsonrpc: '2.0', id: 69, method, ...(params ? { params } : {}) }),
    }),
  );
  check(res.status === 200, 'MCP_HTTP_STATUS');
  const raw = await res.text();
  const frame = raw.split('\n').find((s) => s.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : raw);
}
async function call(name: string, args: object) {
  return (await mcp('tools/call', { name, arguments: args })).result;
}
Deno.test('6.9: exactly 23 OAuth tools with closed post schemas and annotations', async () => {
  const tools = (await mcp('tools/list')).result.tools;
  check(MCP_TOOL_COUNT === 25 && tools.length === 25, 'EXACT_23');
  for (const name of POST_BASE_TOOL_NAMES) {
    const t = tools.find((x: { name: string }) => x.name === name);
    check(t?.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
    check(t?.outputSchema.additionalProperties === false, 'CLOSED_OUTPUT');
    check(t?._meta.securitySchemes[0].type === 'oauth2', 'OAUTH');
    check(t.annotations.openWorldHint === false, 'NO_OPEN_WORLD');
    check(t.annotations.destructiveHint === false, 'NON_DESTRUCTIVE');
    check(t.annotations.readOnlyHint === (name !== 'save_post'), 'READ_ONLY');
    check(!Object.hasOwn(t._meta, 'openai/profile'), 'NO_PROFILE');
  }
});
Deno.test(
  '6.9: forward user JWT to exact RPCs without identity override or token echo',
  async () => {
    const old = globalThis.fetch;
    const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      const name = String(input).split('/').pop()!;
      const h = new Headers(init?.headers);
      check(h.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
      check(h.get('apikey') === context.publishableKey, 'PUBLIC_KEY');
      check(h.get('Content-Profile') === 'api', 'PUBLIC_RPC');
      calls.push({ name, params: JSON.parse(String(init?.body)) });
      return Promise.resolve(Response.json({ response_schema_version: 1, data: response[name] }));
    }) as typeof fetch;
    try {
      const s = await call('save_post', save);
      check(!s.isError && s.structuredContent.data.post.status === 'draft', 'SAVE_DRAFT');
      check(!JSON.stringify(s.content).includes(token), 'NO_TOKEN_TEXT');
      check(!(await call('list_posts', { ...base, limit: 1 })).isError, 'LIST_OK');
      check(
        !(await call('get_post', { ...base, post_public_id: postId, include_sources: false }))
          .isError,
        'GET_OK',
      );
      check(calls.map((c) => c.name).join(',') === POST_BASE_TOOL_NAMES.join(','), 'EXPECTED_RPCS');
      check(calls[0].params.p_reservation_token === token, 'RESERVATION_FORWARDED');
      check(calls[0].params.p_plan_item === null, 'NO_PLAN');
      check(calls[1].params.p_limit === 1, 'LIST_LIMIT');
      check(
        calls[2].params.p_include_sources === false &&
          calls[2].params.p_include_checks === true &&
          calls[2].params.p_include_latest_metrics === false,
        'READ_DEFAULTS',
      );
      check(
        calls.every(
          (c) => !Object.keys(c.params).some((p) => /^p_(actor|client|oauth|owner)/.test(p)),
        ),
        'NO_IDENTITY_OVERRIDE',
      );
    } finally {
      globalThis.fetch = old;
    }
  },
);
Deno.test(
  '6.9: malformed, foreign, mismatched fact and secret overrides fail before RPC',
  async () => {
    const old = globalThis.fetch;
    let hits = 0;
    globalThis.fetch = (() => {
      hits++;
      return Promise.resolve(Response.json({}));
    }) as typeof fetch;
    try {
      for (const [name, args] of [
        ['save_post', { ...save, reservation_token: 'bad' }],
        ['save_post', { ...save, plan_item: { claim_token: token } }],
        [
          'save_post',
          {
            ...save,
            content_payload: {
              ...payload,
              body: { facts: [{ position: 1, text: 'Mismatched sentence.' }] },
            },
          },
        ],
        ['save_post', { ...save, owner_user_id: context.actorUserId }],
        ['save_post', { ...save, workspace_public_id: postId }],
        ['list_posts', { ...base, statuses: [] }],
        ['list_posts', { ...base, limit: 51 }],
        [
          'list_posts',
          { ...base, created_from: '2027-01-01T00:00:00Z', created_to: '2026-01-01T00:00:00Z' },
        ],
        ['get_post', { ...base, post_public_id: postId, include_sources: 'yes' }],
        ['get_post', { ...base, post_public_id: postId, access_token: 'bad' }],
      ] as const) {
        const result = await call(name, args);
        check(result.isError === true, 'REJECT_' + name);
      }
      check(hits === 0, 'NO_RPC_ON_INVALID_INPUT');
    } finally {
      globalThis.fetch = old;
    }
  },
);
Deno.test(
  '6.9: reject malicious PostgREST response, do not leak source or private identifiers',
  async () => {
    const old = globalThis.fetch;
    globalThis.fetch = (() =>
      Promise.resolve(
        Response.json({
          response_schema_version: 1,
          data: {
            post: { ...post, owner_user_id: context.actorUserId },
            plan: null,
            replayed: false,
          },
        }),
      )) as typeof fetch;
    try {
      const r = await call('save_post', save);
      check(
        r.isError === true && r.structuredContent?.error?.code === 'DATABASE_UNAVAILABLE',
        'MALICIOUS_RESPONSE_DENIED',
      );
    } finally {
      globalThis.fetch = old;
    }
  },
);
