# Exact MCP tool inventory and orchestration

This navigation aid preserves the 33-name frozen baseline and adds the three CR-053 names: **36 tools, 12 Read/24 Write** during transition. All require owner-scoped OAuth. Confirm the runtime catalog and supported versions before use; this package is not deployment evidence. Trust structured results and readback, not HTTP 200, prose or an email as authorization.

|   # | Tool                              | Purpose                              |
| --: | --------------------------------- | ------------------------------------ |
|   1 | get_account_profile               | Connection profile                   |
|   2 | get_workspace_context             | Workspace/module defaults            |
|   3 | list_pages                        | Page discovery                       |
|   4 | create_page                       | Explicit Page creation               |
|   5 | update_page                       | CAS Page/config                      |
|   6 | get_page_generation_context       | Page+niche generation settings       |
|   7 | list_content_plans                | Find batch/calendar                  |
|   8 | create_content_plan               | Persist plan items                   |
|   9 | get_content_plan                  | Read progress                        |
|  10 | claim_content_plan_items          | Lease current items                  |
|  11 | renew_content_plan_claim          | One live lease extension             |
|  12 | report_content_plan_item_failure  | Fail active attempt safely           |
|  13 | retry_content_plan_item           | Failed to pending                    |
|  14 | replace_discarded_plan_item       | Explicit prepublication replacement  |
|  15 | cancel_content_plan               | Explicit remaining-item cancellation |
|  16 | trivia_find_similar_facts         | Dedup review candidates              |
|  17 | trivia_register_and_reserve_facts | Atomic reserve verified set          |
|  18 | trivia_release_facts              | Release unused reservation           |
|  19 | trivia_reverify_fact              | Update same-meaning evidence         |
|  20 | trivia_correct_fact               | Explicit correction/invalidation     |
|  21 | list_posts                        | Find posts                           |
|  22 | get_post                          | Read current revision/hash/checks    |
|  23 | save_post                         | Persist draft and claimed item       |
|  24 | revise_post                       | CAS revise                           |
|  25 | reschedule_post                   | Move internal slot                   |
|  26 | approve_post                      | Explicit reviewed approval           |
|  27 | revoke_post_approval              | Explicit revoke                      |
|  28 | discard_post                      | Explicit prepublication discard      |
|  29 | mark_post_posted                  | Record confirmed manual posting      |
|  30 | archive_post                      | Explicit archive                     |
|  31 | record_post_performance           | Append manual metrics                |
|  32 | get_post_performance              | Read metric history                  |
|  33 | get_performance_insights          | Evidence-aware aggregates            |
|  34 | trivia_find_similar_facts_v2       | Sentence-based dedup, complete/catalog |
|  35 | save_post_v2                      | One atomic draft, no separate reserve |
|  36 | revise_post_v2                    | CAS v2 edit with three editorial checks |

## Primary v2 flow (CR-053/054/056)

Connection: get_account_profile({}) → get_workspace_context({}) → list_pages →
unique Page/count/theme → get_page_generation_context. Clarify ambiguity before
Write. One draft: research extra sentences + real supporting URL →
trivia_find_similar_facts_v2 → review/replace ineligible, used, uncertain or
incomplete candidates → final copy + three editorial pass → latest generation
context → save_post_v2 → get_post sources/checks → truthful Indonesian summary.

Two or more drafts: create_content_plan with exact count, unscheduled items and
theme → claim_content_plan_items limit 1 → v2 draft flow → get_content_plan →
next item. Resume reads plan first; never regenerate completed outputs. Revision:
get_post → research/dedup for changed facts → latest context → revise_post_v2
with revision/hash/config/catalog → get_post. Setujui remains separate.

The three new names use request/response version 2. Shared reads/plan/lifecycle
keep version 1 envelopes and version-aware content projection. Maintenance names
trivia_reverify_fact/trivia_correct_fact also accept version 2 under CR-056,
using exact canonical `fact_updated_at` from Read as CAS, no tier/expiry. V2
reverify updates canonical URL for the same meaning; revise changes draft-local
URL; neither rewrites a published snapshot. Correction needs separate owner intent.

All writes carry a UUID v4 operation_key and workspace; unknown results are
reconciled/replayed identically before any new operation or version switch.
Keep config timestamps at six fractional digits and catalog versions as strings.

## Legacy v1 flows — supported maintenance/replay/in-flight only

