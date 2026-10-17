# CR-025 — Restore production Data API access to the frozen `api` RPC schema

Date: 2026-10-17
Status: Accepted for Phase 9.5 remediation

## Evidence and cause

The hosted MCP v4 returned HTTP 200 for `initialize` and HTTP 503 for
`tools/list` at 12:12:51 UTC. Its safe log marked the second request
`auth_denied`. The only additional owner check on `tools/list` calls
`/rest/v1/rpc/get_account_profile` with `Accept-Profile: api` and
`Content-Profile: api`.

A no-user-token, no-owner-data POST to that exact RPC path and profile returned
HTTP 406, PostgREST code `PGRST106`, and `Invalid schema: api`. The response
listed only `public` and `graphql_public` as exposed. The production Data API
dashboard independently showed those two schemas selected and `api` omitted.
The `api.get_account_profile(integer)` routine exists and `authenticated` has
EXECUTE privilege, so the request is rejected at Data API schema selection,
before RPC execution or response validation. The MCP adapter currently maps a
non-owner-denial RPC status to a generic HTTP 503. This explains the observed
failure without attributing it to token verification or guessing from timing.

## Decision

Restore the already frozen Data API contract by adding `api` to production
Exposed schemas. Keep `internal` unexposed and automatic table exposure off.
Retain the platform `public` schema with its revoked direct business-object
privileges and RLS. Remove unused `graphql_public` only if the dashboard
allows doing so in the same reviewed setting change; it is not needed for the
MCP repair. No SQL migration, tool contract, editorial rule, or token-audience
relaxation is authorized by this record.

Classify workspace-check failures in safe function logs as `fetch`,
`rpc_status` (HTTP status only), or `response`. Do not log URLs, headers,
token values, user IDs, owner data, or response bodies. Preserve fail-closed
responses: non-owner remains 403 and unavailable checks remain 503. Add a
focused regression for 406 and malformed responses, plus a hosted preflight
that checks the configured schema with a no-user-token probe before an owner
OAuth run. The probe must not emit its request key or response data.

The existing Phase 9.5 cookie-tamper test changes the final base64url
character, whose unused padding bits can leave the decoded ciphertext
unchanged. Change the test to alter the first ciphertext character instead;
this stabilizes the gate without changing callback behavior.

## Rollout and evidence gate

Run focused tests, `pnpm run check`, and `git diff --check` before merge.
Run the full Phase 9 gate once on the resulting main SHA. Only after it passes,
set the production Data API schema and verify that the same no-user-token probe
no longer returns `PGRST106`. Deploy MCP from that exact gated SHA, then run
one new owner Approve flow. Reuse the proven Deny and v4 negative-token
evidence. If `tools/list` or any of the three owner reads still fails, stop
and report the exact stage and status; do not repeat login or run `create_page`.

Rollback: remove `api` from Exposed schemas only if an unexpected privilege
exposure is found, or redeploy the previous MCP version if the new function
regresses. Either action closes the business RPC path and leaves 9.5 blocked
until a reviewed forward fix; do not restore broad grants or expose `internal`.
