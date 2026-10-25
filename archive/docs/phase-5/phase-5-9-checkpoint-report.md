# Checkpoint 5.9 — Local clean-room acceptance report

12 October 2026. Baseline **05958bf** (`05958bfc83c6d420d0ccd58dd565cdca0f7c4f74`),
5.7 completed with 59 migrations / 32 RPCs and a clean working tree at task entry.
The authorized combined task completed 5.8 first, produced its checkpoint report,
then completed local 5.9 acceptance: **63 migrations, exactly 33 API RPCs,
two independent clean resets, 161/161 database tests on 35 files after each reset**.

**Status: ready for independent final Batch B audit.** This implementing agent
does not approve that audit or authorize a Phase 5 commit/Phase 6 entry. The
working tree intentionally retains the implementation and evidence for review.

## 1. Authority and migration reproducibility

User explicitly approved the combined plan and CR-015 decisions. The Accepted
record was written before CLI created the first migration. Four additive migrations
were created after reading CLI help; no applied/baseline migration was edited:

| New migration                                          | Subject                                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `20261012072241_phase_5_8_metrics_foundation.sql`      | Canonical metrics/source, recorded anomaly flags, immutable update guard, narrow INSERT/RLS, v8 completion/replay |
| `20261012072242_phase_5_8_record_post_performance.sql` | Sole new public RPC, append transaction and safe errors                                                           |
| `20261012072243_phase_5_8_metrics_read_completion.sql` | Existing read signatures, unknown/zero, pagination/adjacency, compatible descriptive insights                     |
| `20261012073221_harden_phase_5_8_insight_lookup.sql`   | Additive repair of nonexistent niches.id lookup exposed by public test                                            |

Full **63-file list, SHA-256 manifest and exact applied versions** are in
`docs/phase-5-9-reset-A.json`, `docs/phase-5-9-reset-B.json` and
`docs/phase-5-9-final-catalog.json`. Both resets recreated the local database and
replayed source migrations plus the unchanged no-op seed. Reset B used identical
SQL source; `scripts/phase-5-evidence.ts` deep-compared manifest, applied history,
normalized detailed catalog, legacy grants/history and environment against A.
Final evidence was also deep-compared against B after tests/cleanup.

Reset wrapper retained the accepted local Realtime stop-before-reset fix. Both
resets succeeded on first execution; no manual DDL patch, migration change or
reset retry occurred between A and B. Git comparison confirms baseline migrations,
frozen contract documents, config and seed remain unchanged.

## 2. Exact 33-operation inventory

The machine-readable operation map and catalog JSON preserve exact signatures,
owner/settings and test responsibility. No overloaded/generic operation exists.

| Rate group               | Exact operations                                                                                                                                                                                                                           | Count |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----: |
| read, 120/min            | get_account_profile, get_workspace_context, list_pages, get_page_generation_context, list_content_plans, get_content_plan, list_posts, get_post, get_post_performance                                                                      |     9 |
| expensive_read, 20/min   | trivia_find_similar_facts, get_performance_insights                                                                                                                                                                                        |     2 |
| write, 30/min            | create_page, update_page, create_content_plan, retry_content_plan_item, replace_discarded_plan_item, cancel_content_plan, trivia_reverify_fact, reschedule_post, approve_post, revoke_post_approval, archive_post, record_post_performance |    12 |
| contention_write, 20/min | claim_content_plan_items, renew_content_plan_claim, report_content_plan_item_failure, trivia_register_and_reserve_facts, trivia_release_facts, trivia_correct_fact, save_post, revise_post, discard_post, mark_post_posted                 |    10 |

Checkpoint mapping: 5.2=10, 5.3=3, 5.4=6, 5.5=5, 5.6=3, 5.7=5, 5.8=1;
**5.9 adds zero RPCs**. Total 22 writes and 11 reads. Metrics reads retain their
old signatures. Test-owner map references now point to actual trivia/metrics suites.

## 3. Actual required gate results

