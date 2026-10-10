# CR-004 — Phase 4 trivia persistence reconciliation

| Field  | Value                                               |
| ------ | --------------------------------------------------- |
| Status | Accepted                                            |
| Date   | 9 October 2026                                      |
| Scope  | Phase 4 trivia database module, checkpoints 4.2–4.6 |

## Conflict

The frozen contracts require three pieces of persistence that the illustrative
reference DDL cannot represent faithfully.

### 1. Risk class is supplied by the fact contracts but has no canonical storage

`plans/tool-inventory.md` section 12.2 requires each registration candidate to
carry `risk_class: standard | sensitive`; sections 12.4 and 12.5 require the
same value for re-verification and correction. `plans/trivia-content-dna.md`
section 17 defines materially different source and freshness treatment for
sensitive claims. In contrast, `plans/database-design.md` section 8.1 lists
identity, source, verification, freshness, and reservation columns for
`trivia_facts`, but no `risk_class` column.

Without canonical persistence, later verification, freshness enforcement, and
immutable post evidence would have to infer sensitivity from prose or topic.
That conflicts with the accepted lifecycle and source-policy contracts.

### 2. The accepted reservation binding cannot fit in the reference reservation columns

`plans/phase-0-decision-register.md` section 9.4 says that one reservation
token is bound to owner, workspace, Page, reuse-scope snapshot, config version,
ordered fact IDs, and canonical request fingerprint, with server timestamps and
expiry. `plans/module-contract.md` section 14.1 likewise requires workspace,
Page, niche scope, the exact reserved item set, server expiry, and atomic
claim/reclaim.

The `trivia_facts` reference DDL in `plans/database-design.md` section 8.1
stores only `reservation_token`, `reserved_for_page_id`, `reserved_at`, and
`reserved_until`. It has no storage for actor, reuse scope, config snapshot,
ordered fact set, request hash, niche, or a versioned context. The typed columns
therefore cannot prove the required token binding or exact-set invariant.

### 3. The reference junction snapshot is too narrow for immutable usage evidence

`plans/phase-0-decision-register.md` section 9.6 requires a junction snapshot
to retain canonical wording/hash, identity and ontology versions, source schema
and sources, verification/freshness state, `verified_at`, `as_of_date`,
`expires_at`, and review evidence version. The same section requires those
snapshots to remain unchanged when canonical source metadata changes.

`plans/database-design.md` section 8.2 instead defines
`trivia_post_facts.source_snapshot` as a source array and its constraint says
that `source_snapshot` is an array with at least one item. An array cannot hold
the complete, versioned fact-usage evidence required by the accepted decision.

## Proposed amendment

The following narrowly scoped amendment reconciles persistence with the frozen
behavioral contracts. It does not change the public tool contracts, introduce a
new public API, or authorize any new persistent domain table.

1. Add `public.trivia_facts.risk_class text not null` with a check allowing
   only `standard` and `sensitive`. It is authoritative canonical metadata,
   never inferred later from `topic_key` or wording, and is copied into every
   immutable fact-usage snapshot.
2. Add `public.trivia_facts.reservation_context jsonb null`.
   It is null exactly when `reservation_status = 'available'`. When the row is
   reserved, it contains a closed-schema `ReservationContextV1` object:

   ```text
   schema_version: 1
   actor_user_id: UUID
   workspace_id: positive bigint
   page_id: positive bigint
   niche_key: trivia
   fact_reuse_scope: workspace_unique | page_unique
   config_schema_version: 1
   config_updated_at: RFC 3339 timestamp
   ordered_fact_public_ids: unique UUID array, length 1..9
   request_hash: lowercase SHA-256 hex
   ttl_minutes: integer 5..120
   reserved_at: server RFC 3339 timestamp
   reserved_until: server RFC 3339 timestamp
   ```

   Private reservation primitives generate this object. Its typed values must
   agree with the reservation columns, and every row for a token must contain
   the same canonical JSON object and exact ordered fact set.

3. Retain the name `source_snapshot` on `public.trivia_post_facts`, but redefine
   it as one closed-schema `FactUsageSnapshotV1` object rather than a raw source
   array. The object contains the complete fields required by Phase 0:
   canonical claim/normalized claim, identity and ontology versions, claim and
   structured hashes/keys, structured eligibility, topic, risk class, source
   schema version and `sources`, verified status/time, `as_of_date`, expiry,
   and dedup-review schema version. `claim_hash_snapshot` and
   `verified_at_snapshot` remain typed projections and must equal the object.
   The snapshot is created from a locked eligible fact at allocation and is
   immutable; it is never rebuilt from mutable canonical data.

## Implementation mapping if approved

| Checkpoint | Scope constrained by this amendment                                                                                                                           | Required proof                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| 4.2        | Add `risk_class` and nullable `reservation_context`; enforce allowlist and available/reserved nullability shape.                                              | `trivia_facts` schema, check, RLS, and privilege catalog tests.                               |
| 4.3        | Add closed validators for `risk_class` use in verification/freshness and `ReservationContextV1` syntax, bounds, timestamps, and JSON shape.                   | Source/freshness and closed-schema negative tests.                                            |
| 4.5        | Define and validate `FactUsageSnapshotV1`; replace the raw-array invariant on `source_snapshot`; copy risk and assert typed projection equality/immutability. | Junction snapshot completeness, mismatch, source-refresh, and publication-immutability tests. |
| 4.6        | Generate reservation context server-side and enforce exact context/set equality per token.                                                                    | Context mismatch, all-or-none, expiry, release, and separate-session race tests.              |

The amendment does not authorize checkpoint 4.5 objects during Batch A before
their planned checkpoint; it only records their required eventual shape.

## Affected validators, snapshots, and tests

- Validators: canonical fact risk allowlist; `ReservationContextV1` closed
  schema and typed-column agreement; `FactUsageSnapshotV1` closed schema and
  projection agreement; existing source/freshness validators use persisted risk
  rather than inferred topic/prose.
- Snapshots: reservation context is server-produced at reserve time; usage
  snapshot is server-produced at allocation time and immutable thereafter.
- Focused tests: fact schema/state/privilege tests (4.2), identity/source/
  freshness validation tests (4.3), candidate tests where risk blocks automatic
  verification (4.4), post-fact snapshot tests (4.5), and reservation/reuse
  plus ten-session concurrency tests (4.6). Tests must reject unknown keys,
  wrong types, invalid versions, non-canonical values, mismatched projections,
  and token rows with different context or ordered sets.

## Scope and approval condition

This record was accepted by explicit user approval on 9 October 2026. It
authorizes only the additive Phase 4 persistence changes and validators mapped
above. It does not authorize a public `api` RPC, a seed fact, or a remote
action.
