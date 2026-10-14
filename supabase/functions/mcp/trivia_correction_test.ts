import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { TRIVIA_CORRECTION_TOOL_NAMES } from './trivia_correction.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const factId = '77777777-7777-4777-8777-777777777777';
const successorId = '88888888-8888-4888-8888-888888888888';
const operationKey = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-14T12:00:00Z';
const context: RequestContext = {
  requestId: '6.8-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const source = {
  schema_version: 1,
  url: 'https://example.test/reverify',
  canonical_url: 'https://example.test/reverify',
  title: 'Research',
  publisher: 'Authority',
  tier: 'A',
  source_type: 'official',
  accessed_at: stamp,
  published_at: null,
  updated_at: null,
  as_of: null,
  language: 'en',
  supports: 'Supports the tested proposition.',
  independence_group: 'authority',
};
const candidate = {
  candidate_key: 'corrected',
  claim_text: 'Corrected proposition.',
  subject_key: 'test_subject',
  relation_key: 'has_count',
  object_key: '4',
  numbers: [{ value: '4', unit: 'count', role: 'count' }],
  qualifiers: { negated: false, comparison_direction: 'none' },
  topic_key: 'animals',
  normalization_version: 1,
  ontology_version: 1,
};
const common = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: operationKey,
  fact_public_id: factId,
  expected_fact_updated_at: stamp,
};
const reverify = {
  ...common,
  confirmed_claim_text: 'A tested proposition.',
  sources: [source],
  freshness_class: 'stable',
  as_of_date: null,
  requested_expires_at: '2027-01-11T00:00:00Z',
  risk_class: 'standard',
  review_note: 'Confirmed unchanged proposition.',
};
const successor = {
  candidate,
  dedup_reviews: [],
  sources: [source],
  freshness_class: 'stable',
  as_of_date: null,
  requested_expires_at: '2027-01-11T00:00:00Z',
  risk_class: 'standard',
  verification_note: 'New evidence supports successor.',
};
const correct = {
  ...common,
  action: 'supersede',
  correction_reason: 'Materially changed.',
  successor,
  explicit_correction: true,
};
const affectedPosts = {
  draft: { count: 0, items: [], truncated: false },
  ready: { count: 1, items: [{ post_public_id: factId, status: 'draft', revision: 2 }], truncated: false },
  posted: { count: 1, items: [{ post_public_id: successorId, status: 'archived', revision: 1 }], truncated: false },
};
const outputs: Record<string, object> = {
  trivia_reverify_fact: {
    fact_public_id: factId,
    verification_status: 'verified',
    verified_at: stamp,
    expires_at: '2027-01-11T00:00:00Z',
    fact_updated_at: stamp,
    affected_posts: affectedPosts,
    replayed: false,
  },
  trivia_correct_fact: {
    fact_public_id: factId,
    old_status: 'superseded',
    successor_public_id: successorId,
    affected_posts: affectedPosts,
    replayed: false,
  },
};
function check(value: unknown, code: string): asserts value {
  if (!value) throw new Error(code);
}
async function mcp(method: string, params?: object) {
  const response = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 68, method, ...(params ? { params } : {}) }),
    }),
  );
  check(response.status === 200, 'MCP_HTTP_STATUS');
  const body = await response.text();
  const frame = body.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : body);
}
async function call(name: string, input: object) {
  return (await mcp('tools/call', { name, arguments: input })).result;
}
Deno.test('6.8 exactly 20 authenticated tools with closed correction schemas', async () => {
  const tools = (await mcp('tools/list')).result.tools;
  check(MCP_TOOL_COUNT === 20 && tools.length === 20, 'EXACT_TWENTY_TOOLS');
  for (const name of TRIVIA_CORRECTION_TOOL_NAMES) {
    const tool = tools.find((x: { name: string }) => x.name === name);
    check(tool && tool._meta.securitySchemes[0].type === 'oauth2', 'OAUTH_REQUIRED');
    check(tool._meta.securitySchemes[0].scopes.join(' ') === 'openid email', 'OAUTH_SCOPES');
    check(tool.annotations.readOnlyHint === false, 'WRITE_ONLY');
    check(tool.annotations.destructiveHint === true, 'CORRECTION_DESTRUCTIVE');
    check(tool.annotations.openWorldHint === false, 'CLOSED_WORLD');
    check(tool.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
    check(tool.outputSchema.additionalProperties === false, 'CLOSED_OUTPUT');
    check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE_METADATA');
  }
});
Deno.test('6.8 public MCP forwards exact CAS, evidence, successor and unmodified user JWT', async () => {
  const original = globalThis.fetch;
  const seen: Array<{ name: string; args: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const name = String(input).split('/').pop()!;
    const headers = new Headers(init?.headers);
    check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
    check(headers.get('Content-Profile') === 'api', 'PUBLIC_SCHEMA');
    check(headers.get('apikey') === context.publishableKey, 'PUBLIC_API_KEY');
    seen.push({ name, args: JSON.parse(String(init?.body)) });
    return Promise.resolve(Response.json({ response_schema_version: 1, data: outputs[name] }));
  }) as typeof fetch;
  try {
    for (const [name, args] of [
      ['trivia_reverify_fact', reverify],
      ['trivia_correct_fact', correct],
    ] as const) {
      const result = await call(name, args);
      check(result?.isError !== true, 'VALID_TOOL_' + name);
      check(result.structuredContent.data.fact_public_id === factId, 'STRUCTURED_FACT');
      check(!JSON.stringify(result.content).includes(operationKey), 'TEXT_KEY_LEAK');
    }
    check(seen.map((x) => x.name).join(',') === TRIVIA_CORRECTION_TOOL_NAMES.join(','), 'RPC_NAMES');
    check(seen.every((x) => x.args.p_expected_fact_updated_at === stamp), 'EXACT_CAS');
    check(seen.every((x) => x.args.p_operation_key === operationKey), 'OPERATION_KEY');
    check(seen.every((x) => x.args.p_workspace_public_id === workspace), 'OWNER_SCOPE');
    check(seen[0].args.p_sources !== undefined, 'SOURCE_EVIDENCE');
    check(seen[1].args.p_successor !== undefined, 'SUCCESSOR_EVIDENCE');
    check(seen[1].args.p_explicit_correction === true, 'EXPLICIT_INTENT');
    check(seen.every((x) => !Object.keys(x.args).some((key) => /p_owner|p_actor|p_client|p_oauth/.test(key))), 'IDENTITY_OVERRIDE');
  } finally {
    globalThis.fetch = original;
  }
});
Deno.test('6.8 rejects stale-shaped, unauthorized and semantically invalid corrections before RPC', async () => {
  const original = globalThis.fetch;
  let invoked = 0;
  globalThis.fetch = (() => {
    invoked++;
    return Promise.resolve(Response.json({}));
  }) as typeof fetch;
  try {
    const badInputs: Array<[string, object]> = [
      ['trivia_reverify_fact', { ...reverify, expected_fact_updated_at: 'invalid' }],
      ['trivia_reverify_fact', { ...reverify, sources: [] }],
      ['trivia_reverify_fact', { ...reverify, confirmed_claim_text: '' }],
      ['trivia_reverify_fact', { ...reverify, actor_user_id: context.actorUserId }],
      ['trivia_reverify_fact', { ...reverify, workspace_public_id: successorId }],
      ['trivia_correct_fact', { ...correct, explicit_correction: false }],
      ['trivia_correct_fact', { ...correct, action: 'invalidate' }],
      ['trivia_correct_fact', { ...correct, action: 'supersede', successor: undefined }],
      ['trivia_correct_fact', { ...correct, successor: { ...successor, candidate: { ...candidate, ontology_version: 2 } } }],
      ['trivia_correct_fact', { ...correct, correction_reason: '' }],
    ];
    for (const [name, args] of badInputs) {
      const result = await call(name, args);
      check(result?.isError === true, 'REJECT_' + name);
    }
    check(invoked === 0, 'INVALID_REQUEST_REACHED_RPC');
  } finally {
    globalThis.fetch = original;
  }
});
Deno.test('6.8 keeps safe RPC errors and rejects unexpected correction projections', async () => {
  const original = globalThis.fetch;
  try {
    globalThis.fetch = (() =>
      Promise.resolve(new Response(JSON.stringify({ message: 'FACT_CORRECTION_CONFLICT' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      }))) as typeof fetch;
    const stale = await call('trivia_reverify_fact', reverify);
    check(stale?.isError === true, 'STALE_CAS_DENIAL');
    check(stale.structuredContent.error.code === 'FACT_CORRECTION_CONFLICT', 'STABLE_ERROR_CODE');
    globalThis.fetch = (() =>
      Promise.resolve(Response.json({
        response_schema_version: 1,
        data: { ...outputs.trivia_correct_fact, internal_id: 12345 },
      }))) as typeof fetch;
    const leaked = await call('trivia_correct_fact', correct);
    check(leaked?.isError === true, 'INVALID_OUTPUT_REJECTED');
    check(!JSON.stringify(leaked).includes('12345'), 'INTERNAL_ID_LEAK');
  } finally {
    globalThis.fetch = original;
  }
});
