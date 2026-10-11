# CR-012 — Trivia RPC composition, historical replay and lock protocol

| Field     | Value                                                                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                                                        |
| Date      | 11 October 2026                                                                                                                                 |
| Authority | User accepted the independent Batch A audit and explicitly authorized checkpoint 5.5 and documenting these decisions before its first migration |
| Scope     | Exactly five trivia RPCs; 19 → 24 API routines; private composition and evidence required by these operations                                   |

## Sources and reconciliations

Authority: Phase 0 CORE-001/003/004/007/008 and FACT-001..006; tool inventory
§§6, 11, 12; database design §§8, 9, 12, 17; trivia DNA §19.4; CR-004,
CR-005, CR-009, CR-010 and CR-011. Frozen documents and applied migrations
remain unchanged. This record supplies missing executable definitions and a
scoped replay envelope; it does not add another public operation.

## 1. Historical response and token privacy

Only the four trivia writes may complete a ledger envelope v5. Its closed shape
is `schema_version`, `operation_name`, `target_public_id`, and `response`, with
a maximum serialized size of 64 KiB. The response contains only the bounded
inventory success projection, including canonical wording (at most nine claims
of 500 characters), action, public identifiers, statuses and timestamps. It
contains no source payload, post copy, request input, bigint identifiers or token.
This reconciles the minimal ledger rule with exact successful replay.

The reserve success response **does contain reservation_token**. Before ledger
completion that one field is removed. The canonical request hash binds the
supplied UUID-v4 token. After authorization and exact operation/hash validation,
replay restores that field from the identical request, and changes only
`data.replayed` to true. No mutable-row reconstruction is allowed. Replay after
release, expiry, reclaim or correction retains original times/actions/claims;
it does not reserve again or extend the lease. Corrupted snapshots fail closed.
Other envelope versions remain unchanged. Tests compare digests, keep tokens
in memory, use stdin for SQL, disable test error-statement logging, and never
throw SQL/results or token-bearing assertions into output.

## 2. Source-free candidate retrieval

The public find input remains exactly the frozen input, with no sources field.
A new private retrieval adapter permits an empty source array **only for search**.
It omits source_overlap from signals and score components when no source data is
provided. Registration/correction use real validated source evidence. No dummy
source is manufactured and source validators are not weakened. Public signals
are projected to the inventory allowlist; private topic/relation scores are not
additional public signals. Existing ranking and the 0.20 trigram threshold stay
unchanged; development/holdout fixtures are not retuned.

Public rate-limit testing found a baseline defect: begin_read_v1 consumed a
bucket but ignored its allowed flag. An additive shared-kernel repair replaces
that call with assert_rate_limit_v1, exactly once, and rejects null version/group.
This restores the frozen rate contract for the existing ten reads as well as
trivia search; no public signature, operation or limit changes. The full read
regression suite and an explicit existing-read RATE_LIMITED case are required.

## 3. Single ordered lock protocol

All new logical writes use:

1. Validate identity/client, owner scope and closed typed input; rate bucket.
2. Claim ledger key; replay returns before business locks.
3. Workspace `FOR NO KEY UPDATE` gate. This serializes trivia writes, but is
   compatible with FK KEY SHARE taken by ledger insertion. FOR UPDATE would
   permit a lock-upgrade deadlock between transactions with new ledger rows.
4. Page rows in ascending ID, then config rows for those Pages in ascending ID.
5. Distinct schedule advisory keys numeric ascending, if occupancy changes.
6. Plans, then items in their specified deterministic order (CR-011 claim
   position/id and SKIP LOCKED exception remains scoped to its Page/plan gate).
7. Posts in ascending ID.
8. Materialized identity and lineage advisory keys in numeric ascending order.
9. Facts in ascending ID, then junctions in ascending ID when needed.
10. Mutate, append history, complete the owned ledger.

