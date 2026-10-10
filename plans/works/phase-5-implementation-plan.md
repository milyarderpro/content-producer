# Phase 5 — Transactional RPC, Lifecycle, and Security Implementation Plan

## 1. Purpose

This document is the executable runbook for Phase 5. It turns the Phase 3
core tables and the Phase 4 trivia module into the only permitted caller-facing
database surface: a narrow, owner-scoped `api` RPC allowlist.

The result is **33 database operations**, exactly one for each final domain
operation in `plans/tool-inventory.md`. Phase 5 has no MCP transport, Edge
Function handler, OAuth middleware, auth frontend, plugin package, remote
project, production seed, or Facebook integration. Those belong to later
phases. A successful RPC test does not claim that an MCP tool already exists.

The phase is complete only when all operations are atomic, idempotent where
required, owner-scoped, safely error-mapped, and concurrency-tested through
the public RPC path. Direct caller access to business tables must remain
impossible.

## 2. Normative sources and precedence

Read these files before each checkpoint. They are the source of truth; this
runbook sequences their implementation and does not silently amend them.

1. `AGENTS.md` — repository guardrails.
2. `plans/phase-0-decision-register.md` — accepted CORE, FACT, QUALITY,
   TOOL, AUTH, and PLATFORM decisions.
3. `plans/tool-inventory.md` — final names, exact input/output behavior,
   rate groups, errors, confirmation constants, privacy, and orchestration.
4. `plans/database-design.md` — data model, function security, RLS, grants,
   locks, lifecycle, and reference DDL.
5. `plans/module-contract.md` and `plans/trivia-content-dna.md` — core/niche
   boundary and trivia version-1 validation/quality requirements.
6. `plans/acceptance-traceability.md` — evidence IDs and acceptance mapping.
7. `plans/implementation-plan.md` — Phase 5 scope and final gate.
8. Accepted change records under `docs/decisions/` — later accepted decisions
   win only for their explicitly reconciled subject.

If two requirements cannot both be implemented, stop before creating a
migration and write a Proposed change record. Do not resolve it by weakening a
test, changing an old migration, changing a frozen fixture, widening a grant,
or inventing a new public operation.

## 3. Starting baseline and entry gate

The expected committed baseline is `cb3568a` (`feat: complete Phase 4 Batch B
lifecycle foundation`) after the Phase 4 commits. The baseline has 20 local
migrations, all Phase 3/4 tables with RLS enabled, private Phase 4 helpers,
and **zero** `api` business routines.

Before checkpoint 5.1, the implementing agent must prove:

- `git status --short` is empty.
- A clean local reset replays all source migrations.
- `pnpm run check`, `pnpm run test-all`, `pnpm run verify-migrations`,
  `pnpm run smoke-test`, and `pnpm run supabase:verify` pass.
- Security Advisor has no error-level finding.
- Catalog evidence confirms all Phase 3/4 business tables are RLS-enabled,
  caller roles have no direct table/sequence privilege, callers cannot execute
  `internal` helpers, and `api` has no business RPC.

Do not repair a Phase 3/4 defect by rewriting its migration. Add an additive
migration and a focused regression test, or stop for a change record when the
contract itself is inconsistent.

## 4. Non-negotiable boundaries

### 4.1 Included

- SQL migrations for narrow `api` entry points and private `internal` helpers.
- Role, RLS, object privilege, default privilege, timeout, error, rate-limit,
  idempotency, lifecycle, rendering, quality, and projection logic needed by
  the 33 operations.
- Local database integration, privilege, lifecycle, replay, race, and query
  performance tests.
- Test-only local Auth fixtures or request contexts required to prove owner,
  non-owner, and unauthenticated behavior. They must not become production
  seed records.

### 4.2 Explicitly excluded

- `supabase/functions/mcp/**`, any MCP server/handler/tool registry, HTTP
  `/health`, Deno application code, or OAuth token middleware.
- Login, consent, auth frontend, DCR client creation, remote linking, deploy,
  cloud resource, secret, service-role key, or production user/workspace/Page
  seed.
- OpenAI API, embeddings/vector search, Facebook/Canva APIs, external network
  calls, background workers, generic executor, raw SQL tool, or generic status
  mutation.
- A new niche, changes to the frozen trivia editorial contract, or production
  facts copied from reference datasets.

### 4.3 Public surface rule

`api` is the sole Content Producer business-RPC schema. `public` and `storage`
may be technically included by Supabase platform configuration but are never
the application business API. `internal` is not a Data API business schema and
never receives caller grants.

