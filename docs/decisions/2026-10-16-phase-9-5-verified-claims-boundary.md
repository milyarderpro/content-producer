# CR-022 — Use Supabase verified claims once at the hosted MCP boundary

Date: 2026-10-16  
Scope: Phase 9 checkpoint 9.5 only  
Status: Approved for implementation, pending a new full technical gate and hosted acceptance

## Evidence and reason

CR-021's private Custom Access Token Hook is enabled in the dedicated production
project. A new authorization-code/PKCE token and its refreshed token both have
the exact MCP resource URL as `aud`. The authorization-code and refresh exchanges
return HTTP 200. The live ES256 signature verifies against the project's JWKS;
issuer, audience, role, client ID, subject, expiration, and `openid email` scopes
pass focused checks. The same access token passes the source `authenticateRequest`
verifier outside the Edge runtime, yet the hosted MCP returns 401 for initialize,
list, and owner reads. No source change is deployed to address this second 401.

The Edge pipeline already gates requests with `withSupabase({ auth: 'user',
audience: config.resource, issuer: config.issuer, jwks: project JWKS })` before
calling MCP. The MCP handler then repeats signature/JWKS verification. The
hosted failure is consistent with this redundant second verification path;
its exact Edge-runtime failure point is not directly observable from the
redacted responses. We will remove the duplicate verification for requests
that passed the upstream Supabase gate, while retaining every claim check.

## Decision and frozen-contract impact

- Keep the Supabase middleware's asymmetric-JWKS signature verification and
  exact issuer and resource audience checks. Do not accept `authenticated` as
  an MCP audience.
- Pass only the middleware's verified JWT claims into the MCP handler. The
  handler still requires the original Bearer token and independently checks
  exact issuer, audience/resource, expiry, issued/not-before time, role,
  `openid email` scopes, UUID subject, UUID OAuth client ID, owner ID, and
  active owner workspace. It forwards the original validated token to RLS.
- Keep the direct handler's own signature-verification path for calls without
  an upstream verified-claims context, including local tests. No tool schema,
  editorial behavior, database schema, or Page payload changes.
- Test that a verified-claims context with a wrong audience, issuer, scope,
  client, owner, or missing Bearer header remains denied. The upstream
  middleware must reject invalid signatures and mismatched audience before
  the handler. No claimed bypass path may be exposed over HTTP.

## Release and recovery

Run `pnpm run check`, focused auth tests, and one full Phase 9 technical gate
on the new merged `main` SHA. Only after it passes, redeploy the MCP Edge
Function from that exact SHA. Repeat only the affected hosted token,
initialize, exact 33-tool list, three owner reads, and access-denial checks;
the fresh Deny PASS remains valid unless the consent flow changes. If the
hosted gate fails, stop the Page pilot and record the failure. The previous
function version remains a rollback candidate; rolling back cannot be called
a Phase 9.5 PASS while owner reads fail.
