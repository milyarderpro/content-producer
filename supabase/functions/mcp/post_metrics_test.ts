import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { POST_METRICS_TOOL_NAMES } from './post_metrics.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const post = '77777777-7777-4777-8777-777777777777';
const page = '88888888-8888-4888-8888-888888888888';
const op = '99999999-9999-4999-8999-999999999999';
const at = '2026-10-14T12:00:00Z';
const source = { source_type: 'facebook_ui', metric_definition_version: 1 };
const context: RequestContext = {
  requestId: '6.13-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-user-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const metrics = {
  views: 0, reach: null, reactions: 3, likes: 2, comments: null,
  shares: null, saves: null, follows: null,
  watch_time_seconds: 0, average_watch_time_seconds: null,
};
const snapshot = {
  metric_snapshot_public_id: op, post_public_id: post, captured_at: at,
  metrics, source: { ...source, source_reported_at: null, timezone: null, note: null },
  anomaly_flags: [], created_at: at,
};
const outputs: Record<string, object> = {
  record_post_performance: {
    metric_snapshot_public_id: op, post_public_id: post, captured_at: at,
    metrics, anomaly_flags: [], replayed: false,
  },
  get_post_performance: {
    post_public_id: post, observation_period: { from: at, to: at },
    metric_definition_version: 1, snapshots: [snapshot], latest_snapshot: snapshot,
    compatible_deltas: [], next_cursor: null, has_more: false,
  },
  get_performance_insights: {
    scope: { workspace_public_id: workspace, page_public_id: page, niche_key: 'trivia' },
    observation_period: { requested_from: null, requested_to: null, observed_from: at, observed_to: at },
    metric_definition_version: 1, eligible_post_count: 1, excluded_post_count: 0,
    excluded_reasons: {
      not_published: 0, no_snapshot_in_period: 0, missing_metric: 0,
      unknown_source_or_definition: 0, missing_dimension: 0, invalid_observation_age: 0,
    },
    groups: [{
      dimension_values: { format: 'single_subject_fast' }, sample_size: 1,
      age_distribution: { min_days: 1, median_days: 1, max_days: 1 },
      metric_summary: { median: 0, mean: 0, min: 0, max: 0 },
      observed_period: { from: at, to: at },
      evidence_strength: 'insufficient',
      caveats: ['Descriptive early signal only, not a causal conclusion or winner.'],
    }],
  },
};
function check(value: unknown, label: string): asserts value {
  if (!value) throw new Error(label);
}
async function mcp(method: string, params?: object) {
  const response = await createAuthenticatedTransport(context).fetch(
    new Request('http://localhost/functions/v1/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({ jsonrpc: '2.0', id: 613, method, ...(params ? { params } : {}) }),
    }),
  );
  check(response.status === 200, 'MCP_HTTP_STATUS');
  const raw = await response.text();
  const frame = raw.split('\n').find(x => x.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : raw);
}
async function call(name: string, args: object) {
  return (await mcp('tools/call', { name, arguments: args })).result;
}
const common = { request_schema_version: 1, workspace_public_id: workspace };
const recordInput = {
  ...common, operation_key: op, post_public_id: post,
  captured_at: at, metrics: { views: 0, reactions: 3, likes: 2, reach: null }, source,
};
const historyInput = { ...common, post_public_id: post, limit: 1 };
const insightsInput = {
  ...common, page_public_id: page, niche_key: 'trivia',
  dimensions: ['format'], metric: 'views', minimum_sample_size: 5,
};

