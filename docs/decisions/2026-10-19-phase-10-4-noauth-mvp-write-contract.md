# CR-039 — MVP No-auth owner-bound RPC writes without temporary grants

- Date: 2026-10-19
- Applies to: Phase 10.4 onward, MAN-03 through MAN-09, one existing private Content Producer plugin, single fixed pilot workspace
- Supersedes: only the **temporary grant/latch activation requirement** in CR-037/CR-038 and earlier Phase 10.1 default-write-denial policy; does not supersede the RPC domain contracts, editorial gates, or Phase 10.7 independent audit
- Authority: explicit owner instruction to remove repeat per-card grant scripts and accept the public unauthenticated endpoint risk for MVP

## Decision

Keep the existing ChatGPT custom MCP connection set to **No authentication** and the server-owned fixed workspace identity of CR-032. For the MVP, any registered write RPC may be invoked without activating `MCP_MAN02_APPROVED_SHA256`, `MCP_MAN03_RESERVE_GRANT_JSON`, `MCP_MAN03_SAVE_GRANT_JSON`, or MAN-04 grants. These legacy settings are not consulted in the live write route; do not resurrect them, and never request that the owner run grant scripts. The plugin is PRIVATE, but its MCP URL is public. This is a consciously accepted temporary MVP risk, **not** owner authentication.

Write requests must still pass:
1. An active server-resolved `MCP_OWNER_USER_ID` workspace; the client cannot select a different workspace. MCP boundary rejects a different `p_workspace_public_id`, invalid `request_schema_version`, missing/invalid v4 `operation_key`.
2. Existing per-call SQL transaction `SET LOCAL ROLE authenticated`, server-minted claims and existing owner-scoped RLS; no service-role, admin bypass, or direct `anon` grants.
3. Frozen Phase 5 RPC input validation, source evidence and semantic dedup, Page/config CAS (including microsecond precision), operation ledger/replay and rate limits, reservation expiration, content rendering and quality checks.
4. Separate editorial approval protocol: `save_post` creates only a draft; `approve_post` remains a separately authorized **user instruction** in the ChatGPT workflow with exact revision/hash and explicit approval flag. No automatic approval, scheduling, publication, or MAN-04 as part of MAN-03.

**Security limitation:** Since HTTP is unauthenticated, any caller knowing this public endpoint can attempt write operations as the fixed pilot owner, including abusing operation keys and `explicit_approval` flags. The server cannot cryptographically verify that human approval came from the owner in this MVP. Rate limits, RLS, CAS and editorial validation limit scope and corruption but **do not prevent an outsider from acting inside the fixed workspace**. This elevated risk is explicit, time-bounded to the MVP, and must be closed by real caller authentication or a trusted per-request authority before broader release. Keep only one pilot workspace; treat accidental publication/discard and data tampering as material residual risks.

## Acceptance and rollout sequence

- No alteration to Phase 5 database procedures, CAS meaning, privilege/RLS policies, or frozen tool input schemas. MCP facade only removes redundant per-stage secret checks and validates owner workspace + UUIDv4 key; pilot adapter casts all known JSONB arguments explicitly.
- Local focused Deno tests cover read tools, valid fixed-owner writes with no grants, cross-workspace, invalid key/schema and named JSONB binding. Local migrated PostgreSQL integration uses seven NASA-backed MAN-03 Moon facts: a truncated timestamp must fail; six-digit microsecond timestamp must allow reserve, `save_post` must produce exactly one draft with seven fact bindings, and `get_post` must agree. Do not touch production for tests.
- Run exactly one full CR-020 backend/security gate **on the final changed SHA**. Deploy to production only after full SUCCESS. Verify deployed source/version without any write.
- **Only then**, in this owner-directed ChatGPT conversation, perform at most one logical `trivia_register_and_reserve_facts` call with the previously approved seven Moon facts, prepared reservation operation key/token, and one `save_post` with the previously prepared save key **only after a successful reserve**. Do not generate keys, change payload without approval, or retry an ambiguous/failed write. Perform readback `get_post` and report post id, revision, hash and checks. No MAN-04.
- In any failure: STOP, record exact nonsecret error code, true request timestamp/scope, deployed Edge function version, operation-key identity securely (not in public issue), whether any RPC committed, and available owner-scoped readback. Never print secret grants/tokens to GitHub.
- Preserve issue, PR and checkpoint statuses accurately; MAN-03 may PASS only after persisted draft readback, MAN-04 remains NOT STARTED.

## Rollback

If the public write exposure is unacceptable, restore the previously gated MCP Edge deployment/commit (thereby denying ungated writes), verify no owner/workspace privilege expansion, and suspend manual cards. No DB migration rollback is required for this MCP-only change. Do not silently switch to grant scripts.

## Evidence gaps and historical error

The previous `FACT_RESERVATION_CONTEXT_CHANGED` was raised at 2026-10-19 14:19:54.945Z by Edge version 25, SQLSTATE P0001. Original PostgreSQL bind values `$6/$7` and historical v25 bundle were not independently available. Production row readback showed the expected `2026-10-19T10:33:17.018070Z` and `workspace_unique`; microsecond truncation is a demonstrated **possible** cause, not a proven historical cause. Prior failed operation is not replayable with a different payload.
