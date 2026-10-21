import { createAuthenticatedTransport } from './transport.ts';
import type { RequestContext } from './auth.ts';
import { MCP_TOOL_COUNT } from './registry.ts';
import { POST_PUBLICATION_TOOL_NAMES } from './post_publication.ts';

const workspace = '44444444-4444-4444-8444-444444444444';
const post = '77777777-7777-4777-8777-777777777777';
const fact = '88888888-8888-4888-8888-888888888888';
const operation = '99999999-9999-4999-8999-999999999999';
const stamp = '2026-10-14T12:00:00Z';
const hash = 'a'.repeat(64);
const context: RequestContext = {
  requestId: '6.12-local',
  actorUserId: '11111111-1111-4111-8111-111111111111',
  oauthClientId: '33333333-3333-4333-8333-333333333333',
  workspacePublicId: workspace,
  accessToken: 'original-user-jwt',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'local-public-key',
};
const responses: Record<string, Record<string, unknown>> = {
  mark_post_posted: {
    post_public_id: post,
    status: 'posted',
    revision: 4,
    published_at: stamp,
    platform_post_id: null,
    published_url: null,
    published_fact_public_ids: [fact],
    replayed: false,
  },
  archive_post: {
    post_public_id: post,
    status: 'archived',
    revision: 5,
    archived_at: stamp,
    replayed: false,
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
      body: JSON.stringify({ jsonrpc: '2.0', id: 612, method, ...(params ? { params } : {}) }),
    }),
  );
  check(response.status === 200, 'MCP_HTTP_STATUS');
  const raw = await response.text();
  const frame = raw.split('\n').find((line) => line.startsWith('data: '));
  return JSON.parse(frame ? frame.slice(6) : raw);
}
async function call(name: string, args: object) {
  return (await mcp('tools/call', { name, arguments: args })).result;
}
const common = {
  request_schema_version: 1,
  workspace_public_id: workspace,
  operation_key: operation,
  post_public_id: post,
};
const postedInput = {
  ...common,
  expected_revision: 3,
  expected_content_hash: hash,
  published_at: stamp,
  explicit_publication_confirmation: true,
};
const archiveInput = {
  ...common,
  expected_revision: 4,
  reason: 'Archive the already published post.',
  explicit_archive: true,
};

Deno.test(
  '6.12: exactly 33 OAuth tools with closed publication schemas and destructive hints',
  async () => {
    const tools = (await mcp('tools/list')).result.tools;
    check(MCP_TOOL_COUNT === 33 && tools.length === 33, 'EXACT_33');
    for (const name of POST_PUBLICATION_TOOL_NAMES) {
      const tool = tools.find((entry: { name: string }) => entry.name === name);
      check(tool?.inputSchema.additionalProperties === false, 'CLOSED_INPUT');
      check(!Object.hasOwn(tool ?? {}, 'outputSchema'), 'OPTIONAL_OUTPUT_OMITTED');
      check(tool?._meta.securitySchemes[0].type === 'oauth2', 'OAUTH');
      check(tool.annotations.readOnlyHint === false, 'WRITE_TOOL');
      check(tool.annotations.destructiveHint === true, 'DESTRUCTIVE_HINT');
      check(tool.annotations.openWorldHint === false, 'CLOSED_WORLD');
      check(!Object.hasOwn(tool._meta, 'openai/profile'), 'NO_PROFILE');
    }
  },
);

