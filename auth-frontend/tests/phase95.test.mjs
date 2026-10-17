import assert from 'node:assert/strict';
import { randomBytes, webcrypto } from 'node:crypto';
import test from 'node:test';
import { approvedPilotPayload } from '../api/phase-9-5/approved-pilot.js';
import { GET as callback } from '../api/phase-9-5/callback.js';
import { POST as start } from '../api/phase-9-5/start.js';
import {
  boundedMcpResult,
  callbackParams,
  challenge,
  constants,
  resultRedirect,
  seal,
  settings,
  pilotEnabled,
  unseal,
  verifyJwt,
} from '../api/phase-9-5/_shared.js';

const ownerId = '11111111-1111-4111-8111-111111111111';
const otherId = '22222222-2222-4222-8222-222222222222';
const clientId = '33333333-3333-4333-8333-333333333333';
const workspaceId = '44444444-4444-4444-8444-444444444444';
const fakeCode = 'dummy-single-use-code';
const keyText = randomBytes(32).toString('base64url');
const config = {
  clientId,
  ownerId,
  publishableKey: 'sb_publishable_test',
  key: Buffer.from(keyText, 'base64url'),
};

function flow() {
  return {
    state: 'dummy-state',
    verifier: randomBytes(32).toString('base64url'),
    createdAt: Date.now(),
  };
}

async function jwt(subject = ownerId, audience = constants.RESOURCE) {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const publicKey = await webcrypto.subtle.exportKey('jwk', pair.publicKey);
  publicKey.kid = 'dummy-key';
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: publicKey.kid })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({
      iss: constants.SUPABASE + '/auth/v1',
      aud: audience,
      sub: subject,
      client_id: clientId,
      role: 'authenticated',
      scope: 'openid email profile',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 300,
    }),
  ).toString('base64url');
  const signature = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(header + '.' + payload),
  );
  return {
    token: header + '.' + payload + '.' + Buffer.from(signature).toString('base64url'),
    publicKey,
  };
}

function json(data, status = 200) {
  return Response.json(data, { status });
}

function richTools() {
  const names = [
    'get_account_profile',
    'get_workspace_context',
    'list_pages',
    ...Array.from({ length: 30 }, (_, i) => 'other_' + i),
  ];
  return names.map((name) => ({
    name,
    description: 'Production-style MCP tool metadata for ' + name,
    inputSchema: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        Array.from({ length: 64 }, (_, index) => [
          'input_field_' + index,
          {
            type: 'string',
            description: ('Detailed schema for ' + name + ' property ' + index).padEnd(180, '.'),
          },
        ]),
      ),
    },
  }));
}

function mcpListResponse() {
  return { jsonrpc: '2.0', id: 2, result: { tools: richTools() } };
}

test('33 realistic tool schemas exceed the old guard but fit the metadata-only bound', async () => {
  const body = JSON.stringify(mcpListResponse());
  assert.ok(Buffer.byteLength(body) > 262144);
  assert.ok(Buffer.byteLength(body) < 4 * 1024 * 1024);
  const result = await boundedMcpResult(
    new Response(body, { headers: { 'Content-Type': 'application/json' } }),
    'tools/list',
  );
  assert.equal(result.tools.length, 33);
  assert.equal(new Set(result.tools.map((tool) => tool.name)).size, 33);
  const sse = await boundedMcpResult(
    new Response('data: ' + body + '\n\n', {
      headers: { 'Content-Type': 'text/event-stream' },
    }),
    'tools/list',
  );
  assert.equal(sse.tools.length, 33);
});

test('metadata over 4 MiB is rejected, including chunked streams and forged length', async () => {
  const max = 4 * 1024 * 1024;
  const oversized = JSON.stringify({
    jsonrpc: '2.0',
    id: 2,
    result: { tools: richTools(), padding: 'x'.repeat(max) },
  });
  await assert.rejects(
    boundedMcpResult(
      new Response(oversized, { headers: { 'Content-Type': 'application/json' } }),
      'tools/list',
    ),
    /mcp_size/,
  );
  let chunksRead = 0;
  const stream = new ReadableStream({
    pull(controller) {
      chunksRead++;
      controller.enqueue(new Uint8Array(128 * 1024));
      if (chunksRead > 50) controller.close();
    },
  });
  await assert.rejects(
    boundedMcpResult(
      new Response(stream, { headers: { 'Content-Type': 'application/json' } }),
      'tools/list',
    ),
    /mcp_size/,
  );
  assert.ok(chunksRead <= 34, 'reader must stop near the byte limit');
  await assert.rejects(
    boundedMcpResult(
      new Response('{}', {
        headers: { 'Content-Type': 'application/json', 'Content-Length': String(max + 1) },
      }),
      'tools/list',
    ),
    /mcp_size/,
  );
});

