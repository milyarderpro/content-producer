# CR-026 — One approved, owner-authenticated Phase 9.5 create_page pilot

Date: 2026-10-17
Status: Accepted by owner for the exact pilot payload only (Issue #8, approved 2026-10-17)
Scope: Phase 9.5 only; narrows CR-024 read-only testing exception; does not change any frozen business contract.

## Authority and evidence

Issue #8 comment #6235723905 contains the exact proposed create_page JSON argument payload. The owner subsequently explicitly approved exactly one production create_page with Page name `Phase 9.5 Pilot - Trivia`, slug `phase-9-5-pilot-trivia`, workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`, target markets `["US"]`, and operation_key `b9f08c05-ee8e-4adf-8fe4-6c863128b9f7`. The owner's second instruction authorizes a narrowly constrained, temporary owner OAuth execution path, without renewed payload approval. No other business mutation is permitted.

Prior real owner hosted OAuth approve/refresh (both HTTP 200), MCP exactly 33 tools, and three reads passed on gated `9e0cf43667cc94ea9b3c7f2d38aa7724be44353f`. Production is empty for Page/config/ledger/post/reservations. The old callback must remain read-only for all other paths.

## Narrow implementation decision

- Add a distinct explicit `/phase-9-5/pilot` browser entry, with an unambiguous Page name/slug/operation_key warning. It must not silently reuse the read-only `/phase-9-5` action.
- Require server-only `PHASE95_ENABLED=1` **and** `PHASE95_WRITE_ENABLED=1` to initiate _only_ the pilot path; the new flag is disabled by default. Keep the original existing read-only path read-only even while the pilot flag is enabled. Reject unexpected request intent and all browser-provided JSON business arguments. Start requires an authenticated active owner browser session and issues server-generated PKCE and state. Include the fixed pilot intent in the encrypted flow cookie, and ensure the callback checks intent against the feature flag at execution time.
- Run signed JWT owner/client/resource/scope verification, refresh and the proven MCP initialize, exactly-33 tools/list, and the three owner reads before write; require the profile workspace UUID to equal the owner-approved workspace UUID. Use the original OAuth-owner token in a single MCP `tools/call` to `create_page` using exactly the literal approved payload; no service_role, SQL administrator, second tool or parameter supplied by the browser.
- Keep one immutable idempotency operation_key. One authenticated callback makes **at most one** tools/call create_page request; on uncertain outcome, stop and inspect DB/ledger before deciding any retry. No generic MCP proxy. The database RPC's idempotency remains authoritative.
- Never log or return code, access token, refresh token, cookies, business contents, full tool results or request query metadata. Preserve CR-024 narrow Vercel built-in metadata caveat, no new drains, no stored OAuth secrets. Only show a generic success/failure status. Reject missing/expired/mismatched state and Deny without business tool calls.
- PR focused tests must prove flag off, wrong start intent, read-only mode even if write flag on, user denial, token failures and Deny, the exact approved arguments, single MCP create_page call on valid owner flow, and no token/code/payload disclosure. Gate new final merged main SHA with full manual Phase 9 workflow **once** before any production deploy. Preserve old hosted backend/schema without redeploy. Pilot flag off by default even after deployment.
- Verify **before** write no conflicting slug or operation key exists. After the one consent flow, audit exactly one Page and Page config with owner-approved values, exactly one appropriate operation-ledger record with the approved key (an expected ledger entry is not a leak), no duplicated ledger, no posts/content plans/facts/reservations/metrics, and a safe owner list_pages read if available. Never silently report a missing write as PASS.
- Immediately set `PHASE95_WRITE_ENABLED=0` and `PHASE95_ENABLED=0` and redeploy the same gated SHA after the write/inspection (or after failure). Record deployment IDs, provider status, safe rollback, hosted advisor warnings, 14 AC evidence/PENDING and independent auditor assignment. Do not claim independent review passed.

## Stop criteria and rollback

Fail closed if project identity, owner UUID, allowed tool, payload, migration, SHA, gate, pre-write state, JWT, or output disagree. Disable the temporary path and revert frontend to last safe deployment if necessary; do not reset or revert the database. No manual SQL write, service role, OAuth token display or fabricated MCP call is an acceptable workaround. CR-024 remains in force outside this one fixed pilot. Phase 9 requires independent approval; implementer cannot self-sign audit.
