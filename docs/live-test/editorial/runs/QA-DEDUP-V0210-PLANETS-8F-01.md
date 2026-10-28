# QA dedup v0.2.10 — eight planetary/moon facts, attempt 01 (READ-only)

**Date:** 2026-10-28. **Evidence level:** OWNER_REPORTED_LIVE; coordinator has owner-provided report, not raw MCP tool logs or host build fingerprint.

**Separate diagnostic** outside the frozen 30-case editorial MAIN campaign; do not count as MAIN case 10, do not alter 9/30 denominator, and do not replay MAIN-SSF-05 or MAIN-CMP-05.

## Scope and identity

- Selected plugin: existing PRIVATE Content Producer owner OAuth `mcpku2` with authenticated owner, workspace resolution, and Page/niche context confirmed by tester. Target Page `f3984ee4-8ae7-4043-8c93-45765f82f46e` (Trivia Editorial Test (Internal)), trivia enabled.
- Plugin Creator externally confirms current account plugin `plugins_6ad5bf91a278819182951ebb312eca06` is PRIVATE release `0.2.10`, `pluginrel_6ae1b386802c8191a3ef8a55c5392bcf`; this **does not** verify the precise host/runtime version in the tester chat (`HOST_RUNTIME_UNVERIFIED`).
- Each proposed candidate F1–F8 was submitted alone to `trivia_find_similar_facts` with `max_matches_per_candidate:20`, ontology v1 and non-directional `comparison_direction:none`; no business Write.

## Eight-candidate READ evidence

| Key | Claim | READ calls | Matches reported | review_required | Result inspectable (tester report) | Explicit decisions authored |
|---|---|---:|---:|---|---|---:|
| F1 | Jupiter has a giant storm called the Great Red Spot | 2 | 20 | false | yes | 0 required |
| F2 | Venus has a thick atmosphere dominated by carbon dioxide | 2 | 20 | false | yes | 0 required |
| F3 | Mars has a giant volcano called Olympus Mons | 2 | 20 | false | yes | 0 required |
| F4 | Uranus has an unusually tilted rotation axis | 2 | 20 | false | yes | 0 required |
| F5 | Neptune is classified as an ice giant | 2 | 20 | false | yes | 0 required |
| F6 | Mercury is the closest planet to the Sun | 2 | 20 | true | yes | **0/20** |
| F7 | Earth's atmosphere is mostly nitrogen | 2 | 20 | true | yes | **0/20** |
| F8 | Earth's Moon rotates synchronously with its orbit around Earth | 2 | 20 | false | yes | 0 required |
| **TOTAL** | | **16** | **160** | **2 true** | **8/8** | **0/40 mandatory** |

- 8 initial READ calls and 8 additional "diagnostic" READ calls were owner-reported. **The 8 repeat calls were NOT justified by observed truncation**; this is an orchestration-protocol deviation, not an MCP failure. No third READ was attempted.
- Structured match results are reported complete; 20 IDs/material identities/qualifiers visible per fact. Coordinator does not independently possess the eight raw MCP results. Complete response inspection is **owner-reported**, not a byte-for-byte evidence check.
- F6 preliminary example: Saturn's sixth-planet-from-Sun fact, existing ID `85e6d028-9602-44d3-8d17-0c83e5446e99`, clearly not logically equivalent to "Mercury closest to Sun"; this is **not** a substitute for all 20 ID-by-ID reviews.
- F7 preliminary example: Saturn hydrogen/helium composition, ID `6aaf4eb2-5f6b-48e5-b399-9d83aa63303b`; both propositions can share `has_named_part_or_property`, so `relation` must **not** be asserted on that pair without different `relation_key`. Subject/object differences matter. Not a completed 20-match review.
- F6 and F7 are `review_required:true`, but their outstanding 40 decisions are **NOT automatically `uncertain`**: they are `UNREVIEWED`. Do not invent semantic conclusions or waive the reviews.

## Reported tools and safety

- `get_account_profile`: 1; `get_workspace_context`: 1; `list_pages`: 1; `get_page_generation_context`: 1; `trivia_find_similar_facts`: 16.
- `trivia_register_and_reserve_facts`: **0**. All other business Writes including `save_post`, revision, approval, publication: **0**. No draft or reservation was created.
- Source-evidence research quality and host fingerprint **not independently audited**; this diagnostic concerns READ orchestration and semantic review requirements only.

## Verdict and follow-up

| Gate | Verdict |
|---|---|
| `READ_ORCHESTRATION` | **PASS_WITH_DEVIATION**: 8/8 full results, but 8 unnecessary repetitions |
| `SEMANTIC_REVIEW_COMPLETENESS` | **INCOMPLETE**: F6 0/20, F7 0/20 |
| `RESERVATION_READINESS` | **HOLD**: required decisions missing; no business Write permitted |
| `HOST_RUNTIME_VERIFICATION` | **UNVERIFIED**: account package v0.2.10 verified externally only |
| Overall 8-fact diagnostic | **BLOCKED / SEMANTIC_REVIEW_INCOMPLETE**; not #56 FIXED |

**Next safe test:** in the **same eight-fact QA chat**, ask for F6 twenty exact ID/key/decision/reason/material-differences rows from the already-returned tool results, then F7 separately. Use explicit literal keys, no placeholders, no false asserted differences; `same` => `material_differences:[]`; `uncertain` => hold. Because two READ calls were already used per candidate, **do not issue a third READ in this test**; if prior full match objects cannot be inspected, mark that fact BLOCKED and report missing evidence. Do not merge/rename/retry a MAIN baseline or perform a business Write.

Continue holding Issue #56 OPEN and MAIN editorial campaign PAUSED at 9/30 pending a fully reviewed eight-fact diagnostic and an explicit owner decision about next steps. No automatic restart.