There are exactly 33 `api` entry points at Phase 5 exit. A helper is not an
entry point. No overloaded generic `execute`, `update_status`, or arbitrary
JSON action function is permitted.

## 5. Global implementation rules

### 5.1 Migrations and function safety

- This repository uses imperative migrations. Create each new migration through
  the Supabase CLI, then review it before filling in SQL. Never edit an applied
  migration.
- Every public entry point has explicit, stable argument types. Versioned
  domain payloads may be `jsonb`, but must be validated as a closed schema
  before any state change. A generic unvalidated request envelope is forbidden.
- Public functions that require table access are intentionally `SECURITY
  DEFINER`, owned by `content_producer_api_owner`. The role is `NOLOGIN`, has
  no `BYPASSRLS`, is not a business-table owner, and has only the minimum table
  and sequence privileges needed. It must not be a member of an unbounded
  privileged role.
- Every privileged function uses `SET search_path = ''`, fully-qualified object
  references, explicit argument validation, `auth.uid()` ownership checks, and
  OAuth client context validation required by the frozen contract. It must not
  authorize from `user_metadata`, email, a supplied actor ID, or a supplied
  workspace ID alone.
- Helpers that do not need elevated access remain `SECURITY INVOKER` in
  `internal`. Revoke `EXECUTE` on all new functions from `PUBLIC`, `anon`,
  `authenticated`, and `service_role`, then grant only the allowlisted `api`
  entry points to `authenticated`.
- New tables, functions, sequences, and schemas receive explicit privileges and
  safe default privileges. RLS and object grants are separate controls.

### 5.2 Transaction, lock, and error rules

- A write RPC is one short database transaction: claim ledger key, acquire
  locks in the global order, validate current state, mutate, snapshot a minimal
  safe response, complete the ledger, commit. No network, research, model call,
  or user interaction runs inside it.
- Set local `lock_timeout` to 2 seconds and `statement_timeout` to 15 seconds
  in write paths. Map timeout/deadlock/serialization conditions to the safe,
  retryable `DATABASE_BUSY` contract without raw SQL details.
- Lock order is: workspace → Page → plan → plan item → post → trivia fact →
  trivia post-fact junction → metric. Schedule lock keys are acquired in
  numeric order for two-slot moves. Fact sets are locked deterministically.
- A domain error exposes only stable code, safe message/recovery, public IDs,
  safe status/revision, and retry information when applicable. It never exposes
  a bigint internal ID, SQLSTATE/SQL text, stack trace, JWT, token, source
  document, or secret.

### 5.3 Phase 5/Phase 6 authentication interface

Phase 5 does **not** parse or cryptographically validate an OAuth token; that
is Phase 6 middleware work. It nevertheless defines the database-side boundary
that every entry point must enforce: an authenticated `auth.uid()` and a
nonempty validated OAuth `client_id` request context. The context is trusted
only after Phase 6 has validated issuer, audience/resource, expiry/not-before,
scopes, and client identity and passed the user JWT to `.schema('api').rpc(...)`.

For local Phase 5 tests, establish that context only through the supported
Supabase/Postgres request-claim test mechanism. Test setup must cover owner,
non-owner, missing user, and missing client context. It must not add a
production token parser, accept a caller-provided actor/client field, or make a
browser session without `client_id` valid. Phase 6 must later consume this
database contract unchanged; it must not reimplement or bypass authorization
in handler SQL.

### 5.4 Request, idempotency, and rate-limit rules

- Every write has `request_schema_version = 1`, owner-resolved workspace,
  RFC UUID-v4 `operation_key`, canonical semantic request hash, and its exact
  inventory operation name.
- Same workspace + key + operation + canonical hash returns the completed
  minimal response snapshot with `replayed = true`, without another mutation,
  revision increment, attempt increment, allocation transition, or metric row.
- The same key with another operation or semantic payload returns
  `OPERATION_KEY_REUSED`. A failed transaction leaves no completed ledger or
  partial business mutation.
- Reads do not create ledger or business rows. They are rate-limited but are
  not idempotency-ledger operations.
- Rate limiting happens after verified request identity/context and before the
  business mutation. Default groups are: `read` 120/minute,
  `expensive_read` 20/minute, `write` 30/minute, and `contention_write`
  20/minute. It is keyed by actor, OAuth client, group, and UTC minute. A
  rejected request does not run the mutation and returns `RATE_LIMITED` with a
  bounded `retry_after_seconds`.

### 5.5 Quality and lifecycle rules