Deno.test('6.13: precisely 33 tools; metrics schemas closed, OAuth and annotations explicit', async () => {
  const tools = (await mcp('tools/list')).result.tools;
  check(MCP_TOOL_COUNT === 33 && tools.length === 33, 'EXACT_33');
  for (const name of POST_METRICS_TOOL_NAMES) {
    const tool = tools.find((entry: { name: string }) => entry.name === name);
    check(tool?.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
    check(tool?.outputSchema.additionalProperties === false, 'CLOSED_OUTPUT');
    check(tool?._meta.securitySchemes[0].type === 'oauth2', 'OAUTH');
    check(tool.annotations.readOnlyHint === (name !== 'record_post_performance'), 'READ_ONLY');
    check(tool.annotations.destructiveHint === false, 'NOT_DESTRUCTIVE');
    check(tool.annotations.openWorldHint === false, 'NO_OPEN_WORLD');
    check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE');
  }
});

Deno.test('6.13: original user JWT, null versus zero and exact public RPC arguments', async () => {
  const previous = globalThis.fetch;
  const calls: { name: string; params: Record<string, unknown> }[] = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const headers = new Headers(init?.headers);
    check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
    check(headers.get('apikey') === context.publishableKey, 'PUBLIC_KEY');
    check(headers.get('Content-Profile') === 'api', 'PUBLIC_RPC');
    const name = String(input).split('/').pop()!;
    calls.push({ name, params: JSON.parse(String(init?.body)) });
    return Promise.resolve(Response.json({ response_schema_version: 1, data: outputs[name] }));
  }) as typeof fetch;
  try {
    const recorded = await call('record_post_performance', recordInput);
    check(!recorded.isError && recorded.structuredContent.data.metrics.views === 0, 'ZERO_PRESERVED');
    check(recorded.structuredContent.data.metrics.reach === null, 'NULL_PRESERVED');
    const history = await call('get_post_performance', historyInput);
    check(!history.isError && history.structuredContent.data.snapshots.length === 1, 'HISTORY');
    const insights = await call('get_performance_insights', insightsInput);
    check(!insights.isError && insights.structuredContent.data.groups[0].evidence_strength === 'insufficient', 'INSUFFICIENT');
    check(calls.map(c => c.name).join(',') === POST_METRICS_TOOL_NAMES.join(','), 'EXACT_RPC');
    check((calls[0].params.p_metrics as { reach: unknown }).reach === null, 'RPC_NULL');
    check((calls[0].params.p_metrics as { views: unknown }).views === 0, 'RPC_ZERO');
    check(calls[1].params.p_limit === 1 && calls[2].params.p_minimum_sample_size === 5, 'BOUNDED');
    check(calls.every(c => !Object.keys(c.params).some(k => /^p_(owner|actor|client|oauth)/.test(k))), 'NO_IDENTITY_OVERRIDE');
    check(!JSON.stringify(insights.content).includes(context.accessToken), 'NO_TOKEN_LEAK');
  } finally { globalThis.fetch = previous; }
});

Deno.test('6.13: malformed, ambiguous and cross-scope inputs fail before database access', async () => {
  const previous = globalThis.fetch;
  let hits = 0;
  globalThis.fetch = (() => { hits++; return Promise.resolve(Response.json({})); }) as typeof fetch;
  try {
    for (const [name, args] of [
      ['record_post_performance', { ...recordInput, metrics: {} }],
      ['record_post_performance', { ...recordInput, metrics: { views: null } }],
      ['record_post_performance', { ...recordInput, metrics: { views: -1 } }],
      ['record_post_performance', { ...recordInput, metrics: { views: 1.5 } }],
      ['record_post_performance', { ...recordInput, metrics: { likes: 4, reactions: 3 } }],
      ['record_post_performance', { ...recordInput, metrics: { views: 1, extra: 2 } }],
      ['record_post_performance', { ...recordInput, source: { ...source, metric_definition_version: 2 } }],
      ['record_post_performance', { ...recordInput, source: { ...source, note: 'bearer secret' } }],
      ['record_post_performance', { ...recordInput, captured_at: '2026-99-99' }],
      ['record_post_performance', { ...recordInput, owner_user_id: context.actorUserId }],
      ['record_post_performance', { ...recordInput, workspace_public_id: post }],
      ['get_post_performance', { ...historyInput, limit: 101 }],
      ['get_post_performance', { ...historyInput, cursor: '' }],
      ['get_post_performance', { ...historyInput, captured_from: '2026-10-15T12:00:00Z', captured_to: at }],
      ['get_performance_insights', { ...insightsInput, dimensions: ['format', 'format'] }],
      ['get_performance_insights', { ...insightsInput, dimensions: [] }],
      ['get_performance_insights', { ...insightsInput, metric: 'engagement' }],
      ['get_performance_insights', { ...insightsInput, minimum_sample_size: 0 }],
      ['get_performance_insights', { ...insightsInput, captured_from: '2026-10-15T12:00:00Z', captured_to: at }],
    ] as const) {
      check((await call(name, args)).isError === true, 'INVALID_INPUT_' + name);
    }
    check(hits === 0, 'INVALID_REACHED_RPC');
  } finally { globalThis.fetch = previous; }
});

Deno.test('6.13: poisoned backend projections are rejected without leaking data', async () => {
  const previous = globalThis.fetch;
  let data: object = { ...outputs.record_post_performance, private_workspace_id: 123 };
  globalThis.fetch = (() => Promise.resolve(Response.json({ response_schema_version: 1, data }))) as typeof fetch;
  try {
    check((await call('record_post_performance', recordInput)).structuredContent.error.code === 'DATABASE_UNAVAILABLE', 'PRIVATE_OUTPUT');
    data = { ...outputs.get_performance_insights, groups: [{ surprise: 'secret' }] };
    check((await call('get_performance_insights', insightsInput)).structuredContent.error.code === 'DATABASE_UNAVAILABLE', 'UNCLOSED_INSIGHTS');
  } finally { globalThis.fetch = previous; }
});
