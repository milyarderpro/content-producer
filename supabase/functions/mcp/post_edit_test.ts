import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { POST_EDIT_TOOL_NAMES } from './post_edit.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const page = '66666666-6666-4666-8666-666666666666';
const postId = '77777777-7777-4777-8777-777777777777';
const factId = '88888888-8888-4888-8888-888888888888';
const token = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-14T12:00:00Z';
const context: RequestContext = {
  requestId: '6.10-local',
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

const reviseArgs = {
  ...base,
  operation_key: token,
  post_public_id: postId,
  expected_revision: 1,
  expected_content_hash: 'a'.repeat(64),
  reservation_token: null,
  content_schema_version: 1,
  format_key: 'single_subject_fast',
  topic_key: 'animals',
  interaction_goal: 'share',
  content_payload: { ...payload, caption: 'Revised, checked caption.' },
  generation_snapshot: generation,
  fact_bindings: factBindings,
  editorial_checks: save.editorial_checks,
  revision_reason: 'Improve the caption.',
};
const scheduleArgs = {
  ...base,
  operation_key: token,
  post_public_id: postId,
  expected_revision: 2,
  scheduled_at: '2027-01-14T12:00:00Z',
  reason: 'Move the planned time.',
};
response.revise_post = {
  post: { ...post, revision: 2, content_hash: 'b'.repeat(64) },
  released_fact_public_ids: [],
  replaced_fact_public_ids: [],
  approval_invalidated: false,
  replayed: false,
};
response.reschedule_post = {
  post_public_id: postId,
  status: 'draft',
  revision: 3,
  content_hash_unchanged: true,
  scheduled_at: scheduleArgs.scheduled_at,
  plan_item_schedule: null,
  replayed: false,
};

Deno.test('6.10: exactly 25 OAuth tools, closed post-edit schemas and destructive annotations', async () => {
  const tools = (await mcp('tools/list')).result.tools;
  check(MCP_TOOL_COUNT === 25 && tools.length === 25, 'EXACT_25');
  for (const name of POST_EDIT_TOOL_NAMES) {
    const tool = tools.find((x: { name: string }) => x.name === name);
    check(tool?.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
    check(tool?.outputSchema.additionalProperties === false, 'CLOSED_OUTPUT');
    check(tool?._meta.securitySchemes[0].type === 'oauth2', 'OAUTH');
    check(tool.annotations.openWorldHint === false && tool.annotations.destructiveHint === true, 'ANNOTATIONS');
    check(tool.annotations.readOnlyHint === false, 'WRITE_TOOL');
    check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE');
  }
});
Deno.test('6.10: forward original owner JWT, strict CAS and null schedule to exact public RPCs', async () => {
  const oldFetch = globalThis.fetch;
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const name = String(input).split('/').pop()!;
    const headers = new Headers(init?.headers);
    check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
    check(headers.get('apikey') === context.publishableKey, 'PUBLIC_KEY');
    check(headers.get('Content-Profile') === 'api', 'PUBLIC_RPC');
    calls.push({ name, params: JSON.parse(String(init?.body)) });
    return Promise.resolve(Response.json({ response_schema_version: 1, data: response[name] }));
  }) as typeof fetch;
  try {
    const revised = await call('revise_post', reviseArgs);
    check(!revised.isError && revised.structuredContent.data.post.revision === 2, 'REVISE_OK');
    const moved = await call('reschedule_post', scheduleArgs);
    check(!moved.isError && moved.structuredContent.data.content_hash_unchanged, 'SCHEDULE_OK');
    const cleared = await call('reschedule_post', { ...scheduleArgs, scheduled_at: null });
    check(!cleared.isError, 'NULL_SCHEDULE_ACCEPTED');
    check(calls.map((c) => c.name).join(',') === 'revise_post,reschedule_post,reschedule_post', 'EXACT_RPCS');
    check(calls[0].params.p_expected_revision === 1 && calls[0].params.p_expected_content_hash === 'a'.repeat(64), 'CAS_FORWARDED');
    check(calls[0].params.p_reservation_token === null, 'NULL_RESERVATION');
    check(calls[0].params.p_revision_reason === 'Improve the caption.', 'SAFE_REASON');
    check(calls[1].params.p_scheduled_at === scheduleArgs.scheduled_at && calls[2].params.p_scheduled_at === null, 'SCHEDULE_EXPLICIT_NULL');
    check(calls.every((c) => !Object.keys(c.params).some((key) => /^p_(actor|client|oauth|owner)/.test(key))), 'NO_IDENTITY_OVERRIDES');
    check(!JSON.stringify(revised.content).includes(context.accessToken), 'NO_TOKEN_LEAK');
  } finally {
    globalThis.fetch = oldFetch;
  }
});
Deno.test('6.10: malformed CAS, mismatched facts, foreign owner and secret keys fail before RPC', async () => {
  const oldFetch = globalThis.fetch;
  let hits = 0;
  globalThis.fetch = (() => { hits++; return Promise.resolve(Response.json({})); }) as typeof fetch;
  try {
    for (const [name, args] of [
      ['revise_post', { ...reviseArgs, expected_revision: 0 }],
      ['revise_post', { ...reviseArgs, expected_content_hash: 'bad' }],
      ['revise_post', { ...reviseArgs, reservation_token: 'bad' }],
      ['revise_post', { ...reviseArgs, content_payload: { ...payload, body: { facts: [{ position: 1, text: 'Different text' }] } } }],
      ['revise_post', { ...reviseArgs, system_checks: {} }],
      ['revise_post', { ...reviseArgs, owner_user_id: context.actorUserId }],
      ['revise_post', { ...reviseArgs, revision_reason: 'secret=private' }],
      ['reschedule_post', { ...scheduleArgs, expected_revision: -1 }],
      ['reschedule_post', { ...scheduleArgs, scheduled_at: 'not a time' }],
      ['reschedule_post', { ...scheduleArgs, access_token: context.accessToken }],
      ['reschedule_post', { ...scheduleArgs, workspace_public_id: postId }],
    ] as const) {
      const result = await call(name, args);
      check(result.isError === true, 'REJECT_' + name);
    }
    check(hits === 0, 'INVALID_DID_NOT_REACH_RPC');
  } finally {
    globalThis.fetch = oldFetch;
  }
});
Deno.test('6.10: post-edit output stays strictly closed and fails on backend injection', async () => {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = (() => Promise.resolve(Response.json({
    response_schema_version: 1,
    data: { ...response.revise_post, owner_user_id: context.actorUserId },
  }))) as typeof fetch;
  try {
    const result = await call('revise_post', reviseArgs);
    check(result.isError && result.structuredContent.error.code === 'DATABASE_UNAVAILABLE', 'BACKEND_RESPONSE_REJECTED');
  } finally {
    globalThis.fetch = oldFetch;
  }
});
