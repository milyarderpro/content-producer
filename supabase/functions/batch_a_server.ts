// Local-only test host: production HTTP middleware and transport, real PostgREST.
import { handleHttpRequest } from './mcp/http.ts';
import type { OAuthConfig } from './mcp/auth.ts';
const fixture = JSON.parse(await Deno.readTextFile(Deno.args[0]));
const config: OAuthConfig = fixture.config;
Deno.serve({ hostname: '127.0.0.1', port: 54330 }, (request) => {
  if (new URL(request.url).pathname === '/auth/v1/.well-known/jwks.json') {
    return Response.json(fixture.jwks);
  }
  return handleHttpRequest(request, { config });
});
