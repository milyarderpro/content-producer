# Phase 4 — Trivia Database Module Implementation Plan

> Historical execution plan. Phase 4 was committed at `cb3568a`. Status and
> stop instructions below reflect the checkpoint when this plan was written;
> see [the current phase tracker](../implementation-plan.md#16-phase-tracker).

Status: Ready for staged execution after Phase 4 preflight and contract reconciliation
Execution model: Two implementation batches with one mandatory independent mid-audit
Starting commit: `1e3bd9c` (`feat: complete Phase 3 core database`)
Target environment: Local Supabase only
Production impact: None
Commit policy: No commit or push until the full Phase 4 audit is complete

## 1. Purpose

This document is the execution plan for Phase 4 of Content Producer. It turns
the frozen Phase 0 fact, deduplication, source, freshness, reservation, reuse,
lineage, and post-fact contracts into ordered implementation checkpoints for
an AI implementation agent.

Phase 4 adds the trivia-specific database module on top of the generic Phase 3
core. It must produce:

- One canonical fact store per workspace.
- One authoritative post-to-fact junction.
- Deterministic normalization and ontology version 1.
- Exact and structured identity with fail-closed collision handling.
- Candidate retrieval using exact, structured, FTS, trigram, entity, numeric,
  qualifier, and source-overlap signals without embeddings.
- Versioned source, verification, freshness, dedup-review, reservation, and
  immutable usage snapshots.
- Private database primitives for reservation, reuse, and lineage behavior
  needed to prove Phase 4 invariants.
- A gold deduplication set of at least 150 unique labeled cases with a frozen
  30% holdout.
- Database and evaluation tests proving the Phase 4 gate.

Phase 4 does not expose caller-facing business operations. Phase 5 composes
the private primitives into authenticated, idempotent `api` RPC workflows.

## 2. Sources of truth

Implementation must follow these sources in descending order of authority:

1. `AGENTS.md`.
2. Frozen Phase 0 documents under `plans/`.
3. Accepted change records under `docs/decisions/`.
4. This execution plan.
5. Existing migrations, implementation, and tests.

The primary Phase 4 contracts are:

- `plans/implementation-plan.md`, section **Phase 4 — Trivia database module**.
- `plans/phase-0-decision-register.md`, sections 9.1 through 9.11.
- `plans/database-design.md`, sections 8 through 14, 19.3 through 19.4,
  20 through 25, and the Phase 4 handoff requirements.
- `plans/module-contract.md`, sections 13 through 15, 19, 20, and 22.
- `plans/trivia-content-dna.md`, sections 16 through 18 and 21.
- `plans/tool-inventory.md`, `SourceEvidenceV1`, `TriviaCandidateV1`,
  `DedupDecisionV1`, `FactBindingInputV1`, and the five future trivia tools.
- `plans/acceptance-traceability.md`, `FR-FACT-*`, `FACT-*`, `AC-004`,
  `AC-005`, `NFR-DATA-003`, `NFR-DATA-006`, `NFR-CONC-001`, and
  `NFR-PERF-002..003`.
- `plans/use-case-inventory.md`, fact, reservation, interruption, correction,
  and concurrency fixtures.

When wording differs, accepted Phase 0 decisions control over illustrative
reference DDL. A conflict that changes a table, constraint, snapshot shape,
or domain behavior requires a documented change record before implementation.
The agent must never resolve such a conflict silently.

## 3. Completed baseline

Phase 4 starts only from commit `1e3bd9c`. The expected baseline is:

- Node.js `24.15.x`.
- pnpm `10.33.2`.
- Supabase CLI `2.120.0` or the project-pinned compatible version.
- PostgreSQL 17 in the local Supabase runtime.
- `pgcrypto` and `pg_trgm` installed in schema `extensions`.
- Eight Phase 3 tables in `public` and two operational tables in `internal`.
- RLS enabled on all Phase 3 tables.
- No direct business-table or sequence privileges for caller roles.
- No caller-executable private helper.
- No business RPC in schema `api`.
- Exactly one active `trivia` niche registry row at version 1.
- Eleven accepted migrations through
  `20261009012428_enforce_integer_evidence_versions.sql`.
- A clean Git working tree.

Checkpoint 4.1 must prove this baseline instead of assuming it.

## 4. Phase boundary

### 4.1 Included in Phase 4

- `public.trivia_facts`.
- `public.trivia_post_facts`.
- Versioned private helpers for normalization, ontology validation, structured
  serialization, hash calculation, source validation, freshness calculation,
  candidate retrieval, reservation, reuse, lineage, and snapshot validation.
- RLS enablement and explicit privilege revocation for every new table,
  sequence, and function.
- The FTS, trigram, identity, freshness, reservation, lineage, junction, and
  reuse indexes required by documented query patterns.
- Short triggers for derived-value validation, canonical-meaning protection,
  updated timestamps, and cross-row invariants that cannot be expressed in a
  `CHECK` constraint.
- Private database-owner primitives that make reservation, reuse, and lineage
  semantics testable before public RPCs exist.
- Source-controlled fixtures and evaluation runners.
- Database, concurrency, catalog, and performance tests.

### 4.2 Explicitly excluded

- Any function in schema `api`.
- The five caller-facing trivia fact RPCs.
- Owner/OAuth authorization, operation-ledger orchestration, rate-limit
  orchestration, public error envelopes, and public response shaping.
- Full atomic `save_post`, `revise_post`, approval, publish, discard, or plan
  progress workflows.
- MCP transport, Edge Function handlers, and plugin tools.
- Production facts or facts copied from reference datasets.
- OpenAI API calls, embeddings, vector extensions/search, external AI calls,
  Facebook APIs, Canva APIs, or background network jobs.
- Remote Supabase linking, push, deploy, or hosted data changes.
- A production seed workspace, Page, post, or trivia fact.

### 4.3 Phase 4 and Phase 5 overlap

The frozen requirements assign fact reservation and reuse evidence to both
Phase 4 and Phase 5. The boundary is fixed as follows:

- Phase 4 creates private, non-caller-executable database primitives and tests
  their storage, locking, eligibility, reuse, expiry, and lineage behavior.
- Phase 5 wraps those primitives in authenticated `api` RPCs and composes them
  with the operation ledger, Page-config CAS, post/plan lifecycle, rate limits,
  and stable public error mapping.
- Phase 4 primitives may be called only by database-owner tests. They must not
  accept caller identity as authoritative authorization data and must not be
  granted to `PUBLIC`, `anon`, `authenticated`, or `service_role`.
- Phase 4 tests may prove reservation races directly. Phase 5 must repeat them
  through the complete RPC path.
- Phase 4 may validate junction and correction effects structurally. Phase 5
  owns the full transaction that updates posts, approvals, revisions, plan
  items, and operation-ledger responses.

## 5. Mandatory contract reconciliation at checkpoint 4.1

Three frozen requirements cannot be implemented faithfully by the illustrative
Phase 0 reference DDL without an explicit amendment. Checkpoint 4.1 must create
one proposed change record, tentatively `CR-004`, covering the three related
Phase 4 persistence gaps below. The agent must stop and request approval before
creating a Phase 4 migration.

### 5.1 Fact risk class persistence

The future register, reverify, and correct contracts carry
`risk_class: standard | sensitive`, and freshness/source policy must be
revalidated later. `public.trivia_facts` has no field that persists this
decision.

Recommended amendment:

- Add `risk_class text not null` with values `standard` and `sensitive`.
- Store the value on the canonical fact and copy it into every immutable usage
  snapshot.
- Do not infer sensitivity later only from `topic_key` or prose.

### 5.2 Reservation context persistence

The accepted reservation contract binds a token to actor, workspace, Page,
reuse scope, config version, ordered fact set, request fingerprint, TTL, and
timestamps. The illustrative table stores only token, Page, and timestamps.

Recommended amendment:

- Add nullable `reservation_context jsonb` to `public.trivia_facts`.
- It is null when `reservation_status = 'available'` and a closed-schema
  `ReservationContextV1` object when reserved.
- Every row carrying the same token must carry byte-equivalent canonical
  context and the exact ordered fact set.
- Private reservation helpers compute this context; callers never supply an
  authoritative stored snapshot.

### 5.3 Immutable fact-usage snapshot shape

The accepted decision requires a junction snapshot containing canonical
wording/hash, identity and ontology versions, source schema and sources,
verification/freshness state, expiry, risk, and dedup-review evidence version.
The illustrative DDL constrains `source_snapshot` to a raw array, which cannot
represent the complete versioned snapshot.

Recommended amendment:

- Keep the column name `source_snapshot` to avoid adding redundant snapshot
  columns, but define it as a closed-schema `FactUsageSnapshotV1` object.
- Place the exact source array under `sources` within that object.
- Keep `claim_hash_snapshot` and `verified_at_snapshot` as indexed/typed
  projections and validate that they equal the corresponding object fields.
- Do not store only a mutable reference to `trivia_facts.source_data`.

The change record must quote the conflicting clauses, state the selected
schema, list affected validators/tests, remain `Proposed` until approved, and
become `Accepted` only after explicit user approval. If the user selects a
different persistence model, update this execution plan before checkpoint 4.2.

## 6. Target object inventory

### 6.1 Domain tables

| Table | Responsibility |
| --- | --- |
| `public.trivia_facts` | Workspace-scoped canonical identity, sources, freshness, lineage, and temporary reservation state |
| `public.trivia_post_facts` | Ordered post-fact relationship, reuse lifecycle, rendered wording, and immutable fact-usage evidence |

No other persistent domain table is authorized by this plan. Ontology v1 is
implemented through versioned private functions and source-controlled fixture
manifests, not through an unapproved generic ontology table. A future need for
additional persistent tables requires a change record.

### 6.2 Private helper categories

- `trivia_normalize_claim_v1`.
- `trivia_validate_candidate_v1`.
- `trivia_build_structured_key_v1`.
- `trivia_relation_is_deterministic_safe_v1`.
- `trivia_structured_match_eligible_v1`.
- Domain-separated SHA-256 identity helpers.
- Source and dedup-review snapshot validators.
- Freshness-policy validator/effective-expiry calculator.
- Candidate retrieval/ranking helper returning at most 20 candidates.
- Identity resolution/registration primitive with collision checks.
- Reservation-set claim, cleanup, and release primitives.
- Reuse eligibility primitive.
- Lineage/cycle validator and correction-state primitive.
- Canonical-meaning protection and shared `updated_at` triggers.
- Fact-usage snapshot validator.

These semantic names describe required responsibilities. Exact SQL function
names may use the repository naming convention, but every function must be
schema-qualified, versioned when behavior can evolve, narrowly scoped, and
covered by a catalog privilege test. There must be no generic SQL executor or
generic status mutation function.

## 7. `trivia_facts` contract

The implementation must preserve all columns in the frozen reference design
and the accepted CR-004 additions. Required invariant groups are:

### 7.1 Identity and scope

- `id bigint generated always as identity` primary key.
- Unique UUID `public_id` generated server-side.
- Required `workspace_id` with `on delete restrict`.
- Unique `(workspace_id, id)` for scoped foreign keys.
- `claim_text` represents one atomic proposition and is trimmed and 1 through
  500 characters. SQL enforces shape and bounds; semantic atomicity is supplied
  by the researched candidate/review workflow and is not guessed from prose by
  a trigger.
- `normalized_claim` is server-derived under normalization version 1.
- `normalization_version` is exactly 1 for new Phase 4 writes.
- `claim_hash` is lowercase 64-character SHA-256 hex computed with the frozen
  domain separator.
- Subject, relation, object, numbers, qualifiers, ontology version, structured
  key/hash, eligibility, topic, and dedup snapshot are required.
- `ontology_version` is exactly 1 for new Phase 4 writes.
- Topic belongs to the trivia v1 allowlist already enforced by Page config.

### 7.2 Current identity

`needs_review` and `verified` are current rows. `rejected`, `invalidated`, and
`superseded` are historical/non-current rows.

- Unique current `(workspace_id, claim_hash)`.
- Partial unique current `(workspace_id, structured_hash)` only when
  `structured_match_eligible = true`.
- Hash equality is never sufficient by itself: the corresponding canonical
  input must also match.
- Same hash with different canonical input yields the internal condition that
  Phase 5 maps to `FACT_HASH_COLLISION`.
- A non-eligible structured collision yields review-required and cannot be
  silently inserted as distinct or silently merged.
- Text similarity, shared sources, entity overlap, and model judgment are not
  uniqueness constraints.

### 7.3 Verification and freshness

- Status allowlist: `needs_review`, `verified`, `rejected`, `invalidated`,
  `superseded`.
- Freshness allowlist: `stable`, `periodic`, `volatile`.
- Risk allowlist after CR-004: `standard`, `sensitive`.
- A verified row requires `verified_at`, valid sources, effective expiry, and
  a closed-schema dedup review snapshot.
- Every verified fact, including stable facts, has a non-null `expires_at`.
- `expires_at` must be later than `verified_at` and no later than the effective
  policy ceiling.
- Periodic and volatile facts require `as_of_date`.
- Records, rankings, current statistics, laws, office holders, prices, and
  changing superlatives also require time context even if the caller labels
  them incorrectly; deterministic relation/qualifier checks fail closed.
- Rejected, invalidated, superseded, expired, or insufficient-source facts are
  not reservation-eligible.

### 7.4 Reservation shape

Available rows have null token, Page, timestamps, and context. Reserved rows
have all of them and satisfy:

- Canonical UUID v4 token.
- Scoped Page FK within the same workspace.
- `reserved_until > reserved_at`.
- TTL from 5 through 120 minutes, default 30 minutes.
- One active global reservation per fact regardless of reuse scope.
- All rows for one token have the same owner/workspace/Page/config/reuse/request
  context and exact ordered set.
- Expired rows are made available only while locked in a short transaction.
- No background worker is required.

### 7.5 Lineage

- `supersedes_fact_id` is scoped to the same workspace.
- A fact cannot supersede itself.
- The graph cannot contain a cycle.
- One predecessor has at most one current direct successor.
- A superseding row requires a non-empty correction reason and server
  correction timestamp.
- Meaning correction creates a new row; it never rewrites identity fields on
  a previously used fact.
- Canonical facts are never hard-deleted in the MVP.

## 8. `trivia_post_facts` contract

### 8.1 Identity and scope

- Internal identity PK and unique public UUID.
- Workspace, Page, post, and fact scope are explicit.
- `niche_key` is exactly `trivia`.
- Composite post FK proves workspace, Page, and trivia niche consistency.
- Composite fact FK proves workspace consistency.
- Unique `(post_id, position)` and `(post_id, fact_id)`.
- Position starts at 1; completed post bindings are contiguous from 1 through
  the post fact count, enforced by the private save validation in Phase 5 and
  tested structurally in Phase 4.
- Allowed fact roles are `general`, `myth_reversal`, `numeric_comparison`,
  `emotional`, `practical`, `scientific`, and `visual`.
- `rendered_text` is trimmed, 1 through 90 characters, and at most 18 words
  using the canonical word-count helper already required by the content
  contract. Phase 4 may add the narrow validator but not a save-post RPC.

### 8.2 Allocation lifecycle

- `allocated`: neither release nor publish timestamp.
- `published`: publish timestamp only.
- `released`: release timestamp only.
- Released rows remain for audit and do not block reuse.
- Allocated and published rows participate in reuse checks.
- Published rows are never released, including when their post is archived.
- JSON post bodies are never treated as the relational source of fact usage.

### 8.3 Immutable snapshot

Each row stores:

- `claim_hash_snapshot`.
- `verified_at_snapshot`.
- A complete `FactUsageSnapshotV1` in `source_snapshot` after CR-004.
- Public rendered wording in `rendered_text`.
- Fact role, topic available through the fact snapshot, position, and
  allocation timestamps.

Once a row becomes `published`, all snapshot, fact identity, rendered wording,
position, role, post/fact references, and publication timestamp fields are
immutable. Updating canonical sources later must not change an existing
junction snapshot.

## 9. Versioned JSON contracts

Every object below is closed-schema: unknown keys, wrong JSON types, empty
required strings, unsupported versions, non-canonical timestamps, and values
outside documented bounds fail closed.

### 9.1 `SourceEvidenceV1`

Each source item contains exactly:

```text
schema_version: integer const 1
url: absolute HTTPS URL, 1..2048 characters
canonical_url: absolute HTTPS URL, 1..2048 characters
title: string 1..300
publisher: string 1..200
tier: A | B | C | D
source_type: official | primary_paper | dataset | museum |
             professional_association | reputable_reference | review_paper |
             reputable_secondary | social | aggregator | other
accessed_at: RFC 3339 timestamp
published_at: YYYY-MM-DD | null
updated_at: YYYY-MM-DD | null
as_of: string 1..100 | null
language: valid bounded BCP-47 string, maximum 35
supports: string 1..500
independence_group: string 1..120
```

`source_data` is an array of 1 through 8 items. Tier D is discovery-only and
never counts toward verification. Duplicate canonical URLs do not count twice.
Items sharing an independence group do not count as independent confirmation.
The database performs syntax and policy validation only; it never fetches URLs
inside a transaction.

### 9.2 `DedupReviewSnapshotV1`

```text
schema_version: integer const 1
identity_schema_version: integer const 1
reviewed_at: server RFC 3339 timestamp
evaluator: const chatgpt
evaluator_label: optional string 1..120
decisions: array 0..20 of {
  candidate_fact_public_id: UUID
  decision: same | distinct
  reason: string 1..500
  material_differences: unique array 0..10 drawn from
    relation | negation | number | unit | time | location | population |
    condition | comparison_direction | method | scope | other
}
```

For a newly inserted distinct current fact, every strong candidate returned by
the identity and configured ranking boundary must have a recorded `distinct`
decision and a material discriminator. A `same` decision resolves to the
existing row instead of creating a new row. `uncertain` is not a stored success
decision and blocks reservation/verified registration.

### 9.3 `ReservationContextV1` after CR-004

```text
schema_version: integer const 1
actor_user_id: UUID
workspace_id: positive bigint
page_id: positive bigint
niche_key: const trivia
fact_reuse_scope: workspace_unique | page_unique
config_schema_version: integer const 1
config_updated_at: RFC 3339 timestamp
ordered_fact_public_ids: array 1..9 of unique UUIDs
request_hash: lowercase SHA-256 hex
ttl_minutes: integer 5..120
reserved_at: server RFC 3339 timestamp
reserved_until: server RFC 3339 timestamp
```

The object is server-generated. It must agree with typed reservation columns,
and all rows for a token must carry the same canonical JSON value.

### 9.4 `FactUsageSnapshotV1` after CR-004

```text
schema_version: integer const 1
canonical_claim: string 1..500
normalized_claim: non-empty string
normalization_version: integer const 1
claim_hash: lowercase SHA-256 hex
subject_key, relation_key, object_key: canonical non-empty keys
numbers: canonical TriviaCandidateV1 numbers array
qualifiers: canonical TriviaCandidateV1 qualifiers object
ontology_version: integer const 1
structured_key: non-empty deterministic serialization
structured_hash: lowercase SHA-256 hex
structured_match_eligible: boolean
topic_key: trivia v1 topic
risk_class: standard | sensitive
source_schema_version: integer const 1
sources: array 1..8 of SourceEvidenceV1
verification_status: const verified
verified_at: RFC 3339 timestamp
as_of_date: YYYY-MM-DD | null
expires_at: RFC 3339 timestamp
dedup_review_schema_version: integer const 1
```

The typed `claim_hash_snapshot` and `verified_at_snapshot` columns must match
the object. The snapshot is generated from a locked, currently eligible fact
during allocation; it is never reconstructed lazily from mutable canonical
data.

## 10. Normalization and ontology version 1

### 10.1 Normalization rules

The v1 normalizer is deterministic and applies only safe surface changes:

1. Validate UTF-8 text and normalize to Unicode NFC.
2. Trim and lowercase deterministically.
3. Replace the explicit v1 typographic punctuation variants with their ASCII
   canonical form.
4. Collapse all runs of whitespace to one ASCII space.
5. Normalize only explicitly allowlisted whole-token subject/object aliases
   and singular/plural variants; do not stem arbitrary words.
6. Normalize explicitly supported written numbers, decimals, symbols, and
   equivalent units without losing precision or comparison direction.
7. Preserve negation, approximate/range markers, comparison direction, time,
   location, population, condition, method, and scope.
8. Do not paraphrase, summarize, translate, or remove a detail merely because
   it appears editorially minor.

Two executions with the same input and versions must be byte-identical.

### 10.2 Domain-separated hashes

```text
claim_hash = sha256("trivia-claim:v1|" + normalized_claim)
structured_hash = sha256("trivia-structure:v1|" + structured_key)
```

Both are lowercase 64-character hexadecimal strings produced server-side with
the installed `pgcrypto` extension. Caller-supplied hashes are never
authoritative.

### 10.3 Ontology relation families

Deterministic-safe only when the relation-specific completeness manifest
passes:

- `has_count`
- `has_measurement`
- `is_classified_as`
- `is_located_in`
- `originated_in_time_place`
- `has_named_part_or_property`
- `holds_record_by_metric_as_of`

Always semantic-review-only in ontology v1:

- `can_perform`
- `behaves_as`
- `communicates_by`
- `affects`
- `causes`
- `reduces_or_increases_risk`
- `is_safe_or_toxic_for`
- `recommended_practice`
- `is_illegal_or_required_in`
- `is_best_or_safest`

Unknown relations are rejected as unsupported ontology input. Review-only
relations always produce `structured_match_eligible = false`.

### 10.4 Canonical structured serialization

The implementation must use one documented field order covering every
material identity component:

```text
subject_key, subject_type, relation_key, object_key, object_type,
numbers, comparison_direction, negated, time, location, population,
condition, method, estimate_or_range, scope
```

Subject/object types and comparison direction are derived by the server from
the ontology relation/key manifest; they are not trusted caller fields. Empty
fields have explicit empty markers. Numbers are ordered canonically by role,
unit, and exact decimal value. Qualifiers use fixed key order.

To prevent delimiter ambiguity, every scalar value is serialized as the
hexadecimal UTF-8 bytes of its canonical text and joined with fixed lowercase
field names. Arrays/objects are first converted to their validated canonical
JSON representation, then encoded the same way. Any implementation using a
different serialization requires a change record because it changes identity.

### 10.5 Eligibility

`structured_match_eligible` is computed by a private server helper and is true
only when:

- Ontology version is 1.
- Relation is in the deterministic-safe list.
- Every required field for that relation is present and canonical.
- No unknown alias, unit, qualifier, or comparison direction remains.
- All material numbers and qualifiers are represented in the structured key.
- The structured key and hash recompute exactly.

The caller cannot force this value to true. The relation-completeness manifest
must live in source control and have one positive and one negative fixture per
relation.

## 11. Source and freshness policy

### 11.1 Minimum source evidence

- Stable standard fact: at least one Tier A or B source supporting the complete
  proposition.
- Periodic or volatile fact: at least one authoritative A/B source; important
  numbers, records, superlatives, disputed claims, or misleading-risk claims
  also require an independent A/B/C confirmation.
- Sensitive fact: at least one Tier A source and one independent A/B source.
- Two pages sharing one independence group count as one source.
- Tier D never verifies a fact.
- Source support notes must map to the proposition and material qualifiers.

The database validates submitted policy evidence and result metadata. It does
not decide whether a web page actually supports a claim and performs no
network call.

### 11.2 Effective expiry

The effective expiry is server-computed as the earliest of the requested
expiry and every applicable ceiling:

| Policy | Maximum from `verified_at` |
| --- | ---: |
| Stable | 24 months |
| Periodic | 12 months or earlier expected update supplied by evidence |
| Volatile | 30 days by default |
| Volatile with explicit rationale | 90 days absolute maximum |
| Sensitive | Minimum of its class ceiling and 180 days |

An expiry beyond 30 days for volatile data requires explicit bounded rationale
in the verification note. The database never extends a requested expiry.
Expired facts remain historical but cannot be reserved, allocated, saved, or
published until reverified.

### 11.3 Same-meaning re-verification

Re-verification may replace source/freshness metadata only when recomputed
normalized and structured identity remains exactly equal. A meaning change is
not re-verification and must take the correction/successor path.

## 12. Candidate retrieval and decision boundary

The private candidate query combines, in deterministic precedence:

1. Exact current claim hash and canonical-input comparison.
2. Exact current structured hash, ontology version, eligibility, and
   canonical structured-key comparison.
3. Full-text rank over the stored `simple` search vector.
4. Trigram similarity over `normalized_claim`.
5. Subject/entity, relation, numeric, qualifier, and source-overlap signals.

Rules:

- Return at most 20 candidates per proposed fact.
- Exact/eligible-structured signals sort ahead of ranked candidate-only
  signals.
- Ranking ties use stable `public_id` ordering.
- The score is a bounded named component object, not one unexplained number.
- FTS, trigram, entity, numeric, qualifier, topic, or source overlap never
  auto-merges or auto-rejects.
- Thresholds are calibrated only on the development split and written into a
  versioned fixture manifest before the frozen holdout is evaluated.
- The holdout must not be used to tune thresholds.
- A semantic `same` decision reuses a row; `distinct` requires a recorded
  material discriminator; `uncertain` stops registration/reservation.

## 13. Reservation and reuse primitives

### 13.1 Required private behavior

The private reservation primitive must:

1. Receive already researched, normalized, source-validated candidate
   decisions; perform no network or model work.
2. Validate one token, one Page, one config snapshot, one reuse scope, and an
   ordered set of 1 through 9 unique facts.
3. Lock facts in ascending internal ID order.
4. Opportunistically clear expired reservations on locked rows.
5. Recheck current status, source policy, expiry, lineage, and reuse while the
   rows are locked.
6. Claim the entire set or none of it.
7. Store identical `ReservationContextV1` on every claimed row.
8. Return one deterministic reservation expiry for the set.

The private release primitive clears only facts still owned by that token.
Repeating release is safe. It never modifies allocated or published junctions.
Phase 5 adds operation-ledger idempotency and caller-visible error mapping.

### 13.2 Reuse semantics

Reuse is calculated from canonical fact IDs and junction states:

| State | Blocks `workspace_unique` | Blocks `page_unique` on target Page | Blocks another Page under `page_unique` |
| --- | ---: | ---: | ---: |
| Another active reservation | Yes | Yes | Yes |
| Allocated junction | Yes | Yes | No |
| Published junction | Yes | Yes | No |
| Released junction | No | No | No |

The Page destination's current config is authoritative. Reserve snapshots that
config. Phase 5 save must reject a changed config/reuse context and require a
new reservation; Phase 4 must persist enough context to make that comparison
possible.

### 13.3 Concurrency proof

- Ten separate database sessions race for the same fact.
- Exactly one token owns it after all sessions finish.
- A multi-fact losing request owns zero rows.
- Locks are acquired in ascending fact ID order.
- Tests have bounded statement/lock timeouts and fail instead of hanging.
- Different facts proceed independently.

## 14. Correction and lineage boundary

Phase 4 implements and tests private lineage primitives:

- Same-meaning source refresh retains the fact ID and identity fields.
- Invalidation changes a formerly verified fact to `invalidated` without a
  successor.
- Meaning correction inserts one successor and changes the predecessor to
  `superseded` in one transaction.
- Cross-workspace links, self-reference, cycles, and two current direct
  successors fail.
- A correction race produces one legal successor.
- Any fact ever referenced by any junction, including released, cannot mutate
  its meaning fields.
- Posted/published junction snapshots remain unchanged.

Phase 5 owns the complete effect on draft/ready posts, revisions, approval
staleness, publish races, operation ledger, and public errors. Phase 4 tests
must not pretend those complete workflows already exist.

## 15. Index and query plan

Required indexes include:

- Unique current workspace+claim hash.
- Partial unique current eligible workspace+structured hash.
- Partial unique current successor per predecessor.
- GIN on generated `search_vector` using `simple` configuration.
- GIN trigram on `normalized_claim` with the schema-qualified extension
  operator class.
- Workspace+verification+topic lookup.
- Reservation token partial lookup.
- Reserved-until partial cleanup lookup.
- Scoped lineage lookup.
- Junction fact+allocation state.
- Junction Page+allocation state+recency.
- Partial unique Page+fact for allocated/published rows.
- Every foreign key must have useful leftmost-prefix index coverage.

Do not add a default GIN index to arbitrary JSONB. Use B-tree, partial, FTS,
and trigram indexes only for documented access patterns. Tests must inspect
catalog definitions and representative `EXPLAIN (ANALYZE, BUFFERS)` plans.

## 16. Security and database function rules

- Enable RLS on both tables when they are created.
- Add no permissive caller policy in Phase 4.
- Revoke all direct table and sequence privileges from `PUBLIC`, `anon`,
  `authenticated`, and `service_role`.
- Keep helpers in `internal` or another non-exposed approved schema.
- Revoke function execution from `PUBLIC`, `anon`, `authenticated`, and
  `service_role` immediately after creation/replacement.
- Use `SECURITY INVOKER` unless a narrowly justified private primitive cannot
  work otherwise. Do not add `SECURITY DEFINER` merely to bypass a privilege
  error.
- Use a fixed safe `search_path`; schema-qualify all objects and extension
  functions/operator classes.
- Treat claim text, source metadata, URLs, snapshots, and review notes as
  untrusted data.
- Do not log reservation tokens, full sources, full claims, or evidence.
- Schema inclusion, object privileges, and RLS are verified separately.
- Schema `api` must still contain zero business routines after Phase 4.

## 17. Migration strategy

### 17.1 Frozen work-item traceability

| Frozen Phase 4 work item | Owning checkpoint | Required evidence |
| --- | --- | --- |
| Create `trivia_facts` | 4.2 | Schema/catalog and constraint tests |
| Create `trivia_post_facts` | 4.5 | Scoped-FK, lifecycle, snapshot, and privilege tests |
| Normalization v1 | 4.3 | Deterministic equivalence and anti-loss fixtures |
| Ontology v1 | 4.3 | Relation/completeness/alias/unit fixtures |
| Claim hash, structured hash, eligibility | 4.3 | Domain-separator, collision, and fail-closed tests |
| Search vector and trigram indexes | 4.4 | Catalog and `EXPLAIN` evidence |
| Source validator | 4.3 | `SourceEvidenceV1` positive/negative matrix |
| Freshness policy | 4.3 | Class/risk/as-of/expiry boundary matrix |
| Reservation state and TTL | 4.2 and 4.6 | Shape, expiry, release, rollback, and race tests |
| Fact lifecycle, dedup snapshot, reverify, correction lineage | 4.2, 4.3, and 4.7 | State, identity-preservation, cycle, and race tests |
| Allocation states | 4.5 | Allocated/published/released transition-shape tests |
| Immutable source/hash/identity/freshness snapshots | 4.5 | Snapshot equality and mutation-resistance tests |
| `topic_key` and `fact_role` | 4.2 and 4.5 | Allowlist and analytics-dimension tests |
| Canonical-meaning protection | 4.5 | Any-junction immutability tests |
| Gold dedup set, development/holdout evaluation | 4.4 and 4.7 | Counts, checksum, precision/recall, and zero-false-merge report |
| Database tests for every invariant | 4.2 through 4.8 | Focused suite plus clean-room final suite |

Every frozen Phase 4 work item has exactly one primary checkpoint. Work spread
across multiple checkpoints has an explicit base-schema checkpoint and a later
behavioral-proof checkpoint; it is not considered complete at the earlier
checkpoint alone.

### 17.2 Migration groups

Every migration must be created through the project-pinned Supabase CLI after
checking the current command help. Never invent a timestamp or filename.
Existing migrations are immutable.

| Group | Checkpoint | Purpose |
| --- | --- | --- |
| 1 | 4.2 | Create `trivia_facts`, base constraints, RLS, and revokes |
| 2 | 4.3 | Normalization, ontology, identity, source, freshness, and derived-value validation |
| 3 | 4.4 | Candidate retrieval, dedup indexes, ranking primitives, and fixture evaluator support |
| 4 | 4.5 | Create `trivia_post_facts`, immutable usage snapshots, allocation constraints, and meaning protection |
| 5 | 4.6 | Reservation, expiry cleanup, release, and reuse private primitives |
| 6 | 4.7 | Lineage/reverification/correction primitives and final Phase 4 hardening |

If a completed checkpoint later needs correction, add a new migration. Do not
edit, rename, reorder, or delete an earlier migration.

Each migration must:

- Be forward-only and deterministic under a clean local reset.
- Use explicit names for constraints, indexes, functions, and triggers.
- Use appropriate Postgres types and `timestamptz` for instants.
- Include RLS and privilege treatment for every new object.
- Keep transactions short and perform no network work.
- Avoid redundant indexes and unbounded JSON.
- Include focused tests in the same checkpoint.

## 18. Execution protocol and audit cadence

### 18.1 Batch A

Execute checkpoints 4.1 through 4.4 in order. The agent may proceed between
checkpoints without waiting for `Lanjutkan 4.x` only after each checkpoint's
verification passes. It must stop immediately for:

- The mandatory CR-004 approval at 4.1.
- Any additional frozen-contract conflict.
- A failing clean reset or unresolved security boundary.
- A gold-fixture label that requires human editorial adjudication.

After 4.4, stop for an independent mid-audit. Do not start 4.5.

### 18.2 Batch B

After the mid-audit findings are fixed and accepted, execute checkpoints 4.5
through 4.8. Stop after 4.8 for independent final audit. Do not start Phase 5.

### 18.3 General agent rules

1. Inspect Git status and preserve unrelated work.
2. Read the relevant frozen sections before each checkpoint.
3. Keep all work local.
4. Inspect CLI help before an unfamiliar Supabase command.
5. Add focused positive, negative, boundary, and catalog tests with each
   behavior.
6. Use separate sessions for concurrency tests.
7. Clean test rows in transaction rollback or `finally` cleanup.
8. Do not weaken a fixture expectation merely to pass an implementation.
9. Do not modify the frozen `plans/*.md` contracts. Use change records.
10. Do not commit or push unless explicitly instructed after final audit.

## 19. Checkpoint 4.1 — Preflight, contract map, and CR-004

### Objective

Prove the Phase 3 baseline, map every Phase 4 requirement to an implementation
checkpoint, and resolve the known persistence gaps before schema work.

### Work

1. Confirm HEAD is `1e3bd9c` or a user-approved descendant containing only
   reviewed work.
2. Confirm the working tree is clean or identify unrelated user changes.
3. Verify Node, pnpm, Supabase CLI, Docker, local health, and PostgreSQL major.
4. Inspect CLI help for migration creation, reset, query, migration listing,
   and security advisors.
5. Review current Supabase breaking changes relevant to Postgres, extensions,
   grants, public-schema exposure, functions, and indexes.
6. Run the full Phase 3 gate.
7. Produce a requirement-to-checkpoint and requirement-to-test mapping.
8. Confirm no production fact will be seeded and no dataset-reference claim is
   treated as verification evidence.
9. Create the proposed CR-004 described in section 5.
10. Stop for explicit user approval. Do not create a Phase 4 migration.

### Verification

- `pnpm run check`
- `pnpm run test-all`
- `pnpm run verify-migrations`
- `pnpm run smoke-test`
- `pnpm run supabase:verify`
- Security advisor with error threshold
- Catalog proof that Phase 3 still has 10 tables, 10 RLS-enabled tables, no
  direct caller grants, no exposed internal helper, and zero `api` routines

### Completion criteria

- Baseline is green.
- CR-004 is explicit and approved.
- No unresolved contract conflict remains.
- No Phase 4 migration or database object exists.

## 20. Checkpoint 4.2 — Canonical fact table

### Objective

Create the Phase 4 canonical fact storage root with structural constraints,
scope, lifecycle shape, RLS, and privilege revocation.

### Schema work

Create `public.trivia_facts` according to section 7 and accepted CR-004,
including:

- Identity/public IDs and workspace scope.
- Canonical identity input/derived columns.
- Verification, freshness, risk, source, and review columns.
- Reservation fields and accepted reservation context field.
- Correction lineage fields.
- Generated stored FTS vector.
- Current exact and eligible-structured partial uniqueness.
- One-current-successor uniqueness.
- Base lifecycle, JSON top-level, hash-format, and reservation-shape checks.
- Foreign keys with `on delete restrict`.
- RLS, per-object revokes, and sequence revokes.

Do not yet add candidate retrieval or complete semantic validators; those are
owned by 4.3 and 4.4. Base checks must still reject impossible types and state
shapes.

### Tests

- Table and every required column/type/default exist.
- Public ID, scoped key, and FK behavior.
- Current exact uniqueness and historical-row allowance.
- Eligible structured uniqueness and non-eligible non-automatic merge
  boundary at the constraint level.
- Hash formats and JSON top-level shapes.
- Status/freshness/risk allowlists.
- Reservation all-or-none field shape.
- Same-workspace Page reservation FK.
- Self-reference rejected and current-successor uniqueness present.
- RLS enabled; no caller table, sequence, or schema access is added.
- Phase 3 tests remain green.

### Completion criteria

- Migration group 1 replays from zero.
- Exactly one new domain table exists.
- No `trivia_post_facts`, `api` routine, production fact, or remote resource
  exists.

## 21. Checkpoint 4.3 — Identity, ontology, source, and freshness

### Objective

Make canonical identity and verification metadata deterministic, versioned,
server-derived, and fail-closed.

### Work

1. Implement normalization v1 exactly as section 10.1.
2. Implement the ontology v1 relation and completeness manifest.
3. Implement exact canonical validation for candidate numbers and qualifiers.
4. Implement canonical structured serialization.
5. Implement domain-separated hashes.
6. Compute or validate all authoritative derived fields server-side.
7. Implement `structured_match_eligible` as server-derived only.
8. Implement exact `SourceEvidenceV1` validation.
9. Implement exact `DedupReviewSnapshotV1` validation.
10. Implement source hierarchy/independence checks and effective expiry.
11. Attach narrow checks/triggers so verified facts cannot bypass validators.
12. Revoke every helper from caller roles and `PUBLIC`.

### Tests

- NFC, case, whitespace, punctuation, explicit alias, number, and unit
  equivalents normalize identically.
- Negation, material number, comparison direction, time, location, population,
  condition, method, estimate/range, and scope remain distinct.
- Domain separators and lowercase hash format are exact.
- Same input/version returns byte-identical output across repeated runs.
- Each deterministic-safe relation has complete/incomplete cases.
- Each review-only relation remains non-eligible.
- Unknown relation, alias, unit, qualifier, or version fails closed.
- Caller-provided incorrect derived values cannot become authoritative.
- Closed source schema, HTTPS, field lengths, tiers/types, counts, timestamps,
  dates, BCP-47 form, canonical URL duplication, and independence rules.
- Stable, periodic, volatile, sensitive, 30/90-day rationale, 180-day safety,
  and 24-month ceilings.
- Verified facts require current valid evidence and expiry.
- Tier D alone never verifies.
- Private helpers are not executable by callers.

### Completion criteria

- Migration group 2 replays from zero.
- Canonical identity is completely reproducible from stored source inputs.
- No semantic similarity signal can set eligibility or verification.

## 22. Checkpoint 4.4 — Candidate retrieval and gold-set development gate

### Objective

Implement indexed candidate retrieval and prove the dedup decision boundary on
the development fixtures before junction/reservation work begins.

### Work

1. Add FTS, trigram, exact/structured, topic/status, and identity query indexes.
2. Implement the private candidate retrieval helper described in section 12.
3. Create the fixture structure under
   `supabase/tests/fixtures/trivia/dedup-v1/`.
4. Curate at least 150 unique labeled pair/cases from the three reference
   datasets as pattern material only.
5. Assign exactly 70% to development and 30% to holdout. For 150 cases this is
   105 development and 45 holdout; larger totals must preserve the same split
   without rounding the holdout below 30%.
6. Freeze holdout content and checksum before threshold tuning.
7. Calibrate candidate-only thresholds on development fixtures.
8. Run the development set; do not inspect holdout outcome to tune thresholds.
9. Add deterministic evaluator and report generation to tests.

### Fixture coverage

- At least 30 exact/surface variants.
- At least 40 paraphrase equivalents.
- At least 20 alias, singular/plural, number, or unit equivalents.
- At least 50 anti-duplicates differing on material identity.
- At least 10 ambiguous/risky cases requiring review/rejection.
- At least 30 cases derived from each Curious Mind, DYK, and Daily Facts
  reference dataset.
- Total unique cases at least 150; one case may carry multiple secondary tags.

### Tests and targets

- Exact hash precision/recall: 100% on exact subset.
- Eligible structured auto-match precision: 100%.
- False automatic merge: zero across anti-duplicates.
- Ambiguous/risky automatic verification or merge: zero.
- Candidate result cap: 20, with deterministic order.
- Development recall report produced without changing labels.
- Repeated evaluation produces identical output.
- Representative exact, structured, FTS, and trigram queries use intended
  indexes under `EXPLAIN (ANALYZE, BUFFERS)`.
- No dataset claim is inserted into production seed or marked factually
  verified merely because it appears in the dataset.

### Mandatory stop

Stop after reporting 4.1 through 4.4. The independent mid-audit must inspect:

- CR-004 implementation mapping.
- Identity and serialization exactness.
- Auto-match versus candidate-only boundaries.
- Source/freshness validation.
- Fixture labels, split integrity, holdout checksum, and threshold process.
- Index and privilege catalog evidence.

Do not begin 4.5 before audit findings are resolved.

## 23. Checkpoint 4.5 — Junction and immutable usage snapshots

### Objective

Create the authoritative post-fact relationship and protect historical meaning
and source context.

### Schema work

Create `public.trivia_post_facts` according to section 8 and accepted CR-004:

- Scoped post and fact foreign keys.
- Trivia-only niche constraint.
- Unique position and fact per post.
- Fact-role and rendered-text validation.
- Allocation-state timestamp shape.
- Complete closed-schema `FactUsageSnapshotV1`.
- Snapshot-to-projection equality checks/trigger.
- Page-level active/published partial uniqueness.
- Fact/state and Page/state/recency indexes.
- RLS, revokes, and sequence revokes.

Add canonical-meaning protection to `trivia_facts`: after any junction has ever
referenced a fact, including a released junction, reject changes to every
meaning/identity field listed in the frozen contract.

### Tests

- Cross-workspace fact and post links fail.
- Non-trivia post link fails.
- Duplicate position/fact per post fails.
- Invalid role, wording length, state/timestamp shape, and snapshot fail.
- Snapshot typed projections must agree with JSON object.
- Canonical source refresh does not mutate existing snapshot.
- Released rows persist and stop blocking Page uniqueness.
- Allocated/published rows block the same Page.
- Published snapshot and identity fields are immutable.
- Meaning fields cannot change after any allocated, released, or published
  junction has existed.
- JSON post content is not used to infer relational membership.
- RLS and caller privilege boundary remains closed.

### Completion criteria

- Migration group 4 replays from zero.
- Exactly two Phase 4 domain tables now exist.
- Junction snapshots retain all accepted Phase 0 evidence fields.
- No post lifecycle RPC has been added.

## 24. Checkpoint 4.6 — Reservation, release, expiry, and reuse

### Objective

Implement private reservation/reuse primitives and prove transactional safety
without exposing a public business RPC.

### Work

1. Implement locked opportunistic cleanup for expired reservations.
2. Implement all-or-nothing reservation of 1 through 9 facts.
3. Implement token/context/exact-set validation.
4. Implement idempotent private release by current token ownership.
5. Implement `workspace_unique` and `page_unique` checks over active
   reservations plus allocated/published junctions.
6. Recheck current verified status, sources, freshness, lineage, and reuse
   while rows are locked.
7. Use ascending fact-ID lock order and short transactions.
8. Add bounded timeout behavior for tests.

### Tests

- Only fresh current verified facts can reserve.
- Expired, needs-review, rejected, invalidated, superseded, or insufficient-
  source facts fail.
- Exact set of 1 and 9 succeeds; empty, duplicate, non-contiguous request
  position, and 10 facts fail.
- One conflicting fact rolls back the entire set.
- Token/Page/config/reuse/fact-set/request-hash mismatch fails.
- Expired reservation is reclaimed opportunistically.
- Release repeated twice is safe and does not release another token.
- Released junction does not block reuse.
- Workspace uniqueness blocks every Page.
- Page uniqueness blocks the target Page and permits another Page after the
  active reservation ends.
- Ten-session race has exactly one winning token and no partial loser.
- Different facts do not contend incorrectly.
- Caller roles cannot execute reservation primitives.

### Completion criteria

- Migration group 5 replays from zero.
- Concurrency is proven with separate sessions.
- No operation-ledger/public-RPC behavior is claimed as complete.

## 25. Checkpoint 4.7 — Reverification, correction lineage, holdout, and hardening

### Objective

Complete private fact-maintenance behavior, run the untouched holdout, and
close every remaining Phase 4 test/performance gap.

### Work

1. Implement same-meaning re-verification primitive.
2. Implement invalidation and atomic successor creation primitive.
3. Implement cycle detection and one-current-successor enforcement.
4. Prove correction does not rewrite published snapshots.
5. Complete any missing FK/index/catalog checks.
6. Reveal and evaluate the frozen holdout for the first time only after
   development thresholds are frozen. Subsequent verification may rerun the
   unchanged holdout, but no threshold or implementation may be tuned from its
   individual cases.
7. Produce a machine-readable and human-readable dedup evaluation report.
8. Load deterministic local performance fixtures and inspect critical plans.
9. Add only additive corrective migration if a defect is found.

### Tests and gates

- Reverification retains public/internal identity and every meaning field.
- Meaning change through reverify fails as correction-required internally.
- Invalidation has no successor and makes the fact ineligible.
- Supersession creates one successor and changes predecessor atomically.
- Self-reference, cycle, cross-workspace, and second current successor fail.
- Concurrent correction produces one legal winner.
- Published snapshot remains byte-identical after source refresh/correction.
- Candidate recall@20 on frozen paraphrase holdout is at least 95%.
- Exact subset remains 100% precision/recall.
- Eligible structured auto-match precision remains 100%.
- False auto-merge remains zero.
- Every ambiguous/risky case remains review/reject, never auto-verified.
- Same input/version produces identical evaluation output.
- Duplicate search and simple reservation/write meet the documented local p95
  target of at most 3 seconds, excluding research/generation time.
- Security advisor has no error-level finding.

If holdout fails, do not tune against holdout cases. Report the failure and
return to design/change review. A label may change only through documented
human adjudication and a fixture-version increment.

### Completion criteria

- Migration group 6 and all corrective migrations replay from zero.
- All Phase 4 functional, evaluation, concurrency, performance, and security
  gates pass.
- Phase 5 has not started.

## 26. Checkpoint 4.8 — Final clean-room acceptance

### Objective

Audit Phase 4 from a clean local database and prepare an independent-review
handoff.

### Clean reset

1. Confirm the target is local and no remote project is linked for mutation.
2. Reset from zero and apply the complete migration chain.
3. Confirm seed remains free of production facts.
4. Run the complete test/evaluation suite.
5. Reset a second time and repeat structural/smoke verification.

### Catalog audit

- Twelve application/operational tables exist in total: the ten Phase 3 tables
  plus the two Phase 4 domain tables. No unapproved persistent ontology or
  reservation table exists.
- RLS is enabled on all twelve.
- All PK, FK, unique, partial unique, checks, indexes, triggers, and generated
  columns match the accepted contracts.
- Every FK has useful index coverage.
- No caller role has direct table or sequence privilege.
- No private helper is executable by callers or `PUBLIC`.
- `internal` remains outside the Data API business profile.
- Schema `api` still has zero business routines.
- No Phase 5 object, MCP handler, secret, fixture row, or remote resource exists.

### Behavioral audit

- Exact/structured/candidate boundaries pass.
- Source, independence, risk, freshness, and expiry pass.
- Reservation/reuse and ten-session race pass.
- Junction scope, states, reuse, and immutable snapshots pass.
- Reverify/correction/invalidation/lineage pass.
- Gold development and frozen holdout targets pass.
- Performance plans and local p95 targets pass.

### Required verification

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

Run the clean reset twice. Inspect current CLI help before any unfamiliar
command variation.

### Final report

Report:

- Changed/added files.
- Every generated migration and its group.
- Table/function/trigger/index inventory.
- Accepted CR-004 decision and implementation mapping.
- Fixture counts by dataset, category, and split.
- Development and holdout metrics.
- Concurrency result.
- Performance method and results.
- Every verification command and result.
- Security advisor result.
- Explicit confirmation of no remote action, secret, commit, push, Phase 5
  RPC, or production data.

Stop for independent final audit.

## 27. Fixture and test organization

Recommended structure:

```text
supabase/tests/fixtures/trivia/
  ontology-v1.json
  source-policy-v1.json
  dedup-v1/
    manifest.json
    development.jsonl
    holdout.jsonl
    holdout.sha256

supabase/tests/database/
  trivia-facts-schema.test.ts
  trivia-identity-and-source.test.ts
  trivia-candidate-retrieval.test.ts
  trivia-post-facts.test.ts
  trivia-reservation-and-reuse.test.ts
  trivia-lineage.test.ts
  trivia-concurrency.test.ts
  trivia-final-acceptance.test.ts
```

The exact file split may follow repository conventions, but test intent must
remain visible. Shared helpers may manage local queries, fixtures, cleanup, and
parallel connections; they must not hide assertions or print secrets/tokens.

Every dedup case contains at least:

```text
fixture_id
fixture_manifest_version
normalization_version
ontology_version
split: development | holdout
primary_category
secondary_tags[]
left_candidate
right_candidate
expected_decision: same | distinct | review_required | reject
expected_signals[]
material_differences[]
reason_label
provenance_dataset
provenance_record_ids[]
reviewer
review_status
```

The fixtures evaluate identity behavior, not factual truth. They must not
contain secrets, full copied articles, or a claim that competitor engagement
proves correctness.

## 28. Acceptance checklist

### Contract and scope

- [ ] Phase 3 commit/baseline is verified.
- [ ] CR-004 is accepted before schema affected by it is implemented.
- [ ] Only the trivia-specific Phase 4 module is added.
- [ ] No `api` business routine exists.
- [ ] No MCP/Edge handler is implemented.
- [ ] No production fact is seeded.
- [ ] No embeddings/vector search/OpenAI/Facebook/Canva API is added.

### Canonical fact table

- [ ] `public.trivia_facts` exists with all frozen and accepted-CR columns.
- [ ] Public and workspace-scoped identity is enforced.
- [ ] Claim text is trimmed/bounded at the storage boundary, and semantic
      atomicity is represented by the candidate/review workflow rather than a
      heuristic SQL prose classifier.
- [ ] Current exact uniqueness is enforced.
- [ ] Eligible current structured uniqueness is enforced.
- [ ] Historical rows do not block valid successors.
- [ ] Hash collision compares canonical inputs and fails closed.
- [ ] Risk/source/freshness/reservation/lineage shapes are enforced.

### Identity and ontology

- [ ] Normalization v1 performs only explicit safe surface normalization.
- [ ] Negation and all material qualifiers are preserved.
- [ ] Domain-separated hashes are exact.
- [ ] Structured field order and encoding are deterministic.
- [ ] Deterministic-safe relations require complete material fields.
- [ ] Review-only relations cannot become eligible.
- [ ] Unknown versions/relations/aliases/units fail closed.
- [ ] Authoritative derived fields are server-computed.

### Sources and freshness

- [ ] `SourceEvidenceV1` is closed-schema and fully bounded.
- [ ] Source arrays contain 1..8 items.
- [ ] Tier D never verifies.
- [ ] Independence groups are enforced.
- [ ] Stable/periodic/volatile/sensitive policy is enforced.
- [ ] Verified facts always have a valid effective expiry.
- [ ] Required `as_of_date` cases fail without it.
- [ ] Expired facts cannot enter reservation/allocation paths.

### Candidate retrieval and gold set

- [ ] Exact, structured, FTS, trigram, entity/numeric/qualifier/source signals
      are represented.
- [ ] Candidate-only signals never auto-merge.
- [ ] Results are deterministic and capped at 20.
- [ ] At least 150 unique labeled cases exist.
- [ ] Each reference dataset contributes at least 30 cases.
- [ ] Development/holdout split is 70/30.
- [ ] Holdout was frozen before tuning.
- [ ] Exact precision/recall is 100%.
- [ ] Eligible structured auto-match precision is 100%.
- [ ] Holdout paraphrase recall@20 is at least 95%.
- [ ] False auto-merge count is zero.
- [ ] Ambiguous/risky auto-merge or auto-verify count is zero.

### Junction and snapshots

- [ ] `public.trivia_post_facts` exists.
- [ ] Workspace/Page/post/niche/fact scope cannot cross.
- [ ] Position and fact uniqueness per post are enforced.
- [ ] Allocation lifecycle shape is enforced.
- [ ] Released rows do not block reuse.
- [ ] Allocated/published rows block according to target Page scope.
- [ ] `FactUsageSnapshotV1` is complete and immutable after publish.
- [ ] Canonical source refresh does not rewrite old snapshots.
- [ ] Meaning cannot mutate after any junction has existed.

### Reservation and reuse

- [ ] Token context binds actor/workspace/Page/config/reuse/exact set/request.
- [ ] TTL is 5..120 minutes and default 30.
- [ ] Reservation set is all-or-nothing.
- [ ] Lock order is ascending fact ID.
- [ ] Expiry cleanup is opportunistic and locked.
- [ ] Release is safe to repeat.
- [ ] Workspace/page reuse matrices pass.
- [ ] Ten concurrent sessions produce one winner and no partial losers.

### Lineage

- [ ] Reverify preserves identity.
- [ ] Meaning change requires correction.
- [ ] Invalidation and supersession are distinct.
- [ ] Successor creation is atomic.
- [ ] Self-reference, cross-workspace, cycle, and second successor fail.
- [ ] Correction race produces one legal outcome.
- [ ] Published snapshots remain unchanged.

### Indexes, security, and reproducibility

- [ ] Every FK has useful index coverage.
- [ ] FTS/trigram/identity/reuse/reservation queries use intended indexes.
- [ ] Duplicate search and simple writes meet local p95 targets.
- [ ] Both Phase 4 tables have RLS enabled.
- [ ] Direct caller table/sequence privileges remain absent.
- [ ] Private helper execution remains revoked.
- [ ] `api` has zero business routines.
- [ ] Security advisor reports no error.
- [ ] Clean reset succeeds twice.
- [ ] All repository gates pass.
- [ ] Existing migrations remain unchanged.
- [ ] No remote project, secret, commit, or push is involved.

## 29. Risk controls

| Risk | Required control |
| --- | --- |
| False merge corrupts canonical history | Eligible structured allowlist, complete discriminators, zero-false-merge gate, human review |
| Similarity is mistaken for truth | Candidate-only boundary and source policy kept separate |
| Hash equality hides a collision | Compare canonical input and fail with collision condition |
| Identity changes silently | Versioned normalization/ontology, domain separators, deterministic fixtures |
| Holdout is tuned indirectly | Freeze checksum before thresholds; no retuning against holdout |
| Competitor claim becomes production fact | Fixtures only; no seed/verification without authoritative sources |
| Stale fact gets used | Server effective expiry and locked eligibility recheck |
| Reservation partially succeeds | Ordered locks and one short transaction for the whole set |
| Page config changes after reserve | Persist context snapshot; Phase 5 rejects mismatch |
| Released usage blocks forever | Reuse predicates include only allocated/published |
| Meaning correction rewrites history | Successor lineage and immutable junction snapshot |
| Private helper becomes public API | Internal schema, explicit revokes, catalog tests |
| Search becomes slow | FTS/trigram/composite/partial indexes and explain/performance gate |
| Migration history is rewritten | Additive correction migrations only |
| Phase 4 drifts into Phase 5 | Zero `api` routines and explicit deferred-work audit |

## 30. Rollback and recovery

Phase 4 is local-only. Normal recovery is:

1. Stop the affected checkpoint.
2. Preserve evidence and migration source.
3. Correct an accepted/shared migration through a new additive migration.
4. Reset the local database.
5. Replay the complete migration chain and tests.

Do not delete migrations to hide failures, rewrite Phase 3 migrations, loosen
fixture labels, disable security constraints, reset a linked database, or push
a broken schema. Generated local state is disposable; migrations, fixtures,
and tests are the durable record.

## 31. Checkpoint report template

```text
Status:
- Complete / blocked / complete with notes

Checkpoints completed:
- 4.x ...

Files changed:
- ...

Migrations generated through Supabase CLI:
- filename — group and purpose

Invariants implemented:
- ...

Fixtures/tests added:
- counts, split, and coverage

Verification:
- command — result

Security and scope:
- no remote project
- no secret
- no caller grant or api RPC
- no later-phase object
- no commit or push

Blockers/change records:
- ...

Deferred explicitly to Phase 5:
- ...

Next action:
- wait for CR approval / mid-audit / final audit
```

## 32. User command sequence

Recommended efficient sequence:

1. In a new implementation chat: `Kerjakan Phase 4 batch A (4.1–4.4) sesuai plans/works/phase-4-implementation-plan.md. Berhenti pada change-record approval atau setelah 4.4.`
2. Approve or reject CR-004 when requested.
3. Return the 4.1–4.4 report for independent mid-audit.
4. Send remediation findings to the same implementation agent.
5. After the mid-audit passes: `Lanjutkan Phase 4 batch B (4.5–4.8). Berhenti setelah final report; jangan mulai Phase 5.`
6. Return the final report for independent Phase 4 audit.
7. Commit Phase 4 only after the final audit is clean and the user explicitly
   requests the commit.

## 33. Phase 4 exit and Phase 5 entry

Phase 5 may begin only when:

- CR-004 is accepted and implemented exactly.
- Both Phase 4 tables and every private primitive pass clean-reset tests.
- Gold development and untouched holdout gates pass.
- Reservation concurrency produces one winner without partial state.
- Source/freshness, reuse, snapshot, and lineage invariants pass.
- Catalog and security audits show no caller exposure.
- No unresolved Phase 4 defect remains.
- The final independent audit is clean.
- Phase 4 changes are committed by explicit user request and the working tree
  is clean.

Phase 5 then adds authenticated transactional RPCs. It must not compensate for
an unresolved canonical identity, source policy, reservation context, reuse,
snapshot, or lineage defect left by Phase 4.
