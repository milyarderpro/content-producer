import * as z from 'npm:zod@4.3.6';
import { createMcpHandler } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { invoke } from './foundation.ts';
import { buildPilotRpcStatement } from './pilot_db.ts';
import { canonicalMan02RpcArguments, isApprovedMan02CreatePage } from './pilot_write.ts';
import { isApprovedPilot104Write } from './pilot_write_10_4.ts';
import { createAuthenticatedTransport } from './transport.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { createMcpServer } from './server.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}
const context: RequestContext = {
  requestId: 'phase-10-1-fixed-pilot',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: 'phase-10-1-noauth-fixed-pilot',
  workspacePublicId: '44444444-4444-4444-8444-444444444444',
  accessToken: '',
  supabaseUrl: 'https://invalid.example',
  publishableKey: '',
  pilotMode: true,
};
function request(method: string, params?: object): Request {
  return new Request('http://localhost/functions/v1/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 11, method, ...(params ? { params } : {}) }),
  });
}
function responseJson(body: string): Record<string, unknown> {
  const line = body.split('\n').find((text) => text.startsWith('data: '));
  return JSON.parse((line ?? body).replace(/^data: /, '')) as Record<string, unknown>;
}
function normalizeExpectedWirePatterns(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeExpectedWirePatterns);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key === 'pattern' && typeof entry === 'string'
        ? entry.replaceAll('\\p{Cc}', '\\x00-\\x1F\\x7F-\\x9F')
        : normalizeExpectedWirePatterns(entry),
    ]),
  );
}
Deno.test('10.1 noauth pilot advertises exactly 33 tools without OAuth descriptors', async () => {
  const response = await createAuthenticatedTransport(context).fetch(request('tools/list'));
  assert(response.status === 200, 'catalog must succeed');
  const catalogBody = await response.text();
  assert(
    new TextEncoder().encode(catalogBody).byteLength < 100_000,
    'CR-033 pilot catalog must remain under 100 KB without changing tool count',
  );
  const listed = responseJson(catalogBody);
  const tools = (listed.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(MCP_TOOL_COUNT === 33 && tools.length === 33, 'exact 33 tools');
  assert(new Set(tools.map((tool) => tool.name)).size === 33, 'duplicate tool names');
  assert(
    tools.some((tool) => tool.name === 'create_page'),
    'missing create_page',
  );
  for (const tool of tools) {
    assert(
      JSON.stringify(tool.securitySchemes) === JSON.stringify([{ type: 'noauth' }]),
      'every pilot tool must explicitly advertise top-level noauth',
    );
    const meta = tool._meta as Record<string, unknown> | undefined;
    assert(
      JSON.stringify(meta?.securitySchemes) === JSON.stringify([{ type: 'noauth' }]),
      'every pilot tool must explicitly advertise _meta noauth',
    );
    assert(!('openai/profile' in (meta ?? {})), 'pilot tools must not advertise OAuth profiles');
    assert(!('outputSchema' in tool), 'pilot catalog must omit optional output metadata');
    assert(!('title' in tool), 'pilot catalog must omit redundant display title');
    const input = tool.inputSchema as Record<string, unknown>;
    assert(input.type === 'object', 'pilot input schema must remain object');
    assert(!('$schema' in input), 'omit optional input-schema dialect only');
  }
  // Compare BOTH host catalogs against the original SDK descriptors.
  // Changes must be limited to optional wire metadata and CR-034's
  // character-class equivalent, never input constraints or auth schemes.
  const rawTransport = createMcpHandler(() =>
    createMcpServer({
      ...context,
      pilotMode: false,
    }),
  );
  const rawResponse = await rawTransport.fetch(request('tools/list'));
  assert(rawResponse.status === 200, 'raw SDK catalog available');
  const original = responseJson(await rawResponse.text());
  const originalTools = (original.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(originalTools.length === 33, 'SDK original contains 33 tools');

  const oauthResponse = await createAuthenticatedTransport({
    ...context,
    pilotMode: false,
  }).fetch(request('tools/list'));
  assert(oauthResponse.status === 200, 'OAuth tools/list returns HTTP 200');
  const oauthWire = await oauthResponse.text();
  assert(
    new TextEncoder().encode(oauthWire).byteLength < 100_000,
    'CR-033 OAuth catalog must be below the tested 100 KB target',
  );
  const oauth = responseJson(oauthWire);
  const oauthTools = (oauth.result as { tools: Array<Record<string, unknown>> }).tools;
  assert(oauthTools.length === 33, 'OAuth catalog must expose exactly 33 tools');
  assert(new Set(oauthTools.map((tool) => tool.name)).size === 33, 'OAuth duplicate tool name');
  assert(
    oauthTools.some((tool) => tool.name === 'mark_post_posted'),
    'the historically rejected tool must remain available',
  );

  const scan = (value: unknown, patterns: string[]): void => {
    if (Array.isArray(value)) {
      value.forEach((item) => scan(item, patterns));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, entry] of Object.entries(value)) {
      if (key === 'pattern' && typeof entry === 'string') {
        patterns.push(entry);
        assert(!entry.includes('\\p{Cc}'), 'OAuth input contains nonportable Cc escape');
        new RegExp(entry); // Assert every advertised regex compiles as ordinary JS regex.
      } else scan(entry, patterns);
    }
  };
  const compiledPatterns: string[] = [];
  for (const compact of tools) {
    const full = originalTools.find((tool) => tool.name === compact.name);
    const auth = oauthTools.find((tool) => tool.name === compact.name);
    assert(!!full && !!auth, 'tool is missing in raw or OAuth catalog');
    assert('outputSchema' in full && 'title' in full, 'raw SDK metadata intact');
    const expandedInput = { ...(full.inputSchema as Record<string, unknown>) };
    delete expandedInput.$schema;
    const portable = normalizeExpectedWirePatterns(expandedInput);
    assert(
      JSON.stringify(compact.inputSchema) === JSON.stringify(portable),
      'No-auth input differs from SDK beyond CR-034 transforms',
    );
    assert(
      JSON.stringify(auth.inputSchema) === JSON.stringify(portable),
      'OAuth input differs from SDK beyond CR-034 transforms',
    );
    assert(
      !('outputSchema' in auth) && !('title' in auth),
      'OAuth optional metadata must be compact',
    );
    assert(
      !('$schema' in (auth.inputSchema as Record<string, unknown>)),
      'OAuth root dialect must be omitted',
    );
    assert(
      JSON.stringify(auth.securitySchemes) ===
        JSON.stringify((full._meta as Record<string, unknown>).securitySchemes),
      'OAuth top-level security must equal SDK OAuth scheme',
    );
    assert(
      JSON.stringify((auth._meta as Record<string, unknown>).securitySchemes) ===
        JSON.stringify((full._meta as Record<string, unknown>).securitySchemes),
      'OAuth meta security must equal SDK OAuth scheme',
    );
    assert(
      JSON.stringify(auth.securitySchemes) !== JSON.stringify([{ type: 'noauth' }]),
      'OAuth tool must NEVER be marked noauth',
    );
    assert(
      JSON.stringify((auth._meta as Record<string, unknown>)['openai/profile']) ===
        JSON.stringify((full._meta as Record<string, unknown>)['openai/profile']),
      'OAuth profile marker must not change',
    );
    assert(
      JSON.stringify(auth.description) === JSON.stringify(full.description),
      'descriptions must not be rewritten',
    );
    scan(auth.inputSchema, compiledPatterns);
    assert(
      !JSON.stringify(auth.inputSchema).includes('\\\\p{Cc}'),
      'OAuth catalog must have no nonportable Unicode category pattern',
    );
  }
  assert(compiledPatterns.length > 0, 'compiled schema must contain patterns');
  const profiles = oauthTools.filter(
    (tool) => (tool._meta as Record<string, unknown>)['openai/profile'] === true,
  );
  assert(
    profiles.length === 1 && profiles[0]?.name === 'get_account_profile',
    'exactly one OAuth get_account_profile marker required',
  );
  const impactedTools = originalTools
    .filter((tool) => JSON.stringify(tool.inputSchema).includes('\\\\p{Cc}'))
    .map((tool) => tool.name);
  assert(
    JSON.stringify(impactedTools) ===
      JSON.stringify(['mark_post_posted', 'record_post_performance']),
    'unexpected Cc rewrite target',
  );
});
Deno.test('10.1 default pilot write latch blocks business RPC before database access', async () => {
  const result = await invoke(
    'create_page',
    context,
    { p_request_schema_version: 1, p_workspace_public_id: context.workspacePublicId },
    z.unknown(),
  );
  assert('isError' in result, 'business write must be blocked');
  assert(JSON.stringify(result).includes('PILOT_WRITE_LOCKED'), 'write latch error code');
});

Deno.test(
  '10.3 MAN-02 payload grant is default-closed and exact, including operation key',
  async () => {
    const params: Record<string, unknown> = {
      p_request_schema_version: 1,
      p_workspace_public_id: context.workspacePublicId,
      p_operation_key: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      p_name: 'Owner approved sample',
      p_slug: 'owner-approved-sample',
      p_timezone: 'America/New_York',
      p_target_markets: ['US'],
      p_niche_key: 'trivia',
      p_config_schema_version: 1,
      p_config: {
        fact_count: { mode: 'adaptive', min: 5, preferred: 7, max: 9 },
        fact_reuse_scope: 'workspace_unique',
      },
      p_make_default: true,
    };
    const canonical = canonicalMan02RpcArguments(params);
    const digest = new Uint8Array(
      await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical)),
    );
    const grant = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    assert(!(await isApprovedMan02CreatePage('create_page', params, '')), 'no grant must deny');
    assert(
      !(await isApprovedMan02CreatePage('create_page', params, '0'.repeat(64))),
      'wrong grant',
    );
    assert(
      !(await isApprovedMan02CreatePage('create_page', params, 'SHA256:' + grant)),
      'bad grant format',
    );
    assert(!(await isApprovedMan02CreatePage('update_page', params, grant)), 'other write blocked');
    assert(await isApprovedMan02CreatePage('create_page', params, grant), 'exact grant permits');
    const reordered: Record<string, unknown> = Object.fromEntries(Object.entries(params).reverse());
    reordered.p_config = {
      fact_reuse_scope: 'workspace_unique',
      fact_count: { max: 9, preferred: 7, min: 5, mode: 'adaptive' },
    };
    assert(
      await isApprovedMan02CreatePage('create_page', reordered, grant),
      'object key order must not change the semantic hash',
    );
    for (const altered of [
      { ...params, p_name: 'Unexpected Page' },
      { ...params, p_operation_key: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' },
      { ...params, p_workspace_public_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' },
      { ...params, p_target_markets: ['GB'] },
      { ...params, p_config: { ...(params.p_config as object), fact_reuse_scope: 'page_unique' } },
      { ...params, p_make_default: false },
      { ...params, extra_rpc_argument: 'unexpected' },
    ]) {
      assert(
        !(await isApprovedMan02CreatePage('create_page', altered, grant)),
        'altered Page, config, key, workspace or fields must deny',
      );
    }
    const removed = { ...params };
    delete removed.p_make_default;
    assert(!(await isApprovedMan02CreatePage('create_page', removed, grant)), 'missing key denies');
  },
);

Deno.test('10.1 foreign workspace must be rejected before SQL connection', async () => {
  const result = await invoke(
    'list_pages',
    context,
    {
      p_request_schema_version: 1,
      p_workspace_public_id: '55555555-5555-4555-8555-555555555555',
    },
    z.unknown(),
  );
  assert('isError' in result, 'foreign workspace must fail');
  assert(JSON.stringify(result).includes('OWNER_ACCESS_REQUIRED'), 'wrong workspace error');
});
Deno.test('10.1 SQL statement builder allows only named parameters, never free SQL', () => {
  assert(
    buildPilotRpcStatement('list_pages', {
      p_request_schema_version: 1,
      p_workspace_public_id: context.workspacePublicId,
    }) ===
      'select api."list_pages"("p_request_schema_version" => $1, "p_workspace_public_id" => $2) as result',
    'named parameter binding changed',
  );
  assert(
    buildPilotRpcStatement('create_page', {
      p_request_schema_version: 1,
      p_config: { fact_count: { mode: 'fixed', value: 7 } },
      p_make_default: true,
    }) ===
      'select api."create_page"("p_request_schema_version" => $1, "p_config" => $2::text::jsonb, "p_make_default" => $3) as result',
    'MAN-02 JSON text must be explicitly parsed into a jsonb object by PostgreSQL',
  );
  assert(
    buildPilotRpcStatement('trivia_find_similar_facts', {
      p_candidates: [{ candidate_key: 'moon_1' }],
    }) === 'select api."trivia_find_similar_facts"("p_candidates" => $1::text::jsonb) as result',
    'MAN-03 dedup candidates must be encoded as JSONB, not a PostgreSQL array',
  );
  assert(
    buildPilotRpcStatement('update_page', { p_config: { example: true } }) ===
      'select api."update_page"("p_config" => $1) as result',
    'MAN-02 cast must not silently change other RPC SQL',
  );
  for (const [name, params] of [
    ['list_pages;drop table public.workspaces', {}],
    ['list_pages', { 'p_limit); drop table x --': 1 }],
    ['public.workspaces', {}],
  ] as Array<[string, Record<string, unknown>]>) {
    let rejected = false;
    try {
      buildPilotRpcStatement(name, params);
    } catch {
      rejected = true;
    }
    assert(rejected, 'unsafe dynamic identifier accepted');
  }
});

Deno.test(
  '10.4 stage permits are default-closed, short-lived and confined to Moon draft',
  async () => {
    const now = Date.UTC(2026, 9, 19, 12);
    const key = '11111111-1111-4111-8111-111111111111';
    const token = '22222222-2222-4222-8222-222222222222';
    const sha256 = async (input: string) =>
      Array.from(
        new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))),
      )
        .map((n) => n.toString(16).padStart(2, '0'))
        .join('');
    const permit = JSON.stringify({
      expires_at: '2026-10-19T13:00:00Z',
      operation_key_sha256: await sha256(key),
      reservation_token_sha256: await sha256(token),
    });
    const read = (name: string) => (name === 'MCP_MAN03_RESERVE_GRANT_JSON' ? permit : undefined);
    const source = {
      schema_version: 1,
      url: 'https://science.nasa.gov/moon/moon-phases/',
      canonical_url: 'https://science.nasa.gov/moon/moon-phases/',
      title: 'Moon Phases',
      publisher: 'NASA',
      tier: 'A',
      source_type: 'official',
      accessed_at: '2026-10-19T12:00:00Z',
      language: 'en',
      supports: 'The Sun illuminates one hemisphere of the Moon',
      independence_group: 'nasa',
    };
    const args: Record<string, unknown> = {
      p_request_schema_version: 1,
      p_workspace_public_id: 'cad2885e-952e-41b3-9eae-d2d9d75d533d',
      p_operation_key: key,
      p_page_public_id: '37457236-17ec-4486-8880-6832460ae411',
      p_reservation_token: token,
      p_expected_config_updated_at: '2026-10-19T10:33:17.018070Z',
      p_fact_reuse_scope: 'workspace_unique',
      p_reservation_ttl_minutes: 30,
      p_facts: Array.from({ length: 7 }, (_, i) => ({
        position: i + 1,
        candidate: {
          candidate_key: 'moon_' + i,
          topic_key: 'nature_science',
          normalization_version: 1,
          ontology_version: 1,
        },
        sources: [source],
        risk_class: 'standard',
        freshness_class: 'stable',
      })),
    };
    assert(
      !(await isApprovedPilot104Write(
        'trivia_register_and_reserve_facts',
        args,
        () => undefined,
        now,
      )),
      'no grant must deny',
    );
    assert(
      await isApprovedPilot104Write('trivia_register_and_reserve_facts', args, read, now),
      'bounded Moon reservation',
    );
    for (const changed of [
      { ...args, p_operation_key: '33333333-3333-4333-8333-333333333333' },
      { ...args, p_page_public_id: '44444444-4444-4444-8444-444444444444' },
      { ...args, p_reservation_token: '33333333-3333-4333-8333-333333333333' },
      { ...args, p_facts: (args.p_facts as unknown[]).slice(0, 4) },
      {
        ...args,
        p_facts: (args.p_facts as Record<string, unknown>[]).map((x) => ({
          ...x,
          candidate: { ...(x.candidate as object), topic_key: 'animals' },
        })),
      },
    ]) {
      assert(
        !(await isApprovedPilot104Write('trivia_register_and_reserve_facts', changed, read, now)),
        'altered scope must deny',
      );
    }
    assert(
      !(await isApprovedPilot104Write('create_page', args, read, now)),
      'wrong write must deny',
    );
    assert(
      !(await isApprovedPilot104Write(
        'trivia_register_and_reserve_facts',
        args,
        read,
        now + 3_600_000,
      )),
      'expired grant must deny',
    );
    const excessive = JSON.stringify({
      expires_at: '2026-10-20T00:00:00Z',
      operation_key_sha256: await sha256(key),
      reservation_token_sha256: await sha256(token),
    });
    assert(
      !(await isApprovedPilot104Write(
        'trivia_register_and_reserve_facts',
        args,
        () => excessive,
        now,
      )),
      'long-term grant must deny',
    );
  },
);

