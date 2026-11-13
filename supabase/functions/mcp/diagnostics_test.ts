import * as z from 'npm:zod@4.3.6';
import type { McpServer } from '@modelcontextprotocol/server';
import { registerTools } from './registry.ts';
import { invoke } from './foundation.ts';
import { createAuthenticatedTransport } from './transport.ts';
import { diagnosticFailure } from './diagnostics.ts';
import { errorTaxonomy } from '../../../tests/fixtures/tool-errors-v2.ts';

const id = '11111111-1111-4111-8111-111111111111';
const context = { requestId: 'p6-diagnostics', actorUserId: id, oauthClientId: id,
  workspacePublicId: id, accessToken: 'private-fixture-token', supabaseUrl: 'https://invalid.example',
  publishableKey: 'fixture-public-key' };
const tools: Array<{ name: string; read: boolean }> = [];
registerTools({ registerTool(name: string, config: { annotations: { readOnlyHint: boolean } }) {
  tools.push({ name, read: config.annotations.readOnlyHint });
} } as unknown as McpServer, context);
const schema = z.strictObject({ response_schema_version: z.literal(1), data: z.strictObject({}) });
function check(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const domains: Record<string, string> = {
  get_trivia_editorial_catalog:'EDITORIAL_CATALOG_CONFLICT', update_trivia_editorial_catalog:'EDITORIAL_DEFINITION_UNAVAILABLE',
  get_account_profile: 'WORKSPACE_NOT_FOUND', get_workspace_context: 'WORKSPACE_NOT_FOUND',
  list_pages: 'VALIDATION_FAILED', get_page_generation_context: 'PAGE_NOT_FOUND',
  create_page: 'PAGE_SLUG_CONFLICT', update_page: 'PAGE_VERSION_CONFLICT',
  list_content_plans: 'PAGE_NOT_FOUND', create_content_plan: 'PLAN_LIMIT_EXCEEDED',
  get_content_plan: 'PLAN_NOT_FOUND', claim_content_plan_items: 'PLAN_STATUS_CONFLICT',
  renew_content_plan_claim: 'PLAN_CLAIM_RENEWAL_LIMIT', report_content_plan_item_failure: 'PLAN_ITEM_CLAIM_EXPIRED',
  retry_content_plan_item: 'PLAN_STATUS_CONFLICT', replace_discarded_plan_item: 'PLAN_ITEM_REPLACEMENT_BLOCKED',
  cancel_content_plan: 'PLAN_STATUS_CONFLICT',
  trivia_reverify_fact: 'FACT_CORRECTION_CONFLICT', trivia_correct_fact: 'FACT_CORRECTION_REQUIRED',
  list_posts: 'PAGE_NOT_FOUND', get_post: 'POST_NOT_FOUND',
  reschedule_post: 'SCHEDULE_CONFLICT', approve_post: 'QUALITY_EVIDENCE_STALE',
  revoke_post_approval: 'CONTENT_HASH_CONFLICT', discard_post: 'INVALID_STATUS_TRANSITION',
  mark_post_posted: 'APPROVAL_REQUIRED', archive_post: 'INVALID_STATUS_TRANSITION',
  record_post_performance: 'METRIC_SNAPSHOT_CONFLICT', get_post_performance: 'POST_NOT_FOUND',
  get_performance_insights: 'METRIC_DEFINITION_AMBIGUOUS', trivia_find_similar_facts_v2: 'PAGE_NOT_FOUND',
  save_post_v2: 'FACT_REUSE_BLOCKED', revise_post_v2: 'REVISION_CONFLICT',
};
for (const tool of tools) {
  Deno.test(`P6 diagnostic matrix ${tool.name}: input/access/domain/rate/transport/output/unknown/privacy`, async () => {
    const originalFetch = globalThis.fetch;
    const originalLog = console.info;
    const logs: string[] = [];
    console.info = (...args) => { logs.push(args.join(' ')); };
    const version = tool.name.endsWith('_v2') ? 2 : 1;
    const params = { p_workspace_public_id: id, p_request_schema_version: version,
      ...(tool.read ? {} : { p_operation_key: 'private-operation-key' }) };
    let dispatches = 0;
    try {
      // Real registered input validator: no callback/RPC or payload reflection.
      globalThis.fetch = () => { dispatches++; throw new Error('must not run'); };
      const response = await createAuthenticatedTransport(context).fetch(new Request('http://localhost/mcp', {
        method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: {
          name: tool.name, arguments: { request_schema_version: -1,
            'SQL private-owner-token': 'private-operation-key' },
        } }),
      }));
      const inputText = await response.text();
      check(inputText.includes('VALIDATION_FAILED') && inputText.includes('not_started') === !tool.read,
        'input stage/outcome missing');
      check(!inputText.includes('private-operation-key') && !inputText.includes('SQL private-owner-token'), 'input leak');
      check(dispatches === 0, 'input dispatched');
      const denied = await invoke(tool.name, context, { ...params,
        p_workspace_public_id: '22222222-2222-4222-8222-222222222222' }, schema);
      check('isError' in denied && dispatches === 0, 'owner denial dispatched');
      const scenarios = [
        { code: domains[tool.name], stage: 'domain', outcome: tool.read ? 'not_applicable' : 'rolled_back' },
        { code: 'RATE_LIMITED', stage: 'rate_limit', outcome: tool.read ? 'not_applicable' : 'not_started' },
        { code: 'network', stage: 'rpc_transport', outcome: tool.read ? 'not_applicable' : 'unknown' },
        { code: 'timeout', stage: 'rpc_transport', outcome: tool.read ? 'not_applicable' : 'unknown' },
        { code: 'oversize', stage: 'output', outcome: tool.read ? 'not_applicable' : 'unknown' },
        { code: 'invalid', stage: 'output', outcome: tool.read ? 'not_applicable' : 'unknown' },
        { code: 'unknown', stage: 'rpc_transport', outcome: tool.read ? 'not_applicable' : 'unknown' },
      ];
      for (const scenario of scenarios) {
        globalThis.fetch = () => {
          dispatches++;
          if (scenario.code === 'network') throw new TypeError('private-fixture-token SQL');
          if (scenario.code === 'timeout') throw new DOMException('private-fixture-token', 'TimeoutError');
          if (scenario.code === 'oversize') return Promise.resolve(new Response('private-fixture-token'.repeat(30_000)));
          if (scenario.code === 'invalid') return Promise.resolve(Response.json({ secret: 'private-fixture-token' }));
          return Promise.resolve(Response.json({ message: scenario.code === 'unknown' ? 'SQL private-fixture-token' : scenario.code,
            details: 'private-operation-key' }, { status: 400, headers: { 'Retry-After': '17' } }));
        };
        const result = await invoke(tool.name, context, params, schema);
        check('isError' in result, 'failure treated as success');
        const diag = JSON.parse(result.content[0].text);
        check(diag.tool === tool.name && diag.stage === scenario.stage && diag.write_outcome === scenario.outcome,
          'stage/outcome incorrect');
        check(result.structuredContent.response_schema_version === version, 'error envelope version changed');
        if (version === 1) check(Object.keys(result.structuredContent.error).every(key =>
          ['code', 'message', 'retryable', 'recovery', 'field_errors', 'retry_after_seconds'].includes(key)),
        'canonical fields leaked into closed v1 error');
        if (scenario.code === 'RATE_LIMITED') check(diag.retry_after_seconds === 17, 'actual wait lost');
        if (scenario.outcome === 'unknown') check(diag.recovery.includes('identical payload') && diag.recovery.includes('Reconcile'), 'unsafe unknown recovery');
        check(logs.some(log => JSON.parse(log).diagnostic_id === diag.diagnostic_id), 'diagnostic ID not traceable');
        check(!JSON.stringify(result).includes('private-fixture-token') &&
          !JSON.stringify(result).includes('private-operation-key'), 'response leak');
      }
      check(!logs.join('\n').includes('private-fixture-token') && !logs.join('\n').includes('private-operation-key'), 'log leak');
    } finally { globalThis.fetch = originalFetch; console.info = originalLog; }
  });
}
Deno.test('P6 diagnostic inventory is exactly the actual 33-tool catalog, including D2', () => {
  const expected = errorTaxonomy.groups.flatMap(g => [...g.reads, ...g.writes]).sort();
  check(tools.length === 33 && new Set(tools.map(t => t.name)).size === 33, 'catalog drift');
  check(JSON.stringify(tools.map(t => t.name).sort()) === JSON.stringify(expected), 'diagnostic coverage drift');
  check(JSON.stringify(Object.keys(domains).sort()) === JSON.stringify(expected), 'per-tool domain inventory drift');
});
Deno.test('P6 safe domain locations, alias mapping and v1 native recovery', async () => {
  const original = globalThis.fetch;
  try {
    for (const [raw, details, code, path] of [
      ['FACT_REUSE_BLOCKED', 'facts[3]', 'FACT_REUSE_BLOCKED', 'facts[2]'],
      ['CONTENT_BUDGET_EXCEEDED', null, 'TEXT_BUDGET_EXCEEDED', 'content_payload'],
      ['EDITORIAL_REVIEW_REQUIRED', null, 'QUALITY_EDITORIAL_INCOMPLETE', undefined],
    ]) {
      globalThis.fetch = () => Promise.resolve(Response.json({ message: raw, details }, { status: 400 }));
      const r = await invoke('save_post_v2', context, { p_request_schema_version: 2 }, schema);
      const diag = JSON.parse(r.content[0].text);
      check(diag.code === code && (path === undefined || diag.field_errors[0].path === path), 'domain context lost');
    }
    globalThis.fetch = () => Promise.resolve(Response.json({ message: 'FACT_REVIEW_REQUIRED' }, { status: 400 }));
    const r = await invoke('trivia_find_similar_facts', context, { p_request_schema_version: 1 }, schema);
    const diag = JSON.parse(r.content[0].text);
    check(diag.recovery.includes('only after') && diag.recovery.includes('reconcile'), 'unverified v2 assumed available');
    check(r.structuredContent.response_schema_version === 1, 'native denial broke v1');
  } finally { globalThis.fetch = original; }
});
Deno.test('P6 taxonomy categories, fallback codes and recovery preserve all P1 codes', () => {
  for (const [category, codes] of Object.entries(errorTaxonomy.categories)) {
    for (const code of codes) {
      const r = diagnosticFailure('save_post_v2', 2, code, 'domain', {
        [code]: ['Safe fixture explanation.', false, 'Read and review the current state.'],
        INTERNAL_ERROR: ['Unknown.', false, 'Inspect the diagnostic ID.'],
      });
      const diag = JSON.parse(r.content[0].text);
      check(diag.category === category && diag.code === code, 'taxonomy drift: ' + code);
    }
  }
});
