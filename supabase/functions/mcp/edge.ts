import { pipeline } from 'npm:@supabase/middleware@1.0.0';
import {
  withOAuthProtectedResource,
  withSupabase,
} from 'npm:@supabase/server@1.9.0';
import { runtimeOAuthConfig, type OAuthConfig } from './auth.ts';
import { handleHttpRequest } from './http.ts';

type FixtureJwks = { keys: Array<JsonWebKey & { kid?: string }> };

export function createEdgeHandler(
  configured?: OAuthConfig,
  fixtureJwks?: FixtureJwks,
): (request: Request) => Promise<Response> {
  let protectedHandler:
    | ((request: Request) => Promise<Response>)
    | undefined;
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
        (innerRequest) => handleHttpRequest(innerRequest, { config }),
      );
    }
    return protectedHandler(request);
  };
}
