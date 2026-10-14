import { pipeline } from 'npm:@supabase/middleware@1.0.0';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.0';
import { runtimeOAuthConfig, type OAuthConfig } from './auth.ts';
import { handleHttpRequest, oversizedRequestResponse } from './http.ts';

type FixtureJwks = { keys: Array<JsonWebKey & { kid?: string }> };
const MAX_REQUEST_BYTES = 256 * 1024;

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
    const authDependencies = fixtureJwks
      ? { loadKeys: () => Promise.resolve(fixtureJwks) }
      : undefined;
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