Deno.test('6.12: forwards exact manual publication/archival data with original JWT', async () => {
  const previous = globalThis.fetch;
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];
  globalThis.fetch = ((input: Request | URL | string, init?: RequestInit) => {
    const name = String(input).split('/').pop()!;
    const headers = new Headers(init?.headers);
    check(headers.get('Authorization') === 'Bearer ' + context.accessToken, 'ORIGINAL_JWT');
    check(headers.get('apikey') === context.publishableKey, 'PUBLIC_KEY');
    check(headers.get('Content-Profile') === 'api', 'PUBLIC_RPC');
    calls.push({ name, params: JSON.parse(String(init?.body)) });
    return Promise.resolve(Response.json({ response_schema_version: 1, data: responses[name] }));
  }) as typeof fetch;
  try {
    const publication = await call('mark_post_posted', postedInput);
    check(!publication.isError && publication.structuredContent.data.status === 'posted', 'POSTED');
    check(publication.structuredContent.data.published_fact_public_ids[0] === fact, 'FACT_USAGE');
    const archived = await call('archive_post', archiveInput);
    check(!archived.isError && archived.structuredContent.data.status === 'archived', 'ARCHIVED');
    check(calls.map((c) => c.name).join(',') === 'mark_post_posted,archive_post', 'EXACT_RPC');
    check(calls[0].params.p_published_at === stamp, 'SUPPLIED_PUBLICATION_TIME');
    check(calls[0].params.p_platform_post_id === null, 'OPTIONAL_PLATFORM_NULL');
    check(calls[0].params.p_published_url === null, 'OPTIONAL_URL_NULL');
    check(calls[0].params.p_explicit_publication_confirmation === true, 'EXPLICIT_POSTED');
    check(calls[1].params.p_explicit_archive === true, 'EXPLICIT_ARCHIVE');
    check(calls[1].params.p_reason === archiveInput.reason, 'ARCHIVE_REASON');
    check(
      calls.every(
        (c) => !Object.keys(c.params).some((k) => /^p_(owner|actor|client|oauth)/.test(k)),
      ),
      'NO_IDENTITY_OVERRIDES',
    );
    check(!JSON.stringify(archived.content).includes(context.accessToken), 'TOKEN_PRIVACY');
  } finally {
    globalThis.fetch = previous;
  }
});

Deno.test('6.12: no implicit publication, insecure URL or unsafe archive reaches RPC', async () => {
  const previous = globalThis.fetch;
  let hits = 0;
  globalThis.fetch = (() => {
    hits++;
    return Promise.resolve(Response.json({}));
  }) as typeof fetch;
  try {
    for (const [name, args] of [
      ['mark_post_posted', { ...postedInput, explicit_publication_confirmation: false }],
      ['mark_post_posted', { ...postedInput, expected_revision: 0 }],
      ['mark_post_posted', { ...postedInput, expected_content_hash: 'wrong' }],
      ['mark_post_posted', { ...postedInput, published_at: 'not-a-date' }],
      ['mark_post_posted', { ...postedInput, published_url: 'http://insecure.test/post' }],
      ['mark_post_posted', { ...postedInput, published_url: 'https://example.test/white space' }],
      ['mark_post_posted', { ...postedInput, platform_post_id: '' }],
      ['mark_post_posted', { ...postedInput, owner_user_id: context.actorUserId }],
      ['mark_post_posted', { ...postedInput, workspace_public_id: post }],
      ['archive_post', { ...archiveInput, explicit_archive: false }],
      ['archive_post', { ...archiveInput, reason: 'secret=private' }],
      ['archive_post', { ...archiveInput, expected_revision: -1 }],
    ] as const) {
      const result = await call(name, args);
      check(result.isError, 'INVALID_' + name);
    }
    check(hits === 0, 'INVALID_DID_NOT_REACH_RPC');
  } finally {
    globalThis.fetch = previous;
  }
});

Deno.test(
  '6.12: fail closed on injected backend fields and untrusted publication URL',
  async () => {
    const previous = globalThis.fetch;
    let data: Record<string, unknown> = {
      ...responses.mark_post_posted,
      owner_user_id: context.actorUserId,
    };
    globalThis.fetch = (() =>
      Promise.resolve(Response.json({ response_schema_version: 1, data }))) as typeof fetch;
    try {
      const injected = await call('mark_post_posted', postedInput);
      check(
        injected.isError && injected.structuredContent.error.code === 'DATABASE_UNAVAILABLE',
        'INJECTED_OUTPUT_REJECTED',
      );
      data = { ...responses.mark_post_posted, published_url: 'http://insecure.test/post' };
      const untrusted = await call('mark_post_posted', postedInput);
      check(
        untrusted.isError && untrusted.structuredContent.error.code === 'DATABASE_UNAVAILABLE',
        'INSECURE_OUTPUT_REJECTED',
      );
    } finally {
      globalThis.fetch = previous;
    }
  },
);
