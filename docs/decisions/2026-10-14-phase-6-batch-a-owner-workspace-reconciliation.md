# CR-017 — Phase 6 Batch A owner-workspace authorization boundary

- **Status:** Accepted
- **Date:** 2026-10-14
- **Authority:** Phase 6 Batch A audit remediation
- **Baseline:** PR #2, commit `8e1c61894d26a96e0d1e858133d6a63b0f3ddcb9`
- **Scope:** Authorization placement for the existing 15 MCP tools. No change to tool names, RPC signatures, SQL, RLS, rate limits, or Phase 6.7+ scope.

## Conflict

`plans/tool-inventory.md` §5.2 and `plans/works/phase-6-implementation-plan.md` §4 say that active owner workspace is validated before a tool handler runs. The Batch A implementation validates the owner allowlist and JWT at the HTTP boundary, checks active workspace through `api.get_account_profile` when discovering tools, and lets each business `tools/call` reach its owner-scoped Phase 5 public RPC. The previous remediation test covered inactive-workspace `tools/list` only. It did not prove the direct `tools/call` path.

Running `api.get_account_profile` before every business call would consume an additional read-rate-limit unit and duplicate the owner/RLS check performed by the business RPC. It could also create a time-of-check/time-of-use gap: the workspace may be deactivated after the profile read but before the mutation. The business RPC remains the authoritative check at the point of use.

## Decision

For the existing 15 tools, “validate owner workspace before tool work” is fulfilled by two layers:

1. The MCP HTTP boundary validates JWT signature and current key, issuer, exact resource audience, expiry, not-before, required scopes, OAuth `client_id`, and the configured owner allowlist before transport dispatch. `tools/list` additionally resolves the active workspace through `api.get_account_profile` using the original user JWT. Discovery fails with HTTP 403 and `OWNER_ACCESS_REQUIRED` when no active owner workspace exists.
2. Every business `tools/call` delegates through the existing allowlisted, owner-scoped `api` RPC with that original JWT. The RPC resolves the active workspace under database RLS in the same transaction as its read or write. No MCP handler may use a direct table query, service-role client, or a caller-provided identity as an authorization substitute. The RPC returns the safe `OWNER_ACCESS_REQUIRED` error for an inactive/non-owner workspace; writes cannot persist domain rows or completed ledger entries.

This decision scopes the pre-handler wording in the two documents above to the combined HTTP + RPC boundary. It does not relax server-side authorization on any read or write. A future tool that does not use an owner-scoped public RPC must add an equivalent owner check before accessing owner data, and requires its own review. The owner discovery check is not repeated for every business call, so no additional read-rate-limit charge is introduced. A workspace deactivated after discovery is still rejected by the RPC at use.

## Acceptance evidence required

The Batch A real HTTP → PostgREST → local database test must disable the owner's workspace, then independently call `tools/list`, one read tool, and one write tool through public MCP. It must assert `OWNER_ACCESS_REQUIRED` without resource existence data and verify no Page or operation-ledger mutation. It must restore the fixture and confirm normal owner calls still succeed. Existing non-owner, invalid-token, replay, catalog, RLS, and full-gate assertions remain mandatory. A GitHub Actions success at the exact remediation commit and an independent audit of that commit are required before checkpoint 6.7.

Hosted OAuth account flows remain deferred to Phases 9–10, as already recorded.