test('business tool results retain a strict 256 KiB byte limit', async () => {
  const body = JSON.stringify({ jsonrpc: '2.0', id: 3, result: { data: 'x'.repeat(270000) } });
  await assert.rejects(
    boundedMcpResult(
      new Response(body, { headers: { 'Content-Type': 'application/json' } }),
      'tools/call',
    ),
    /mcp_size/,
  );
  // UTF-8 bytes, not JavaScript character count, determine the budget.
  const multi = JSON.stringify({
    jsonrpc: '2.0',
    id: 3,
    result: { data: '🎯'.repeat(70000) },
  });
  assert.ok(multi.length < 262144);
  assert.ok(Buffer.byteLength(multi) > 262144);
  await assert.rejects(
    boundedMcpResult(
      new Response(multi, { headers: { 'Content-Type': 'application/json' } }),
      'tools/call',
    ),
    /mcp_size/,
  );
});

test('configuration is disabled by default and fixed URLs never include a token', () => {
  assert.equal(settings({}), null);
  assert.equal(settings({ PHASE95_ENABLED: '1' }), null);
  assert.deepEqual(
    settings({
      PHASE95_ENABLED: '1',
      PHASE95_CLIENT_ID: clientId,
      PHASE95_OWNER_USER_ID: ownerId,
      PHASE95_PUBLISHABLE_KEY: 'sb_publishable_test',
      PHASE95_COOKIE_KEY: keyText,
    }),
    config,
  );
  assert.equal(
    resultRedirect(),
    'https://content-producer-auth-frontend.vercel.app/api/phase-9-5/result',
  );
  assert.equal(challenge('A'.repeat(43)).length, 43);
});

test('state, PKCE cookie and Deny are strict', async () => {
  const item = flow();
  const sealed = await seal(item, config.key);
  assert.deepEqual(await unseal(sealed, config.key), item);
  const ciphertextStart = sealed.indexOf('.') + 1;
  const tampered =
    sealed.slice(0, ciphertextStart) +
    (sealed[ciphertextStart] === 'A' ? 'B' : 'A') +
    sealed.slice(ciphertextStart + 1);
  assert.equal(await unseal(tampered, config.key), null);
  const base = constants.CALLBACK + '?state=' + item.state;
  assert.equal(callbackParams(base + '&error=access_denied', item).kind, 'denied');
  assert.equal(callbackParams(base + '&code=' + fakeCode, item).kind, 'approved');
  for (const bad of [
    base + '&error=access_denied&code=' + fakeCode,
    base + '&error=access_denied&state=duplicate',
    constants.CALLBACK + '?state=wrong&error=access_denied',
    base + '&error=server_error',
  ])
    assert.equal(callbackParams(bad, item).kind, 'invalid');
  assert.equal(
    callbackParams(base + '&code=' + fakeCode, { ...item, createdAt: Date.now() - 700000 }).kind,
    'invalid',
  );
});

test('synthetic signed JWT is bound to owner and exact MCP audience', async () => {
  const valid = await jwt();
  const fetcher = async () => json({ keys: [valid.publicKey] });
  assert.equal(await verifyJwt(valid.token, config, fetcher), true);
  const wrongOwner = await jwt(otherId);
  assert.equal(
    await verifyJwt(wrongOwner.token, config, async () => json({ keys: [wrongOwner.publicKey] })),
    false,
  );
  const wrongAud = await jwt(ownerId, 'authenticated');
  assert.equal(
    await verifyJwt(wrongAud.token, config, async () => json({ keys: [wrongAud.publicKey] })),
    false,
  );
  assert.equal(await verifyJwt(valid.token + 'x', config, fetcher), false);
});

test('disabled callback ignores dummy query and produces no code in response', async () => {
  const response = await callback(
    new Request(constants.CALLBACK + '?code=' + fakeCode + '&state=dummy-state'),
  );
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('location'), null);
  assert.equal((await response.text()).includes(fakeCode), false);
});

