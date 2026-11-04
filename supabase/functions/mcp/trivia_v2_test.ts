import { createAuthenticatedTransport } from './transport.ts';
import { postPackage } from './post_base.ts';
import { contentV2, sourceUrlV2 } from './trivia_v2.ts';
import { single, reviseRequest, reviseResponse, configTime, id } from '../../../tests/fixtures/trivia-draft-v2.ts';

const context = { requestId: 'p6-fixture', actorUserId: id(10), oauthClientId: id(11),
  workspacePublicId: id(1), accessToken: 'fixture-user-jwt',
  supabaseUrl: 'https://invalid.example', publishableKey: 'fixture-public-key' };
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
function stable(value: unknown): string {
  const sort = (v: unknown): unknown => Array.isArray(v) ? v.map(sort) :
    v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => [k, sort(v)])) : v;
  return JSON.stringify(sort(value));
}
async function call(name: string, args: object) {
  const response = await createAuthenticatedTransport(context).fetch(new Request('http://localhost/mcp', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }),
  }));
  const text = await response.text();
  return JSON.parse(text.includes('data: ') ? text.split('data: ')[1].split('\n')[0] : text);
}
Deno.test('P6 v2 Read/save/revise use exact versioned RPC mapping and original owner JWT', async () => {
  const original = globalThis.fetch;
  const examples = [
    ['trivia_find_similar_facts_v2', single.findRequest, single.findResponse],
    ['save_post_v2', single.request, single.response],
    ['revise_post_v2', reviseRequest, reviseResponse],
  ] as const;
  try {
    for (const [tool, input, output] of examples) {
      let calls = 0;
      globalThis.fetch = (_url, init) => {
        calls++;
        check(String(_url).endsWith('/rpc/' + tool), 'wrong RPC');
        const headers = new Headers(init?.headers);
        check(headers.get('Authorization') === 'Bearer fixture-user-jwt', 'JWT substituted');
        check(headers.get('Content-Profile') === 'api', 'wrong schema');
        const params = JSON.parse(String(init?.body));
        check(stable(params) === stable(Object.fromEntries(
          Object.entries(input).map(([k, v]) => ['p_' + k, v]))), 'lossy input mapping');
        return Promise.resolve(Response.json(output));
      };
      const result = (await call(tool, input)).result;
      check(!result.isError && calls === 1, 'v2 call failed');
      check(stable(result.structuredContent) === stable(output), 'output mismatch');
    }
  } finally { globalThis.fetch = original; }
});
Deno.test('P6 v2 bad input and foreign workspace never dispatch business RPC', async () => {
  const original = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = () => { calls++; throw new Error('must not dispatch'); };
  try {
    for (const args of [
      { ...single.request, reservation_token: id(2) },
      { ...single.request, expected_config_updated_at: '2026-10-31T01:02:03.123Z' },
      { ...single.request, operation_key: 'bad' },
      { ...single.request, facts: single.request.facts.map(f => ({ ...f, source_url: '' })) },
    ]) {
      const r = await call('save_post_v2', args);
      check(r.error || r.result?.isError, 'bad input accepted');
    }
    const denied = await call('save_post_v2', { ...single.request, workspace_public_id: id(999) });
    check(denied.result?.isError, 'foreign workspace accepted');
    for (const args of [
      { ...reviseRequest, expected_revision: 0 },
      { ...reviseRequest, expected_content_hash: 'bad' },
      { ...reviseRequest, reservation_token: id(2) },
      { ...reviseRequest, owner_user_id: context.actorUserId },
      { ...reviseRequest, system_checks: {} },
    ]) {
      const rejected = await call('revise_post_v2', args);
      check(rejected.error || rejected.result?.isError, 'invalid v2 revision accepted');
    }
    const foreignRevision = await call('revise_post_v2', {
      ...reviseRequest, workspace_public_id: id(999),
    });
    check(foreignRevision.result?.isError, 'foreign revision accepted');
    check(calls === 0, 'unauthorized RPC dispatched');
  } finally { globalThis.fetch = original; }
});
Deno.test('P6 v2 output rejects private or invalid projections', async () => {
  const original = globalThis.fetch;
  try {
    for (const output of [
      { ...single.response, private_key: 'secret-fixture' },
      { ...single.response, response_schema_version: 1 },
      { response_schema_version: 2, data: { ...single.response.data,
        post: { ...single.response.data.post, status: 'ready' } } },
    ]) {
      globalThis.fetch = () => Promise.resolve(Response.json(output));
      check((await call('save_post_v2', single.request)).result?.isError, 'bad output accepted');
    }
  } finally { globalThis.fetch = original; }
});
Deno.test('P6 CR-056 maintenance versions map separately without tier/expiry on v2', async () => {
  const original = globalThis.fetch;
  const affected = { draft: { count: 0, items: [], truncated: false },
    ready: { count: 0, items: [], truncated: false }, posted: { count: 0, items: [], truncated: false } };
  try {
    for (const tool of ['trivia_reverify_fact', 'trivia_correct_fact']) {
      const input = { request_schema_version: 2, workspace_public_id: id(1),
        operation_key: id(10), fact_public_id: id(500), expected_fact_updated_at: configTime,
        ...(tool === 'trivia_reverify_fact'
          ? { confirmed_claim_text: 'Fixture claim.', source_url: 'https://example.org/source' }
          : { action: 'invalidate', correction_reason: 'Owner confirms fixture correction.',
            successor: null, expected_catalog_version: null, explicit_correction: true }) };
      globalThis.fetch = (_url, init) => {
        const params = JSON.parse(String(init?.body));
        check(params.p_expected_fact_updated_at === configTime, 'CAS precision lost');
        check(!('p_sources' in params) && !('p_requested_expires_at' in params), 'legacy evidence required');
        return Promise.resolve(Response.json({ response_schema_version: 2, data: {
          fact_public_id: id(500), affected_posts: affected, replayed: false,
          ...(tool === 'trivia_reverify_fact'
            ? { verification_status: 'needs_review', source_url: 'https://example.org/source', fact_updated_at: configTime }
            : { old_status: 'invalidated', successor_public_id: null }),
        } }));
      };
      check(!(await call(tool, input)).result.isError, 'maintenance v2 failed');
      const invalid = await call(tool, { ...input, private_field: 'must-reject' });
      check(invalid.error || invalid.result?.isError, 'union accepts unknown field');
      if (tool === 'trivia_reverify_fact') {
        const missing = await call(tool, { ...input, source_url: '' });
        check(JSON.stringify(missing).includes('FACT_URL_REQUIRED') &&
          JSON.stringify(missing).includes('source_url'), 'versioned input lost known source location');
      }
    }
  } finally { globalThis.fetch = original; }
});
Deno.test('P6 v2 readback accepts versioned bindings/checks and rejects cross-version shapes', () => {
  const metrics = { hook_chars: 1, fact_chars: [1], facts_total_chars: 1, cta_chars: 1,
    canva_total_chars: 1, word_count: 1, fact_word_counts: [1], line_count: 1,
    fact_line_counts: [1], hook_word_count: 1, cta_word_count: 1, hook_line_count: 1,
    cta_line_count: 1, estimated_read_seconds: 1, replay_ratio: 1, estimated_loops: 1 };
  const p = { ...single.response.data.post, niche_key: 'trivia', format_key: 'themed_utility',
    topic_key: 'food_storage_home', interaction_goal: 'save', scheduled_at: null, published_at: null,
    content_payload: { ...single.request.content_payload, text_metrics: metrics },
    system_checks: { schema_version: 2, post_revision: 1, content_hash: single.response.data.post.content_hash,
      overall_status: 'passed', checks: [{ id: 'trivia.sources.url_valid', status: 'passed' }] },
    editorial_checks: { schema_version: 2, post_revision: 1, content_hash: single.response.data.post.content_hash,
      overall_status: 'passed', checks: single.request.editorial_checks }, quality_status: 'passed',
    fact_bindings: [{ position: 1, fact_public_id: id(500), fact_role: 'general',
      rendered_text: single.request.facts[0].claim_text, allocation_state: 'allocated',
      source_snapshot: { schema_version: 2, canonical_claim: single.request.facts[0].claim_text,
        source_url: single.request.facts[0].source_url } }], created_at: configTime, updated_at: configTime };
  check(postPackage.safeParse(p).success, 'v2 readback rejected');
  check(!postPackage.safeParse({ ...p, content_schema_version: 1 }).success, 'cross-version projection accepted');
  check(!contentV2.safeParse({ ...single.request.content_payload, schema_version: 1 }).success, 'v1 input as v2');
});
Deno.test('P6 v2 source URLs reject local/credential/nonweb addresses', () => {
  for (const url of ['http://127.0.0.1/a', 'http://10.1.2.3/a', 'http://[::1]/a',
    'https://u:p@example.org/a', 'javascript:alert(1)', 'https://host.local/a']) {
    check(!sourceUrlV2.safeParse(url).success, 'unsafe source URL accepted');
  }
  check(sourceUrlV2.safeParse('https://example.org/source').success, 'valid source URL rejected');
});