- The server owns renderer output, text metrics, system checks, content hash,
  timestamps, revision increments, and owner approval actor. Client-provided
  copies of those values are assertions to validate, never authority.
- Editorial checks are validated closed-schema input bound to current hash and
  rubric version. They are not fact verification and cannot override blocking
  system/critical editorial failure.
- Save and revise may persist drafts with quality failures; they must not create
  a partial draft on an integrity, ownership, reservation, reuse, or schema
  failure. Save never creates `ready`.
- A ready/posted/archived post must retain quality `passed` and a matching
  approval snapshot. Revision of ready returns it to draft and invalidates
  approval. Posted source/fact snapshots are immutable.

## 6. The exact 33-operation allowlist

The SQL function name may be mechanically prefixed only if that does not alter
the inventory operation identity. For example `api.get_account_profile` maps
to `get_account_profile`; names, argument semantics, response fields, error
families, rate group, and confirmation constants remain those in the inventory.

| Checkpoint | Operations | Count |
|---|---|---:|
| 5.2 | `get_account_profile`, `get_workspace_context`, `list_pages`, `get_page_generation_context`, `list_content_plans`, `get_content_plan`, `list_posts`, `get_post`, `get_post_performance`, `get_performance_insights` | 10 |
| 5.3 | `create_page`, `update_page`, `create_content_plan` | 3 |
| 5.4 | `claim_content_plan_items`, `renew_content_plan_claim`, `report_content_plan_item_failure`, `retry_content_plan_item`, `replace_discarded_plan_item`, `cancel_content_plan` | 6 |
| 5.5 | `trivia_find_similar_facts`, `trivia_register_and_reserve_facts`, `trivia_release_facts`, `trivia_reverify_fact`, `trivia_correct_fact` | 5 |
| 5.6 | `save_post`, `revise_post`, `reschedule_post` | 3 |
| 5.7 | `approve_post`, `revoke_post_approval`, `discard_post`, `mark_post_posted`, `archive_post` | 5 |
| 5.8 | `record_post_performance` | 1 |
| **Total** |  | **33** |

`get_post_performance` and `get_performance_insights` are implemented at 5.2
as read projections, but their complete behavioral coverage is finalized after
the write operation at 5.8. No later checkpoint may add a 34th RPC.

## 7. Test architecture and evidence

Add focused Phase 5 database tests under `supabase/tests/database/`, grouped by
responsibility rather than a single monolithic test. Existing Phase 3/4 tests
remain regression coverage and must not be weakened.

Required groups include:

- API security, grants, RLS, function owner, auth/request context, and error
  safety.
- Ledger replay, payload mismatch, rollback, timeout mapping, and rate limits.
- Page/context and plan projection/mutation/CAS.
- Claim/reclaim/renew/failure/retry/replacement/cancel and schedule races.
- Trivia RPC registration/reservation/release/reverification/correction.
- Post save/revise/reschedule/render/quality/approval/lifecycle.
- Metrics snapshots, history, and cautious insights.
- Cross-RPC concurrency and final catalog audit.

Tests must invoke entry points as the caller role with an authenticated request
context. Database-owner calls are useful only for fixture setup and catalog
inspection; they do not prove public-RPC authorization. Each operation needs a
positive owner path and at least one relevant invalid, non-owner, replay,
conflict, or recovery path. Test fixture data is ephemeral and always cleaned
up, including when a test fails.

The phase owns deterministic database evidence, not MCP protocol evaluation or
the 101 prompt suite. Preserve evidence IDs in test names/comments where
practical: `CORE-001..008`, `RPC-*`, `CON-*`, `SEC-*`, and relevant
`QUALITY-*`/`FACT-*` references from `plans/acceptance-traceability.md`.

## 8. Batch and audit cadence

Phase 5 uses two implementation batches to reduce the risk of carrying a
privilege mistake into the complex lifecycle code.

1. Batch A is checkpoints 5.1–5.4. The agent stops after 5.4. An independent
   audit is required before the user authorizes 5.5.
2. Batch B is checkpoints 5.5–5.9. The agent stops after 5.9. An independent
   final audit is required before commit or Phase 6.

Within a batch the user authorizes one checkpoint at a time with
`Lanjutkan 5.x`. A checkpoint report is not a phase-complete claim. The agent
must not start the next checkpoint, Phase 6, commit, push, or remote action
without the corresponding user instruction.

At every checkpoint, run its focused tests plus `pnpm run check`,
`pnpm run verify-migrations`, and the relevant database suite. Before either
batch audit, run the full verification set in section 18.

