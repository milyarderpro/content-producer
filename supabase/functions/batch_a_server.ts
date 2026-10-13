// Local-only test host: production HTTP middleware and transport, real PostgREST.
import { handleHttpRequest } from './mcp/http.ts';
import type { OAuthConfig } from './mcp/auth.ts';
const fixture = JSON.parse(await Deno.readTextFile(Deno.args[0]));
const config: OAuthConfig = fixture.config;
Deno.serve({ hostname: '127.0.0.1', port: 54330 }, async (request) => {
  // Match Kong's REST prefix while preserving the original user Authorization.
  const path = new URL(request.url).pathname;
  if (path.startsWith('/rest/v1/rpc/')) {
    return fetch('http://127.0.0.1:54329' + path.slice('/rest/v1'.length), {
      method: request.method,
      headers: request.headers,
      redirect: 'error',
      body: await request.arrayBuffer(),
    });
  }
  if (new URL(request.url).pathname === '/auth/v1/.well-known/jwks.json') {
    return Response.json(fixture.jwks);
  }
  return handleHttpRequest(request, { config });
});
