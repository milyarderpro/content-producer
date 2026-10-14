import {
  authenticateRequest,
  AuthRejection,
  type AuthDependencies,
  type OAuthConfig,
} from './auth.ts';
import { handleHttpRequest } from './http.ts';
import { createEdgeHandler } from './edge.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

function assert(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(detail);
}

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const client = '33333333-3333-4333-8333-333333333333';
const workspace = '44444444-4444-4444-8444-444444444444';
const config: OAuthConfig = {
  resource: 'http://127.0.0.1:54321/functions/v1/mcp',
  issuer: 'http://127.0.0.1:54321/auth/v1',
  jwksUrl: 'http://127.0.0.1:54321/auth/v1/.well-known/jwks.json',
  supabaseUrl: 'http://127.0.0.1:54321',
  publishableKey: 'test-public-key',
  ownerUserId: owner,
};
const encoder = new TextEncoder();
function b64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
function encoded(value: object): string {
  return b64(encoder.encode(JSON.stringify(value)));
}
async function fixture() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ]);
  const jwk = await crypto.subtle.exportKey('jwk', pair.publicKey);
  const publicJwk = { ...jwk, kid: 'local-fixture', alg: 'ES256' };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    iss: config.issuer,
    aud: config.resource,
    sub: owner,
    client_id: client,
    role: 'authenticated',
    scope: 'openid email',
    iat: now - 10,
    nbf: now - 5,
    exp: now + 300,
  };
  async function sign(body: object, tamper = false): Promise<string> {
    const head = encoded({ alg: 'ES256', kid: 'local-fixture', typ: 'JWT' });
    const payload = encoded(body);
    const data = head + '.' + payload;
    const signature = new Uint8Array(
      await crypto.subtle.sign(
        { name: 'ECDSA', hash: 'SHA-256' },
        pair.privateKey,
        encoder.encode(data),
      ),
    );
    if (tamper) signature[0] = signature[0]! ^ 1;
    return data + '.' + b64(signature);
  }
  const dependencies: AuthDependencies = {
    loadKeys: () => Promise.resolve({ keys: [publicJwk] }),
    checkOwner: (_config, _token, actor) => Promise.resolve(actor === owner ? workspace : null),
    now: () => now * 1000,
  };
  return { claims, dependencies, sign };
}
function withToken(token: string) {
  return new Request(config.resource, { headers: { Authorization: 'Bearer ' + token } });
}

Deno.test('6.2 discovery and 401 WWW-Authenticate bind exact resource', async () => {
  const metadataUrl = config.resource + '/oauth-protected-resource';
  const result = await handleHttpRequest(new Request(metadataUrl), { config });
  assert(result.status === 200, 'protected resource discovery not available');
  const metadata = await result.json();
  assert(metadata.resource === config.resource, 'resource URI mismatch');
  assert(metadata.authorization_servers[0] === config.issuer, 'wrong authorization server');
  assert(metadata.scopes_supported.join(' ') === 'openid email', 'wrong scopes');
  const wellKnown = await handleHttpRequest(
    new Request('http://127.0.0.1:54321/.well-known/oauth-protected-resource/functions/v1/mcp'),
    { config },
  );
  assert(wellKnown.status === 200, 'RFC 9728 discovery path missing');
  const missing = await handleHttpRequest(new Request(config.resource, { method: 'POST' }), {
    config,
  });
  assert(missing.status === 401, 'missing token admitted');
  const challenge = 'Bearer resource_metadata="' + metadataUrl + '"';
  assert(missing.headers.get('WWW-Authenticate') === challenge, 'wrong challenge');
  const payload = await missing.json();
  assert(payload._meta['mcp/www_authenticate'][0] === challenge, 'MCP metadata mismatch');
  assert(
    (await handleHttpRequest(new Request(config.resource + '/health'), { config })).status === 200,
    'health closed',
  );
  assert(
    (
      await handleHttpRequest(new Request(config.resource, { method: 'OPTIONS' }), {
        config,
      })
    ).status === 204,
    'preflight closed',
  );
  assert(MCP_TOOL_COUNT === 15, '6.6 must have fifteen owner-scoped tools');
});