## 9. Checkpoint 5.1 — Security kernel, RPC conventions, and replay/rate-limit foundation

### Objective

Create the secure foundation on which every `api` entry point will rely, while
keeping business behavior private until it can be exposed narrowly.

### Work

1. Re-run the Phase 4 entry gate and create a machine-readable operation map:
   inventory operation → function → rate group → write/read → required CAS /
   confirmation fields → test owner. The map must total exactly 33.
2. Create or harden the `content_producer_api_owner` role and the `api` schema
   privileges according to section 5.1. Confirm the role is not a table owner,
   cannot log in, and has no `BYPASSRLS`.
3. Add RLS policies for each business/internal table required by the narrow API
   role. Policies for the function owner repeat the same `auth.uid()` owner
   predicate; `TO authenticated` alone is not authorization. Do not grant
   callers direct table access merely to make policies testable.
4. Add private helpers for validated owner/workspace lookup, OAuth-client
   context assertion, canonical request hashing, error construction/mapping,
   transaction timeout setup, ledger claim/complete/replay, and atomic fixed
   window rate limiting. Their names and signatures remain private.
5. Make helper/default privileges fail closed. Ensure `api` has `USAGE` only
   for `authenticated`; `anon` gets no `api` usage or RPC execute. No business
   function receives implicit `PUBLIC EXECUTE`.
6. If an entry point needs a shared projection or no-op read helper, keep it
   private; do not expose a provisional generic RPC.

### Required tests

- Owner versus non-owner versus unauthenticated/request-context-missing access.
- Direct table/sequence access denied to caller roles on every business table;
  caller access to `internal` denied.
- Role/catalog assertions: only allowlisted public functions may later be
  executable by `authenticated`; no helper/PUBLIC execution; function owner
  has the intended attributes and minimum privileges.
- Same operation key/payload concurrent replay gives one mutation; key reuse
  with different operation/hash rejects; rollback leaves no ledger completion.
- Parallel rate-limit increment has one consistent count and returns bounded
  retry-after after the limit; rejected writes leave no business mutation.
- Safe mapping of lock/statement timeout to `DATABASE_BUSY`, without SQL text.

### Completion criteria

- No business-domain `api` RPC has been exposed prematurely.
- The kernel test proves a future SECURITY DEFINER entry point remains subject
  to owner RLS. No broad grant, table-owner function, or bypass-RLS workaround
  exists.
- Security Advisor remains clean and all baseline tests still pass.

## 10. Checkpoint 5.2 — Owner-scoped read projections

### Objective

Expose the ten bounded read operations, using the 5.1 security kernel and no
business-state side effects.

### Work

1. Implement the ten read functions listed in section 6 with explicit typed
   arguments, strict limits/cursors/filters, deterministic sort keys, and safe
   response projections.
2. Apply their inventory rate groups (`read` or `expensive_read`) and enforce
   result minimization: public UUIDs, bounded previews, no bigint IDs, secret,
   raw source document, hidden reservation/claim token, or unrelated workspace
   row.
3. Make `get_workspace_context` the module/default context projection; do not
   add `list_niches`. Make `get_page_generation_context` the single bounded
   generation projection, including only current Page/niche config, reusable
   context, and safe summaries required by its contract.
4. Keep `list_*` pagination opaque and deterministic. `get_*` returns a
   resource-specific not-found code only after ownership-safe lookup, without
   cross-workspace existence leakage.
5. Ensure performance reads use latest compatible metric snapshots/deltas and
   descriptive aggregates with sample size, period, exclusions, and caveats;
   they never sum cumulative history or assert causation.

### Required tests

- Every read has owner success, non-owner denial/no existence leak, invalid
  input, empty result, and no-ledger/no-mutation assertion.
- Pagination/cursor determinism, filter bounds, result-size bounds, and
  projection privacy for all list functions.
- Similar-fact read never auto-merges candidates and preserves the Phase 4 cap
  and deterministic ordering.
- Metrics projections prove latest/delta behavior and `insufficient` insight is
  a safe successful response rather than an invented conclusion.

### Completion criteria

- Exactly ten read allowlist functions are executable by `authenticated`.
- No direct table grant or caller-executable helper has appeared.

## 11. Checkpoint 5.3 — Page and content-plan creation

### Objective

Implement Page/config mutation and plan creation atomically, with idempotency,
CAS, and schedule protection.

### Work

1. Implement `create_page` to create the Page and its initial enabled trivia
   config in one transaction. Validate Page timezone, target markets, platform
   config, supported schema versions, defaults, and niche enablement.