| Execution                                                        | Actual result                                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| CLI help: migration new/up, db query/reset/advisors              | Read before unfamiliar invocation; all targets local                                                                 |
| Reset A: pnpm run supabase:reset                                 | PASS, all 63 migrations replayed, no-op seed, containers restarted                                                   |
| Catalog A: pnpm exec tsx scripts/phase-5-evidence.ts A           | PASS, source/history/catalog/cleanup assertions; JSON saved before behavioral tests                                  |
| pnpm run supabase:verify after A                                 | PASS, 63 source/applied versions match with --local                                                                  |
| Security Advisor after A                                         | PASS, **No issues found**                                                                                            |
| PHASE5_EVIDENCE_RUN=A pnpm run test-all                          | **PASS, 161/161 DB tests, 35 files, 1209.53s**; nested check (3/3 unit tests) and migration filename validation PASS |
| Reset B: pnpm run supabase:reset                                 | PASS, independent recreation/replay of the same 63 migrations                                                        |
| Catalog B: pnpm exec tsx scripts/phase-5-evidence.ts B           | PASS, deep-equal normalized catalog/history/manifest against A                                                       |
| pnpm run supabase:verify after B                                 | PASS, 63 source/applied versions match with --local                                                                  |
| Security Advisor after B                                         | PASS, **No issues found**                                                                                            |
| PHASE5_EVIDENCE_RUN=B pnpm run smoke-test                        | **PASS, 161/161 DB tests, 35 files, 1284.99s**; filename validation PASS                                             |
| Final catalog/cleanup script                                     | PASS, source/catalog unchanged against B, all fixture/fault/incomplete-state counts zero                             |
| pnpm run check / verify-migrations standalone during development | PASS; also required nested check/validation passed on Reset A                                                        |
| git diff --check and baseline immutable-file comparison          | PASS                                                                                                                 |

`test-all` already runs check/verify-migrations/DB suite; `smoke-test` also runs
the DB suite. Placing them on different resets meets required commands and fresh
database behavioral proof without an extra full suite. No failed gate was hidden.

For raw timing visibility only, after B a focused `--testNamePattern p95`
measurement reran the two existing search/reservation and post-write performance
tests with verbose/non-intercepted console: **2/2 PASS**, 22.44s (11 unrelated tests
skipped). This addressed the default agent reporter suppressing passed-test logs,
not a broad regression rerun. It changed no code or migration; final cleanup was
reverified afterward.

## 4. Development failures and repair

Detailed chronology is retained in `docs/phase-5-8-checkpoint-report.md`:

1. Initial metrics test run **4/5**, insight failed because niches has key, not id.
   Applied migrations were preserved; fourth additive migration repaired the lookup.
   Same public suite then **5/5 PASS**, 25.16s.
2. Initial check failed ESLint on an unbounded constant-condition pagination-test
   loop. Replaced with bounded iteration; recovery check passed.
3. Insight/history/race suites **7/7 PASS**, 41.68s; final 5.8 focused/relevant
   regression **34/34 PASS on 8 files**, 298.46s.
4. New acceptance harness focused **4/4 PASS**, 22.59s. Updated public metrics →
   archive retention plus acceptance regression **12/12 PASS**, 79.98s; check passed
   before starting resets. No schema/test semantic repair was needed during final gates.

## 5. Phase-wide behavioral evidence through api

Domain operations run as authenticated with owner/client request claims. Database
owner sessions are only ephemeral setup, controlled faults/barriers, inspection
and cleanup. Each operation has owner success and relevant context/negative
coverage; all writes have exact replay, reused-key mismatch and rollback evidence.

