# CR-042 — Restore owner OAuth on the production MCP route

- Date: 2026-10-20
- Scope: Phase 10 OAuth repair on draft PR #23; MCP routing and authentication selection only
- Authority: Owner requested a working ChatGPT OAuth connection, exact protected-resource discovery path, and no anonymous business writes. This supersedes CR-032's default No authentication connection mode for the production `mcp` URL. CR-032 remains available only as an explicit rollback mode.

## Evidence

Production MCP v27 returns 404 for `GET /functions/v1/mcp/.well-known/oauth-protected-resource`, while its legacy `/oauth-protected-resource` alias returns valid metadata. A POST without JSON `Content-Type` returns 415 without an authentication challenge. A valid anonymous JSON `initialize` currently enters the fixed pilot branch before OAuth. Thus the route and auth selection prevent a reliable OAuth negotiation even though the separate metadata alias works.

## Decision

The production handler defaults to owner OAuth. The CR-032 fixed pilot branch runs only when the server explicitly sets `MCP_AUTH_MODE=fixed-pilot`; no request header, query parameter, or client tool argument may select it. The default OAuth path permits anonymous MCP protocol discovery only and returns a bearer challenge for missing-token business calls. A malformed or unsupported-media anonymous POST must return an OAuth challenge instead of 415. Serve the exact nested `.well-known/oauth-protected-resource` path requested by ChatGPT, alongside existing metadata aliases, from the same canonical resource and issuer. The metadata endpoint is public and read-only.

Bearer validation, active-owner workspace checks, all 33 tool names and business schemas, database RPCs, RLS, and existing write locks remain unchanged. The current No authentication plugin may cease to work after the OAuth-default deployment; do not use it for MAN-03/04 or enable a grant. Reverting to fixed pilot requires an explicit server-side mode setting and separate risk review.

## Acceptance boundary

Test the production handler without a supplied `configured` OAuth fixture: exact nested metadata route and fields, anonymous protocol catalog, challenge for a no-token POST lacking JSON media type, and no anonymous business execution. Run focused tests and `pnpm run check`, then one CR-020 full gate on the final deployment SHA before deploying the same SHA. Probe the active endpoint before owner login. Only real ChatGPT owner OAuth with 33 visible tools, three owner reads, and visible write approval without a write can establish PASS. No production business write, grant, or RLS change is authorized.