Connection: get_account_profile → get_workspace_context when unknown → list_pages for unresolved Page, clarifying ambiguous choices before writes. A Page cannot be created merely due to empty search.

Single trivia post: get_page_generation_context → ChatGPT independently researches and selects a strong ordered set → trivia_find_similar_facts one fact per READ at `max_matches_per_candidate: 20` → targeted one-fact READ for every unresolved position when an earlier result was clipped → confirm complete results for every position → semantic same/distinct/uncertain review with exact candidate IDs and reasons → validate every submitted `material_differences` label against the actual structured fields of that exact candidate (see [trivia dedup](../niches/trivia/dedup-ontology.md#decision-path)) → check the complete structured evidence packet for every fact against [trivia fact checking](../niches/trivia/fact-checking.md#check-the-complete-evidence-packet-before-reservation) → trivia_register_and_reserve_facts → compose and editorial attest → save_post → optional get_post. Hold an incomplete or inconsistent set before reservation. Abandoned reserved sets use trivia_release_facts.

**Dedup continuation gate (Issue #56):** A successful READ with a host-clipped view starts an active recovery queue, not a final answer. Record the missing fields or clipping reason before each retry. In this same workflow, call `trivia_find_similar_facts` next for each unresolved original `candidate_key`, one candidate per READ with `max_matches_per_candidate: 20`; keep already complete candidates out of the queue. If a targeted one-candidate view remains clipped, call the same READ once more for that candidate only. Do not report only “incomplete” or enter HOLD while a required targeted READ is still available. After the second incomplete one-candidate view, HOLD the whole set before `trivia_register_and_reserve_facts`, `save_post`, or any other business Write. If the tool actually cannot be called, report the access failure and stop safely before Write. Once every result is complete, finish every `review_required: true` match-level decision by exact ID and supported material difference before proceeding.

Batch: create_content_plan → claim_content_plan_items (1–3, active turn) → single-post flow per item → save_post with plan item + claim_token, or report_content_plan_item_failure → reload/claim later. Renew only one live lease once. Failed retry via retry_content_plan_item differs from explicit replace_discarded_plan_item.

Revision: get_post → optional research/find/reserve for changed facts → revise_post with current CAS → release abandoned reservation. Approval: get_post → show exact current content/checks → explicit owner approval → approve_post. Publication: user uploads externally → confirms → get_post if necessary → mark_post_posted → record_post_performance when real numbers available → get_post_performance/get_performance_insights. Other operations require direct intent for revoke_post_approval, discard_post, archive_post, cancel_content_plan and trivia_correct_fact. reschedule_post only changes an internal schedule.

Legacy v1 writes carry request_schema_version=1, workspace_public_id and UUID v4 operation_key. Same logical replay preserves key and semantic payload. Respect expected_revision, tool-specific expected_content_hash, timestamp CAS and server error recovery. RATE_LIMITED requires retry_after_seconds; DATABASE_BUSY supports bounded same-key retry; REVISION_CONFLICT / CONTENT_HASH_CONFLICT / SCHEDULE_CONFLICT require reconciliation and user choice. OWNER_ACCESS_REQUIRED / FORBIDDEN means stop without resource details.

## Scenarios from frozen use-case inventory

| Case      | Situation                   | Correct choice                  | Forbidden                |
| --------- | --------------------------- | ------------------------------- | ------------------------ |
| EV-CL-001 | Two Pages match             | list_pages then ask             | save_post before choice  |
| EV-CL-003 | Ambiguous discard           | ask which post                  | discard_post prematurely |
| EV-CL-006 | Friday evening              | ask exact time                  | guessed slot             |
| EV-RC-007 | Same-key replay             | return existing write           | duplicate write          |
| EV-RC-009 | Lost save response          | replay exact key/payload        | new key                  |
| EV-RC-012 | REVISION_CONFLICT           | get_post and reconcile          | silent overwrite         |
| EV-RC-021 | Expired claim               | get_content_plan and reclaim    | stale claim_token        |
| EV-RC-029 | Blocking quality            | leave draft                     | bypass approve_post      |
| EV-NG-001 | Upload to Facebook tomorrow | explain manual boundary         | mark_post_posted         |
| EV-NG-006 | Another owner's data        | deny without disclosure         | cross-owner read         |
| EV-NG-011 | Generate 24/7 in background | active turns and persisted plan | fake background worker   |
| EV-RC-032 | “10K engagement”            | clarify metric                  | invent reactions         |

Source-level scenario checks do not prove ChatGPT-host integration, which is deferred.