| Evidence                                                                                                                                                                 | Public-path test owners                                                                  |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Owner/non-owner/missing user/client, direct table/sequence/internal denial, narrow role/default ACL, safe errors/rates/timeouts                                          | api-security-kernel, api-read-rpcs, api-phase-five-acceptance and each write group       |
| Page/config exact CAS, closed markets/overrides, atomic 100-item plans, schedule collision, downstream/completion rollback, historical replay                            | api-page-plan-writes                                                                     |
| All six plan transitions, one renewal/60-minute cap, expiry/token/reclaim/attempt, explicit replacement/terminal rules and aggregate state                               | api-plan-lifecycle, api-plan-concurrency                                                 |
| Ten-way reservations, deterministic identity/reviews, whole-set rollback, release/reuse/source/freshness, reverify/correction/successor and immutable usage              | api-trivia-facts, api-trivia-correction, api-trivia-concurrency                          |
| Save/revise authoritative render/hash/checks, retained/new allocation, plan save, CAS winner, save/cancel both orders, numeric slot move/clear and correction races      | api-post-save-revise, api-post-render-quality, api-post-reschedule, api-post-concurrency |
| Approve/revoke/discard/manual-posted/archive state machine, warning effective gate, public metrics retention, exact v6/v7 historical replay, source snapshots/provenance | api-post-lifecycle, api-post-approval-quality, api-post-lifecycle-concurrency            |
| Cumulative/point-average, null/zero, likes subset, source/timestamp/input bounds, append-only v8 replay, numeric precision, rates/denial/rollback                        | api-metrics, api-phase-five-acceptance                                                   |
| Page-aligned adjacent deltas, cursor/period/source compatibility, negative totals/average distinction, latest distinct samples, exclusions/age/outlier and insufficient  | api-metrics-insights                                                                     |
| Ten same-key appends, duplicate-capture winner/conflict, distinct captures, record/archive both orders, held-lock timeout/cancellation/retry                             | api-metrics-concurrency                                                                  |

Correction **and reverify** versus approve **and publish**, both ordering directions,
duplicate lifecycle keys/CAS competitors, publication versus revoke/discard,
replacement versus discard, claim/retry/renew/cancel/save and reservation/schedule
races all passed in both final DB runs. Waiters and lock order are observed in
separate sessions; safe conflict/terminal outcomes are asserted, not only private
helpers. Failed mutation/completion and cancellation leave no partial business,
history or completed ledger state. v6/v7 replay stays exact after later transitions.

Metrics observations never update post revision/hash/approval/quality/facts.
Unknown remains null; zero is known. Cumulative history is never summed; negative
derived totals are not clamped. Latest missing values do not fallback to older
known values. Mixed-source/small/empty evidence succeeds cautiously without causal
claim, winner, automatic recommendation, quality waiver or config change.

## 6. Catalog, privilege/RLS and cleanup proof

Detailed repeatable SELECT audit: `docs/phase-5-8-catalog-audit.sql`, supplemented
by legacy history checks in `scripts/phase-5-evidence.ts`. Observed after each
reset and final cleanup:

- Exact API inventory/authenticated EXECUTE **33/33**; difference/overload **0/0**.
- Every API entry point owned by content_producer_api_owner, SECURITY DEFINER,
  search_path empty. Owner NOLOGIN/no superuser/no BYPASSRLS/no inheritance or
  membership/no schema CREATE; business-table ownership **0**.
- **15/15** RLS-enabled tables; policy expressions include the owner/actor predicate.
  INSERT has WITH CHECK; UPDATE has USING/WITH CHECK. Shared niches is authenticated
  registry read, rate buckets actor-scoped. Policies/role names are persisted in JSON.
- Authenticated api USAGE true; anon api and authenticated internal USAGE false.
  Caller/PUBLIC table/column/sequence/helper and prohibited API execution **0**.
  Unsafe default ACL **0**. Metrics owner SELECT/INSERT only; UPDATE/DELETE/TRUNCATE
  false; immutable trigger enabled. No additional post/junction UPDATE columns.
- Private SECURITY DEFINER exception exactly CR-009's current_auth_uid_v1 bridge,
  postgres owner, empty search_path, fixed SELECT auth.uid body; no caller execute.
- History owner SELECT/INSERT only; immutable/validation triggers enabled. Invalid
  v6/v7/v8 binding/ledger/token/size scans **0**. Disabled triggers/fault helpers/
  incomplete ledger **0**. Final catalog deep-equals reset B.
