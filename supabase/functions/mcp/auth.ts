// Phase 6.2: fail-closed OAuth validation; never trust tool payload for identity.
export interface OAuthConfig {
  resource: string;
  issuer: string;
  jwksUrl: string;
  supabaseUrl: string;
  publishableKey: string;
  ownerUserId: string;
}
export interface RequestContext {
  requestId: string;
  actorUserId: string;
  oauthClientId: string;
  workspacePublicId: string | null;
  accessToken: string; // Original validated user token, never log.
  supabaseUrl: string;
  publishableKey: string;
  pilotMode?: boolean; // CR-032: anonymous HTTP, server-fixed database identity
}
interface JwkSet {
  keys: Array<JsonWebKey & { kid?: string }>;
}
export interface AuthDependencies {
  loadKeys?: (url: string) => Promise<JwkSet>;
  checkOwner?: (config: OAuthConfig, token: string, actor: string) => Promise<string | null>;
  now?: () => number;
}
export class AuthRejection extends Error {
  constructor(readonly status: 401 | 403 | 503) {
    super('Access denied');
  }
}
export class WorkspaceCheckFailure extends Error {
  constructor(
    readonly kind: 'fetch' | 'rpc_status' | 'response',
    readonly rpcStatus?: number,
  ) {
    super('Workspace check unavailable');
  }
}
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function canonicalUrl(raw: string): string {
  const value = new URL(raw);
  if (
    (value.protocol !== 'https:' &&
      !(value.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(value.hostname))) ||
    value.username ||
    value.password ||
    value.search ||
    value.hash ||
    value.pathname.endsWith('/')
  )
    throw new Error('Invalid OAuth configuration');
  return value.href;
}