Deno.test('10.4 draft saving cannot schedule, switch topic, approve or waive quality', async () => {
  const now = Date.UTC(2026, 9, 19, 12);
  const key = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const token = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const sha = async (input: string) =>
    Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
  const permit = JSON.stringify({
    expires_at: '2026-10-19T13:00:00Z',
    operation_key_sha256: await sha(key),
    reservation_token_sha256: await sha(token),
  });
  const read = (name: string) => (name === 'MCP_MAN03_SAVE_GRANT_JSON' ? permit : undefined);
  const copy = Array.from({ length: 7 }, (_, i) => ({
    position: i + 1,
    text: 'Verified Moon fact ' + (i + 1),
  }));
  const args: Record<string, unknown> = {
    p_request_schema_version: 1,
    p_workspace_public_id: 'cad2885e-952e-41b3-9eae-d2d9d75d533d',
    p_operation_key: key,
    p_page_public_id: '37457236-17ec-4486-8880-6832460ae411',
    p_niche_key: 'trivia',
    p_reservation_token: token,
    p_expected_config_updated_at: '2026-10-19T10:33:17.018070Z',
    p_plan_item: null,
    p_scheduled_at: null,
    p_content_schema_version: 1,
    p_format_key: 'single_subject_fast',
    p_topic_key: 'nature_science',
    p_interaction_goal: 'follow',
    p_content_payload: {
      schema_version: 1,
      hook: 'Moon facts',
      body: { facts: copy },
      cta: 'Follow for more',
    },
    p_generation_snapshot: {
      profile_key: 'fast_trivia',
      config_updated_at: '2026-10-19T10:33:17.018070Z',
      fact_count_applied: 7,
      fact_reuse_scope: 'workspace_unique',
      locale: 'en-US',
      render_style: 'plain_lines',
      target_markets: ['US'],
      text_budget: { hook_max_chars: 45 },
    },
    p_fact_bindings: copy.map((x) => ({ position: x.position })),
    p_editorial_checks: { rubric_version: 1, overall_status: 'pass' },
  };
  assert(await isApprovedPilot104Write('save_post', args, read, now), 'draft-only scoped save');
  for (const changed of [
    { ...args, p_scheduled_at: '2026-10-20T12:00:00Z' },
    { ...args, p_topic_key: 'animals' },
    { ...args, p_format_key: 'myth_vs_fact' },
    { ...args, p_plan_item: {} },
    { ...args, p_editorial_checks: { rubric_version: 1, overall_status: 'fail' } },
  ]) {
    assert(
      !(await isApprovedPilot104Write('save_post', changed, read, now)),
      'unauthorized variant must deny',
    );
  }
  assert(
    !(await isApprovedPilot104Write('approve_post', args, read, now)),
    'approval always separately locked',
  );
  const sqlReserve = buildPilotRpcStatement('trivia_register_and_reserve_facts', { p_facts: [{}] });
  assert(sqlReserve.includes('"p_facts" => $1::text::jsonb'), 'fact list must be JSONB');
  const sqlSave = buildPilotRpcStatement('save_post', {
    p_content_payload: {},
    p_generation_snapshot: {},
    p_fact_bindings: [{}],
    p_editorial_checks: {},
  });
  assert(sqlSave.includes('"p_fact_bindings" => $3::text::jsonb'), 'allocations must be JSONB');
});

