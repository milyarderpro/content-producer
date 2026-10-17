# CR-023 — Accept the Supabase Edge gateway path at the MCP handler

Date: 2026-10-17
Scope: Phase 9 checkpoint 9.5 only
Status: Approved for focused implementation; hosted acceptance pending

## Evidence and cause

Production MCP version 3 on SHA `0d745275b875d4dcf6be25c2564c912f3e90e53e`
returned 401 to a fresh owner OAuth token for initialize, tools/list, and three
read calls. The token and refresh exchange returned 200, and the access token
passed ES256 verification against production JWKS with the exact MCP resource
audience and issuer. Redacted Edge logs for 2026-10-17 02:27–02:32 UTC show
four 401 MCP requests with an authenticated JWT user and two negative 401
requests; function logs show no `mcp_request` entry for them.

The Supabase Edge gateway removes `/functions/v1` before invoking a function,
so the function receives `/mcp` while its advertised OAuth resource remains
`/functions/v1/mcp`. `createEdgeHandler` already admits both paths, but
`handleHttpRequest` rejects `/mcp` at `path !== expectedPath` before its auth
try/catch and safe log. This yields 401 for a verified owner token without an
`mcp_request` log. A focused signed-token test will reproduce this exact path
before the fix and prove the response changes after it.

CR-022's duplicate-verification hypothesis was not the remaining hosted cause:
version 3 already removed that verification and still returned 401. Its
verified-claims and exact-audience security boundaries remain in force.

## Decision and frozen-contract impact

- Accept `/mcp` as the internal Supabase Edge gateway path in the final MCP
  handler, alongside the exact public resource path. Keep the public OAuth
  resource, issuer, audience, signature, owner, and active workspace checks.
- Do not broaden to arbitrary routes or accept `authenticated` as an audience.
  No database, RPC, tool schema, editorial, or Page behavior changes.
- Add a regression test with a signed owner token on `/mcp`, plus owner and
  invalid-audience denials on that same path.

## Release and recovery

Run focused auth tests and `pnpm run check` while editing. Run the full Phase 9
technical gate exactly once on the final merged main SHA before redeploying
only MCP. Retest affected hosted OAuth token, initialize, 33 tools, three owner
reads, access denials, and fresh consent Deny through the official flow. Keep
the Page pilot blocked until hosted reads pass and the owner explicitly
approves its complete payload. Previous function version 3 remains the
rollback candidate; rollback alone cannot satisfy 9.5.
