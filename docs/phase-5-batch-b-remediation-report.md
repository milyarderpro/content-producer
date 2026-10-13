# Phase 5 Batch B — CR-016 remediation handoff

Baseline **289afe31d7700cdee962ce8e8d014c449100041c**. Implementer verification of
all four audit findings is complete locally; **independent re-audit is pending**.
HEAD remains the baseline, with remediation files uncommitted for review.
No Phase 6, commit, push, fetch, deployment, cloud-project/resource access or secret
creation occurred. Frozen contracts, all 63 baseline migrations, seed/config and
the original 5.9 reports/JSON are byte-identical to baseline.

## 1. Authority and source

CR-016 and the remediation runbook were written before CLI created the first
remediation migration, following explicit user authorization. Authority is frozen
Phase 0, reconciled only as stated in CR-016; CR-009 and CR-011..015 remain scoped.

- `docs/decisions/2026-10-12-phase-5-batch-b-audit-remediation.md`
- `plans/works/phase-5-batch-b-remediation-plan.md`

Four CLI-created additive migrations, applied locally without a SQL forward-fix:

| Migration in `supabase/migrations/`                          | Purpose                                                                                                    |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `20261012124844_restore_nonretroactive_allocation_reuse.sql` | Separate new allocation eligibility from retained legal usage; preserve same-Page uniqueness               |
| `20261012124847_normalize_unapproved_draft_quality.sql`      | New drafts pending/failed; administrative idempotent legacy normalization with revision/evidence rebinding |
| `20261012124850_enforce_config_aware_preferred_profiles.sql` | Full fact-count/total-word/per-fact preferred ranges using locked Page profiles                            |
| `20261012124852_materialize_trivia_candidate_input.sql`      | Compute parameter-dependent canonical input/eligibility/tsquery once; preserve retrieval semantics         |

Total **67 source/applied migrations**, unique/ordered and source-manifest bound.
There are still exactly **33 API RPCs, 11 reads/22 writes, 15 RLS-enabled tables**.
No public signature, renderer/hash formula, schema/gate/rubric version, dedup
threshold/ranking, business grant or frozen fixture label changed.

## 2. Actual pre-fix failures and development recovery

New regressions ran against the unchanged 63-migration database before repair:

| Regression                                                 | Actual baseline outcome              |
| ---------------------------------------------------------- | ------------------------------------ |
| Legal A workspace_unique / B page_unique retained revision | FAIL, FACT_REUSE_BLOCKED             |
| All-pass draft pending before approval                     | FAIL, returned passed                |
| Uneven per-fact profile words                              | FAIL, preferred_band returned passed |
| Narrowed fast_trivia profile                               | FAIL, preferred_band returned passed |
| Narrowed practical_utility profile                         | FAIL, preferred_band returned passed |
| Authenticated search with 5,001 facts                      | FAIL, p95 **4,065.5 ms** >3,000      |

Baseline focused run: **6 failed, 2 explicitly unselected, 79.96 s**. Unselected
normalizer/concurrency cases were not counted passed. Raw local log:
`/tmp/opencode/cr016-baseline-red.log`.

Development failures were not final-gate passes:

1. Typecheck found the test helper's inferred UUID template type versus a stored
   token string. The helper parameter received an explicit string type; runtime
   validation remains in the typed public RPC, unchanged.
2. First post-repair focused run: **7/8**. A new snapshot assertion compared the
   null-stripped get_post projection with the write package. It now compares full
   persisted source snapshots before/after public actions, strengthening the
   immutability proof rather than weakening it. No production SQL change followed.
3. Initial check found generated JSON using default print width 80 instead of the
   repository's 100. New evidence writers resolve repository Prettier config;
   only new artifact formatting changed.

Final focused remediation: **11/11, 3 files, 108.80 s**. Existing relevant
renderer/approval/lifecycle/concurrency/trivia/security/acceptance regression:
**48/48, 7 files, 294.66 s**. Check then passed. Logs remain under `/tmp/opencode/`.

## 3. Per-finding closure evidence

### P1-01 — Non-retroactive reuse

Public authenticated tests prove legal cross-Page reuse no longer blocks retained
revision, subsequent explicit approval or publication. Partial replacement still
checks new facts; attempting to re-reserve the specifically removed fact while B
uses it remains FACT_REUSE_BLOCKED. Same-Page reuse and a new workspace_unique Page
remain blocked. Retained usage snapshots are compared in their complete stored
form. Publish replay and permanent archive usage remain exact.

Separate sessions hold actual public B save or A publish uncommitted, observe the
waiter lock, and test both commit orders. Both operations commit legally; A ends
posted, B retains five allocations. Subsequent public correction does not rewrite
A's published junctions. Existing correction/reverify/lifecycle CAS races passed
in both full acceptance runs.

