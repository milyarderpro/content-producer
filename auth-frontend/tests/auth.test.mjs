import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { authorizationId, consentPath, loginPath, safeOAuthRedirect } from '../src/routes.js';
import { createAuth } from '../src/auth.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = {
  url: 'https://test.supabase.co',
  publishableKey: 'sb_publishable_test',
};

function mockAuth() {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  const calls = [];
  const request = async (url, options) => {
    const relative = url.pathname + url.search;
    calls.push({ relative, options });
    let data;
    if (relative === '/auth/v1/token?grant_type=password' || relative === '/auth/v1/token?grant_type=refresh_token') {
      data = { access_token: 'access-test', refresh_token: 'refresh-test', expires_in: 3600 };
    } else if (relative === '/auth/v1/user' && options.method === 'GET') {
      data = { id: 'user-id' };
    } else if (relative === '/auth/v1/oauth/authorizations/example_1' && options.method === 'GET') {
      data = {
        authorization_id: 'example_1',
        client: { id: 'client-id', name: 'Test Client' },
        scope: 'email profile',
        redirect_uri: 'https://client.example/callback',
      };
    } else if (
      relative === '/auth/v1/oauth/authorizations/example_1/consent' &&
      options.method === 'POST'
    ) {
      const payload = JSON.parse(options.body);
      assert.deepEqual(Object.keys(payload), ['action']);
      if (payload.action === 'approve') {
        data = { redirect_url: 'https://client.example/callback?code=approved' };
      } else if (payload.action === 'deny') {
        data = { redirect_url: 'https://client.example/callback?error=access_denied' };
      } else {
        throw new Error('Unexpected consent action');
      }
    } else if (relative === '/auth/v1/logout' && options.method === 'POST') {
      data = {};
    } else {
      throw new Error('Unexpected mock Auth endpoint or HTTP method: ' + relative);
    }
    return { ok: true, status: 200, json: async () => data };
  };
  return { client: createAuth(config, storage, request), calls, values };
}

test('all four routes have explicit static hosting fallbacks', () => {
  const hosting = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8'));
  assert.deepEqual(
    hosting.rewrites.map((entry) => entry.source),
    ['/login', '/oauth/consent', '/logout', '/error'],
  );
  for (const entry of hosting.rewrites) assert.equal(entry.destination, '/index.html');
  const html = readFileSync(new URL('../src/index.html', import.meta.url), 'utf8');
  for (const id of ['login', 'consent', 'logout', 'error']) {
    assert.match(html, new RegExp('id="' + id + '"'));
  }
});

test('authorization_id survives login and consent direct-navigation refresh', () => {
  const id = 'uuid_123-ABC';
  assert.equal(authorizationId('?authorization_id=' + id), id);
  assert.equal(authorizationId('?authorization_id=a&authorization_id=b'), null);
  assert.equal(authorizationId('?authorization_id=..%2Fbad'), null);
  assert.equal(authorizationId('?redirect=https%3A%2F%2Fevil.example'), null);
  assert.equal(authorizationId('?authorization_id=' + 'x'.repeat(513)), null);
  assert.equal(authorizationId(new URL('https://auth.example' + loginPath(id)).search), id);
  assert.equal(authorizationId(new URL('https://auth.example' + consentPath(id)).search), id);
});

test('OAuth callback must be a safe registered origin and path', () => {
  const registered = 'https://client.example/callback?channel=approved';
  assert.equal(
    safeOAuthRedirect('https://client.example/callback?channel=approved&code=x', registered),
    'https://client.example/callback?channel=approved&code=x',
  );
  for (const bad of [
    'javascript:alert(1)',
    'data:text/html,abc',
    'http://client.example/callback',
    'https://evil.example/callback',
    'https://client.example/other',
    'https://user:pass@client.example/callback',
    'https://client.example/callback?channel=unapproved',
  ]) {
    assert.equal(safeOAuthRedirect(bad, registered), null, bad);
  }
  assert.equal(
    safeOAuthRedirect('http://127.0.0.1:3000/callback?error=access_denied'),
    'http://127.0.0.1:3000/callback?error=access_denied',
  );
});

