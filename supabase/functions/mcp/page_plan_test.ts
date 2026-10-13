import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { PAGE_PLAN_TOOL_NAMES } from './page_plan.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const foreign = '55555555-5555-4555-8555-555555555555';
const pageId = '66666666-6666-4666-8666-666666666666';
const planId = '77777777-7777-4777-8777-777777777777';
const slotId = '88888888-8888-4888-8888-888888888888';
const opKey = '99999999-9999-4999-8999-999999999999';
const now = '2026-10-13T12:00:00Z';
const context: RequestContext = {
  requestId: '6.4-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'signed-user-jwt-fixture',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-anon-key',
};
function assert(v: unknown, msg: string): asserts v {
  if (!v) throw new Error(msg);
}
function packet(method: string, params?: object) {
  return new Request('http://localhost/functions/v1/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 4, method, ...(params ? { params } : {}) }),
  });
}
async function request(method: string, params?: object) {
  const res = await createAuthenticatedTransport(context).fetch(packet(method, params));
  assert(res.status === 200, method + ' HTTP ' + res.status);
  return await res.text();
}
function call(name: string, args: object) {
  return request('tools/call', { name, arguments: args });
}
const config = {
  allowed_formats: [
    'single_subject_fast',
    'themed_utility',
    'emotional_animal_collection',
    'comparison',
    'myth_vs_fact',
  ],
  format_weights: {
    single_subject_fast: 35,
    themed_utility: 20,
    emotional_animal_collection: 20,
    comparison: 15,
    myth_vs_fact: 10,
  },
  allowed_topics: [
    'animals',
    'pet_safety',
    'food_science',
    'food_storage_home',
    'practical_utility',
    'human_body',
    'nature_science',
    'geography',
    'history_origins',
    'inventions_everyday',
    'general_trivia',
  ],
  topic_group_weights: {
    animals_pet_safety: 30,
    human_body_food_myth: 20,
    practical_utility: 15,
    places_geography: 15,
    nature_space: 10,
    history_inventions_people: 10,
  },
  fact_count: { mode: 'adaptive', min: 5, preferred: 7, max: 9 },
  profiles: {
    fast_trivia: {
      fact_count_min: 7,
      fact_count_max: 8,
      words_per_fact_min: 8,
      words_per_fact_max: 11,
      total_words_min: 65,
      total_words_max: 85,
    },
    practical_utility: {
      fact_count_min: 5,
      fact_count_max: 6,
      words_per_fact_min: 10,
      words_per_fact_max: 14,
      total_words_min: 65,
      total_words_max: 85,
    },
  },
  fact_reuse_scope: 'workspace_unique',
  render_style: 'plain_lines',
  allowed_interaction_goals: ['share', 'save', 'comment', 'follow'],
  text_budget: {
    hook_max_chars: 45,
    fact_max_chars: 90,
    facts_total_max_chars: 500,
    cta_max_chars: 50,
    canva_total_max_chars: 600,
  },
  caption: { max_chars: 500 },
  hashtags: { default_count: 3, min_count: 0, max_count: 5 },
  style: {
    english_variant: 'en-US',
    tone: 'conversational_credible',
    emoji_allowed: false,
    regional_slang_allowed: false,
  },
};
const niche = {
  niche_key: 'trivia',
  is_enabled: true,
  is_default: true,
  config_schema_version: 1,
  updated_at: now,
};
const page = {
  page_public_id: pageId,
  name: 'Page one',
  slug: 'page-one',
  timezone: 'UTC',
  target_markets: ['US'],
  is_active: true,
  enabled_niches: [niche],
  created_at: now,
  updated_at: now,
};
const pageConfig = {
  niche_key: 'trivia',
  config_schema_version: 1,
  config,
  is_enabled: true,
  is_default: true,
  updated_at: now,
};
const progress = { pending: 1, in_progress: 0, completed: 0, failed: 0, cancelled: 0 };
const plan = {
  plan_public_id: planId,
  name: 'Week 1',
  page_public_id: pageId,
  niche_key: 'trivia',
  status: 'pending',
  requested_count: 1,
  progress,
  created_at: now,
  updated_at: now,
};
const item = {
  plan_item_public_id: slotId,
  plan_public_id: planId,
  position: 1,
  status: 'pending',
  scheduled_at: null,
  topic_key: 'animals',
  format_key: 'single_subject_fast',
  interaction_goal: 'share',
  item_config: {},
  attempt_count: 0,
  claim_expires_at: null,
  active_post_public_id: null,
  last_error: null,
  created_at: now,
  updated_at: now,
};
const slot = {
  position: 1,
  scheduled_at: null,
  topic_key: 'animals',
  format_key: 'single_subject_fast',
  interaction_goal: 'share',
  item_config: {},
};
const shared = { request_schema_version: 1, workspace_public_id: workspace };
const write = { ...shared, operation_key: opKey };
const pageArgs = {
  ...write,
  name: page.name,
  slug: page.slug,
  timezone: page.timezone,
  target_markets: ['US'],
  niche_key: 'trivia',
  config_schema_version: 1,
  config,
};
const updateArgs = {
  ...write,
  page_public_id: pageId,
  expected_page_updated_at: now,
  page_patch: { name: 'Edited name' },
};
const planArgs = {
  ...write,
  page_public_id: pageId,
  niche_key: 'trivia',
  config_schema_version: 1,
  items: [slot],
  plan_intent: 'Week of facts',
  name: 'Week 1',
};
function envelope(data: object) {
  return { response_schema_version: 1, data };
}
const payloads: Record<string, object> = {
  create_page: envelope({ page, config: pageConfig, replayed: false }),
  update_page: envelope({ page, replayed: false }),
  list_content_plans: envelope({ items: [plan], next_cursor: null, has_more: false }),
  create_content_plan: envelope({
    plan,
    items: [item],
    context_version: { page_updated_at: now, config_updated_at: now },
    replayed: false,
  }),
  get_content_plan: envelope({ plan, items: [item], next_cursor: null, has_more: false }),
};