Skip unused layers; never acquire an earlier layer while holding a later one.
Correction does not change schedules, plan items or allocations. It locks every
Page represented by current reservation/active usage, and every affected mutable
post, before locking facts. Lineage's existing workspace advisory key is included
before facts so the Phase 4 trigger only reacquires an already-owned lock.

After acquiring workspace, rediscover affected Pages/posts/facts. Re-read target
membership, current config, status, CAS and token/context after each wait.
Expiry tests use clock_timestamp after locks, not transaction-start now().
The workspace gate makes discovery stable against cooperating fact/usage writers.

Phase 5.6 save/revise and 5.7 approve/publish/discard must reuse this gate and
ordering before Page/plan/post/fact locks. They must not obtain workspace after
Page. Existing 5.4 RPCs retain CR-011: they do not obtain workspace late or write
facts/junctions. Page-only config writes cannot produce a reverse workspace wait.
Lock/statement limits remain 2/15 seconds; query_canceled is explicitly caught.

## 4. Strong candidates and canonical actions

Within the ranked top 20 current candidates, a strong candidate has exact claim,
equal structured identity (safe or review-only), FTS > 0, trigram >= 0.20, or
equal subject key. Topic alone, generic/empty qualifier or number equality, and
source overlap alone are supporting signals. Exact hash/identity collision
lookup is independent of the candidate cap. Hash equality is always checked
against its complete canonical input. Unsafe equal structured identity requires
review/discrimination and cannot be forced distinct or merged.

The transaction reruns retrieval after the workspace/identity gates. Creating a
new distinct fact requires a distinct decision and at least one actual material
discriminator for every strong candidate. Missing/new reviews return
FACT_REVIEW_REQUIRED. Reviews reference current owner-workspace facts; duplicates,
uncertain, incompatible same decisions and invented material differences fail.
Multiple same decisions must resolve to one identity-compatible row. Exact
matching cannot be overridden by distinct. A set cannot contain the same resolved
canonical fact twice.
An exact claim with contradictory supplied material identity returns
FACT_REVIEW_REQUIRED; exact normalized wording is not permission to ignore
different numbers, negation, entities or qualifiers. This is an integrity guard,
not a new automatic semantic comparison.

For rows newly created earlier in the same submitted ordered set, their generated
public IDs were unavailable when the caller assembled dedup_reviews. Those rows
are tracked explicitly in a private per-call ID array. A later member must have
a different complete material structured identity; exact/unsafe identity collision
and duplicate canonical rules still apply. Only the review-reference requirement
for these newly created intra-set rows is skipped. Existing rows (including rows
refreshed in this call) still require all strong reviews. No semantic same/distinct
attestation is fabricated; caller-supplied material discriminators are the
deterministic anti-merge proof for this narrow within-set case.

Fresh eligible matched rows retain canonical evidence (`matched_existing`).
Expired verified or exact needs-review rows may be refreshed/promoted using the
fully validated supplied evidence without changing identity (`refreshed_existing`).
New identity creates a verified row (`created_new`). Any failure rolls back the
entire set, including earlier inserts/refreshes. A correction successor must be a
new, materially changed identity; a current matching successor identity returns
FACT_CORRECTION_CONFLICT rather than attaching an unrelated existing lineage.

## 5. Historical reservation binding and release

Add one private append-only table, internal.trivia_reservation_sets, with public
UUID, tenant-scoped ledger/Page references, actor, domain-separated token
fingerprint, canonical request hash, ordered unique fact public IDs, config/reuse
snapshot, server initial timestamps and TTL. No raw token is stored there. API
owner may SELECT/INSERT only; RLS repeats the active-workspace owner predicate;
caller roles have no table/sequence/helper access. Retain for the no-expiry ledger
horizon. Application UPDATE is prohibited; administrator deletes are fixture
cleanup only. Current facts still hold the typed active token/context from CR-004.