test('login, authorization details, explicit approve/deny and logout', async () => {
  const { client, calls, values } = mockAuth();
  await client.signIn('owner@example.test', 'testing-only');
  assert.deepEqual(await client.user(), { id: 'user-id' });
  assert.equal((await client.authorizationDetails('example_1')).scope, 'email profile');
  assert.match((await client.decide('example_1', 'approve')).redirect_url, /code=approved/);
  assert.match((await client.decide('example_1', 'deny')).redirect_url, /error=access_denied/);
  await assert.rejects(() => client.decide('example_1', 'auto'), /Keputusan/);
  // Pin the exact Supabase Auth REST contract, not path suffixes.
  const oauthCalls = calls.filter((call) => call.relative.includes('/oauth/'));
  assert.deepEqual(
    oauthCalls.map(({ relative, options }) => ({
      relative,
      method: options.method,
      body: options.body,
    })),
    [
      {
        relative: '/auth/v1/oauth/authorizations/example_1',
        method: 'GET',
        body: undefined,
      },
      {
        relative: '/auth/v1/oauth/authorizations/example_1/consent',
        method: 'POST',
        body: '{"action":"approve"}',
      },
      {
        relative: '/auth/v1/oauth/authorizations/example_1/consent',
        method: 'POST',
        body: '{"action":"deny"}',
      },
    ],
  );
  assert.deepEqual(
    oauthCalls.map((call) => call.relative.replace('/auth/v1', config.url + '/auth/v1')),
    [
      'https://test.supabase.co/auth/v1/oauth/authorizations/example_1',
      'https://test.supabase.co/auth/v1/oauth/authorizations/example_1/consent',
      'https://test.supabase.co/auth/v1/oauth/authorizations/example_1/consent',
    ],
  );
  for (const [index, call] of oauthCalls.entries()) {
    assert.equal(call.options.headers.Authorization, 'Bearer access-test');
    if (index === 0) {
      assert.equal(call.options.headers['Content-Type'], undefined);
    } else {
      assert.equal(call.options.headers['Content-Type'], 'application/json');
      assert.deepEqual(JSON.parse(call.options.body), { action: index === 1 ? 'approve' : 'deny' });
    }
  }
  assert.ok(calls.every((call) => call.options.headers.apikey === config.publishableKey));
  assert.ok(calls.every((call) => call.options.redirect === 'error'));
  await client.signOut();
  assert.equal(values.size, 0);
  assert.equal(await client.user(), null);
});

test('missing config and privileged keys fail closed', () => {
  const storage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
  for (const key of ['sb_secret_wrong', 'service_role']) {
    assert.throws(
      () => createAuth({ url: config.url, publishableKey: key }, storage),
      /Konfigurasi/,
    );
  }
  assert.throws(
    () =>
      createAuth(
        { url: 'https://user:pass@foo.supabase.co', publishableKey: config.publishableKey },
        storage,
      ),
    /Konfigurasi/,
  );
});

test('built browser assets include only allowlisted public values', () => {
  execFileSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      VITE_SUPABASE_URL: 'https://demo.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_demo',
      PRIVATE_DATABASE_PASSWORD: 'must-not-be-in-bundle',
    },
  });
  const built = readFileSync(new URL('../dist/config.js', import.meta.url), 'utf8');
  assert.match(built, /sb_publishable_demo/);
  assert.doesNotMatch(built, /must-not-be-in-bundle|PRIVATE_DATABASE_PASSWORD/);
  const rejected = spawnSync(process.execPath, ['scripts/build.mjs'], {
    cwd: root,
    env: { ...process.env, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_wrong' },
  });
  assert.notEqual(rejected.status, 0);
});
