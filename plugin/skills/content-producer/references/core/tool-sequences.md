# Exact MCP tool inventory and orchestration

The config2 owner OAuth catalog has **33 active tools, 12 Read/21 Write**: three trivia v2 tools, two editorial catalog tools plus shared tools for Page, plan, lifecycle, and metrics. Five retired v1 content names are absent. All require owner-scoped OAuth. Confirm the runtime catalog and supported versions before use; this package is not deployment evidence. Trust structured results and readback, not HTTP 200, prose or an email as authorization.

|   # | Tool                              | Purpose                              |
| --: | --------------------------------- | ------------------------------------ |
|    1 | get_account_profile               | Connection profile                   |
|    2 | get_workspace_context             | Workspace/module defaults            |
|    3 | list_pages                        | Page discovery                       |
|    4 | create_page                       | Explicit Page creation               |
|    5 | update_page                       | CAS Page/config                      |
|    6 | get_page_generation_context       | Page+niche generation settings       |
|    7 | list_content_plans                | Find batch/calendar                  |
|    8 | create_content_plan               | Persist plan items                   |
|    9 | get_content_plan                  | Read progress                        |
|  10 | claim_content_plan_items          | Lease current items                  |
|  11 | renew_content_plan_claim          | One live lease extension             |
|  12 | report_content_plan_item_failure  | Fail active attempt safely           |
|  13 | retry_content_plan_item           | Failed to pending                    |
|  14 | replace_discarded_plan_item       | Explicit prepublication replacement  |
|  15 | cancel_content_plan               | Explicit remaining-item cancellation |
|  16 | trivia_reverify_fact              | Update same-meaning evidence         |
|  17 | trivia_correct_fact               | Explicit correction/invalidation     |
|  18 | list_posts                        | Find posts                           |
|  19 | get_post                          | Read current revision/hash/checks    |
|  20 | reschedule_post                   | Move internal slot                   |
|  21 | approve_post                      | Explicit reviewed approval           |
|  22 | revoke_post_approval              | Explicit revoke                      |
|  23 | discard_post                      | Explicit prepublication discard      |
|  24 | mark_post_posted                  | Record confirmed manual posting      |
|  25 | archive_post                      | Explicit archive                     |
|  26 | record_post_performance           | Append manual metrics                |
|  27 | get_post_performance              | Read metric history                  |
|  28 | get_performance_insights          | Evidence-aware aggregates            |
|  29 | trivia_find_similar_facts_v2       | Sentence-based dedup, complete/catalog |
|  30 | save_post_v2                      | One atomic draft, no separate reserve |
|  31 | revise_post_v2                    | CAS v2 edit with three editorial checks |
|  32 | get_trivia_editorial_catalog       | Pinned definitions/examples, paginated Read |
|  33 | update_trivia_editorial_catalog    | Explicit owner publish/retire, CAS/replay |

The explicit fixed-pilot rollback retains 31 tools without the two catalog
names; never enable it to bypass missing config2 capability. Read actual runtime
support, not this package, before using config2. Both catalog tools use version1
envelopes; config/content/snapshot versions are distinct.

For config2, use [profile guidance](../niches/trivia/formats.md), including exact
catalog refs/examples, consistent multi-Read dedup and item-aware context. The
legacy flow below keeps its source/scope/approval safeguards for both branches.

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

The three trivia v2 names use request/response version 2. Shared reads/plan/lifecycle
keep version 1 envelopes and version-aware content projection. Maintenance names
trivia_reverify_fact/trivia_correct_fact also accept version 2 under CR-056,
using exact canonical `fact_updated_at` from Read as CAS, no tier/expiry. V2
reverify updates canonical URL for the same meaning; revise changes draft-local
URL; neither rewrites a published snapshot. Correction needs separate owner intent.

All writes carry a UUID v4 operation_key and workspace; unknown results are
reconciled/replayed identically before any new operation.
Keep config timestamps at six fractional digits and catalog versions as strings.

## Scenarios from frozen use-case inventory

| Case      | Situation                   | Correct choice                  | Forbidden                |
| --------- | --------------------------- | ------------------------------- | ------------------------ |
| EV-CL-001 | Two Pages match             | list_pages then ask             | save_post_v2 before choice |
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
| CUT-OLD-01 | Owner asks for reset post   | get_post; explain unavailable if absent | recreate or restore automatically |

Source-level scenario checks do not prove ChatGPT-host integration, which is deferred.