2. Implement `update_page` with exact `expected_page_updated_at` and, when
   applicable, `expected_config_updated_at` comparison. It may not silently
   merge configuration or change a Page identity through stale input.
3. Implement `create_content_plan` to validate the closed plan schema and
   create the plan plus its exact, ordered item set atomically. Enforce the
   maximum 100 items and supported schedule intent.
4. Acquire the deterministic schedule locks and recheck `content_plan_items`
   and `posts` in the same transaction before every scheduled item write. A
   conflict returns `SCHEDULE_CONFLICT`; the server never auto-moves it.
5. All writes use 5.1 ledger/replay/rate-limit primitives and minimal response
   snapshots. Every child item links to the same scoped operation ledger row.

### Required tests

- Create/update exact replay, key mismatch, failed atomic rollback, owner/non-
  owner, invalid config, stale Page/config CAS, and no direct table access.
- Plan item count, contiguous positions, schedule validation, and full rollback
  if one planned slot is invalid/conflicting.
- Direct post/plan item slot collision and linked-plan exception semantics are
  verified through the public path where applicable.

### Completion criteria

- `create_page`, `update_page`, and `create_content_plan` are the only newly
  exposed functions; each has a positive owner and negative/rollback test.

## 12. Checkpoint 5.4 — Plan item lease, recovery, replacement, and cancellation

### Objective

Expose the six plan progression operations without bypassing the lease,
terminal, lock, or schedule contracts.

### Work

1. Implement claim using a short transaction with `FOR UPDATE SKIP LOCKED`,
   deterministic `position, id` order, chunk 1–3, and a fresh claim token.
   It may reclaim expired `in_progress` rows opportunistically.
2. Implement one-time renewal only for the active matching token and never
   beyond 60 minutes from initial `claimed_at`.
3. Implement safe failure, retry only from `failed`, explicit replacement only
   after all previous pre-publication posts were discarded, and cancellation of
   non-completed items only. Preserve attempt history/audit; never hard-delete.
4. Enforce claim token/current lease validation in every claim-bound write;
   Phase 5.6 `save_post` must later reuse this exact helper rather than copying
   its rule.
5. Implement cancellation versus save semantics by lock and revalidation, not
   by a status overwrite. Retain the global schedule lock ordering.

### Required tests

- Parallel claim workers receive different items; stale/expired/mismatched
  tokens cannot renew, fail, or later save.
- One renewal succeeds and another/late renewal fails; expiry can be reclaimed.
- Replay does not add attempt count; retry, replacement, and cancellation are
  distinct legal transitions.
- Save-versus-cancel, retry-versus-claim, and opposite-direction reschedule
  races end in one legal state with no deadlock.
- Archived/posted history blocks replacement; discard alone does not create a
  replacement implicitly.

### Completion criteria

- All six plan operations use the kernel and owner RLS, and cross-session
  tests prove leases/schedules rather than merely exercising private helpers.
- Stop for the independent Batch A audit. Do not start trivia RPCs yet.

## 13. Checkpoint 5.5 — Trivia RPC composition

### Objective

Expose the five trivia operations by composing Phase 4 private primitives with
authorization, ledger, rate limits, safe errors, and full RPC-path races.

### Work

1. `trivia_find_similar_facts`: project Phase 4 candidates bounded to the
   owner workspace; it returns candidates/signals only and never auto-merges.
2. `trivia_register_and_reserve_facts`: validate every candidate against the
   versioned trivia contract, register canonical facts only after deterministic
   dedup decision, then reserve the full ordered set all-or-nothing. Hash
   collision, review-required structured collision, source/freshness failure,
   and reuse block remain distinct safe errors.
3. `trivia_release_facts`: release only junctions still owned by the matching
   token/context; repeat release is safe and cannot affect allocated/published
   facts.
4. `trivia_reverify_fact`: update evidence/freshness only when canonical
   identity is unchanged and expected fact timestamp matches.
5. `trivia_correct_fact`: atomically validate correction/invalidation/successor
   lineage. It must preserve published snapshots and apply the accepted impact
   behavior to mutable draft/ready state without rewriting historical meaning.

### Required tests

- Owner/non-owner, exact replay/key mismatch, and no caller access to private
  reservation/candidate helpers.
- Ten concurrent public reservation calls yield one owner per fact; a failed
  set yields no partially reserved set.
- Expiry, release/release replay, config/reuse-context change, reuse scopes,
  source/freshness, hash collision, and structured review-required paths.
- Reverify CAS and correction/invalidation/successor race behavior, including
  no mutation of published fact snapshots.

