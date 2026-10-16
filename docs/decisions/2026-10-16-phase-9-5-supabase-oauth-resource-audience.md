# CR-021 — Supabase OAuth resource audience for Phase 9.5

- **Status:** Accepted for implementation; hosted evidence remains pending.
- **Date:** 2026-10-16.
- **Authority:** Owner's explicit Phase 9.5 remediation request after the hosted PKCE test on release `350508610736b621ad46463f284a948ba446e0d0`.
- **Scope:** OAuth token issuance configuration only. The frozen exact MCP audience/resource, issuer, signature, scope, OAuth-client and owner checks remain in force. No MCP tool, editorial or Page contract changes.

## Conflict and evidence

The hosted authorization-code and refresh exchanges returned HTTP 200, but Supabase issued access tokens with its default `aud=authenticated`. The MCP resource is `https://xjonnilnypchtxogtopb.supabase.co/functions/v1/mcp`; exact audience verification correctly returned 401 for initialize, tools/list and owner reads. Sending an OAuth `resource` parameter did not change the issued audience. The second consent attempt returned a callback `code`, so Deny is PENDING.

The [Supabase OAuth token-security guide](https://supabase.com/docs/guides/auth/oauth-server/token-security) documents the default audience and recommends a Custom Access Token Hook for a service-specific audience. The [hook contract](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) supplies `claims.client_id` and calls the hook on every issuance, including refresh. OAuth scopes do not govern database permissions. A generic `authenticated` exception at the MCP boundary would defeat the frozen resource binding and is rejected.

## Decision

1. Add one least-privilege Postgres Custom Access Token Hook through a new migration and configure it in `supabase/config.toml` for local parity. For a token with a valid OAuth `claims.client_id`, preserve every claim and replace only `aud` with the canonical MCP resource derived from the trusted Supabase Auth issuer by replacing the final `/auth/v1` with `/functions/v1/mcp`. Require a well-formed project issuer; an unexpected issuer fails token issuance closed. Tokens without OAuth client context retain their original audience. This covers authorization-code and refresh grants without changing ordinary owner login tokens.
2. The hook is executable only by `supabase_auth_admin` in the private `internal` schema. Neither public API roles nor MCP clients can invoke it directly. The MCP continues to validate the exact resource and all existing JWT and owner predicates. `MCP_RESOURCE_URL` in the deployed function must equal the derived audience; compare both before and after deployment.
   This project currently exposes one OAuth protected resource (MCP). Issuing the MCP audience to any OAuth client that the owner explicitly authorizes is a project-level policy; if another protected resource is added, introduce an approved client-to-resource mapping before enabling it. Dynamic registration alone never grants owner access without consent.
3. Register the hook in hosted Supabase Auth only after the new release SHA passes the full Phase 9 technical gate. Recheck Auth setting and token issuance after activation. If the hook fails or changes ordinary login, disable it and stop hosted testing; do not relax MCP validation. Existing unexpired `aud=authenticated` tokens remain rejected by MCP; a fresh OAuth grant or refresh is needed.
4. Treat Deny as separate evidence: create a genuinely new authorization request that reaches a visible consent screen, record an observed click on **Tolak**, and require callback `error=access_denied` with matching state and no code. A callback `code` is not Deny PASS. Reuse of an already granted consent cannot substitute for this test.

## Verification and release sequence

Test the hook against OAuth code/refresh-shaped events, ordinary login events, malformed issuer/client context, and direct public-role execution. Run focused checks during repair, then freeze and run the full gate once on the new main SHA before any production migration/Auth setting/function deployment. After deployment rerun only affected hosted token, initialize, tools/list (33), three owner reads, access denials and Deny checks. Keep all token material in process memory only. The Page pilot remains blocked until owner reads pass and the owner explicitly approves the complete final `create_page` payload (`GB`, not `UK`).
