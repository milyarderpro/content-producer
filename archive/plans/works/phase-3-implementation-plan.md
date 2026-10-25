# Phase 3 — Core Database Implementation Plan

> Historical execution plan. Phase 3 was committed at `1e3bd9c`. Status and
> stop instructions below reflect the checkpoint when this plan was written;
> see [the current phase tracker](../implementation-plan.md#16-phase-tracker).

Status: Final acceptance verified locally; ready for Phase 4 planning
Execution model: One checkpoint at a time through an AI agent
Target environment: Local Supabase only
Production impact: None
Commit policy: No commit or push until the full Phase 3 audit is complete

## 1. Purpose

This document is the execution plan for Phase 3 of Content Producer. It turns
the frozen Phase 0 database contract into an ordered series of implementation
checkpoints that can be run safely by an AI agent.

Phase 3 builds the generic core database required by every future niche. It
does not implement trivia facts, public business RPCs, the MCP transport, or
any external integration.

The expected result is a reproducible local database containing:

- Eight core tables in `public`.
- Two operational tables in `internal`.
- Versioned JSON validators.
- Structural lifecycle and tenant-isolation constraints.
- Indexes that support the documented access patterns.
- Private primitives for operation idempotency and schedule coordination.
- Database tests proving every Phase 3 invariant.

## 2. Sources of truth

Implementation must follow these documents in descending order of authority:

1. `AGENTS.md`.
2. Frozen Phase 0 documents under `plans/`.
3. Accepted change records under `docs/decisions/`.
4. This execution plan.
5. Existing implementation and tests.

The main Phase 3 contracts are:

- `plans/implementation-plan.md`, section **Phase 3 — Core database**.
- `plans/database-design.md`, especially sections 5–7, 9–10, 16–20, and 25.
- `plans/tool-inventory.md` for the future public RPC boundary.
- `docs/decisions/2026-10-08-data-api-public-schema-platform-constraint.md`.
- `docs/runbooks/local-development.md`.

If this document conflicts with a frozen contract, the frozen contract wins.
If two frozen contracts cannot be reconciled, the agent must create a proposed
change record and stop before implementing the affected behavior.

## 3. Phase boundary

### 3.1 Included in Phase 3

- Generic workspace, Page, plan, post, metrics, and operational storage.
- Public IDs and internal identity keys.
- Workspace-scoped composite foreign keys.
- RLS enablement and explicit privilege revocation.
- Status, shape, and lifecycle-state constraints that can be enforced at the
  storage boundary.
- Versioned JSON validation functions.
- Private database helpers needed to prove Phase 3 invariants.
- A transaction-level advisory-lock primitive for Page schedule slots.
- An internal operation-ledger primitive that can distinguish first use,
  valid replay, and operation-key mismatch.
- Test fixtures and database tests.
- Seed of the generic `trivia` niche registry row.

### 3.2 Explicitly excluded

- `trivia_facts` and `trivia_post_facts`; these belong to Phase 4.
- The 33 caller-facing operations in schema `api`; these belong to Phase 5.
- Complete owner-scoped public RPC workflows.
- Full claim, retry, cancellation, revision, publish, and metrics RPCs.
- RLS policies intended to replace the reviewed RPC-only access model.
- MCP Edge Function implementation; this belongs to Phase 6.
- Plugin manifest and packaging completion; these belong to Phase 7.
- OpenAI APIs, embeddings, vector search, Facebook APIs, and Canva APIs.
- Remote Supabase linking, deployment, or production data.

### 3.3 Interpretation of the Phase 3/Phase 5 overlap

The frozen Phase 3 gate requires schedule-concurrency and operation-replay
semantics to be testable, while Phase 5 owns the public transactional RPCs
that use them. The implementation boundary is therefore:

- Phase 3 creates and tests private `internal` primitives.
- Phase 5 composes those primitives into authenticated `api` business RPCs.
- Phase 3 must not expose the primitives directly to `anon`, `authenticated`,
  `service_role`, or `PUBLIC`.
- Phase 3 tests the primitive behavior directly as the database owner.
- Phase 5 will test the complete caller-visible workflow and error mapping.

“Global operation key” means one operation-key namespace across all write
operations inside a workspace, enforced by
`unique (workspace_id, operation_key)`. It does not mean one namespace shared
by unrelated workspaces.

## 4. Execution protocol for the AI agent

The agent must follow these rules at every checkpoint:

1. Execute only the checkpoint explicitly requested by the user.
2. Read the relevant frozen-contract sections before editing.
3. Inspect `git status` and preserve unrelated changes.
4. Inspect Supabase CLI help before using an unfamiliar command.
5. Create each migration through the project-pinned Supabase CLI. Never invent
   a migration timestamp or filename.
6. Never rewrite, rename, reorder, or delete an existing migration.
7. Keep SQL domain logic in migrations and private database helpers, never in
   MCP handlers.
8. Keep all work local. Do not log in, link, push, deploy, or contact a hosted
   Supabase project.
9. Do not store or print secrets, access tokens, service-role keys, OAuth
   credentials, or database passwords.
10. Add focused tests in the same checkpoint as the invariant being added.
11. Run the checkpoint verification before reporting success.
12. Stop after the checkpoint report and wait for the next `Lanjutkan 3.x`.
13. Do not commit or push unless the user explicitly changes the commit policy.

When a checkpoint reveals a contract conflict, the agent must:

1. Stop the affected implementation.
2. Describe the exact conflicting clauses.
3. Create a proposed change record if a contract change is required.
4. Avoid marking the checkpoint complete.
5. Ask the user to approve or reject the change record.

## 5. Current baseline and assumptions

Phase 3 starts from the completed Phase 2 baseline:

- Node.js `24.15.x`.
- pnpm `10.33.2`.
- Supabase CLI `2.120.0`, invoked through pnpm.
- PostgreSQL major version 17 in local Supabase.
- `pgcrypto` and `pg_trgm` installed in `extensions`.
- Schemas `api` and `internal` exist.
- `api` is the only configured business RPC schema.
- `public` is a platform schema but direct business-object grants are denied.
- `internal` is not exposed and has no caller schema usage.
- Default table, sequence, and function privileges have been revoked.
- The MCP Edge Function remains disabled.
- No business table or public business RPC exists.

Before modifying Phase 3, the agent must verify that the baseline has not
regressed.

## 6. Target object inventory

### 6.1 Core tables in `public`

| Table | Primary responsibility |
| --- | --- |
| `workspaces` | Tenant, owner, default locale, target markets, and core settings |
| `niches` | Versioned registry of supported niche modules |
| `pages` | Facebook Page identity and generic Page configuration |
| `page_niche_configs` | Versioned niche configuration for a Page |
| `content_plans` | Durable batch or calendar production intent |
| `content_plan_items` | Individual requested production slots and claim lease state |
| `posts` | Content output, quality state, approval, schedule, and publication state |
| `post_metrics` | Immutable time-series snapshots of manually supplied performance data |

### 6.2 Operational tables in `internal`

| Table | Primary responsibility |
| --- | --- |
| `operation_ledger` | Workspace-wide write idempotency and minimal replay snapshots |
| `rate_limit_buckets` | Atomic per-actor, client, group, and time-window counters |

### 6.3 Required helper categories

- JSON and version validators.
- `updated_at` maintenance.
- Operation-ledger claim/replay classification.
- Deterministic Page schedule advisory locking.
- Cross-table schedule availability validation.
- Post-state validation for metrics.
- Schema and invariant inspection queries used by tests.

Helper names and signatures must be descriptive, schema-qualified, stable,
and private. Their exact names may be selected during implementation as long
as they do not create a generic executor or caller-facing API.

## 7. Data-model conventions

### 7.1 Identity

- Business tables use `bigint generated always as identity` as internal keys.
- Externally visible objects use a separate UUID `public_id` generated with
  `gen_random_uuid()`.
- Random UUIDs are not used as clustered primary keys.
- `niches.key` is the stable text primary key defined by the frozen contract.

### 7.2 Tenant scope

- Every user-owned row carries `workspace_id`.
- Cross-table relationships include the workspace, Page, and niche scope where
  required by the frozen design.
- Foreign keys use `on delete restrict`, except
  `internal.rate_limit_buckets.actor_user_id` to `auth.users(id)`, which uses
  `on delete cascade` under accepted CR-002. This is the only Phase 3
  exception.
- No hard-delete cascade is introduced beyond the accepted CR-002 exception.
- Audit links to `internal.operation_ledger` use a composite
  `(workspace_id, created_by_operation_id)` foreign key.

### 7.3 Time and mutable rows

- All timestamps use `timestamptz`.
- All mutable tables carry `created_at` and `updated_at`.
- `scheduled_at` is an absolute timestamp.
- `captured_at` records when metrics were observed.
- The shared update trigger changes `updated_at` only on actual row updates.

### 7.4 Status and JSON

- Statuses use `text` plus explicit allowlist checks.
- JSONB is limited to versioned configuration, content, checks, snapshots, and
  additional metrics.
- Every JSON field has a top-level shape check.
- Strict validators reject unknown keys where the frozen schema requires it.
- Validators are version-aware and fail closed on unsupported versions.

### 7.5 Security

- RLS is enabled on every new table, including tables in `internal`.
- Phase 3 adds no permissive caller policy.
- Direct table and sequence privileges remain revoked from `anon`,
  `authenticated`, and `service_role`.
- Helper-function execution remains revoked from caller roles and `PUBLIC`.
- Any function needing elevated privileges must be justified explicitly, use a
  fixed safe `search_path`, and remain in an unexposed schema.

## 8. Migration strategy

Phase 3 contains six official migration groups. The checkpoint numbering has
an additional preflight and final acceptance step, but it does not alter the
migration groups in the frozen implementation plan.

| Migration group | Checkpoint | CLI migration description |
| --- | --- | --- |
| 1 | 3.2 | Workspace and niche registry |
| 2 | 3.3 | Operation ledger and rate-limit buckets |
| 3 | 3.4 | Pages and Page niche configs |
| 4 | 3.5 | Content plans and plan items |
| 5 | 3.6 | Posts and post metrics |
| 6 | 3.7 | Core indexes, validators, triggers, and private helpers |

The descriptions above are semantic names, not filenames. The agent must run
the CLI migration creation command and use the generated filename.

Each migration must:

- Be forward-only.
- Be deterministic on a clean local reset.
- Avoid environment-specific values and credentials.
- Schema-qualify tables, functions, extensions, and operator classes.
- Use explicit constraint and index names.
- Include explicit RLS and privilege statements for new objects.
- Avoid broad grants.
- Avoid `security definer` unless the frozen design cannot otherwise be
  implemented safely.

If a completed checkpoint requires correction later, add a new corrective
migration. Do not edit the earlier migration.

## 9. Checkpoint 3.1 — Preflight and contract mapping

### Objective

Confirm the Phase 2 foundation, resolve the Phase 3/Phase 5 boundary, and
produce an executable mapping before schema work starts.

### Work

1. Inspect repository status and recent commits.
2. Verify the pinned runtime and CLI versions.
3. Inspect CLI help for migration creation, local reset, local query, migration
   listing, and advisors.
4. Confirm the local Supabase stack can start or is already healthy.
5. Run the Phase 2 baseline tests.
6. Map every Phase 3 table, constraint, index, validator, helper, and test to a
   migration group and checkpoint.
7. Confirm the following boundary decisions:
   - Operation replay is a private primitive in Phase 3 and public workflow in
     Phase 5.
   - Schedule locking is a private primitive in Phase 3 and mandatory public
     workflow composition in Phase 5.
   - No caller-facing `api` function is created.
   - No trivia fact table is created.
8. Inspect current Supabase breaking changes relevant to Data API exposure,
   PostgreSQL versions, extensions, grants, functions, and RLS.
9. Create a proposed change record only if an actual frozen-contract conflict
   remains.

### Files

No migration or schema file should change at this checkpoint. A concise local
execution matrix may be added under `plans/works/` only if it provides detail
not already present in this document.

### Verification

- `pnpm run check`
- `pnpm run test-all`
- `pnpm run verify-migrations`
- `pnpm run smoke-test`
- `pnpm run supabase:verify`

### Completion criteria

- Phase 2 remains green.
- The local database is the only target.
- No unresolved contract conflict remains.
- No Phase 3 migration has been created.

## 10. Checkpoint 3.2 — Workspace and niche registry

### Objective

Implement migration group 1 and establish the tenant and module roots for all
later core tables.

### Schema work

Create `public.workspaces` with the frozen columns and invariants, including:

- Internal identity primary key and unique public UUID.
- Owner FK to `auth.users(id)` with restricted deletion.
- Unique stable slug.
- MVP language `en` and locale `en-US`.
- Target markets limited to `US`, `GB`, `CA`, and `AU`.
- Versioned settings object.
- Active flag and timestamps.
- At most one active workspace per owner.
- Composite key required by later scoped foreign keys.

Create `public.niches` with:

- Stable text key.
- Display name.
- Status allowlist: `development`, `active`, or `disabled`.
- Positive module, config-schema, and content-schema versions.
- Timestamps.

Insert the `trivia` registry row as active version 1 in a deterministic,
source-controlled manner. The registry row belongs to this migration group;
it must not be delayed until the trivia fact module.

Enable RLS and explicitly revoke table and sequence access from caller roles.
Do not create caller policies.

### Tests

Add tests covering at least:

- Public-ID uniqueness.
- Workspace slug uniqueness.
- One active workspace per owner.
- Owner deletion restriction.
- Language and locale allowlists.
- Market allowlist and required array shape.
- Settings top-level object shape.
- Niche status and version constraints.
- Presence and exact version of the `trivia` registry row.
- RLS enabled and caller table privileges absent.

Advanced workspace-settings validation may be attached in checkpoint 3.7,
but the table must already reject obviously invalid structural shapes.

### Completion criteria

- Migration group 1 replays on a clean local reset.
- Only `workspaces` and `niches` have been added.
- Focused tests pass.
- All Phase 2 tests still pass.

## 11. Checkpoint 3.3 — Operation ledger and rate-limit buckets

### Objective

Implement migration group 2 without exposing any operational object.

### Schema work

Create `internal.operation_ledger` with:

- Identity primary key.
- Workspace and actor identity.
- UUID v4 operation key.
- Versioned operation name and request-schema version.
- Lowercase SHA-256 request hash.
- Optional minimal response snapshot.
- Optional safe target type and public ID.
- Creation and completion timestamps.
- Unique `(workspace_id, operation_key)`.
- Composite `(workspace_id, id)` uniqueness for audit foreign keys.
- Shape constraints for incomplete and completed records.

Create `internal.rate_limit_buckets` using the frozen key:

- `actor_user_id`.
- `oauth_client_id`.
- `limit_group`.
- One-minute UTC `window_start`.
- Non-negative counter and required timestamps as defined by the database
  design.

Add indexes for operation lookup, target lookup, created time, and rate-limit
bucket identity. Enable RLS and revoke every caller privilege.

The replay-classification helper is deferred to checkpoint 3.7 so that shared
helper and privilege rules are implemented together.

### Tests

Add tests covering at least:

- Duplicate operation key rejected within the same workspace.
- The same operation UUID allowed in different workspaces.
- Invalid operation key version or hash rejected.
- Invalid response-snapshot shape rejected.
- Rate-limit bucket identity uniqueness.
- Negative counters rejected.
- Deleting an Auth user removes only that user's rate-limit buckets through
  the accepted `on delete cascade` exception.
- Business and operation-ledger audit foreign keys retain `on delete restrict`.
- RLS enabled and `internal` inaccessible to all caller roles.

### Completion criteria

- Migration group 2 replays from zero.
- Both internal operational tables exist.
- Neither table is visible through the configured Data API surface.
- No public RPC or rate-limiting behavior has been introduced.

## 12. Checkpoint 3.4 — Pages and Page niche configs

### Objective

Implement migration group 3 and enforce Page ownership and niche
configuration scope.

### Schema work

Create `public.pages` with:

- Internal and public IDs.
- Workspace ownership.
- Workspace-scoped slug.
- `facebook` as the only MVP platform.
- MVP language and locale.
- IANA timezone field.
- Normalized target markets.
- Optional default niche key.
- Generic platform config object.
- Active flag and timestamps.
- Composite `(workspace_id, id)` key for scoped relationships.

Create `public.page_niche_configs` with:

- Internal and public IDs.
- Workspace, Page, and niche identity.
- Config schema version and config snapshot.
- Enabled and default flags.
- Timestamps.
- Unique Page+niche pair.
- Composite workspace+Page+niche key.
- Scoped Page foreign key and niche-registry foreign key.
- Partial uniqueness for one enabled default config per Page.

Advanced IANA timezone, default-niche, and trivia-config validation is attached
in checkpoint 3.7. Base table constraints must still enforce types, non-empty
identifiers, supported MVP values, and JSON object shapes.

### Tests

Add tests covering at least:

- Duplicate Page slug rejected only inside the same workspace.
- Page cannot reference a nonexistent workspace.
- Page config cannot combine a workspace with another workspace's Page.
- Unknown niche rejected.
- Duplicate Page+niche config rejected.
- More than one enabled default config on one Page rejected.
- Separate Pages may each have their own default config.
- Invalid platform, locale, language, and JSON top-level shape rejected.
- RLS enabled and direct caller privileges absent.

### Completion criteria

- Migration group 3 replays from zero.
- Page ownership cannot cross workspace boundaries.
- No trivia fact storage or public Page-management RPC exists.

## 13. Checkpoint 3.5 — Content plans and plan items

### Objective

Implement migration group 4 so the database can persist a complete production
plan before any post exists.

### Schema work

Create `public.content_plans` with:

- Internal and public IDs.
- Scoped workspace, Page, and niche identity.
- Optional workspace-scoped operation-ledger audit link.
- Name, requested count, schema version, and plan config.
- Plan status allowlist.
- Started, completed, cancelled, created, and updated timestamps.
- Scoped key for plan-item foreign keys.

Create `public.content_plan_items` with:

- Internal and public IDs.
- Scoped plan, workspace, Page, and niche identity.
- Position and optional schedule.
- Optional topic, format, and interaction-goal intent.
- Item config and attempt count.
- Claim token, claim start, claim expiry, and renewal count.
- Safe failure metadata and explicit replacement reason.
- Lifecycle timestamps.
- Scoped operation-ledger audit link.
- Unique position inside a plan.
- Partial unique Page schedule for non-cancelled items.
- Claim-shape constraint.

Add indexes for plan status, item queue order, claim expiry, and scheduled work.
Index the referencing side of every foreign key unless an existing composite
index already provides the needed leftmost prefix.

Do not implement claim, renewal, retry, cancel, or replacement RPCs.

### Tests

Add tests covering at least:

- A plan can contain all requested items before any post exists.
- Requested count and position bounds.
- Duplicate plan position rejected.
- Plan item scope must match its plan's workspace, Page, and niche.
- Audit link to a ledger row from another workspace rejected.
- Duplicate active Page schedule among plan items rejected.
- Cancelled item no longer blocks its slot according to the frozen rule.
- Non-negative attempt count.
- Renewal count limited to zero or one.
- All claim fields are required for `in_progress`.
- Claim fields are cleared for non-`in_progress` states.
- Claim expiry is later than claim start.
- Status and interaction-goal allowlists.
- RLS and caller privilege boundary.

### Completion criteria

- Migration group 4 replays from zero.
- Plan items work without posts.
- Claim lease shape is enforced structurally.
- No Phase 5 workflow RPC has been created.

## 14. Checkpoint 3.6 — Posts and post metrics

### Objective

Implement migration group 5 and complete the eight core-table inventory.

### Schema work

Create `public.posts` with:

- Internal and public IDs.
- Scoped workspace, Page, niche, and optional plan-item identity.
- Optional workspace-scoped operation-ledger audit link.
- Format, topic, and interaction goal.
- Content schema version and lifecycle status.
- Content payload and generation snapshot.
- System and editorial checks.
- Optional approval snapshot.
- Lowercase SHA-256 content hash.
- Quality status.
- Schedule and publication fields.
- Ready, discarded, archived, created, and updated timestamps.
- Revision starting at one.
- Composite scoped keys required by later niche junctions.

Add post constraints and indexes for:

- Status, quality, and required lifecycle timestamp shapes.
- Approval snapshot required for ready, posted, and archived states.
- Published timestamp required for posted and archived states.
- Discarded posts not carrying a published timestamp.
- HTTPS published URLs.
- One active post per plan item.
- One active Page schedule within the posts table.
- Unique platform post identity within a Page.
- Page/status recency, Page/niche/format, Page/niche/topic, plan item,
  publication, and content hash access patterns.

Create `public.post_metrics` with:

- Internal and public IDs.
- Scoped workspace, Page, and post identity.
- Optional workspace-scoped operation-ledger audit link.
- Observation timestamp.
- Known engagement and watch-time metrics.
- Additional metrics payload object.
- Immutable creation timestamp.
- Unique post+capture-time identity.
- Non-negative numeric constraints.
- At least one known metric or one additional payload key.

The cross-row check that metrics belong only to posted or archived posts is
attached as a private validator in checkpoint 3.7.

### Tests

Add tests covering at least:

- Post scope must match Page, niche config, and plan item.
- Audit link cannot cross workspace boundaries.
- Content hash must be 64 lowercase hexadecimal characters.
- Revision starts at one and cannot be below one.
- JSON fields require the documented top-level shapes.
- Ready/posted/archived shape requirements.
- Discarded and archived timestamp requirements.
- Published URL must use HTTPS.
- One non-discarded post per plan item.
- Per-table active schedule uniqueness.
- Platform post identity uniqueness per Page.
- Negative metrics rejected.
- Empty metric snapshot rejected.
- Duplicate post+captured timestamp rejected.
- RLS and privilege boundary.

### Completion criteria

- Migration group 5 replays from zero.
- Exactly eight Phase 3 core tables and two internal operational tables exist.
- The base post, approval, content-hash, and metric shapes are enforced.
- No niche fact tables or lifecycle RPCs exist.

## 15. Checkpoint 3.7 — Validators, private primitives, and final indexes

### Objective

Implement migration group 6, attach all cross-cutting validation, and prove the
Phase 3 concurrency and replay semantics without exposing business RPCs.

### 15.1 Versioned validators

Implement strict validators for:

1. Workspace settings version 1:
   - Exact known keys.
   - Supported schema version.
   - Reservation TTL from 5 through 120 minutes.
   - Default plan chunk size from 1 through 5.
   - Supported default post status.
2. Trivia Page config version 1:
   - Format and topic allowlists.
   - Format weights totaling 100.
   - Topic-group weights totaling 100.
   - Fixed or adaptive fact-count rules.
   - Complete positive text budgets within MVP ceilings.
   - Facts budget no larger than total Canva budget.
   - Supported reuse scope, render style, interaction goals, and profiles.
   - `en-US`, no regional slang, and the frozen style flags.
   - Unknown keys rejected.
3. Plan config:
   - Supported schema version.
   - Valid date/schedule intent.
   - Positive requested chunk size within the workspace limit.
   - Requested format/topic/goal values consistent with the config snapshot.
4. Post payload envelope:
   - Supported content schema version.
   - Required object/array shapes.
   - Stable separation between generic envelope and future niche validation.
5. System and editorial checks:
   - Supported version and known statuses.
   - Content-hash binding where required by the frozen quality contract.
6. Metrics payload:
   - Object shape.
   - Known version if a version field is present.
   - Non-negative supported additional numeric values.

Validators must be immutable or stable only when their implementation truly
meets PostgreSQL's volatility rules. They must fail closed and return a
deterministic result for a deterministic input.

Attach validators using checks or private validation triggers as appropriate.
Do not use a `CHECK` constraint for cross-row queries.

### 15.2 Generic triggers

Implement and attach:

- A shared `updated_at` trigger for mutable core tables.
- A post-metrics validator that rejects metrics unless the referenced post is
  `posted` or `archived`.
- Any narrowly scoped validator required for a cross-row invariant that cannot
  be expressed safely as a check constraint.

Triggers must not silently implement Phase 5 state transitions.

### 15.3 Operation-ledger primitive

Implement a private helper that classifies an operation claim as:

- First use: create an incomplete ledger row and return its internal identity.
- Valid replay: the workspace, operation key, operation name, schema version,
  and request hash match; return the stored minimal response when completed.
- In-progress duplicate: classify deterministically without duplicating the
  business mutation.
- Key reuse mismatch: the name, schema version, or hash differs; signal the
  frozen `OPERATION_KEY_REUSED` domain condition.

The helper does not canonicalize arbitrary business payloads and does not
perform a business mutation. Phase 5 remains responsible for validating and
normalizing each request, producing its semantic hash, running the mutation,
and mapping internal errors to the public contract.

### 15.4 Schedule-lock primitive

Implement a private helper that:

1. Derives a deterministic advisory-lock key from Page identity and absolute
   `scheduled_at`.
2. Takes a transaction-level advisory lock.
3. Checks active slots in both `content_plan_items` and `posts`.
4. Excludes the current row when used for a move/update operation.
5. Returns availability or signals the frozen schedule-conflict condition.

Every test and future RPC must acquire locks in the documented global order.
The advisory lock coordinates the cross-table race; partial unique indexes
remain the local defense inside each table.

Direct database-owner writes can bypass a helper by design. Caller roles have
no table privileges, and Phase 5 RPCs must be the only supported write path.

### 15.5 Index completion

Audit every foreign key and query path. Add missing indexes where the
referencing columns are not already a useful leftmost prefix of a composite
index.

Confirm at least these documented access patterns:

- Workspace and active-owner lookup.
- Page by workspace, slug, and active state.
- Config by Page+niche and default Page config.
- Plan by Page, status, and recency.
- Plan item by plan, status, position, schedule, and claim expiry.
- Post by Page, status, recency, niche, format, topic, schedule, publication,
  plan item, and content hash.
- Metrics by post and Page in descending capture order.
- Ledger by operation key, target, and creation time.
- Rate-limit bucket identity.

Use composite indexes for equality-plus-range access and partial indexes for
active lifecycle subsets. Avoid redundant indexes that duplicate a unique
constraint or a stronger leftmost-prefix index.

### 15.6 Tests

Add tests covering at least:

- Valid and invalid workspace settings.
- Valid frozen trivia config v1 and one failing case per validator family.
- Unknown config keys and unsupported versions rejected.
- Valid and invalid plan config.
- Valid and invalid post envelope/check snapshots.
- Metrics payload validation.
- `updated_at` behavior.
- Metrics rejected for draft, ready, or discarded posts.
- Metrics accepted for posted and archived posts.
- First operation claim.
- Same-key, same-operation, same-hash replay.
- Same-key mismatch rejected as `OPERATION_KEY_REUSED`.
- No duplicate mutation marker under replay.
- Parallel Page+slot requests yield one winner.
- Cross-table collision between plan item and post is detected.
- Different Pages or different timestamps do not contend incorrectly.
- Caller roles cannot execute private helpers.
- All required indexes are present and no foreign key lacks useful index
  coverage.

Concurrency tests must use separate database sessions or connections. A
single-session sequential test is not proof of race prevention.

### Completion criteria

- Migration group 6 replays from zero.
- All Phase 3 validators are attached and tested.
- Replay and payload-mismatch semantics pass at the private primitive level.
- Cross-table schedule contention is proven with real parallel sessions.
- No new function is executable by a caller role.
- No public `api` business operation exists.

## 16. Checkpoint 3.8 — Final acceptance and handoff

### Objective

Run a clean-room audit of Phase 3, fix only Phase 3 defects through additive
migrations, and produce the final report for an independent review.

### 16.1 Clean reset

1. Confirm the target is the local project.
2. Reset the local database from zero.
3. Confirm all migrations apply in order.
4. Confirm the source-controlled registry seed is present exactly once.
5. Reset a second time to prove reproducibility.

### 16.2 Catalog inspection

Inspect and assert:

- Exactly eight required core tables exist.
- Exactly two required internal operational tables exist.
- Every primary, foreign, unique, and check constraint is present.
- Composite foreign keys enforce workspace, Page, and niche scope.
- Every documented partial and composite index exists.
- Every foreign key has useful index coverage.
- RLS is enabled on every Phase 3 table.
- Caller roles have no direct table or sequence privileges.
- Caller roles and `PUBLIC` cannot execute private helpers.
- `internal` remains absent from the Data API profile.
- No public business RPC exists in `api`.

### 16.3 Behavioral gate

The final suite must prove:

- Cross-workspace writes are rejected.
- Cross-workspace operation-ledger audit links are rejected.
- A plan can persist items before a post exists.
- Duplicate active Page schedules are rejected within each table.
- Parallel cross-table Page schedule creation produces one winner.
- Metrics are accepted only for posted or archived posts.
- Operation keys are unique across write-operation names within a workspace.
- Valid replay returns the same minimal result without duplicate mutation.
- Payload or operation mismatch is rejected.
- Claim lease shape is valid.
- Approval and content-hash shape is valid.
- JSON validators accept the canonical version-1 examples and reject invalid
  boundary cases.

### 16.4 Required verification

Run, at minimum:

```sh
pnpm run supabase:reset
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
git diff --check
```

Before invoking an unfamiliar variation of any Supabase command, inspect its
current `--help` output.

If the local test suite writes temporary probe objects or rows, it must clean
them in `finally` blocks or transaction rollbacks.

### 16.5 Documentation update

Update only implementation-status and local-development guidance that became
factually outdated. Do not silently change frozen schema, tool, or editorial
contracts.

The documentation must state clearly:

- Phase 3 is local-only.
- Core tables are not a direct Data API surface.
- Phase 5 will add the reviewed public RPC allowlist.
- Phase 4 owns trivia fact storage and deduplication.
- No hosted project or secret was used.

### 16.6 Final report

The agent must report:

- All changed and added files.
- Every generated migration filename and its migration group.
- Final table, function, trigger, and index inventory.
- Test commands and results.
- Security advisor result.
- Any accepted change record used.
- Any intentionally deferred Phase 4 or Phase 5 work.
- Confirmation that no remote project, deployment, secret, commit, or push was
  performed.

### Completion criteria

Phase 3 is complete only when every requirement in section 18 is checked and
the independent audit finds no unresolved Phase 3 defect.

## 17. Test organization

The exact file split may follow existing repository conventions. A recommended
structure is:

```text
supabase/tests/database/
  baseline.test.ts
  core-schema.test.ts
  core-invariants.test.ts
  core-validation.test.ts
  core-concurrency.test.ts
```

Test helpers may be introduced to avoid duplicating local CLI query parsing,
fixture creation, transaction cleanup, and catalog inspection. Shared helpers
must not hide assertion intent or log credentials.

Tests should use:

- Unique fixture identifiers per process/run.
- Deterministic timestamps when asserting collisions.
- Explicit workspace and actor fixtures.
- Cleanup through transaction rollback or `finally`.
- Separate connections for concurrency claims.
- Catalog queries for structural verification.
- Negative tests for every tenant boundary.

## 18. Acceptance checklist

### Schema inventory

- [ ] `public.workspaces` exists.
- [ ] `public.niches` exists.
- [ ] `public.pages` exists.
- [ ] `public.page_niche_configs` exists.
- [ ] `public.content_plans` exists.
- [ ] `public.content_plan_items` exists.
- [ ] `public.posts` exists.
- [ ] `public.post_metrics` exists.
- [ ] `internal.operation_ledger` exists.
- [ ] `internal.rate_limit_buckets` exists.
- [ ] `trivia_facts` and `trivia_post_facts` do not exist yet.

### Identity and isolation

- [ ] Required public UUIDs are unique.
- [ ] All user-owned rows carry `workspace_id`.
- [ ] Scoped relationships use composite foreign keys.
- [ ] Cross-workspace Page relationships fail.
- [ ] Cross-workspace plan relationships fail.
- [ ] Cross-workspace post relationships fail.
- [ ] Cross-workspace audit links fail.
- [ ] All business and audit foreign keys use `on delete restrict`; the sole
      exception is `internal.rate_limit_buckets.actor_user_id` to
      `auth.users(id)`, which uses `on delete cascade` under accepted CR-002.

### Lifecycle and shape

- [ ] All status allowlists match the frozen contract.
- [ ] Plan items can exist before posts.
- [ ] Claim lease fields satisfy the all-or-none rule.
- [ ] Claim expiry follows claim start.
- [ ] Claim renewal count is limited to one.
- [ ] Post revision is at least one.
- [ ] Content hash is lowercase SHA-256.
- [ ] Ready/posted/archived states require passed quality and approval shape.
- [ ] Posted/archived states require publication time.
- [ ] Discarded and archived timestamp shapes are enforced.
- [ ] Published URLs are HTTPS when present.
- [ ] Metrics are non-negative and non-empty.
- [ ] Metrics reference only posted or archived posts.

### Configuration validation

- [ ] Workspace settings v1 validator passes canonical settings.
- [ ] Workspace TTL and chunk boundaries are tested.
- [ ] Trivia Page config v1 passes the canonical example.
- [ ] Format and topic allowlists are enforced.
- [ ] Format and topic-group weights each total 100.
- [ ] Fact-count rules are enforced.
- [ ] Text budgets and hard ceilings are enforced.
- [ ] Unknown config keys are rejected.
- [ ] Plan config validation is versioned.
- [ ] Post payload envelope validation is versioned.
- [ ] System/editorial check validation is versioned.
- [ ] Metrics payload validation is versioned.

### Scheduling and idempotency

- [ ] Plan-item local schedule uniqueness passes.
- [ ] Post local schedule uniqueness passes.
- [ ] Cross-table schedule helper checks both tables.
- [ ] Parallel collision test produces one winner.
- [ ] Non-conflicting Page/time pairs proceed independently.
- [ ] Operation key is unique per workspace across all operation names.
- [ ] Same semantic operation can replay safely.
- [ ] Different name or request hash is rejected.
- [ ] No duplicate mutation marker is produced by replay.

### Indexes and performance

- [ ] Every foreign key has useful index coverage.
- [ ] Composite index column order matches equality/range access patterns.
- [ ] Partial indexes match active lifecycle predicates.
- [ ] No accidental redundant index remains.
- [ ] Critical representative queries have plausible local `EXPLAIN` plans.

### Security

- [ ] RLS is enabled on all ten Phase 3 tables.
- [ ] No direct table grants exist for caller roles.
- [ ] No sequence grants exist for caller roles.
- [ ] `internal` schema usage remains denied.
- [ ] Private helper execution remains denied to callers and `PUBLIC`.
- [ ] No public `api` business function exists.
- [ ] Security advisor reports no Phase 3 error.
- [ ] No secret or credential is added to source.

### Reproducibility and scope

- [ ] Clean local reset succeeds twice.
- [ ] Migration history is ordered and valid.
- [ ] All repository checks pass.
- [ ] No existing migration was rewritten.
- [ ] No Phase 4 table was introduced.
- [ ] No Phase 5 public workflow was introduced.
- [ ] No remote Supabase action occurred.
- [ ] No commit or push occurred during staged execution.

## 19. Risks and controls

| Risk | Control |
| --- | --- |
| Tenant relationship accidentally crosses workspaces | Composite unique keys, composite foreign keys, and negative tests |
| `public` table becomes reachable through Data API | Default privilege revokes, per-object revokes, RLS, profile probes, and advisor |
| Private function inherits default `PUBLIC EXECUTE` | Explicit function revoke plus catalog tests |
| Schedule race spans two tables | Deterministic transaction advisory lock, cross-table availability check, and parallel-session test |
| Per-table unique index is mistaken for cross-table protection | Document helper requirement and keep a dedicated cross-table concurrency test |
| Ledger helper expands into a premature generic business executor | Restrict helper to claim/replay classification; business payload handling remains Phase 5 |
| Validator silently accepts future schema | Reject unknown schema versions and unknown keys where specified |
| Missing FK index causes future lock/performance issues | Catalog audit plus representative query-plan inspection |
| Tests depend on persistent local rows | Unique fixtures plus rollback/finally cleanup |
| Migration correction rewrites history | Add a new migration; never edit a completed migration |
| Scope drifts into trivia or RPC implementation | Explicit non-goals and object inventory checks |

## 20. Rollback and recovery

Phase 3 targets local development only.

Normal rollback is:

1. Stop the affected checkpoint.
2. Preserve migration source for diagnosis.
3. Correct the issue with an additive migration when the earlier migration has
   already been shared or accepted.
4. Reset the local database.
5. Replay the complete migration chain and tests.

Do not:

- Delete migration files to hide failures.
- Rewrite the Phase 2 baseline migration.
- Run destructive Git commands.
- Reset or modify a linked/remote database.
- Push a broken schema to a hosted project.

Generated local database state can be recreated through the documented local
reset. Source migrations and tests are the durable implementation record.

## 21. Checkpoint report template

After each `Lanjutkan 3.x`, the agent must return this information:

```text
Status checkpoint:
- Complete / blocked / complete with notes

Files changed:
- ...

Migration generated:
- Filename generated by Supabase CLI
- Migration group and purpose

Implemented invariants:
- ...

Tests added or updated:
- ...

Verification executed:
- Command: result

Security and scope confirmation:
- No remote project touched
- No secret added
- No later-phase object added
- No commit or push performed

Deferred work:
- ...

Next checkpoint:
- Wait for `Lanjutkan 3.x`
```

## 22. User command sequence

The intended execution order is:

1. `Lanjutkan 3.1`
2. `Lanjutkan 3.2`
3. `Lanjutkan 3.3`
4. `Lanjutkan 3.4`
5. `Lanjutkan 3.5`
6. `Lanjutkan 3.6`
7. `Lanjutkan 3.7`
8. `Lanjutkan 3.8`

Do not skip a checkpoint. If a checkpoint is blocked, the next command should
address that blocker or approve its change record rather than starting the
next checkpoint.

## 23. Phase 3 exit and Phase 4 entry

Phase 4 may begin only after:

- Every Phase 3 acceptance item is proven.
- The working tree has been independently audited.
- Any Phase 3 defect has been fixed through valid migrations.
- The final verification suite passes from a clean reset.
- The completed Phase 3 work has been committed by explicit user request.

Phase 4 then adds only the trivia-specific database module on top of this
generic core. It must not compensate for unresolved tenant isolation,
idempotency, schedule locking, lifecycle shape, or privilege defects left by
Phase 3.