### Completion criteria

- The five functions are the only trivia additions to `api`; no model/research
  decision is encoded as an automatic duplicate merge.

## 14. Checkpoint 5.6 — Draft save, revision, renderer, and schedule

### Objective

Implement the three draft-editing operations with atomic fact allocation,
authoritative rendering/quality evidence, revision CAS, plan completion, and
schedule integrity.

### Work

1. Implement server-side trivia renderer v1 and canonical content hash exactly
   as frozen. Normalize text before comparison; reject supplied `canva_copy`
   that differs from rendered output. Validate format/topic/interaction goal,
   content/generation schemas, caption/hashtags, fact binding order, fact role,
   and all hard text/readability budgets.
2. `save_post` validates current Page config and reservation context, locks and
   converts only the exact reserved fact set to allocated `trivia_post_facts`,
   persists immutable usage snapshots, saves a draft, records system/editorial
   evidence, and completes a matching active plan item atomically when supplied.
   Without a plan item it validates the standalone schedule path. It never
   makes a post ready.
3. `revise_post` is a CAS operation on draft/ready only. It increments revision
   exactly once, invalidates ready approval, replaces allocations only with a
   matching fresh reservation, releases superseded allocations safely, and
   leaves posted/archived immutable.
4. `reschedule_post` changes only schedule and related linked-plan slot when
   the frozen contract permits it. Acquire old/new advisory locks in numeric
   order, recheck both tables, and increment revision without changing content
   hash.
5. System checks are server-written versioned evidence. Drafts can persist
   quality failures but not integrity failures. Facts/junctions must be current,
   verified, fresh, source-sufficient, and reuse-valid at save/revise time.

### Required tests

- Save/revise positive, exact replay, key mismatch, transaction rollback, owner
  isolation, CAS conflict, stale config/reservation/claim, and wrong fact set.
- Renderer equality, NFC/whitespace/control character handling, hash binding,
  character/word/line/replay budget, banned artifact/URL, caption/hashtag, and
  server-only system-check assertions.
- Save-from-plan completes exactly one matching active item; save without/missing
  claim cannot complete it. Reservation conversion, release after failed save,
  and current snapshot immutability are proven.
- Two revisions from one expected revision yield one winner; schedule conflict
  and two-slot opposite-direction move have one legal outcome without deadlock.

### Completion criteria

- `save_post`, `revise_post`, and `reschedule_post` expose no generic content
  mutation and make no Facebook/Canva/network call.

## 15. Checkpoint 5.7 — Approval and explicit publication lifecycle

### Objective

Implement remaining post transitions only as explicit, idempotent operations.

### Work

1. `approve_post` accepts only explicit approval, locks current draft, validates
   revision/hash/config/facts/source/freshness/reuse, recomputes all blocking
   system checks and content hash, validates current editorial evidence and
   permitted warning acceptance, writes an owner-derived approval snapshot, and
   transitions draft → ready with one revision increment.
2. `revoke_post_approval` accepts only explicit revocation and transitions
   ready → draft while invalidating approval without modifying public copy.
3. `discard_post` accepts only explicit discard for draft/ready, transitions it
   terminal, releases allocated facts atomically, and reports replacement
   eligibility without creating a replacement.
4. `mark_post_posted` accepts only explicit manual-publication confirmation;
   it does not call Facebook. It validates ready approval hash/revision and
   publication fields, transitions ready → posted, and changes allocations to
   permanent published usage atomically.
5. `archive_post` accepts only explicit archive and transitions posted →
   archived while retaining schedules, metrics, approval, and snapshots.

### Required tests

- Missing confirmation constants, wrong state, stale revision/hash, invalid
  approval evidence, failed/needs-review blocking criteria, and unauthorized
  caller are denied without mutation.
- Warning acceptance only accepts allowlisted noncritical IDs and an appropriate
  reason; no waiver exists for integrity, safety, source, or hard readability.
- Ready revision/revocation invalidates approval; target-state repeat with a
  new key is an invalid transition, while same-key replay is safe.
- Correction/reverify versus approval/publish race is serialized and produces
  only a contractually valid state; published snapshots never change.
- Discard releases only allocations, publish makes usage permanent, archive
  preserves history, and none of the lifecycle operations contacts Facebook.

### Completion criteria

- The five lifecycle functions are explicit and individually allowlisted. No
  generic status RPC, auto-approval, implicit publish, or hard delete exists.

## 16. Checkpoint 5.8 — Performance snapshots and insight completion

### Objective

