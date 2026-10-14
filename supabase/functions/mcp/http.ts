import { MCP_SERVICE_NAME, MCP_SERVICE_VERSION } from './server.ts';
import { createAuthenticatedTransport } from './transport.ts';
import {
  authenticateRequest,
  AuthRejection,
  runtimeOAuthConfig,
  type OAuthConfig,
  type AuthDependencies,
} from './auth.ts';

const publicHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'Access-Control-Expose-Headers': 'WWW-Authenticate, MCP-Session-Id',
  'Cache-Control': 'no-store',
};
export interface HttpOptions {
  config?: OAuthConfig;
  dependencies?: AuthDependencies;
}
function jsonResponse(body: object, status: number, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...publicHeaders, ...extra } });
}

export function oversizedRequestResponse(): Response {
  return jsonResponse({ error: 'request_too_large' }, 413);
}
function metadataUrl(resource: string): string {
  return resource + '/oauth-protected-resource';
}
function ownerDenied(): Response {
  return jsonResponse(
    {
      response_schema_version: 1,
      error: {
        code: 'OWNER_ACCESS_REQUIRED',
        message: 'Only the connected workspace owner may access this resource.',
        retryable: false,
        recovery: 'Use the authorized owner account.',
      },
    },
    403,
  );
}
function challenge(resource: string, status: number): Response {
  const header = 'Bearer resource_metadata="' + metadataUrl(resource) + '"';
  return jsonResponse(
    {
      error: status === 503 ? 'authentication_unavailable' : 'authentication_required',
      _meta: { 'mcp/www_authenticate': [header] },
    },
    status,
    { 'WWW-Authenticate': header },
  );
}
function discoveryPath(path: string, resourcePath: string): boolean {
  return (
    path === resourcePath + '/oauth-protected-resource' ||
    path === '/mcp/oauth-protected-resource' ||
    path === '/oauth-protected-resource' ||
    path === '/.well-known/oauth-protected-resource' + resourcePath ||
    path === '/.well-known/oauth-protected-resource'
  );
}
function safeLog(id: string, stage: string, status: number): void {
  // Never log request URLs, headers, tokens, user claims, bodies or RPC results.
  console.info(JSON.stringify({ event: 'mcp_request', request_id: id, stage, status }));
}
export async function handleHttpRequest(
  request: Request,
  options: HttpOptions = {},
): Promise<Response> {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const isHealth =
    path === '/health' || path === '/mcp/health' || path === '/functions/v1/mcp/health';
  const isMcp = path === '/mcp' || path === '/functions/v1/mcp';
  const isDiscovery = path.includes('oauth-protected-resource');
  if (!isHealth && !isMcp && !isDiscovery) return jsonResponse({ error: 'not_found' }, 404);
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: publicHeaders });
  }
  if (isHealth) {
    if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405);
    return jsonResponse(
      {
        status: 'ok',
        service: MCP_SERVICE_NAME,
        version: MCP_SERVICE_VERSION,
        timestamp: new Date().toISOString(),
      },
      200,
    );
  }
  if (request.method === 'POST') {
    try {
      if ((await request.clone().arrayBuffer()).byteLength > 256 * 1024) {
        return jsonResponse({ error: 'request_too_large' }, 413);
      }
    } catch {
      return jsonResponse({ error: 'invalid_request' }, 400);
    }
  }
  let config: OAuthConfig;
  try {
    config = options.config || runtimeOAuthConfig();
  } catch {
    return jsonResponse({ error: 'authentication_unavailable' }, 503);
  }
  const expectedPath = new URL(config.resource).pathname;
  if (discoveryPath(path, expectedPath)) {
    if (request.method !== 'GET') return jsonResponse({ error: 'method_not_allowed' }, 405);
    return jsonResponse(
      {
        resource: config.resource,
        authorization_servers: [config.issuer],
        scopes_supported: ['openid', 'email'],
        bearer_methods_supported: ['header'],
      },
      200,
    );
  }
  if (!isMcp) return jsonResponse({ error: 'not_found' }, 404);
  if (path !== expectedPath) return challenge(config.resource, 401);
  const id = crypto.randomUUID();
  try {
    const context = await authenticateRequest(request, config, options.dependencies);
    const response = await createAuthenticatedTransport(context).fetch(request);
    safeLog(id, 'mcp', response.status);
    return response;
  } catch (error) {
    const status = error instanceof AuthRejection ? error.status : 503;
    safeLog(id, 'auth_denied', status);
    return status === 403 ? ownerDenied() : challenge(config.resource, status);
  }
}
