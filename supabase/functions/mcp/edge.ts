import { pipeline } from 'npm:@supabase/middleware@1.0.0';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.0';
import { runtimeOAuthConfig, type AuthDependencies, type OAuthConfig } from './auth.ts';
import { handleHttpRequest, oversizedRequestResponse } from './http.ts';

type FixtureJwks = { keys: Array<JsonWebKey & { kid?: string }> };
const MAX_REQUEST_BYTES = 256 * 1024;
const publicIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

async function checkActiveOwnerWorkspace(
  config: OAuthConfig,
  token: string,
  actor: string,
): Promise<string | null> {
  const response = await fetch(config.supabaseUrl + '/rest/v1/rpc/get_account_profile', {
    method: 'POST',
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
    headers: {
      apikey: config.publishableKey,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json',
      'Accept-Profile': 'api',
      'Content-Profile': 'api',
    },
    body: JSON.stringify({ p_request_schema_version: 1 }),
  });
  const body = await response.text();
  if (new TextEncoder().encode(body).byteLength > 8192) {
    throw new Error('Workspace check response too large');
  }
  let result: unknown;
  try {
    result = JSON.parse(body);
  } catch {
    throw new Error('Invalid workspace check response');
  }
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'message' in result
        ? (result as { message: unknown }).message
        : null;
    if (message === 'OWNER_ACCESS_REQUIRED') return null;
    throw new Error('Workspace check unavailable');
  }
  if (!result || typeof result !== 'object' || !('data' in result)) return null;
  const data = (result as { data: unknown }).data;
  if (!data || typeof data !== 'object' || !('profile' in data)) return null;
  const profile = (data as { profile: unknown }).profile;
  if (!profile || typeof profile !== 'object') return null;
  const value = profile as { id?: unknown; workspace_public_id?: unknown };
  return value.id === actor &&
    typeof value.workspace_public_id === 'string' &&
    publicIdPattern.test(value.workspace_public_id)
    ? value.workspace_public_id
    : null;
}

async function readBoundedBody(request: Request): Promise<ArrayBuffer | null | 'too_large'> {
  if (!request.body) return null;
  const reader = request.clone().body!.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return 'too_large';
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer;
}

export function createEdgeHandler(
  configured?: OAuthConfig,
  fixtureJwks?: FixtureJwks,
  checkOwner: NonNullable<AuthDependencies['checkOwner']> = checkActiveOwnerWorkspace,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (['/health', '/mcp/health', '/functions/v1/mcp/health'].includes(path)) {
      return handleHttpRequest(request, { config: configured });
    }
    let config: OAuthConfig;
    try {
      config = configured ?? runtimeOAuthConfig();
    } catch {
      return handleHttpRequest(request);
    }
    const resourcePath = new URL(config.resource).pathname;
    const isMcpPath = [resourcePath, '/mcp', '/functions/v1/mcp'].includes(path);
    const isDiscoveryPath = [
      resourcePath + '/oauth-protected-resource',
      '/mcp/oauth-protected-resource',
      '/oauth-protected-resource',
      '/.well-known/oauth-protected-resource' + resourcePath,
      '/.well-known/oauth-protected-resource',
    ].includes(path);
    if (!isMcpPath && !isDiscoveryPath) {
      return handleHttpRequest(request, { config });
    }
    let body: ArrayBuffer | null = null;
    if (request.method === 'POST') {
      try {
        const read = await readBoundedBody(request);
        if (read === 'too_large') return oversizedRequestResponse();
        body = read;
      } catch {
        return handleHttpRequest(request, { config });
      }
    }
    const authDependencies: AuthDependencies = {
      ...(fixtureJwks ? { loadKeys: () => Promise.resolve(fixtureJwks) } : {}),
      checkOwner,
    };
    const forwardedRequest = new Request(request, { body: body?.slice(0) ?? null });
    const protectedHandler = pipeline(
      [
        withOAuthProtectedResource({
          resourceServer: config.resource,
          authorizationServer: config.issuer,
        }),
        withSupabase({
          auth: 'user',
          audience: config.resource,
          issuer: config.issuer,
          env: {
            url: config.supabaseUrl,
            publishableKeys: { default: config.publishableKey },
            secretKeys: {},
            jwks: fixtureJwks ?? new URL(config.jwksUrl),
          },
        }),
      ],
      (innerRequest) =>
        handleHttpRequest(new Request(innerRequest, { body: body?.slice() ?? null }), {
          config,
          dependencies: authDependencies,
        }),
    );
    const response = await protectedHandler(forwardedRequest);
    if (
      request.method === 'GET' &&
      (path.endsWith('/oauth-protected-resource') ||
        path === '/.well-known/oauth-protected-resource')
    ) {
      try {
        const metadata = await response.json();
        if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
          const headers = new Headers(response.headers);
          headers.delete('content-length');
          headers.delete('content-encoding');
          headers.set('content-type', 'application/json; charset=utf-8');
          return Response.json(
            {
              ...(metadata as Record<string, unknown>),
              resource: config.resource,
              authorization_servers: [config.issuer],
              scopes_supported: ['openid', 'email'],
              bearer_methods_supported: ['header'],
            },
            { status: response.status, statusText: response.statusText, headers },
          );
        }
      } catch {
        // Keep the middleware response intact if its metadata is not JSON.
      }
    }
    return response;
  };
}
