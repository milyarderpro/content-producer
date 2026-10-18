# CR-032 — Phase 10.1 private ChatGPT No authentication with fixed server-side pilot identity

- **Date:** 2026-10-18
- **Status:** Owner-approved decision; implementation and hosted acceptance pending
- **Authority:** Owner's explicit Phase 10.1 instruction superseding Phase 0 AUTH-001..006, CR-028, CR-029 and CR-031 **only for the ChatGPT production MCP connection**.
- **Repository:** `milyarderpro/content-producer`, existing `codex/phase-10-plugin` / draft PR #23.
- **Existing production:** Supabase project `xjonnilnypchtxogtopb`, function `mcp`, unchanged 33 MCP business tools and existing `api` RPCs; no new project or demo MCP.

## Decision and trust boundary (recorded before source or migration changes)

ChatGPT connects to the **existing production MCP endpoint using No authentication**. No end-user OAuth, consent, user login or bearer token is required for MCP discovery or business-tool calls. One fixed, active pilot workspace/owner is selected **on the Edge server**, never from request headers, user-supplied identity, or arbitrary workspace values. The public MCP endpoint is intentionally unauthenticated; a private ChatGPT plugin does **not** make its network endpoint private.

Keep database credentials exclusively in the Edge Function environment. Prefer the existing hosted `SUPABASE_DB_URL` secret (never commit, return or log it), with a short, single-transaction database connection. Under a privileged **session login** solely for the transaction setup, resolve exactly one active workspace for the configured fixed owner, set locally scoped server-generated JWT-equivalent PostgreSQL request claims, then `SET LOCAL ROLE authenticated` **before invoking** an existing `api` RPC. The RPC, its `content_producer_api_owner` SECURITY DEFINER ownership, RLS policies, grants, workspace ownership checks, validators, ledger, and rate limits remain authoritative. The transaction closes on all outcomes. Verify the role/claims/owner boundary with focused local SQL integration tests **before** using this mechanism for production. If the existing Supabase/role path does not enforce RLS as tested, fail closed and do not deploy. No direct `anon` grant or bypass-RLS business call is allowed; no new unrestricted SQL RPC helper.

All 33 tool descriptors are discoverable and callable without an OAuth scheme; `get_account_profile`, `get_workspace_context`, `list_pages` must pass read-only verification. For Phase 10.1, every mutating tool remains **server-blocked by default**, despite appearing in `tools/list`; only a future, explicitly approved Phase 10 MAN-02 change may enable the relevant business write. Block occurs before reaching an RPC; no test write in production. Existing MCP schemas, error handling, idempotency and workspace public ID matching remain. Remove obsolete OAuth advertising from the No authentication catalog; retain prior OAuth source separately if helpful for rollback but do not use it as a fallback without the owner.

## Explicitly accepted security trade-off and operational controls

Anyone with the production function URL can enumerate tools and, absent further protections, invoke reads against the **single pilot** workspace; a private plugin is only a UI installation choice. This is **not equivalent to authenticating the owner**. Public read exposure, request floods/denial-of-service, traffic costs, prompt injection and eventual publicly reachable write calls are residual risks. RLS preserves a fixed-workspace database boundary but cannot distinguish the owner from an arbitrary HTTP caller. Reduce exposure with bound request bodies, strict workspace matching, response limits, safe logs, rate limiting, a default-closed server-side write latch, and a documented fast rollback to the previously deployed OAuth version. A later business write on a public endpoint remains high risk even if approved in ChatGPT; record it as unresolved for MAN-02. No passwords, keys, JWTs, connection strings or profile private identifiers belong in plugin artifacts, GitHub, response metadata or logs.

## Verification and release protocol

1. Read the latest Phase 0 contract, AGENTS, runbook, tool inventory, tracker and Issue #22, and document this decision **before** source/migration edits.
2. Prove locally that server-injected claims plus `SET LOCAL ROLE authenticated` can call existing 33 RPCs under existing grant/RLS controls, including fixed owner selection, foreign-workspace denial, empty/mismatched identity failure, `anon` denial, malformed claims and transaction rollback. Additive migration **only if necessary**, never privilege grants to `anon`.
3. Adjust existing `mcp` transport, focused tests, docs and light CI on same branch/PR. Run exactly **one** full CR-020 technical gate on the final candidate SHA. On a long-running Actions run, record its exact URL/SHA and stop; resume the **same** run on `lanjutkan`.
4. After full PASS, deploy only to the **same production project** and read back function/security state. Owner creates one PRIVATE ChatGPT plugin with **No authentication**; only real ChatGPT evidence of exactly 33 visible tools including `create_page` and three successful read calls permits 10.1 PASS.
5. Keep Phase 10.1 PENDING otherwise; no business write, no final Phase 10.2 package, no PR merge, no Phase 10.2 start.

## Superseded scope

The prior CR-028/031 requirement for first OAuth host write-approval discovery is superseded for this **No authentication** connection. Action-specific owner approval of exact Page/content/plan payloads, frozen MAN-01..09 procedure-v1, and first write only on MAN-02 remain mandatory. All AC-001..014 and Phase 10.2–10.7 remain pending.
