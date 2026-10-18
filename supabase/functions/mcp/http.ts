import { MCP_SERVICE_NAME, MCP_SERVICE_VERSION } from './server.ts';
import { createAuthenticatedTransport, fetchAnonymousDiscovery } from './transport.ts';
import {
  type AuthDependencies,
  authenticateRequest,
  authenticateVerifiedRequest,
  AuthRejection,
  type OAuthConfig,
  runtimeOAuthConfig,
  WorkspaceCheckFailure,
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
  verifiedClaims?: Record<string, unknown>;
  anonymousDiscovery?: boolean;
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
  const header =
    'Bearer resource_metadata="' +
    metadataUrl(resource) +
    '", error="insufficient_scope", error_description="Sign in to continue"';
  return jsonResponse(
    {
      error: status === 503 ? 'authentication_unavailable' : 'authentication_required',
      _meta: { 'mcp/www_authenticate': [header] },
    },
    status,
    { 'WWW-Authenticate': header },
  );
}
async function toolCallId(request: Request): Promise<string | number | null> {
  try {
    const body: unknown = await request.clone().json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    const record = body as { jsonrpc?: unknown; method?: unknown; id?: unknown };
    if (record.jsonrpc !== '2.0' || record.method !== 'tools/call') return null;
    return typeof record.id === 'string' || typeof record.id === 'number' ? record.id : null;
  } catch {
    return null;
  }
}
function toolAuthChallenge(resource: string, id: string | number): Response {
  const header =
    'Bearer resource_metadata="' +
    metadataUrl(resource) +
    '", error="insufficient_scope", error_description="Sign in to continue"';
  return jsonResponse(
    {
      jsonrpc: '2.0',
      id,
      result: {
        content: [{ type: 'text', text: 'Authentication required.' }],
        _meta: { 'mcp/www_authenticate': [header] },
        isError: true,
      },
    },
    200,
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
function safeLog(id: string, stage: string, status: number, failure?: WorkspaceCheckFailure): void {
  // Never log request URLs, headers, tokens, user claims, bodies or RPC results.
  console.info(
    JSON.stringify({
      event: 'mcp_request',
      request_id: id,
      stage,
      status,
      ...(failure
        ? {
            workspace_check: failure.kind,
            ...(failure.kind === 'rpc_status' ? { rpc_status: failure.rpcStatus } : {}),
          }
        : {}),
    }),
  );
}
function includesToolsList(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(includesToolsList);
  return (
    !!value &&
    typeof value === 'object' &&
    'method' in value &&
    (value as { method: unknown }).method === 'tools/list'
  );
}
async function isToolsListRequest(request: Request): Promise<boolean> {
  if (request.method !== 'POST') return false;
  try {
    return includesToolsList(await request.clone().json());
  } catch {
    return false;
  }
}
const publicIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
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
  // The Supabase Edge gateway removes /functions/v1 before invoking this function.
  if (path !== expectedPath && path !== '/mcp') return challenge(config.resource, 401);
  const id = crypto.randomUUID();
  if (options.anonymousDiscovery && !request.headers.has('Authorization')) {
    const response = await fetchAnonymousDiscovery(request);
    if (response.status !== 403 && response.status !== 400) {
      safeLog(id, 'public_discovery', response.status);
      return response;
    }
    const callId = await toolCallId(request);
    if (callId !== null) {
      safeLog(id, 'auth_challenge', 200);
      return toolAuthChallenge(config.resource, callId);
    }
    return challenge(config.resource, 401);
  }
  try {
    const { checkOwner, ...jwtDependencies } = options.dependencies ?? {};
    const context = options.verifiedClaims
      ? await authenticateVerifiedRequest(request, config, options.verifiedClaims, jwtDependencies)
      : await authenticateRequest(request, config, jwtDependencies);
    if (checkOwner && (await isToolsListRequest(request))) {
      const workspacePublicId = await checkOwner(config, context.accessToken, context.actorUserId);
      if (!workspacePublicId || !publicIdPattern.test(workspacePublicId)) {
        throw new AuthRejection(403);
      }
      context.workspacePublicId = workspacePublicId;
    }
    const response = await createAuthenticatedTransport(context).fetch(request);
    safeLog(id, 'mcp', response.status);
    return response;
  } catch (error) {
    const status = error instanceof AuthRejection ? error.status : 503;
    safeLog(id, 'auth_denied', status, error instanceof WorkspaceCheckFailure ? error : undefined);
    return status === 403 ? ownerDenied() : challenge(config.resource, status);
  }
}