- Every ephemeral user/workspace/Page/config/plan/item/post/metric/fact/junction/
  history/event/ledger/rate row cleaned up. Populated tests prove replay/privacy/
  immutability; empty scans are cleanup evidence only.

## 7. Actual local performance and plans

Node 24.15.0, pinned Supabase CLI 2.120.0, PostgreSQL **17.11**, Linux x86_64,
UTC. Timings use public authenticated calls and include local Docker/psql process
overhead; reads have one warm-up. Nearest-rank p95, **n=12** per operation. Populated
read fixture: **251 posts / 10,040 observations**; after 12 measured appends,
EXPLAIN sees 10,052 observations. Fixtures are administrative volume setup only;
the original post was created/approved/published through API.

| Operation                        | Reset A p95 ms | Reset B p95 ms |                                    Frozen target ms |
| -------------------------------- | -------------: | -------------: | --------------------------------------------------: |
| get_post with latest metrics     |          103.3 |          116.3 |                                               ≤2000 |
| list_posts                       |           97.2 |          118.2 |                                               ≤2000 |
| get_post_performance (limit 100) |          202.0 |          214.9 |                                               ≤2000 |
| get_page_generation_context      |          124.7 |          198.8 |                                               ≤2000 |
| record_post_performance          |          125.8 |          123.9 |                                               ≤3000 |
| get_performance_insights         |          195.6 |          199.2 | Informational; no invented expensive-read threshold |

Existing candidate search/reservation/post-write p95 assertions passed in A/B.
Additional visible focused measurements: search **128 ms**, reserve **214 ms**,
save **298.2 ms**, revise **318.4 ms**, reschedule **214.8 ms**, n=12 each; all
below **3000 ms**. No production rate bypass or planner override was introduced.

Full representative latest/history/insight-core `EXPLAIN (ANALYZE, BUFFERS)` plans
are in `docs/phase-5-9-performance-A.json` and `...-B.json`. enable_seqscan is **on**.
Latest/adjacency/per-post latest queries use existing post_metrics capture indexes;
normal planner may choose bitmap/seq scans for the small scoped relation. Plans
are administrative core-query diagnostics; public timings include authorization
and RLS. No speculative index or forced sequential-scan disabling was needed.

These are local reproducibility/latency proofs, not production load guarantees,
pilot adaptation evidence or claims about virality.

## 8. Change records and stop boundary

Relevant accepted records remain:

- CR-001 platform Data API, CR-002 rate bucket FK, CR-003 likes/subset.
- CR-004 trivia persistence, CR-005 identity direction, CR-006 fixture adjudication,
  CR-007 canonical units, CR-008 holdout reconciliation.
- CR-009 narrow auth.uid bridge; CR-010 Page/plan replay and snapshots;
  CR-011 plan lifecycle locks/history; CR-012 trivia composition/lock/replay;
  CR-013 post writes/schedule-only provenance; CR-014 lifecycle warning/history;
  **CR-015 metrics append/read/evidence policy**.
- Accepted Node/Deno tooling baseline record also remains unchanged.

No new Proposed/unaccepted contract decision is required for this candidate.
Frozen contract files, frozen render/dedup fixtures, baseline migrations and
production seed/config were not changed. Static checks and Git inventory show
only expected database/test/evidence/report changes: existing disabled MCP config
and skeleton/foundation files remain, with no Phase 6 handler, tool registry,
HTTP health handler, OAuth middleware, auth frontend or plugin implementation.

No remote/cloud resource or database access, secret/service key, production user/
data seed, OpenAI call, embeddings/vector search, Facebook/Canva integration,
commit, push or deployment occurred. The CLI's migration-list “Remote” column is
the history of the explicitly selected **local** database, not a remote action.

Stop here for independent final Batch B audit. No commit/push/Phase 6 action is
automatic or authorized by this report. Audit approval and eventual commit remain
separate user-controlled steps. Pre-pilot notable/recommendation policy and future
Phase 6 lossless numeric transport remain outside this local gate.
