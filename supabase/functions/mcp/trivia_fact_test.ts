import { materializeMissingSourceNulls } from './source_evidence_adapter.ts';
import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { TRIVIA_FACT_TOOL_NAMES } from './trivia_fact.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const page = '66666666-6666-4666-8666-666666666666';
const reservationToken = '88888888-8888-4888-8888-888888888888';
const operationKey = '99999999-9999-4999-8999-999999999999';
const factId = '77777777-7777-4777-8777-777777777777';
const stamp = '2026-10-14T12:00:00Z';
const context: RequestContext = {
  requestId: '6.7-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const candidate = {
  candidate_key: 'fixture-1',
  claim_text: 'A tested atomic proposition.',
  subject_key: 'test_subject',
  relation_key: 'has_count',
  object_key: '3',
  numbers: [{ value: '3', unit: 'count', role: 'count' }],
  qualifiers: { negated: false, comparison_direction: 'none' },
  topic_key: 'animals',
  normalization_version: 1,
  ontology_version: 1,
};
const source = {
  schema_version: 1,
  url: 'https://example.test/fact',
  canonical_url: 'https://example.test/fact',
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
const shared = { request_schema_version: 1, workspace_public_id: workspace, page_public_id: page };
const write = { ...shared, operation_key: operationKey };
const inputs: Record<string, Record<string, unknown>> = {
  trivia_find_similar_facts: { ...shared, candidates: [candidate] },
  trivia_register_and_reserve_facts: {
    ...write,
    reservation_token: reservationToken,
    expected_config_updated_at: stamp,
    fact_reuse_scope: 'workspace_unique',
    reservation_ttl_minutes: 30,
    facts: [
      {
        position: 1,
        candidate,
        dedup_reviews: [],
        sources: [source],
        freshness_class: 'stable',
        as_of_date: null,
        requested_expires_at: '2026-12-11T00:00:00Z',
        risk_class: 'standard',
        verification_note: 'Checked against primary research.',
      },
    ],
  },
  trivia_release_facts: {
    ...write,
    reservation_token: reservationToken,
    reason: 'Abandoned before save.',
  },
};
const responses: Record<string, object> = {
  trivia_find_similar_facts: {
    candidates: [
      {
        candidate_key: candidate.candidate_key,
        normalized_preview: 'a tested atomic proposition',
        matches: [],
        review_required: false,
      },
    ],
  },
  trivia_register_and_reserve_facts: {
    reservation_token: reservationToken,
    page_public_id: page,
    fact_reuse_scope: 'workspace_unique',
    reserved_until: stamp,
    facts: [
      {
        position: 1,
        fact_public_id: factId,
        canonical_claim: candidate.claim_text,
        canonical_action: 'created_new',
        verification_status: 'verified',
        expires_at: '2026-12-11T00:00:00Z',
      },
    ],
    replayed: false,
  },
  trivia_release_facts: {
    released_fact_public_ids: [factId],
    already_inactive_count: 0,
    replayed: false,
  },
};
function check(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
}
async function mcp(method: string, params?: object) {
  const http = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 67, method, ...(params ? { params } : {}) }),
    }),
  );
  check(http.status === 200, 'MCP_HTTP_STATUS');
  const text = await http.text();
  const frame = text.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : text);
}
async function call(name: string, args = inputs[name]) {
  return (await mcp('tools/call', { name, arguments: args })).result;
}
Deno.test(
  '6.7 trivia tools among 33 OAuth tools, closed schemas and correct annotations',
  async () => {
    const listed = (await mcp('tools/list')).result.tools;
    check(MCP_TOOL_COUNT === 33 && listed.length === 33, 'EXACT_33_TOOLS');
    for (const name of TRIVIA_FACT_TOOL_NAMES) {
      const tool = listed.find((value: { name: string }) => value.name === name);
      check(tool && tool._meta.securitySchemes[0].type === 'oauth2', 'OAUTH_REQUIRED');
      check(tool._meta.securitySchemes[0].scopes.join(' ') === 'openid email', 'OAUTH_SCOPES');
      check(tool.annotations.openWorldHint === false, 'CLOSED_WORLD');
      check(
        tool.annotations.readOnlyHint === (name === 'trivia_find_similar_facts'),
        'READ_ANNOTATION',
      );
      check(tool.annotations.destructiveHint === false, 'NON_DESTRUCTIVE');
      check(tool.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
      check(!Object.hasOwn(tool, 'outputSchema'), 'OPTIONAL_OUTPUT_OMITTED');
      check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE_METADATA');
      if (name === 'trivia_find_similar_facts') {
        // The advertised tools/list schema must never suggest that CR-005
        // comparison_direction can be omitted when SQL requires it.
        const qualifiers = tool.inputSchema.properties.candidates.items.properties.qualifiers;
        check(qualifiers.required.includes('comparison_direction'), 'DIRECTION_REQUIRED');
        check(
          qualifiers.properties.comparison_direction.enum.includes('none'),
          'DIRECTION_ENUM_ADVERTISED',
        );
      }
    }
  },
);
Deno.test(
  '6.7 authenticated public MCP forwards original JWT, ordered facts, token and unchanged keys',
  async () => {
    const original = globalThis.fetch;
    const seen: Array<{ name: string; args: Record<string, unknown> }> = [];
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      const name = String(input).split('/').pop()!;
      const headers = new Headers(init?.headers);
      check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
      check(headers.get('Content-Profile') === 'api', 'PUBLIC_RPC_SCHEMA');
      check(headers.get('apikey') === context.publishableKey, 'PUBLIC_API_KEY');
      seen.push({ name, args: JSON.parse(String(init?.body)) });
      return Promise.resolve(Response.json({ response_schema_version: 1, data: responses[name] }));
    }) as typeof fetch;
    try {
      for (const name of TRIVIA_FACT_TOOL_NAMES) {
        const result = await call(name);
        check(result?.isError !== true, 'VALID_TOOL_' + name);
        if (name === 'trivia_register_and_reserve_facts') {
          check(
            result.structuredContent.data.reservation_token === reservationToken,
            'STRUCTURED_RESERVATION_TOKEN',
          );
          check(!JSON.stringify(result.content).includes(reservationToken), 'TEXT_TOKEN_LEAK');
        }
      }
      check(seen.map((x) => x.name).join(',') === TRIVIA_FACT_TOOL_NAMES.join(','), 'RPC_NAMES');
      check(seen[0].args.p_max_matches_per_candidate === 10, 'SEARCH_DEFAULT');
      check(seen[1].args.p_reservation_token === reservationToken, 'TOKEN_FORWARD');
      check(seen[1].args.p_operation_key === operationKey, 'KEY_FORWARD');
      check((seen[1].args.p_facts as unknown[]).length === 1, 'ORDERED_SET');
      check(seen[2].args.p_reason === inputs.trivia_release_facts.reason, 'RELEASE_REASON');
      check(
        seen.every((x) => x.args.p_workspace_public_id === workspace),
        'OWNER_SCOPE',
      );
      check(
        seen.every(
          (x) => !Object.keys(x.args).some((k) => /p_owner|p_actor|p_client|p_oauth/.test(k)),
        ),
        'IDENTITY_OVERRIDE',
      );
    } finally {
      globalThis.fetch = original;
    }
  },
);
Deno.test(
  '6.7 malformed candidates, unsafe release, foreign workspace and hidden identity rejected before RPC',
  async () => {
    const original = globalThis.fetch;
    let invoked = 0;
    globalThis.fetch = (() => {
      invoked++;
      return Promise.resolve(Response.json({}));
    }) as typeof fetch;
    try {
      for (const [name, patch] of [
        ['trivia_find_similar_facts', { candidates: [] }],
        ['trivia_find_similar_facts', { candidates: [candidate, candidate] }],
        ['trivia_find_similar_facts', { candidates: [{ ...candidate, ontology_version: 2 }] }],
        // LT-016/CR-005: SQL requires explicit comparison_direction although old MCP
        // schema advertised it as optional. Reject before reaching the RPC boundary.
        [
          'trivia_find_similar_facts',
          { candidates: [{ ...candidate, qualifiers: { negated: false } }] },
        ],
        [
          'trivia_find_similar_facts',
          {
            candidates: [
              { ...candidate, qualifiers: { negated: false, comparison_direction: 'upward' } },
            ],
          },
        ],
        [
          'trivia_register_and_reserve_facts',
          {
            facts: [
              {
                ...(inputs.trivia_register_and_reserve_facts.facts as Record<string, unknown>[])[0],
                candidate: { ...candidate, qualifiers: { negated: false } },
              },
            ],
          },
        ],
        ['trivia_register_and_reserve_facts', { facts: [] }],
        [
          'trivia_register_and_reserve_facts',
          {
            facts: [
              { ...(inputs.trivia_register_and_reserve_facts.facts as object[])[0], position: 2 },
            ],
          },
        ],
        ['trivia_register_and_reserve_facts', { reservation_token: 'invalid' }],
        ['trivia_register_and_reserve_facts', { reservation_ttl_minutes: 4 }],
        ['trivia_release_facts', { reason: 'CONTEXT: unsafe trace content' }],
        ['trivia_release_facts', { reason: 'SQLSTATE 42501' }],
        ['trivia_release_facts', { reservation_token: 'invalid' }],
      ] as const) {
        check(
          (await call(name, { ...inputs[name], ...patch }))?.isError === true,
          'INVALID_' + name,
        );
      }
      for (const name of TRIVIA_FACT_TOOL_NAMES) {
        check(
          (await call(name, { ...inputs[name], actor_user_id: context.actorUserId }))?.isError ===
            true,
          'INJECTED_ACTOR',
        );
        check(
          (
            await call(name, {
              ...inputs[name],
              workspace_public_id: '55555555-5555-4555-8555-555555555555',
            })
          )?.isError === true,
          'FOREIGN_SCOPE',
        );
      }
      check(invoked === 0, 'UNSAFE_INPUT_REACHED_RPC');
    } finally {
      globalThis.fetch = original;
    }
  },
);
Deno.test(
  '6.7 RPC replay stays historical and token never leaks into errors or text; malformed output fails closed',
  async () => {
    const original = globalThis.fetch;
    try {
      let replayed = false;
      globalThis.fetch = ((input: Request | URL | string) => {
        const name = String(input).split('/').pop()!;
        return Promise.resolve(
          Response.json({
            response_schema_version: 1,
            data: {
              ...responses[name],
              ...(name !== 'trivia_find_similar_facts' ? { replayed } : {}),
            },
          }),
        );
      }) as typeof fetch;
      for (const name of ['trivia_register_and_reserve_facts', 'trivia_release_facts']) {
        const first = (await call(name)).structuredContent.data;
        replayed = true;
        const second = (await call(name)).structuredContent.data;
        check(second.replayed === true, 'REPLAY_FLAG');
        check(
          JSON.stringify(first) === JSON.stringify({ ...second, replayed: false }),
          'HISTORICAL_RESULT',
        );
        replayed = false;
      }
      globalThis.fetch = (() =>
        Promise.resolve(
          Response.json(
            {
              code: 'P0001',
              message: 'FACT_RESERVATION_CONFLICT',
              details: 'SQLSTATE internal_id=42 token=secret',
            },
            { status: 400 },
          ),
        )) as typeof fetch;
      const conflict = await call('trivia_register_and_reserve_facts');
      check(
        conflict.isError === true &&
          conflict.structuredContent.error.code === 'FACT_RESERVATION_CONFLICT',
        'SAFE_CONFLICT',
      );
      check(
        !JSON.stringify(conflict).includes('SQLSTATE') &&
          !JSON.stringify(conflict).includes('token=secret'),
        'ERROR_REDACTION',
      );
      globalThis.fetch = (() =>
        Promise.resolve(
          Response.json({
            response_schema_version: 1,
            data: { ...responses.trivia_register_and_reserve_facts, leaked: 'secret' },
          }),
        )) as typeof fetch;
      check((await call('trivia_register_and_reserve_facts')).isError === true, 'CLOSED_OUTPUT');
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test(
  'CR-047 missing nullable source metadata is materialized only at RPC boundary',
  async () => {
    const original = globalThis.fetch;
    const seen: Record<string, unknown>[] = [];
    globalThis.fetch = ((_input: Request | URL | string, init?: RequestInit) => {
      const args = JSON.parse(String(init?.body)) as Record<string, unknown>;
      seen.push(args);
      return Promise.resolve(
        Response.json({
          response_schema_version: 1,
          data: responses.trivia_register_and_reserve_facts,
        }),
      );
    }) as typeof fetch;
    try {
      const before = inputs.trivia_register_and_reserve_facts;
      const fact = (before.facts as Record<string, unknown>[])[0]!;
      const complete = fact.sources as Record<string, unknown>[];
      const omitted = Object.fromEntries(
        Object.entries(complete[0]!).filter(
          ([key]) => !['published_at', 'updated_at', 'as_of'].includes(key),
        ),
      );
      check(!Object.hasOwn(omitted, 'published_at'), 'PRECONDITION_OMITTED');
      const incomplete = { ...fact, sources: [omitted] };
      check(
        (
          await call('trivia_register_and_reserve_facts', {
            ...before,
            facts: [incomplete],
          })
        ).isError !== true,
        'MCP_OMISSION_ALLOWED',
      );
      const first = (seen[0]!.p_facts as Record<string, unknown>[])[0]!;
      const materialized = (first.sources as Record<string, unknown>[])[0]!;
      for (const key of ['published_at', 'updated_at', 'as_of']) {
        check(Object.hasOwn(materialized, key) && materialized[key] === null, 'NULL_' + key);
        check(!Object.hasOwn(omitted, key), 'INPUT_NOT_MUTATED_' + key);
      }
      check(
        materialized.url === omitted.url && materialized.supports === omitted.supports,
        'EVIDENCE_NOT_CHANGED',
      );

      const explicit = {
        ...omitted,
        published_at: '2026-10-01',
        updated_at: null,
        as_of: 'October 2026',
      };
      await call('trivia_register_and_reserve_facts', {
        ...before,
        facts: [{ ...fact, sources: [explicit] }],
      });
      const second = (seen[1]!.p_facts as Record<string, unknown>[])[0]!;
      const preserved = (second.sources as Record<string, unknown>[])[0]!;
      check(
        preserved.published_at === '2026-10-01' &&
          preserved.updated_at === null &&
          preserved.as_of === 'October 2026',
        'EXPLICIT_METADATA_PRESERVED',
      );
    } finally {
      globalThis.fetch = original;
    }
  },
);
Deno.test(
  'CR-047 omitted nullable evidence fields become null without touching caller values',
  () => {
    const original = (
      inputs.trivia_register_and_reserve_facts.facts as Record<string, unknown>[]
    )[0]!;
    const fullSource = (original.sources as Record<string, unknown>[])[0]!;
    const omitted = Object.fromEntries(
      Object.entries(fullSource).filter(
        ([key]) => !['published_at', 'updated_at', 'as_of'].includes(key),
      ),
    );
    const normalized = materializeMissingSourceNulls([{ sources: [omitted] }])[0]!.sources[0]!;
    for (const key of ['published_at', 'updated_at', 'as_of']) {
      check(!Object.hasOwn(omitted, key), 'INPUT_STILL_OMITTED_' + key);
      check(Object.hasOwn(normalized, key) && normalized[key] === null, 'NORMALIZED_' + key);
    }
    check(
      normalized.url === omitted.url && normalized.supports === omitted.supports,
      'SOURCE_UNCHANGED',
    );
    const explicit = {
      ...omitted,
      published_at: '2026-10-01',
      updated_at: null,
      as_of: 'October 2026',
    };
    const preserved = materializeMissingSourceNulls([{ sources: [explicit] }])[0]!.sources[0]!;
    check(
      preserved.published_at === '2026-10-01' &&
        preserved.updated_at === null &&
        preserved.as_of === 'October 2026',
      'EXPLICIT_VALUES_PRESERVED',
    );
  },
);
