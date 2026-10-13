# CR-016 — Batch B audit remediation and reproducible closure

| Field     | Value                                                                                                                                  |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Status    | Accepted                                                                                                                               |
| Date      | 12 October 2026                                                                                                                        |
| Authority | User explicitly authorized implementation of the remediation plan and its two additional requirements before any remediation migration |
| Baseline  | 289afe31d7700cdee962ce8e8d014c449100041c; 63 migrations, 33 RPCs; clean tree                                                           |
| Scope     | Four independent Batch B findings; local data normalization, regression and acceptance evidence only                                   |

## Authority and precedence

Frozen Phase 0 remains the primary contract: PRD §§13.2/17/26, decision register
CORE-001/005/006, FACT-005 and QUALITY-001..005, module contract §§8/10/12,
trivia DNA §§9/19, tool inventory §§12/15, database design and Phase 5 §§17–18.
CR-009 and CR-011..015 remain valid for their expressly reconciled subjects.
This record restores implementation conformance; no frozen document, old
migration, fixture label, public operation/signature, hash formula or threshold
is amended. Implementation/helper revisions are bug repairs under the existing
version-1 contract, not a reinterpretation of historical evidence.

## 1. Non-retroactive allocation reuse — P1-01

Reuse eligibility is decided when an allocation is created. A later legal use
on another Page with page_unique does not invalidate the earlier workspace_unique
allocation (PRD §13.2). Registration and every new allocation still check current
workspace/Page reuse after locks. Removed and subsequently re-added facts are
new allocations and require a new reservation and full reuse validation.

Retained current allocated junctions are not re-reserved or subjected to a new
cross-Page workspace_unique decision. Same-Page active/published uniqueness stays
enforced. Approve/publish validate their own complete current allocated set,
identity, dedup, source, canonical AND usage freshness, renderer/hash/config/CAS
and all other gates, without retroactively blocking a legal cross-Page use.
Workspace/Page/plan/post/identity/fact/junction lock ordering remains unchanged.
This clarifies the general “reuse” language of CR-013/014 without weakening the
eligibility rule for any new allocation.

## 2. Draft quality and existing-data normalization — P2-01

New save/revise results are pending if nonblocking evidence is complete/pending,
or failed under the existing blocking/incomplete-attestation failure rules. Neither
write sets passed. Only explicit approval/effective lifecycle gate establishes
passed; ready content revision clears approval and returns to draft.

Audit ALL current rows where status=draft, quality_status=passed and
approval_snapshot IS NULL, including inactive workspaces. Initial local census:
posts=0, drafts=0, qualifying=0, Auth users=0, workspaces=0. The additive migration
also includes a bounded-purpose administrative normalization, so an existing
database cannot retain the defective derived state merely because fresh writes
are repaired. Its invoker helper is migration-executor owned, has empty search_path,
no arguments and no caller/API-owner EXECUTE; it is never a public request path.

The repair takes workspace/Page/plan/item/post locks in the established order,
rechecks the predicate and validates any nonempty old evidence. For each qualifying
draft it changes quality to pending/failed, increments revision once and rebinds
valid system/editorial post_revision only. Original evaluation times, results,
hash/copy/generation, schedules, allocations, source snapshots and null approval
are preserved. No owner approval, evaluation or operation-ledger entry is invented.
Empty legacy evidence stays empty. Invalid nonempty evidence fails closed and
requires investigation; it is not silently relabeled. A second normalization
changes zero rows. The migration reports the exact count using a safe NOTICE.

Ledger, post_write_history and historical v6/v7/v8 responses are never updated.
An original historical save response containing passed continues to replay exactly;
that historical shape remains readable although fresh drafts cannot emit passed.
Posted/archived/discarded and approved rows are excluded from the repair.

## 3. Complete config-aware preferred profiles — P2-02

trivia.profile.preferred_band evaluates fact count, total Canva words and EACH
raw fact word count using the selected profile in the locked version-1 Page
config. Profile ranges may be narrowed inside their already validated frozen
limits; hardcoding only the defaults would ignore valid current configuration.
Plan-selected profile_key remains enforced. No generation-snapshot field or
renderer/content-hash change is required: the existing config UUID/time binding
already resolves the immutable captured context for a permitted current write.

Use a private config-aware computation shared by save/revise/approve/publish.
Keep the legacy private signature usable with frozen defaults for deterministic
fixtures; all public writers use their locked config. Existing warning ID,
severity and result shape remain; deviations are needs_review, not a hard failure.
Acceptance requires the exact applicable ID and safe owner reason. Hard readability,
source, correction, safety and critical editorial failures cannot be waived.
Publish blocks a newly applicable unaccepted warning per CR-014. Old approval and
published evidence are not rewritten; revoke then explicit reapproval is recovery.

## 4. Parameterized retrieval performance — P1-02

Measure old and new through api.trivia_find_similar_facts as authenticated with
owner/client request claims on the SAME 5,001-fact fixture and candidate. Keep
fixture identities/data unchanged across migration application; record a digest,
baseline/current function digest, warm-up, twelve raw timings and nearest-rank
p95 including local caller-process overhead. No private/literal query timing is
substituted for public performance. Rate groups/limits remain intact.

First optimize repeated parameter-dependent normalization/structured identity,
eligibility and tsquery work by explicitly computing input once. Preserve current
statuses, signal/score values, source-free omission, strong predicate, exact/hash
collision behavior, threshold 0.20 and ordering exact/structured/FTS/trigram/UUID.
No prefilter may drop candidates merely to meet timing. Index changes need actual
plan evidence, not speculation. Capture EXPLAIN (ANALYZE, BUFFERS) on the public
RPC and diagnostic helper with normal planner; never disable enable_seqscan.
Public 150-case development/holdout evaluation and differential result comparisons
must prove equivalence. The 5,001-fact public p95 target is <=3,000 ms.

## 5. Required closure and scope

Record failing public regression executions against the unchanged baseline before
applying repairs. Exercise reuse both orders/new-versus-retained/re-addition,
approval/CAS/rollback/non-owner, draft normalization idempotence with exact original
replays, both profiles and narrowed config boundaries, new publish warnings,
retrieval equivalence/gold/performance, and all existing lifecycle/metrics races.

Preserve all 63 old migration bytes; CLI-create additive migrations only. Public
surface stays 33 (11 read/22 write), tables stay 15/15 RLS, caller grants remain
denied, API-owner privileges do not widen, CR-009 stays the sole private definer.
Evidence uses a new phase-5-batch-b-remediation namespace; old reports/JSON remain.

After source is final, run two independent safe local resets, source/history/catalog
checks after each, check, test-all, verify-migrations, smoke-test, supabase:verify,
local Security Advisor and baseline diff checks. Source changes after reset A
invalidate that acceptance pair. Inspect local data before every reset; preserve
non-fixture data rather than deleting it. Report actual failures/recoveries, final
cleanup and remaining risks. Stop for independent re-audit; no Phase 6, remote
project/resource, secret, commit, push or deployment is authorized.