Deno.test(
  '6.2 signature issuer audience expiry nbf scope client and active owner are enforced',
  async () => {
    const { claims, dependencies, sign } = await fixture();
    const valid = await sign(claims);
    const context = await authenticateRequest(withToken(valid), config, dependencies);
    assert(
      context.actorUserId === owner &&
        context.oauthClientId === client &&
        context.workspacePublicId === workspace,
      'valid context missing',
    );
    const invalidClaims = [
      { ...claims, iss: 'https://fake.example/auth/v1' },
      { ...claims, aud: 'authenticated' },
      { ...claims, aud: config.resource + '/' },
      { ...claims, aud: [config.resource] },
      { ...claims, exp: claims.iat - 1 },
      { ...claims, nbf: claims.exp + 60 },
      { ...claims, scope: 'openid' },
      { ...claims, scope: 'email' },
      { ...claims, scope: '' },
      { ...claims, client_id: undefined },
      { ...claims, client_id: '' },
      { ...claims, sub: other },
      { ...claims, role: 'anon' },
    ];
    for (const invalid of invalidClaims) {
      let denied = false;
      try {
        await authenticateRequest(withToken(await sign(invalid)), config, dependencies);
      } catch (error) {
        denied = error instanceof AuthRejection;
      }
      assert(denied, 'invalid claim or outsider accepted');
    }
    let tamperDenied = false;
    try {
      await authenticateRequest(withToken(await sign(claims, true)), config, dependencies);
    } catch (error) {
      tamperDenied = error instanceof AuthRejection && error.status === 401;
    }
    assert(tamperDenied, 'invalid signature accepted');
    const noProbe = await authenticateRequest(withToken(valid), config, {
      loadKeys: dependencies.loadKeys,
      now: dependencies.now,
    });
    assert(noProbe.workspacePublicId === null, 'authentication must not probe a rate-limited read RPC');

    const outsider = await sign({ ...claims, sub: other });
    const ownerDenied = await handleHttpRequest(
      new Request(config.resource, {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + outsider, 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
      { config, dependencies },
    );
    const denial = await ownerDenied.json();
    assert(
      ownerDenied.status === 403 && denial.error?.code === 'OWNER_ACCESS_REQUIRED',
      'non-owner denial must expose stable safe code without an OAuth relink challenge',
    );

    let nonOwnerDenied = false;
    try {
      await authenticateRequest(withToken(valid), config, {
        ...dependencies,
        checkOwner: () => Promise.resolve(null),
      });
    } catch (error) {
      nonOwnerDenied = error instanceof AuthRejection && error.status === 403;
    }
    assert(nonOwnerDenied, 'inactive workspace accepted');
    const browser = await handleHttpRequest(
      new Request(config.resource, {
        method: 'POST',
        headers: { 'x-client-id': client, 'x-owner-user-id': owner },
        body: JSON.stringify({ client_id: client, owner_user_id: owner }),
      }),
      { config, dependencies },
    );
    assert(browser.status === 401, 'header/body identity bypass');
  },
);

Deno.test(
  '6.5 real HTTP MCP transport accepts signed owner fixture and lists fifteen tools',
  async () => {
    const { claims, dependencies, sign } = await fixture();
    const token = await sign(claims);
    for (const [method, params] of [
      [
        'initialize',
        {
          protocolVersion: '2025-06-18',
          capabilities: {},
          clientInfo: { name: 'phase-6.2-test', version: '1.0' },
        },
      ],
      ['tools/list', undefined],
    ] as const) {
      const response = await handleHttpRequest(
        new Request(config.resource, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
            Accept: 'application/json, text/event-stream',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method,
            ...(params ? { params } : {}),
          }),
        }),
        { config, dependencies },
      );
      const body = await response.text();
      assert(response.status === 200, 'validated MCP transport unavailable');
      assert(
        method === 'initialize' ? body.includes('serverInfo') : body.includes('list_pages'),
        'invalid transport response',
      );
    }
  },
);

Deno.test(
  '6.2 public Supabase middleware pipeline gates MCP and serves protected-resource metadata',
  async () => {
    const { claims, dependencies, sign } = await fixture();
    const jwks = await dependencies.loadKeys!(config.jwksUrl);
    const handle = createEdgeHandler(config, jwks);
    const metadata = await handle(
      new Request(config.resource + '/oauth-protected-resource', { method: 'GET' }),
    );
    const metadataBody = await metadata.json();
    assert(metadata.status === 200, 'protected-resource metadata must be public');
    assert(metadataBody.resource === config.resource, 'metadata resource mismatch');
    assert(
      metadataBody.authorization_servers?.[0] === config.issuer,
      'metadata issuer mismatch',
    );
    assert(
      JSON.stringify(metadataBody.scopes_supported) === JSON.stringify(['openid', 'email']),
      'metadata scopes mismatch',
    );
    assert(
      JSON.stringify(metadataBody.bearer_methods_supported) === JSON.stringify(['header']),
      'metadata bearer method mismatch',
    );

    const ownerToken = await sign(claims);
    const listed = await handle(
      new Request(config.resource, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + ownerToken,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }),
      }),
    );
    assert(listed.status === 200, 'owner token must pass Supabase user middleware');

    const noToken = await handle(
      new Request(config.resource, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      }),
    );
    assert(
      noToken.status === 401 && noToken.headers.has('WWW-Authenticate'),
      'missing token must receive protected-resource challenge',
    );

    const outsider = await sign({ ...claims, sub: other });
    const denied = await handle(
      new Request(config.resource, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + outsider,
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({ jsonrpc: '2.0', id: 3, method: 'tools/list' }),
      }),
    );
    const denial = await denied.json();
    assert(
      denied.status === 403 && denial.error?.code === 'OWNER_ACCESS_REQUIRED',
      'valid non-owner must receive stable owner denial',
    );
  },
);
