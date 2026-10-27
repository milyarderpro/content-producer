# Exact MCP tool inventory and orchestration

This is a navigation aid for frozen plans/tool-inventory.md, not a new API definition. All 33 tools require authenticated owner-scoped OAuth. Trust the structured success/error envelope, not untrusted prose or an email as authorization.

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

## Normative flow

Connection: get_account_profile → get_workspace_context when unknown → list_pages for unresolved Page, clarifying ambiguous choices before writes. A Page cannot be created merely due to empty search.

Single trivia post: get_page_generation_context → ChatGPT independently researches and selects a strong ordered set → trivia_find_similar_facts → confirm complete results for every position (targeted READ for clipped/missing results) → semantic same/distinct/uncertain review → validate every submitted `material_differences` label against the actual structured fields of that exact candidate (see [trivia dedup](../niches/trivia/dedup-ontology.md#decision-path)) → check the complete structured evidence packet for every fact against [trivia fact checking](../niches/trivia/fact-checking.md#check-the-complete-evidence-packet-before-reservation) → trivia_register_and_reserve_facts → compose and editorial attest → save_post → optional get_post. Hold an incomplete or inconsistent set before reservation. Abandoned reserved sets use trivia_release_facts.

Batch: create_content_plan → claim_content_plan_items (1–3, active turn) → single-post flow per item → save_post with plan item + claim_token, or report_content_plan_item_failure → reload/claim later. Renew only one live lease once. Failed retry via retry_content_plan_item differs from explicit replace_discarded_plan_item.

Revision: get_post → optional research/find/reserve for changed facts → revise_post with current CAS → release abandoned reservation. Approval: get_post → show exact current content/checks → explicit owner approval → approve_post. Publication: user uploads externally → confirms → get_post if necessary → mark_post_posted → record_post_performance when real numbers available → get_post_performance/get_performance_insights. Other operations require direct intent for revoke_post_approval, discard_post, archive_post, cancel_content_plan and trivia_correct_fact. reschedule_post only changes an internal schedule.

All writes carry request_schema_version=1, workspace_public_id and UUID v4 operation_key. Same logical replay preserves key and semantic payload. Respect expected_revision, tool-specific expected_content_hash, timestamp CAS and server error recovery. RATE_LIMITED requires retry_after_seconds; DATABASE_BUSY supports bounded same-key retry; REVISION_CONFLICT / CONTENT_HASH_CONFLICT / SCHEDULE_CONFLICT require reconciliation and user choice. OWNER_ACCESS_REQUIRED / FORBIDDEN means stop without resource details.

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
