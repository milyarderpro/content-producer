import { createHash, randomBytes, timingSafeEqual, webcrypto } from 'node:crypto';

const CALLBACK = 'https://content-producer-auth-frontend.vercel.app/api/phase-9-5/callback';
const RESOURCE = 'https://xjonnilnypchtxogtopb.supabase.co/functions/v1/mcp';
const SUPABASE = 'https://xjonnilnypchtxogtopb.supabase.co';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const COOKIE_FLOW = '__Host-cp-phase95-flow';
const COOKIE_RESULT = '__Host-cp-phase95-result';
const AGE_SECONDS = 600;
const encoder = new TextEncoder();

export const constants = { CALLBACK, RESOURCE, SUPABASE, COOKIE_FLOW, COOKIE_RESULT };

export function settings(env = process.env) {
  if (env.PHASE95_ENABLED !== '1') return null;
  const clientId = env.PHASE95_CLIENT_ID || '';
  const ownerId = env.PHASE95_OWNER_USER_ID || '';
  const publishableKey = env.PHASE95_PUBLISHABLE_KEY || '';
  const key = env.PHASE95_COOKIE_KEY || '';
  if (
    !UUID.test(clientId) ||
    !UUID.test(ownerId) ||
    !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey) ||
    !/^[A-Za-z0-9_-]{43}$/.test(key) ||
    Buffer.from(key, 'base64url').length !== 32
  )
    return null;
  return { clientId, ownerId, publishableKey, key: Buffer.from(key, 'base64url') };
}

// Separate server-side permission: the existing owner read test never implies write access.
export function pilotEnabled(env = process.env) {
  return env.PHASE95_WRITE_ENABLED === '1' && settings(env) !== null;
}

export function safeHeaders(extra = {}) {
  return {
    'Cache-Control': 'no-store',
    'Referrer-Policy': 'no-referrer',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Security-Policy':
      "default-src 'none'; style-src 'self'; base-uri 'none'; form-action 'none'",
    ...extra,
  };
}

export function exactRequest(request, path) {
  const url = new URL(request.url);
  return url.origin === new URL(CALLBACK).origin && url.pathname === path;
}

export function randomUrlSafe() {
  return randomBytes(32).toString('base64url');
}

export function challenge(verifier) {
  return createHash('sha256').update(verifier, 'ascii').digest('base64url');
}

export function equalText(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function seal(value, key) {
  const iv = randomBytes(12);
  const cryptoKey = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const ciphertext = await webcrypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: encoder.encode('phase95-cookie-v1') },
    cryptoKey,
    encoder.encode(JSON.stringify(value)),
  );
  return iv.toString('base64url') + '.' + Buffer.from(ciphertext).toString('base64url');
}

export async function unseal(value, key) {
  if (
    typeof value !== 'string' ||
    value.length > 2048 ||
    !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value)
  )
    return null;
  try {
    const [ivText, ciphertext] = value.split('.');
    const iv = Buffer.from(ivText, 'base64url');
    if (iv.length !== 12) return null;
    const cryptoKey = await webcrypto.subtle.importKey('raw', key, 'AES-GCM', false, ['decrypt']);
    const plaintext = await webcrypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: encoder.encode('phase95-cookie-v1') },
      cryptoKey,
      Buffer.from(ciphertext, 'base64url'),
    );
    return JSON.parse(Buffer.from(plaintext).toString('utf8'));
  } catch {
    return null;
  }
}

export function cookieValue(request, name) {
  const all = (request.headers.get('cookie') || '').split(';').map((part) => part.trim());
  const matches = all.filter((part) => part.startsWith(name + '='));
  return matches.length === 1 ? matches[0].slice(name.length + 1) : null;
}