Release resolves the original set by workspace and fingerprint, verifies actor
and Page, and locks its facts ascending. It clears only current reservations
still belonging to that token/context. Active rows cleared are returned as released
IDs. Already inactive count is original set size minus active releases; expired,
converted, corrected, released or differently reclaimed facts are inactive.
Expired owned rows may be cleared without counting them as active releases.
Unknown tokens succeed empty with count zero and do not disclose other tenants.
An existing same-tenant token on another Page returns FACT_RESERVATION_MISMATCH.
Config changes do not block safe release under the original binding. Junctions
are never released by this operation.

An active identical token/context can retain its original lease under a new key,
without renewal. Inactive/incomplete historical sets cannot be revived with a new
key; a new logical reserve requires a new token. Same-key historical replay is
still successful. Freshness/source failures remain separate from reservation,
reuse and context errors.

## 6. Exact CAS, freshness and affected posts

Compare expected_fact_updated_at with locked updated_at using exact timestamptz
equality (same instant, all six fractional digits), without rounding/tolerance.
The baseline shared touch trigger uses transaction-start now(). A delayed write
could move fact updated_at backwards or reuse a timestamp within one transaction.
An additive fact-only touch trigger therefore uses max(clock_timestamp(), old
updated_at + one microsecond) on real changes. Other table touch triggers remain
unchanged. This is required for exact CAS after waiting, not a tolerance rule.
Null/nonfinite timestamps fail validation; stale timestamp returns
FACT_CORRECTION_CONFLICT. Expose fact_updated_at within safe freshness summaries
and reverify results for the next CAS, as an explicit missing-projection
reconciliation. Same-meaning reverify updates evidence/risk/freshness only and
retains claim/structured identity and all usage snapshots. Effective expiry is
min(requested expiry, server class ceiling); expired requested time fails. Stable
24 months, periodic 12 months, volatile 90 days with the required supplied review
rationale, sensitive additionally capped at 180 days. Phase 4 source validators
and its verified-row source policy remain enforced.

Affected outputs contain exact total counts and at most 50 public summaries per
status group, sorted by public UUID, with explicit truncation flags. Counts for
posted include archived, and summaries retain their actual status. Response caps
never cap mutation. Every affected allocated draft/ready is updated once: draft
stays draft; ready becomes draft; revision increments once; ready_at/approval are
cleared; quality becomes failed; editorial current evidence is cleared; server
system evidence records blocking trivia.facts.current_verified on current revision
and unchanged content hash. It does not relabel old editorial checks as current.
Content, schedule, allocation and snapshots remain unchanged. Posted/archived and
published junction rows remain byte-identical; existing get_post fact warnings
provide current correction visibility. Reverification returns mutable summaries
without mutating post approvals or snapshots.

The cumulative API-owner role consequently needs UPDATE on status, quality_status,
revision, ready_at, approval_snapshot, system_checks and editorial_checks, in
addition to the existing row-lock id privilege. The old 5.4 assertion denying all
status UPDATE is superseded by an exact column allowlist assertion that denies
content, schedule and publication writes, plus an assertion that the six plan
RPCs and their private plan helpers never UPDATE posts. Caller direct access and
event-history immutability assertions remain unchanged.

## 7. Required evidence and deferred dependencies

Exactly 24 owner-scoped API routines; four exact replays/mismatches/rollbacks;
source-free search; safe errors; ten public reservation callers; overlapping sets;
expiry/release/history; exact CAS and competing correction/reverify; cross-Page
draft/ready effects and immutable posted/archived snapshots; bounded response;
catalog/RLS/default ACL and no token in ledger; clean reset and all 5.5 gates.

Correction versus public approve/publish is **DEFERRED — NOT PASSED** until 5.7,
then final 5.9. Administrative post/publication fixtures do not prove those RPCs.
CR-011 save/cancel and opposite-direction reschedule evidence stays deferred to
5.6. Stop at the 5.5 report. No later RPC, remote action, commit or push is authorized.