### P2-01 — Draft state and all legacy drafts

Initial ALL-row local census: **posts=0, drafts=0, passed unapproved drafts=0,
users=0, workspaces=0**. No non-fixture local data was removed.

The same-process old/new exercise created actual save/revise outputs through the
baseline public RPCs and kept their capabilities in memory across CLI migration
application. **Two real baseline passed drafts**, one in an inactive workspace,
were normalized to pending with revision +1. Complete original ledger/history
digests, copy/hash/generation/schedules/source snapshots and approved/published
controls remained unchanged. The original passed save and revise responses replayed
exactly after normalization. Second normalization changed **0** rows.

The repeatable suite also emulates valid legacy response/data shapes, tests an
inactive failed draft normalizes to failed, and injects invalid nonempty evidence
after another row could be changed. The repair fails QUALITY_EVIDENCE_STALE with
full rollback. Public get/replay verifies the corrected current state and exact
original history. New all-pass save/revise remain pending until explicit approval;
ready revision clears approval. The administrative repair helper is invoker-owned
by postgres, has empty search_path, no arguments and **no caller/API-owner EXECUTE**.
It is not an API operation or extra private SECURITY DEFINER exception.

### P2-02 — Full preferred-profile checks

The `[1,18,8,8,8,7,6]` / 65-word fixture now yields needs_review. Missing acceptance
fails WAIVER_NOT_ALLOWED without mutation; exact existing warning ID/reason permits
owner approval while retaining needs_review. Hard readability failure is still
unwaivable. Both profiles honor narrowed valid Page ranges through save/revise/
approve/publish. A controlled historical ready fixture with absent acceptance
cannot publish when the newly recomputed warning applies; exact historical replay
remains valid, and public revoke/explicit reapproval restores legal publication.

### P1-02 — Actual authenticated old versus new performance

`scripts/phase-5-remediation-exercise.ts` measures the **same 5,001-fact fixture and
candidate before and after applying the four migrations**, not two regenerated
datasets. Fact count and full-row digest remain identical:
`93d96d699e2701ab57117b0af40b71c1`. Four representative public retrieval result
digests also remain exact: `ac8aebb557bd6133044abd166e2b0401b63eb12044626d60242630b704f79c00`.
Source/function digests are recorded separately. No private/literal timing replaces
the actual authenticated public measurements.

| Authenticated operation                   |      Actual p95, n=12 |     Target |
| ----------------------------------------- | --------------------: | ---------: |
| Baseline, same 5,001 rows / one candidate | **3,798.8 ms — FAIL** | <=3,000 ms |
| Repaired, SAME rows/candidate             |   **242.2 ms — PASS** | <=3,000 ms |
| Repaired, nine candidates                 | **1,033.9 ms — PASS** | <=3,000 ms |
| Fresh reset A, 5,001 rows                 |   **293.0 ms — PASS** | <=3,000 ms |
| Fresh reset B, 5,001 rows                 |   **253.5 ms — PASS** | <=3,000 ms |

Raw samples, warm-up convention, normal-planner public/helper EXPLAIN ANALYZE
BUFFERS and enable_seqscan=on are stored in the before/after/search-A/search-B JSON.
Public search EXPLAIN after repair: **123.470 ms** in the same-fixture comparison;
reset A/B: **152.731 / 131.592 ms**. Existing metrics capture indexes still serve
latest/history/core insights; no speculative index or planner override was added.

All **150** frozen pairs run through public authenticated source-free search:
development 105 cases / 63 of 63 same candidates; holdout 45 / 27 of 27. Exact and
structured expected signals all found, unsafe automatic signals **0**, deterministic
repeatability and omission of source_overlap proved. Fixture labels/checksums were
not changed. This is deterministic retrieval evidence, not factual research proof.

## 4. Final clean-room gates — source frozen before A

Both clean local resets succeeded on first execution. No SQL/code repair or reset
retry occurred between A and B. No manually patched database was used. Each reset
was preceded by complete fixture/user/business/storage cleanup inspection. The
existing local Realtime stop-before-reset wrapper was retained.