export function setCookie(name, value, maxAge = AGE_SECONDS) {
  return `${name}=${value}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name) {
  return setCookie(name, '', 0);
}

export function callbackParams(url, flow, now = Date.now()) {
  const params = new URL(url).searchParams;
  for (const key of ['state', 'code', 'error'])
    if (params.getAll(key).length > 1) return { kind: 'invalid' };
  if (
    !flow ||
    typeof flow !== 'object' ||
    typeof flow.state !== 'string' ||
    typeof flow.verifier !== 'string' ||
    !Number.isSafeInteger(flow.createdAt) ||
    now < flow.createdAt ||
    now - flow.createdAt > AGE_SECONDS * 1000 ||
    !equalText(params.get('state'), flow.state)
  )
    return { kind: 'invalid' };
  const code = params.get('code');
  const error = params.get('error');
  if (code && error) return { kind: 'invalid' };
  if (error === 'access_denied' && !code) return { kind: 'denied' };
  if (error || !code || code.length > 2048) return { kind: 'invalid' };
  return { kind: 'approved', code };
}

export async function boundedJson(response, limit = 131072) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) throw new Error('Unexpected response');
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > limit) throw new Error('Oversized response');
  const body = await response.text();
  if (body.length > limit) throw new Error('Oversized response');
  return JSON.parse(body);
}

export async function verifyJwt(token, config, fetcher = fetch, now = Date.now()) {
  if (typeof token !== 'string' || token.length > 8192) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) return false;
  let header, claims;
  try {
    header = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
  } catch {
    return false;
  }
  const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\s+/) : [];
  if (
    header.alg !== 'ES256' ||
    typeof header.kid !== 'string' ||
    claims.iss !== SUPABASE + '/auth/v1' ||
    claims.aud !== RESOURCE ||
    claims.client_id !== config.clientId ||
    claims.sub !== config.ownerId ||
    claims.role !== 'authenticated' ||
    !scopes.includes('openid') ||
    !scopes.includes('email') ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now / 1000 ||
    !Number.isFinite(claims.iat) ||
    claims.iat > now / 1000 + 60 ||
    (claims.nbf !== undefined && (!Number.isFinite(claims.nbf) || claims.nbf > now / 1000))
  )
    return false;
  try {
    const response = await fetcher(SUPABASE + '/auth/v1/.well-known/jwks.json', {
      redirect: 'error',
      signal: AbortSignal.timeout(3500),
    });
    if (!response.ok) return false;
    const jwks = await boundedJson(response, 65536);
    const matches = jwks.keys?.filter(
      (key) =>
        key.kid === header.kid &&
        key.kty === 'EC' &&
        key.crv === 'P-256' &&
        (!key.alg || key.alg === 'ES256'),
    );
    if (matches?.length !== 1) return false;
    const key = await webcrypto.subtle.importKey(
      'jwk',
      matches[0],
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['verify'],
    );
    return webcrypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      key,
      Buffer.from(parts[2], 'base64url'),
      encoder.encode(parts[0] + '.' + parts[1]),
    );
  } catch {
    return false;
  }
}

export function resultRedirect() {
  const url = new URL('/api/phase-9-5/result', CALLBACK);
  return url.href;
}
// MCP tool catalogues contain 33 full JSON Schemas and legitimately exceed
// the small business-result cap. Keep a separate, finite metadata-only budget.
// Count bytes while streaming: Content-Length and JavaScript string lengths
// alone cannot safely bound chunked or multibyte responses.
const MCP_DEFAULT_MAX_BYTES = 256 * 1024;
const MCP_TOOLS_LIST_MAX_BYTES = 4 * 1024 * 1024;

export async function boundedMcpResult(response, method) {
  const limit = method === 'tools/list' ? MCP_TOOLS_LIST_MAX_BYTES : MCP_DEFAULT_MAX_BYTES;
  const type = response.headers.get('content-type') || '';
  const isEventStream = type.includes('text/event-stream');
  if (!isEventStream && !type.includes('application/json')) throw new Error('mcp_format');
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && /^\d+$/.test(declaredLength) && Number(declaredLength) > limit)
    throw new Error('mcp_size');

  const reader = response.body?.getReader();
  if (!reader) throw new Error('mcp_format');
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let raw = '';
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) throw new Error('mcp_size');
      raw += decoder.decode(value, { stream: true });
    }
    raw += decoder.decode();
  } catch (error) {
    if (error?.message === 'mcp_size') throw error;
    throw new Error('mcp_format', { cause: error });
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
  let body;
  try {
    if (isEventStream) {
      const data = raw.split(/\r?\n/).filter((line) => line.startsWith('data:'));
      if (data.length !== 1) throw new Error('mcp_format');
      body = JSON.parse(data[0].slice(5).trim());
    } else {
      body = JSON.parse(raw);
    }
  } catch {
    throw new Error('mcp_format');
  }
  if (body?.error || !body?.result) throw new Error('mcp_result');
  return body.result;
}