Deno.test('10.4 MAN-04 CAS revision permit does not imply editorial approval', async () => {
  const now = Date.UTC(2026, 9, 19, 12);
  const key = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  const post = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const hash = 'a'.repeat(64);
  const sha = async (input: string) =>
    Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
  const grant = JSON.stringify({
    expires_at: '2026-10-19T13:00:00Z',
    operation_key_sha256: await sha(key),
    post_public_id: post,
    expected_revision: 1,
    expected_content_hash: hash,
    approved_hook: 'Seven Moon-phase surprises',
  });
  const read = (name: string) => (name === 'MCP_MAN04_REVISE_GRANT_JSON' ? grant : undefined);
  const args: Record<string, unknown> = {
    p_request_schema_version: 1,
    p_workspace_public_id: 'cad2885e-952e-41b3-9eae-d2d9d75d533d',
    p_operation_key: key,
    p_post_public_id: post,
    p_expected_revision: 1,
    p_expected_content_hash: hash,
    p_reservation_token: null,
    p_content_schema_version: 1,
    p_format_key: 'single_subject_fast',
    p_topic_key: 'nature_science',
    p_interaction_goal: 'follow',
    p_content_payload: {
      schema_version: 1,
      hook: 'Seven Moon-phase surprises',
      body: { facts: Array.from({ length: 7 }, (_, i) => ({ position: i + 1 })) },
    },
    p_generation_snapshot: {
      profile_key: 'fast_trivia',
      config_updated_at: '2026-10-19T10:33:17.018070Z',
    },
    p_fact_bindings: Array.from({ length: 7 }, (_, i) => ({ position: i + 1 })),
  };
  assert(await isApprovedPilot104Write('revise_post', args, read, now), 'CAS hook edit permitted');
  assert(
    !(await isApprovedPilot104Write('approve_post', args, read, now)),
    'no approval from revision grant',
  );
  for (const changed of [
    { ...args, p_expected_revision: 2 },
    { ...args, p_expected_content_hash: 'b'.repeat(64) },
    {
      ...args,
      p_content_payload: { ...(args.p_content_payload as object), hook: 'Unreviewed hook' },
    },
    { ...args, p_post_public_id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee' },
  ]) {
    assert(
      !(await isApprovedPilot104Write('revise_post', changed, read, now)),
      'CAS/new copy not authorized',
    );
  }
});

Deno.test('10.4 approval demands a new exact owner-reviewed RPC hash with no waivers', async () => {
  const now = Date.UTC(2026, 9, 19, 12);
  const key = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
  const post = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
  const content = 'a'.repeat(64);
  const sha = async (input: string) =>
    Array.from(
      new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input))),
    )
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('');
  const args: Record<string, unknown> = {
    p_request_schema_version: 1,
    p_workspace_public_id: 'cad2885e-952e-41b3-9eae-d2d9d75d533d',
    p_operation_key: key,
    p_post_public_id: post,
    p_expected_revision: 2,
    p_expected_content_hash: content,
    p_explicit_approval: true,
    p_accepted_warning_ids: [],
    p_warning_acceptance_reason: null,
  };
  const ordered = Object.fromEntries(Object.entries(args).sort(([a], [b]) => a.localeCompare(b)));
  const grant = JSON.stringify({
    expires_at: '2026-10-19T13:00:00Z',
    operation_key_sha256: await sha(key),
    post_public_id: post,
    expected_revision: 2,
    expected_content_hash: content,
    approved_rpc_sha256: await sha(JSON.stringify(ordered)),
  });
  const read = (name: string) => (name === 'MCP_MAN04_APPROVE_GRANT_JSON' ? grant : undefined);
  assert(await isApprovedPilot104Write('approve_post', args, read, now), 'matching approval RPC');
  for (const changed of [
    { ...args, p_expected_revision: 1 },
    { ...args, p_expected_content_hash: 'b'.repeat(64) },
    { ...args, p_explicit_approval: false },
    { ...args, p_accepted_warning_ids: ['trivia.visual_rhythm_clear'] },
    { ...args, p_warning_acceptance_reason: 'Unreviewed waiver' },
  ]) {
    assert(
      !(await isApprovedPilot104Write('approve_post', changed, read, now)),
      'stale or unreviewed approval must deny',
    );
  }
});