test('start requires an owner session and binds PKCE S256 to the exact redirect', async () => {
  const original = { ...process.env };
  process.env.PHASE95_ENABLED = '1';
  process.env.PHASE95_CLIENT_ID = clientId;
  process.env.PHASE95_OWNER_USER_ID = ownerId;
  process.env.PHASE95_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.PHASE95_COOKIE_KEY = keyText;
  const oldFetch = globalThis.fetch;
  let subject = otherId;
  globalThis.fetch = async () => json({ id: subject });
  const request = () =>
    new Request(new URL('/api/phase-9-5/start', constants.CALLBACK), {
      method: 'POST',
      headers: {
        Origin: new URL(constants.CALLBACK).origin,
        Authorization: 'Bearer dummy-browser-session',
      },
    });
  try {
    assert.equal((await start(request())).status, 403);
    subject = ownerId;
    const response = await start(request());
    assert.equal(response.status, 200);
    const authorize = new URL((await response.json()).authorize_url);
    assert.equal(authorize.origin, constants.SUPABASE);
    assert.equal(authorize.pathname, '/auth/v1/oauth/authorize');
    assert.equal(authorize.searchParams.get('redirect_uri'), constants.CALLBACK);
    assert.equal(authorize.searchParams.get('code_challenge_method'), 'S256');
    assert.equal(authorize.searchParams.get('resource'), constants.RESOURCE);
    const rawCookie = response.headers.get('set-cookie');
    assert.match(rawCookie, /HttpOnly; Secure; SameSite=Lax/);
    const encrypted = rawCookie.split(';')[0].split('=')[1];
    const item = await unseal(encrypted, config.key);
    assert.equal(authorize.searchParams.get('state'), item.state);
    assert.equal(authorize.searchParams.get('code_challenge'), challenge(item.verifier));
    assert.equal(JSON.stringify([...response.headers]).includes(item.verifier), false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = original;
  }
});

test('Deny callback never exchanges a code and redirects to clean URL', async () => {
  const original = { ...process.env };
  process.env.PHASE95_ENABLED = '1';
  process.env.PHASE95_CLIENT_ID = clientId;
  process.env.PHASE95_OWNER_USER_ID = ownerId;
  process.env.PHASE95_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.PHASE95_COOKIE_KEY = keyText;
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Deny must not fetch');
  };
  try {
    const item = flow();
    const cookie = await seal(item, config.key);
    const request = new Request(
      constants.CALLBACK + '?state=' + item.state + '&error=access_denied',
      {
        headers: { cookie: constants.COOKIE_FLOW + '=' + cookie },
      },
    );
    const response = await callback(request);
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), resultRedirect());
    assert.equal(JSON.stringify([...response.headers]).includes(fakeCode), false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = original;
  }
});

test('approve uses only five read-only MCP calls and no browser secret output', async () => {
  const original = { ...process.env };
  process.env.PHASE95_ENABLED = '1';
  process.env.PHASE95_CLIENT_ID = clientId;
  process.env.PHASE95_OWNER_USER_ID = ownerId;
  process.env.PHASE95_PUBLISHABLE_KEY = 'sb_publishable_test';
  process.env.PHASE95_COOKIE_KEY = keyText;
  const oldFetch = globalThis.fetch;
  const signed = await jwt();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/oauth/token')) {
      calls.push({ kind: 'token', grant: new URLSearchParams(options.body).get('grant_type') });
      return json({ access_token: signed.token, refresh_token: 'dummy-refresh' });
    }
    if (String(url).endsWith('/jwks.json')) return json({ keys: [signed.publicKey] });
    if (String(url) !== constants.RESOURCE) throw new Error('Unexpected endpoint');
    const body = JSON.parse(options.body);
    calls.push({ kind: 'mcp', method: body.method, name: body.params?.name });
    if (body.method === 'initialize')
      return json({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'test' } } });
    if (body.method === 'tools/list') return json(mcpListResponse());
    const profile = body.params.name === 'get_account_profile';
    return json({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          response_schema_version: 1,
          data: profile ? { profile: { workspace_public_id: workspaceId } } : {},
        },
      },
    });
  };
  try {
    const item = flow();
    const cookie = await seal(item, config.key);
    const response = await callback(
      new Request(constants.CALLBACK + '?state=' + item.state + '&code=' + fakeCode, {
        headers: { cookie: constants.COOKIE_FLOW + '=' + cookie },
      }),
    );
    assert.equal(response.status, 303);
    assert.equal(response.headers.get('location'), resultRedirect());
    const resultCookie = /__Host-cp-phase95-result=([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/.exec(
      response.headers.get('set-cookie') || '',
    );
    assert.ok(resultCookie, 'safe result must be present');
    const safeResult = await unseal(resultCookie[1], config.key);
    assert.deepEqual(
      {
        status: safeResult.status,
        tool_count: safeResult.tool_count,
        owner_reads: safeResult.owner_reads,
      },
      { status: 'owner_read_pass', tool_count: 33, owner_reads: 3 },
    );
    assert.deepEqual(calls, [
      { kind: 'token', grant: 'authorization_code' },
      { kind: 'token', grant: 'refresh_token' },
      { kind: 'mcp', method: 'initialize', name: undefined },
      { kind: 'mcp', method: 'tools/list', name: undefined },
      { kind: 'mcp', method: 'tools/call', name: 'get_account_profile' },
      { kind: 'mcp', method: 'tools/call', name: 'get_workspace_context' },
      { kind: 'mcp', method: 'tools/call', name: 'list_pages' },
    ]);
    assert.equal(JSON.stringify([...response.headers]).includes(fakeCode), false);
    assert.equal(JSON.stringify([...response.headers]).includes(signed.token), false);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = original;
  }
});

