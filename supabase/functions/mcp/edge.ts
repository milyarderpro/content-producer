import { pipeline } from 'npm:@supabase/middleware@1.0.0';
import { withOAuthProtectedResource, withSupabase } from 'npm:@supabase/server@1.9.0';
import { runtimeOAuthConfig, type OAuthConfig } from './auth.ts';
import { handleHttpRequest } from './http.ts';

type FixtureJwks = { keys: Array<JsonWebKey & { kid?: string }> };

export function createEdgeHandler(
  configured?: OAuthConfig,
  fixtureJwks?: FixtureJwks,
): (request: Request) => Promise<Response> {
  let protectedHandler: ((request: Request) => Promise<Response>) | undefined;
  return async (request) => {
    const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
    if (path.endsWith('/health')) {
      return handleHttpRequest(request, { config: configured });
    }
    let config: OAuthConfig;
    try {
      config = configured ?? runtimeOAuthConfig();
    } catch {
      return handleHttpRequest(request);
    }
    if (!protectedHandler) {
      const authDependencies = fixtureJwks ? { loadKeys: async () => fixtureJwks } : undefined;
      protectedHandler = pipeline(
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
          handleHttpRequest(innerRequest, { config, dependencies: authDependencies }),
      );
    }
    const response = await protectedHandler(request);
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