Complete the metrics write path and finish behavioral coverage of metrics reads.

### Work

1. Implement `record_post_performance` for owner-provided observations of only
   posted/archived posts. It appends a new immutable cumulative snapshot; it
   never fetches Facebook analytics or overwrites prior snapshots.
2. Validate captured/source timestamps, IANA timezone when supplied, source
   schema/version, at least one metric, nonnegative finite numeric values, and
   `likes <= reactions` when both are present. Preserve null as unknown, not
   zero. Use the operation ledger/replay path.
3. Finalize `get_post_performance` and `get_performance_insights` against real
   snapshot history: use compatible latest/adjacent deltas, include definition
   version, sample/period/exclusions/caveats, and return `insufficient` where
   evidence is inadequate. Never infer causality.

### Required tests

- Owner/non-owner, not-yet-posted rejection, input validation, metric-source
  shape, replay/key mismatch, snapshot immutability, and no summation of
  cumulative values.
- History pagination/delta compatibility and insight grouping with sample-size
  threshold, missing-data exclusions, and safe insufficient result.
- Rate limit and response minimization on write/read/expensive-read paths.

### Completion criteria

- All 33 entry points exist exactly once, with inventory names and rate groups.
- No post/fact/metrics data is exposed through direct caller table grants.

## 17. Checkpoint 5.9 — Final clean-room acceptance

### Objective

Prove the complete Phase 5 public-RPC surface is reproducible, secure, and
correct before independent final audit.

### Clean resets and migration proof

1. Run two independent clean local resets from source migrations. Do not reuse
   a manually patched database.
2. After each reset, verify migration history/order, expected schemas/roles,
   33-function allowlist, function ownership/security settings, RLS, policies,
   grants/default privileges, and no caller-executable internal helper.
3. Confirm no unplanned Phase 6 object exists: no Edge function implementation,
   MCP handler, tool registry, HTTP health handler, OAuth middleware, plugin,
   remote resource, secret, or production fixture.

### Required behavioral audit

- All 33 owner operations have a success path; all writes have exact replay and
  reused-key mismatch coverage.
- No-token/request-context-missing, non-owner, caller direct-table, internal
  schema/helper, and unauthorized function access are denied.
- Ten-way reservation, duplicate operation-key replay, two-way post revision,
  plan claim/reclaim, cancel-versus-save, schedule collision/reschedule, and
  correction-versus-approval/publish races complete with one legal outcome.
- Save/revise/approve/revoke/discard/posted/archive state machine, fact
  allocation/release/publish, quality hash/evidence, and metrics semantics are
  proven through `api`, not only private helpers.
- Representative simple reads target p95 ≤2 seconds; candidate search and
  reservation/simple write target p95 ≤3 seconds in the local performance
  harness. Any query-plan change requires `EXPLAIN (ANALYZE, BUFFERS)` evidence
  with normal planner settings, never `enable_seqscan` override.

### Required commands

Run and report, at minimum:

```text
pnpm run supabase:reset          # twice, independently
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
git diff --check
```

Use CLI help before an unfamiliar Supabase invocation. If a local stack fails
intermittently, diagnose and document the cause; do not mark the reset gate as
passed merely because a pre-existing database happened to work.

### Final report contents

- Baseline commit and final migration count/list.
- Exact 33-RPC inventory and checkpoint mapping.
- Function ownership, `SECURITY DEFINER`/invoker inventory, search path,
  RLS/grant/default-privilege catalog evidence, and direct-access denial.
- Test inventory/results, replay/race/performance evidence, and Security
  Advisor result.
- Every accepted/proposed change record relevant to Phase 5.
- Explicit confirmation that there was no remote action, secret, production
  data, Phase 6 object, commit, or push.

Stop after producing this report. Do not self-approve the final audit, commit,
or begin Phase 6.

## 18. Phase-wide acceptance checklist

### Security and surface

- [ ] Exactly 33 `api` functions and no generic executor/status mutation.
- [ ] `authenticated` has `USAGE` on `api` and `EXECUTE` only on those 33.
- [ ] `anon` and `PUBLIC` cannot execute business API functions; authenticated
      may execute only the explicit 33-function allowlist, and executes no
      `internal` helper.
- [ ] No caller direct table/sequence privilege on business or internal data.
- [ ] Every business table remains RLS-enabled; policies include ownership
      predicates for the API owner role as well as any caller role.
- [ ] `content_producer_api_owner` is `NOLOGIN`, no `BYPASSRLS`, no table-owner
      shortcut, and minimum privilege only.