test('CR-026 fixed pilot configuration and deny-by-default owner write gate', async () => {
  const original = { ...process.env };
  const oldFetch = globalThis.fetch;
  const env = {
    PHASE95_ENABLED: '1',
    PHASE95_CLIENT_ID: clientId,
    PHASE95_OWNER_USER_ID: ownerId,
    PHASE95_PUBLISHABLE_KEY: 'sb_publishable_test',
    PHASE95_COOKIE_KEY: keyText,
  };
  const pilotRequest = () =>
    new Request(new URL('/api/phase-9-5/start', constants.CALLBACK), {
      method: 'POST',
      headers: {
        Origin: new URL(constants.CALLBACK).origin,
        Authorization: 'Bearer dummy-browser-session',
        'X-Phase95-Intent': 'approved-create-page',
      },
    });
  try {
    Object.assign(process.env, env);
    delete process.env.PHASE95_WRITE_ENABLED;
    assert.equal(pilotEnabled(), false);
    assert.equal((await start(pilotRequest())).status, 404);
    assert.equal(approvedPilotPayload.operation_key, 'b9f08c05-ee8e-4adf-8fe4-6c863128b9f7');
    assert.equal(approvedPilotPayload.workspace_public_id, 'cad2885e-952e-41b3-9eae-d2d9d75d533d');
    assert.equal(approvedPilotPayload.name, 'Phase 9.5 Pilot - Trivia');
    assert.equal(approvedPilotPayload.slug, 'phase-9-5-pilot-trivia');
    assert.deepEqual(approvedPilotPayload.target_markets, ['US']);
    process.env.PHASE95_WRITE_ENABLED = '1';
    assert.equal(pilotEnabled(), true);
    globalThis.fetch = async () => json({ id: otherId });
    assert.equal((await start(pilotRequest())).status, 403, 'non-owner must not begin OAuth pilot');
    globalThis.fetch = async () => json({ id: ownerId });
    const enabled = await start(pilotRequest());
    assert.equal(enabled.status, 200);
    const sealedFlow = enabled.headers.get('set-cookie').split(';')[0].split('=')[1];
    assert.equal((await unseal(sealedFlow, config.key)).intent, 'pilot');
    const readRequest = new Request(new URL('/api/phase-9-5/start', constants.CALLBACK), {
      method: 'POST',
      headers: {
        Origin: new URL(constants.CALLBACK).origin,
        Authorization: 'Bearer dummy-browser-session',
      },
    });
    const read = await start(readRequest);
    assert.equal(read.status, 200);
    const readFlow = read.headers.get('set-cookie').split(';')[0].split('=')[1];
    assert.equal((await unseal(readFlow, config.key)).intent, 'read');
    const unknownRequest = new Request(new URL('/api/phase-9-5/start', constants.CALLBACK), {
      method: 'POST',
      headers: {
        Origin: new URL(constants.CALLBACK).origin,
        Authorization: 'Bearer dummy-browser-session',
        'X-Phase95-Intent': 'arbitrary-write',
      },
    });
    assert.equal((await start(unknownRequest)).status, 403);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = original;
  }
});

