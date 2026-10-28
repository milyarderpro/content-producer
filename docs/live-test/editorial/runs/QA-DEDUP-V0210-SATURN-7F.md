# QA dedup Saturnus 7 fakta — READ-only

Diagnostic attempt; **not a MAIN editorial campaign case**, so the campaign count remains 9/30.

## Attempt 01 — blocked preflight

- Owner-reported PRIVATE Content Producer owner OAuth `mcpku2`, Page `f3984ee4-8ae7-4043-8c93-45765f82f46e`.
- Four successful Page/account/context READs were reported.
- Status `BLOCKED / RUNTIME_IDENTITY_UNVERIFIED`. No plugin build fingerprint in MCP responses; `module_version:1` is **not** plugin version.
- `trivia_find_similar_facts` 0/7; no analysis, reservation, post, or Write.
- Prompt was overly restrictive, requiring stop when the runtime build could not be identified. External Plugin Creator readback verifies account release `0.2.10`, not the exact runtime of a chat session.

## Attempt 02 — partial orchestration, incomplete semantic review

- Owner reports Page/owner verification successful; `HOST_RUNTIME_UNVERIFIED`. The installed account release is `0.2.10`, `pluginrel_6ae1b386802c8191a3ef8a55c5392bcf`; no independent host session fingerprint.
- One `trivia_find_similar_facts` candidate per call with `max_matches_per_candidate:20`, `request_schema_version:1`, `normalization_version:1`, `ontology_version:1`, `topic_key:nature_science` and `qualifiers.comparison_direction:none`.
- Seven initial calls (F1–F7), then targeted repeated READs for F2–F6 to make long responses inspectable. **12 READs, 7/7 owner-reported complete response structures**, 20 returned matches each. Raw 12-call traces not accessible to coordinator.
- **Verdict `BLOCKED / SEMANTIC_REVIEW_INCOMPLETE`.** Flags for F1, F2, F6 are `review_required:true`; remaining positions `false`. Full semantic decisions: **0/60**, despite three *preliminary* individual assessments.
- No `trivia_register_and_reserve_facts`, no `save_post`, no approval, publication, draft or business Write. No server error or evidence of backend defect.

| Candidate | Calls | Returned matches | review_required | Inspectable response (owner report) | Completed semantic decisions |
|---|---:|---:|---|---|---:|
| F1 | 1 | 20 | true | yes | 0/20 |
| F2 | 2 | 20 | true | yes | 0/20 |
| F3 | 2 | 20 | false | yes | 0/0 |
| F4 | 2 | 20 | false | yes | 0/0 |
| F5 | 2 | 20 | false | yes | 0/0 |
| F6 | 2 | 20 | true | yes | 0/20 |
| F7 | 1 | 20 | false | yes | 0/0 |
| TOTAL | 12 | 140 | 3 true | 7/7 | 0/60 |

### Preliminary individual match judgments (NOT 60 completed decisions)

- F1 existing `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b`: `distinct` (hydrogen/helium composition not the same proposition as gas giant classification).
- F2 existing `5b5744d0-d6f9-4c27-b4d3-a1d5ba830ff6`: `uncertain` (ice/rock composition not sufficient to demonstrate abundance of water ice).
- F6 existing `fa40c202-51c4-4464-b2b6-88577a8a4572`: `same` meaning (north polar hexagon). All are preliminary interpretations from tester report, **not** final semantic reviews.

Repeat READs on F3–F5 may be justifiable if their first views were clipped, even though final `review_required:false`; raw first-view trace is needed to assess necessity. Do not count repeats alone as endpoint failure.

### Next safe step

Continue in the **existing diagnostic QA chat**, if the 20-match result structures remain available, to review **F1, F2, F6**, each against all 20 match IDs, with exact evidence-based same/distinct/uncertain and material differences where supported. Work one fact per response to avoid truncation. Do not invent IDs, classify unknown matches as distinct, or force uncertain decisions. Only repeat a per-fact READ if the material candidate fields are no longer inspectable, and never lower the top-20 limit.

Do not start a new 8-fact diagnostic or MAIN case 10 until triage of this 60-review backlog. If all decisions complete, evaluate 7-fact READ-only verdict and only then plan the new 8-fact QA. **Do not perform any Write.** Keep Issue #56 OPEN and the 9/30 editorial campaign PAUSED pending verified host behavior.
