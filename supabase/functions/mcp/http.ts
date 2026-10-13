import { MCP_SERVICE_NAME, MCP_SERVICE_VERSION } from './server.ts';

// Public paths in checkpoint 6.1 contain no user or workspace data.
const publicHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'Cache-Control': 'no-store',
};

function jsonResponse(body: object, status: number): Response {
  return Response.json(body, { status, headers: publicHeaders });
}

export function handleHttpRequest(request: Request): Response {
  const path = new URL(request.url).pathname.replace(/\/+$/, '') || '/';
  const isMcpPath = path === '/mcp' || path === '/functions/v1/mcp';
  const isHealthPath =
    path === '/health' || path === '/mcp/health' || path === '/functions/v1/mcp/health';

  if (!isMcpPath && !isHealthPath) return jsonResponse({ error: 'not_found' }, 404);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: publicHeaders });
  }
  if (isHealthPath) {
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

  // Strict fail-closed gate: even an Authorization header is not trusted.
  // No MCP initialize, tools/list or RPC body reaches a handler yet.
  return new Response(JSON.stringify({ error: 'authentication_required' }), {
    status: 401,
    headers: {
      ...publicHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'WWW-Authenticate': 'Bearer',
    },
  });
}