test('approved owner pilot invokes exactly one fixed MCP create_page; read mode stays read-only', async () => {
  const original = { ...process.env };
  const oldFetch = globalThis.fetch;
  Object.assign(process.env, {
    PHASE95_ENABLED: '1',
    PHASE95_WRITE_ENABLED: '1',
    PHASE95_CLIENT_ID: clientId,
    PHASE95_OWNER_USER_ID: ownerId,
    PHASE95_PUBLISHABLE_KEY: 'sb_publishable_test',
    PHASE95_COOKIE_KEY: keyText,
  });
  const signed = await jwt();
  const calls = [];
  globalThis.fetch = async (url, options = {}) => {
    if (String(url).endsWith('/oauth/token')) {
      calls.push('oauth:' + new URLSearchParams(options.body).get('grant_type'));
      return json({ access_token: signed.token, refresh_token: 'dummy-refresh' });
    }
    if (String(url).endsWith('/jwks.json')) return json({ keys: [signed.publicKey] });
    assert.equal(String(url), constants.RESOURCE);
    const body = JSON.parse(options.body);
    calls.push(body.method === 'tools/call' ? 'tool:' + body.params.name : body.method);
    if (body.method === 'initialize')
      return json({ jsonrpc: '2.0', id: body.id, result: { serverInfo: { name: 'test' } } });
    if (body.method === 'tools/list') return json(mcpListResponse());
    assert.equal(body.method, 'tools/call');
    if (body.params.name === 'create_page') {
      assert.deepEqual(body.params.arguments, approvedPilotPayload);
      assert.equal(options.headers.Authorization, 'Bearer ' + signed.token);
      return json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          structuredContent: {
            response_schema_version: 1,
            data: {
              page: { name: approvedPilotPayload.name, slug: approvedPilotPayload.slug },
              config: { niche_key: 'trivia' },
              replayed: false,
            },
          },
        },
      });
    }
    assert.ok(
      ['get_account_profile', 'get_workspace_context', 'list_pages'].includes(body.params.name),
    );
    return json({
      jsonrpc: '2.0',
      id: body.id,
      result: {
        structuredContent: {
          response_schema_version: 1,
          data:
            body.params.name === 'get_account_profile'
              ? { profile: { workspace_public_id: approvedPilotPayload.workspace_public_id } }
              : body.params.name === 'list_pages'
                ? { items: [] }
                : {},
        },
      },
    });
  };
  const run = async (intent) => {
    const item = { ...flow(), intent };
    const cookie = await seal(item, config.key);
    const response = await callback(
      new Request(constants.CALLBACK + '?state=' + item.state + '&code=' + fakeCode, {
        headers: { cookie: constants.COOKIE_FLOW + '=' + cookie },
      }),
    );
    assert.equal(response.status, 303);
    const match = /__Host-cp-phase95-result=([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)/.exec(
      response.headers.get('set-cookie') || '',
    );
    assert.ok(match);
    return { result: await unseal(match[1], config.key), response };
  };
  try {
    let read = await run('read');
    assert.equal(read.result.status, 'owner_read_pass');
    assert.equal(calls.includes('tool:create_page'), false);
    calls.length = 0;
    let pilot = await run('pilot');
    assert.deepEqual(
      {
        status: pilot.result.status,
        tool_count: pilot.result.tool_count,
        owner_reads: pilot.result.owner_reads,
        replayed: pilot.result.replayed,
      },
      { status: 'pilot_write_pass', tool_count: 33, owner_reads: 3, replayed: false },
    );
    assert.deepEqual(calls, [
      'oauth:authorization_code',
      'oauth:refresh_token',
      'initialize',
      'tools/list',
      'tool:get_account_profile',
      'tool:get_workspace_context',
      'tool:list_pages',
      'tool:create_page',
    ]);
    assert.equal(JSON.stringify([...pilot.response.headers]).includes(signed.token), false);
    assert.equal(JSON.stringify([...pilot.response.headers]).includes(fakeCode), false);
    assert.equal(
      JSON.stringify([...pilot.response.headers]).includes(approvedPilotPayload.slug),
      false,
    );
    calls.length = 0;
    process.env.PHASE95_WRITE_ENABLED = '0';
    const blocked = await run('pilot');
    assert.equal(blocked.result.status, 'pilot_disabled');
    assert.deepEqual(calls, []);
    calls.length = 0;
    process.env.PHASE95_WRITE_ENABLED = '1';
    const item = { ...flow(), intent: 'pilot' };
    const denial = await callback(
      new Request(constants.CALLBACK + '?state=' + item.state + '&error=access_denied', {
        headers: { cookie: constants.COOKIE_FLOW + '=' + (await seal(item, config.key)) },
      }),
    );
    assert.equal(denial.status, 303);
    assert.deepEqual(calls, []);
  } finally {
    globalThis.fetch = oldFetch;
    process.env = original;
  }
});