Deno.test(
  '6.4 registry exposes exactly 15 tools with correct metadata and no anonymous tools',
  async () => {
    const text = await request('tools/list');
    assert(MCP_TOOL_COUNT === 15, 'cumulative registry count must be 15');
    for (const tool of PAGE_PLAN_TOOL_NAMES) assert(text.includes(tool), 'missing ' + tool);
    assert((text.match(/"oauth2"/g) || []).length === 15, 'every tool requires OAuth');
    assert((text.match(/"openWorldHint":false/g) || []).length === 15, 'open world hint');
    assert((text.match(/"readOnlyHint":true/g) || []).length === 6, 'six read tools');
    assert((text.match(/"readOnlyHint":false/g) || []).length === 9, 'nine writes');
    assert(
      (text.match(/"destructiveHint":true/g) || []).length === 2,
      'update_page and cancel destructive',
    );
    assert(text.split('"openai/profile":true').length === 2, 'profile only');
    assert(text.includes('claim_content_plan_items'), '6.5 claim tool must be registered');
  },
);

Deno.test(
  '6.4 tools call only corresponding api RPC with owner-bound original JWT and unmodified write fields',
  async () => {
    const original = globalThis.fetch;
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
      const url = String(input);
      const name = url.split('/').pop()!;
      assert(Object.hasOwn(payloads, name), 'unexpected RPC ' + name);
      const headers = new Headers(init?.headers);
      assert(url.endsWith('/rest/v1/rpc/' + name), 'must call one api RPC');
      assert(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'original user JWT');
      assert(headers.get('apikey') === context.publishableKey, 'only publishable key');
      assert(headers.get('Content-Profile') === 'api', 'RPC api schema');
      assert(init?.method === 'POST' && init?.redirect === 'error', 'RPC mode');
      calls.push({ name, args: JSON.parse(String(init?.body)) });
      return Promise.resolve(Response.json(payloads[name]));
    }) as typeof fetch;
    try {
      assert(
        (await call('create_page', pageArgs)).includes('"replayed":false'),
        'create Page failed',
      );
      assert((await call('update_page', updateArgs)).includes('"page"'), 'update Page failed');
      assert(
        (
          await call('list_content_plans', {
            ...shared,
            page_public_id: pageId,
            statuses: ['pending'],
            created_from: now,
            created_to: now,
            limit: 1,
            query: 'Week',
          })
        ).includes('"items"'),
        'list plans failed',
      );
      assert(
        (await call('create_content_plan', planArgs)).includes('"context_version"'),
        'create plan failed',
      );
      assert(
        (
          await call('get_content_plan', {
            ...shared,
            plan_public_id: planId,
            item_statuses: ['pending'],
            limit: 1,
          })
        ).includes('"plan"'),
        'get plan failed',
      );
      assert(
        calls.map((c) => c.name).join(',') === PAGE_PLAN_TOOL_NAMES.join(','),
        'RPC names or order',
      );
      assert(
        calls.every((c) => c.args.p_workspace_public_id === workspace),
        'workspace binding',
      );
      assert(
        calls[0].args.p_operation_key === opKey && calls[0].args.p_make_default === true,
        'caller operation key and default must survive',
      );
      assert(calls[0].args.p_config === undefined ? false : true, 'config object must survive');
      assert(
        calls[1].args.p_expected_page_updated_at === now &&
          JSON.stringify(calls[1].args.p_page_patch) === JSON.stringify({ name: 'Edited name' }),
        'CAS or explicit patch lost',
      );
      assert(
        calls[2].args.p_limit === 1 && Array.isArray(calls[2].args.p_statuses),
        'list filters lost',
      );
      assert(
        JSON.stringify(calls[3].args.p_items) === JSON.stringify([slot]) &&
          calls[3].args.p_operation_key === opKey,
        'exact plan slots or key lost',
      );
      assert(
        calls[4].args.p_limit === 1 && Array.isArray(calls[4].args.p_item_statuses),
        'get plan pagination/status lost',
      );
      assert(
        calls.every(
          (c) =>
            !Object.keys(c.args).some((k) =>
              /^(p_actor|p_owner|p_oauth_client|p_claim_token)/.test(k),
            ),
        ),
        'no identity override',
      );
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test('6.4 write input is closed, bounded and owner denied before RPC', async () => {
  const original = globalThis.fetch;
  let requests = 0;
  globalThis.fetch = (() => {
    requests++;
    return Promise.resolve(Response.json(payloads.create_page));
  }) as typeof fetch;
  try {
    const invalids: Array<[string, object]> = [
      ['create_page', { ...pageArgs, workspace_public_id: foreign }],
      ['create_page', { ...pageArgs, slug: 'INVALID' }],
      ['create_page', { ...pageArgs, config: { ...config, random: 'extra' } }],
      ['create_page', { ...pageArgs, operation_key: 'not-uuid' }],
      ['update_page', { ...write, page_public_id: pageId, expected_page_updated_at: now }],
      ['update_page', { ...updateArgs, expected_page_updated_at: 'yesterday' }],
      ['update_page', { ...updateArgs, page_patch: {} }],
      ['list_content_plans', { ...shared, statuses: ['invalid'] }],
      ['create_content_plan', { ...planArgs, items: [{ ...slot, position: 2 }] }],
      ['create_content_plan', { ...planArgs, items: Array(101).fill(slot) }],
      [
        'create_content_plan',
        { ...planArgs, items: [{ ...slot, item_config: { huge: 'x'.repeat(8200) } }] },
      ],
      [
        'create_content_plan',
        {
          ...planArgs,
          items: [
            { ...slot, scheduled_at: null },
            { ...slot, position: 1 },
          ],
        },
      ],
      ['get_content_plan', { ...shared, plan_public_id: planId, limit: 0 }],
      ['get_content_plan', { ...shared, plan_public_id: planId, extra: 1 }],
    ];
    for (const [name, input] of invalids) {
      const text = await call(name, input);
      assert(
        text.includes('error') || text.includes('OWNER_ACCESS_REQUIRED'),
        name + ' did not deny invalid input',
      );
    }
    assert(requests === 0, 'invalid/foreign inputs must not hit RPC');
  } finally {
    globalThis.fetch = original;
  }
});

Deno.test(
  '6.4 RPC exposes safe replay and stable write errors without raw SQL leakage',
  async () => {
    const original = globalThis.fetch;
    let n = 0;
    globalThis.fetch = (() => {
      n++;
      if (n === 1)
        return Promise.resolve(
          Response.json({
            ...payloads.create_page,
            data: { page, config: pageConfig, replayed: true },
          }),
        );
      return Promise.resolve(
        Response.json(
          {
            code: 'P0001',
            message:
              n === 2
                ? 'OPERATION_KEY_REUSED'
                : n === 3
                  ? 'PAGE_VERSION_CONFLICT'
                  : n === 4
                    ? 'SCHEDULE_CONFLICT'
                    : 'PAGE_SLUG_CONFLICT',
            details: 'SQLSTATE 23505 internal_id=42 bearer token',
          },
          { status: 400 },
        ),
      );
    }) as typeof fetch;
    try {
      assert(
        (await call('create_page', pageArgs)).includes('"replayed":true'),
        'replay must be explicit',
      );
      for (const [name, input, err] of [
        ['create_page', pageArgs, 'OPERATION_KEY_REUSED'],
        ['update_page', updateArgs, 'PAGE_VERSION_CONFLICT'],
        ['create_content_plan', planArgs, 'SCHEDULE_CONFLICT'],
        ['create_page', pageArgs, 'PAGE_SLUG_CONFLICT'],
      ] as const) {
        const text = await call(name, input);
        assert(text.includes(err), 'missing stable error ' + err);
        assert(
          !text.includes('23505') &&
            !text.includes('internal_id=42') &&
            !text.includes('bearer token'),
          'raw SQL/secret leak in error',
        );
      }
    } finally {
      globalThis.fetch = original;
    }
  },
);

Deno.test('6.4 rejects oversized/secret-bearing or malformed RPC output', async () => {
  const original = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (() => {
    n++;
    const result =
      n === 1
        ? envelope({ page, config: { ...pageConfig, secret: 'sensitive' }, replayed: false })
        : envelope({ items: [{ ...plan, internal_id: 1 }], next_cursor: null, has_more: false });
    return Promise.resolve(Response.json(result));
  }) as typeof fetch;
  try {
    const a = await call('create_page', pageArgs);
    const b = await call('list_content_plans', shared);
    assert(a.includes('DATABASE_UNAVAILABLE') && !a.includes('sensitive'), 'config leak');
    assert(b.includes('DATABASE_UNAVAILABLE') && !b.includes('internal_id'), 'internal ID leak');
  } finally {
    globalThis.fetch = original;
  }
});