// Supabase's internal URL may be http://kong:8000; never advertise it
// as the public protected resource. Require an explicit canonical resource.
export function runtimeOAuthConfig(): OAuthConfig {
  const resource = Deno.env.get('MCP_RESOURCE_URL') || '';
  const issuer =
    Deno.env.get('MCP_ISSUER_URL') || (Deno.env.get('SUPABASE_URL') || '') + '/auth/v1';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const publishableKey =
    Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY') || '';
  const ownerUserId = Deno.env.get('MCP_OWNER_USER_ID') || '';
  if (!resource || !supabaseUrl || !publishableKey || !uuid.test(ownerUserId)) {
    throw new Error('Incomplete OAuth configuration');
  }
  return {
    resource: canonicalUrl(resource),
    issuer: canonicalUrl(issuer),
    jwksUrl: canonicalUrl(issuer) + '/.well-known/jwks.json',
    supabaseUrl: supabaseUrl.replace(/\/+$/, ''),
    publishableKey,
    ownerUserId,
  };
}
function bytes(segment: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/.test(segment)) throw new AuthRejection(401);
  const s = segment.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Uint8Array.from(atob(s.padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) =>
      c.charCodeAt(0),
    );
  } catch {
    throw new AuthRejection(401);
  }
}
function record(segment: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(new TextDecoder().decode(bytes(segment)));
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error();
    return value as Record<string, unknown>;
  } catch {
    throw new AuthRejection(401);
  }
}
async function remoteKeys(url: string): Promise<JwkSet> {
  const response = await fetch(url, {
    redirect: 'error',
    signal: AbortSignal.timeout(3500),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw Error('JWKS unavailable');
  const body = await response.text();
  if (body.length > 65536) throw Error('JWKS too large');
  const result: unknown = JSON.parse(body);
  if (
    !result ||
    typeof result !== 'object' ||
    !('keys' in result) ||
    !Array.isArray((result as JwkSet).keys)
  )
    throw Error('Bad JWKS');
  return result as JwkSet;
}
function validateClaims(
  claims: Record<string, unknown>,
  config: OAuthConfig,
  now: number,
): { actor: string; client: string } {
  const scopes = typeof claims.scope === 'string' ? claims.scope.split(/\s+/) : [];
  if (
    claims.iss !== config.issuer ||
    claims.aud !== config.resource || // disallow default "authenticated" audience
    typeof claims.exp !== 'number' ||
    !Number.isFinite(claims.exp) ||
    claims.exp <= now ||
    typeof claims.iat !== 'number' ||
    claims.iat > now + 60 ||
    (claims.nbf !== undefined && (typeof claims.nbf !== 'number' || claims.nbf > now)) ||
    claims.role !== 'authenticated' ||
    !scopes.includes('openid') ||
    !scopes.includes('email') ||
    typeof claims.sub !== 'string' ||
    !uuid.test(claims.sub) ||
    typeof claims.client_id !== 'string' ||
    !uuid.test(claims.client_id)
  )
    throw new AuthRejection(401);
  return { actor: claims.sub, client: claims.client_id };
}

async function verifyJwt(token: string, config: OAuthConfig, deps: AuthDependencies) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new AuthRejection(401);
  const [h64, p64, s64] = parts as [string, string, string];
  const header = record(h64),
    claims = record(p64);
  if (
    (header.alg !== 'ES256' && header.alg !== 'RS256') ||
    typeof header.kid !== 'string' ||
    !header.kid ||
    (header.typ !== undefined && header.typ !== 'JWT')
  )
    throw new AuthRejection(401);
  let jwks: JwkSet;
  try {
    jwks = await (deps.loadKeys || remoteKeys)(config.jwksUrl);
  } catch {
    throw new AuthRejection(503);
  }
  const candidates = jwks.keys.filter(
    (k) =>
      k.kid === header.kid &&
      (!k.alg || k.alg === header.alg) &&
      (!k.use || k.use === 'sig') &&
      (header.alg === 'ES256' ? k.kty === 'EC' && k.crv === 'P-256' : k.kty === 'RSA'),
  );
  if (candidates.length !== 1) throw new AuthRejection(401);
  try {
    const algorithm =
      header.alg === 'ES256'
        ? { name: 'ECDSA', namedCurve: 'P-256' }
        : { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' };
    const key = await crypto.subtle.importKey('jwk', candidates[0]!, algorithm, false, ['verify']);
    const verified = await crypto.subtle.verify(
      header.alg === 'ES256' ? { name: 'ECDSA', hash: 'SHA-256' } : { name: 'RSASSA-PKCS1-v1_5' },
      key,
      bytes(s64).buffer as ArrayBuffer,
      new TextEncoder().encode(h64 + '.' + p64),
    );
    if (!verified) throw Error();
  } catch {
    throw new AuthRejection(401);
  }
  return validateClaims(claims, config, (deps.now || Date.now)() / 1000);
}
async function authorizeIdentity(
  request: Request,
  config: OAuthConfig,
  deps: AuthDependencies,
  identity: (token: string) => Promise<{ actor: string; client: string }>,
): Promise<RequestContext> {
  const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('Authorization') || '');
  if (!match) throw new AuthRejection(401);
  const token = match[1]!;
  if (token.length > 16384) throw new AuthRejection(401);
  const { actor, client } = await identity(token);
  if (actor !== config.ownerUserId) throw new AuthRejection(403);
  let workspace: string | null = null;
  if (deps.checkOwner) {
    try {
      workspace = await deps.checkOwner(config, token, actor);
    } catch {
      throw new AuthRejection(503);
    }
    if (!workspace || !uuid.test(workspace)) throw new AuthRejection(403);
  }
  return {
    requestId: crypto.randomUUID(),
    actorUserId: actor,
    oauthClientId: client,
    workspacePublicId: workspace,
    accessToken: token,
    supabaseUrl: config.supabaseUrl,
    publishableKey: config.publishableKey,
  };
}

export function authenticateRequest(
  request: Request,
  config: OAuthConfig,
  deps: AuthDependencies = {},
): Promise<RequestContext> {
  return authorizeIdentity(request, config, deps, (token) => verifyJwt(token, config, deps));
}

// Only the upstream withSupabase user gate may supply these signature-verified
// claims. Recheck the frozen MCP claims, owner, and active workspace here.
export function authenticateVerifiedRequest(
  request: Request,
  config: OAuthConfig,
  verifiedClaims: Record<string, unknown>,
  deps: AuthDependencies = {},
): Promise<RequestContext> {
  return authorizeIdentity(request, config, deps, () =>
    Promise.resolve(validateClaims(verifiedClaims, config, (deps.now || Date.now)() / 1000)),
  );
}