| Command/check                                     | Actual result                                                                    |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `pnpm run supabase:reset` A                       | PASS, 67 source migrations, unchanged no-op seed                                 |
| Catalog/history/source proof A                    | PASS, exact applied order and manifest                                           |
| `pnpm run check` standalone and nested test-all   | PASS, formatting/lint/typecheck + 3/3 unit tests                                 |
| `CR016_EVIDENCE_RUN=A pnpm run test-all`          | **PASS, 172/172 DB tests, 38 files, 1,418.74 s**                                 |
| `pnpm run verify-migrations`                      | PASS, 67 valid filenames; also nested in both required suites                    |
| `pnpm run supabase:verify` A                      | PASS, explicit local 67/67 history                                               |
| Security Advisor A                                | PASS, No issues found                                                            |
| `pnpm run supabase:reset` B                       | PASS, independent reconstruction from identical source                           |
| Catalog/history/source proof B                    | PASS, deep-equal A including all function-definition hashes/ACL and policy roles |
| `pnpm run supabase:verify` B                      | PASS, explicit local 67/67 history                                               |
| Security Advisor B                                | PASS, No issues found                                                            |
| `CR016_EVIDENCE_RUN=B pnpm run smoke-test`        | **PASS, 172/172 DB tests, 38 files, 1,431.66 s**                                 |
| Final source/catalog/cleanup                      | PASS, deep-equal B after all tests                                               |
| `git diff --check` and `git diff --check 289afe3` | PASS                                                                             |

Security Advisor invocation:
`pnpm exec supabase db advisors --local --type security --fail-on error`.
All unfamiliar CLI invocations were preceded by help. CLI migration-list “Remote”
means the history of the explicit local target, not cloud access.

Representative public metrics/read p95 A/B (milliseconds): get_post **118.5/223.6**,
list_posts **120.1/101.8**, history **237.7/189.6**, context **193.5/196.1**, metrics
append **187.8/188.3**. Simple reads satisfy <=2s and append <=3s. Insights
**272.6/199.9** are informational, with no invented expensive-read threshold.
Existing search/reservation/save/revise/reschedule timing assertions pass in both
full runs. All public race/replay/CAS/rollback/metrics tests remain in those suites.

## 5. Security and scope catalog

- Exact API inventory/authenticated EXECUTE **33/33**, read/write **11/22**;
  allowlist difference/overload/unsafe owner-security-path **0/0/0**.
- All API entry points owned by content_producer_api_owner, SECURITY DEFINER,
  empty search_path. Role has no LOGIN, SUPERUSER, CREATEDB, CREATEROLE,
  REPLICATION, BYPASSRLS, inheritance, membership or schema CREATE.
- RLS **15/15**, owner policies, UPDATE USING/WITH CHECK present; API-owned
  business tables **0**, direct Auth-table privileges **0**.
- Caller/PUBLIC table/column/sequence/helper and prohibited API execute **0**;
  unsafe application default ACL **0**. API-owner post/junction column allowlists
  and metrics/history SELECT/INSERT-only privileges unchanged from original 5.9.
- Sole private definer remains CR-009's argument-free postgres-owned bridge,
  exact SELECT auth.uid body and no caller execute. New repair helper is a private
  administrative INVOKER, denied even to API owner; new check helpers are private
  API-owner INVOKER functions.
- Final invalid v6/v7/v8, incomplete ledger, disabled trigger and leftover fault
  counts **0**. Unapproved passed draft count **0**; all business/history/rate/user/
  storage fixture counts **0** after both full runs.

Evidence generator compares every old migration and all pre-existing plans,
original 5.9 reports/JSON, seed/config against 289afe3 bytes. New evidence is under
`docs/phase-5-batch-b-remediation-*`; no original evidence artifact was overwritten.

## 6. Artifacts and remaining risk

- `scripts/phase-5-remediation-exercise.ts`: same-fixture before/migration/after and
  real baseline-data compatibility proof; intended for a clean baseline-version
  local database with 63 migrations, not to rerun blindly on the repaired database.
- `scripts/phase-5-remediation-evidence.ts`: local-only source/history/full catalog
  and cleanup checks; preflight, reset-A, reset-B and final-catalog JSON.
- Three new suites: api-batch-b-remediation (8), api-trivia-public-gold (2),
  api-trivia-populated-performance (1). Existing acceptance test changes only
  evidence naming/config formatting; existing trivia helper change only token typing.
- Before/after comparison, search A/B, performance A/B and public gold split A/B
  JSON retain actual numeric measurements and full plans. Raw command logs remain
  in `/tmp/opencode/cr016-*` for this local session.

No unresolved implementation failure for the four findings was observed in the
final required gates. Residual boundaries: measurements are local fixture latency,
not production concurrency/load guarantees; no remote deployment/auth transport,
pilot source/editorial review or future lossless numeric MCP transport is claimed.
Administrative normalization intentionally fails closed on corrupt nonempty
evidence instead of fabricating evaluation; any such real data needs investigation.

**Stop for independent re-audit.** These are implementer results, not independent
audit approval or permission to begin Phase 6. No commit/push/deploy occurred.