- [ ] Every privileged entry point has `search_path = ''`, qualified names, and
      validated auth/owner/OAuth-client context.

### Atomicity and concurrency

- [ ] Every write has ledger claim, canonical hash, replay snapshot, rollback,
      and rate-limit coverage.
- [ ] Timeouts map safely to retryable `DATABASE_BUSY`.
- [ ] Claim, reservation, revision, schedule, cancellation, correction, and
      lifecycle races are tested through API entry points.
- [ ] Revision increments exactly once per successful logical mutation and not
      on replay.

### Domain behavior

- [ ] Page/config CAS and plan creation preserve slot integrity.
- [ ] Lease renewal/reclaim/retry/replacement/cancel obey terminal semantics.
- [ ] Trivia reservation/reuse/source/freshness/correction behavior composes
      Phase 4 primitives without broadening their access.
- [ ] Save/revise owns renderer/hash/system checks; facts/junction snapshots,
      reservation conversion, plan completion, and rollback are atomic.
- [ ] Approval has explicit owner intent; publish is a manual record only;
      archive/history/metrics remain immutable where required.
- [ ] Metrics are append-only cumulative observations; insights are cautious.

### Reproducibility and scope

- [ ] Two clean resets and all required commands pass.
- [ ] Security Advisor has no error-level issue.
- [ ] No secret, remote resource, production data, Phase 6 code, or unrelated
      file change exists.
- [ ] Working tree is left for independent audit; commit occurs only after user
      authorization and a clean final audit.

## 19. Risks and controls

| Risk | Required control |
|---|---|
| SECURITY DEFINER bypasses tenant boundary | Narrow no-bypass owner role, policy predicate with `auth.uid()`, caller-context tests, no table-owner shortcut |
| Function becomes publicly executable | Explicit revoke then per-function grant; catalog assertion including `PUBLIC` |
| Same operation is applied twice | Canonical request hash + ledger unique key + replay snapshot/race test |
| Broad error leaks database detail | Central safe domain mapping; response/error regression tests |
| Direct Data API bypasses RPC | Object privilege revokes plus RLS plus authenticated/non-owner direct-query tests |
| Race creates duplicate schedule/reservation | Deterministic advisory/row locks, post-lock rechecks, separate-session tests |
| Stale copy is approved/published | Revision + content hash CAS; recompute checks after locks; immutable snapshots |
| Quality test masks integrity defect | Draft may retain quality failure only; integrity failures roll back completely |
| Metrics imply false performance claim | Append-only observations, compatible deltas, sample/period/exclusion/caveat output |
| Phase 6 scope leaks early | Catalog/static checks forbid handler/tool/secret/remote artifacts |

## 20. Rollback and recovery

This is local implementation. When a checkpoint fails, repair it with an
additive migration and a regression test, then reset from source. Do not loosen
RLS/grants, disable a timeout, modify prior migrations, delete audit rows, or
patch a test expectation to conceal the defect. If the defect changes a frozen
contract, stop for a Proposed change record.

## 21. Checkpoint report template

Every checkpoint report must include:

1. Checkpoint and batch status; explicit statement that later checkpoints and
   Phase 6 were not started.
2. Files/migrations added or changed, with purpose.
3. Allowlist delta and current public-RPC count.
4. Contract decisions/change records, including any blocker.
5. Security delta: role/function owner, RLS/policies, grants/revokes, and
   caller/private-helper boundary.
6. Functional, replay, concurrency, and negative cases tested.
7. Commands run and exact pass/fail status.
8. Scope confirmation: no remote action, secret, production seed, commit, or
   push.
9. The precise next allowed command, for example `Lanjutkan 5.3`.

## 22. User command sequence

```text
Lanjutkan 5.1
Lanjutkan 5.2
Lanjutkan 5.3
Lanjutkan 5.4
```

Stop for the independent Batch A audit. Only after that audit is accepted:

```text
Lanjutkan 5.5
Lanjutkan 5.6
Lanjutkan 5.7
Lanjutkan 5.8
Lanjutkan 5.9
```

Stop for independent final Phase 5 audit. Only after the audit passes and the
user explicitly authorizes it may Phase 5 be committed. Phase 6 starts only
from that clean, audited commit.

## 23. Phase 5 exit and Phase 6 entry

Phase 5 is ready for Phase 6 only when the final audit accepts every item in
section 18, the user has authorized the Phase 5 commit, and `git status
--short` is empty after the commit. Phase 6 consumes the 33 existing `api` RPCs
as a thin MCP facade; it must not reimplement business SQL or use direct table
access.
