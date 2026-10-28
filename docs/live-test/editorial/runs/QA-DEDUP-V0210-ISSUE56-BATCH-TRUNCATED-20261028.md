# Issue #56 — LIVE QA truncated batch and unexecuted targeted recovery

**Date:** 2026-10-28. **Evidence:** OWNER_REPORTED_LIVE (tester-provided narrative; no independent raw MCP response or chat-runtime fingerprint). **Scope:** READ visibility and orchestration only, NOT a MAIN campaign case.

## Preflight and calls

PRIVATE Content Producer owner OAuth `mcpku2`, owner `admin`; workspace `cad2885e-952e-41b3-9eae-d2d9d75d533d`; Page `f3984ee4-8ae7-4043-8c93-45765f82f46e` (Trivia Editorial Test Internal), trivia default/active, module/schema v1. Preflight `get_account_profile`, `get_workspace_context`, `list_pages`, `get_page_generation_context`: all reported PASS. Session build fingerprint **UNVERIFIED**; plugin account release metadata is not host evidence.

A single *diagnostic exception* eight-fact `trivia_find_similar_facts` READ with `QA56_F1`–`QA56_F8`, `max_matches_per_candidate:20`, schema/normalization/ontology 1, nature_science. Backend returned structured success `response_schema_version:1`, but displayed host response included **`Warning: truncated output (original token count: 38165)`**. This does **not** establish a backend/RPC defect.

| Key | Batch visibility (tester report) | Visible review_required | Targeted READ executed | End status |
|---|---|---|---:|---|
| QA56_F1 Jupiter storm | Complete, 20 matches | false | 0 | PASS visibility |
| QA56_F2 Venus atmosphere | Not fully inspectable | unknown | 0 | BLOCKED |
| QA56_F3 Mars Olympus Mons | Not fully inspectable | unknown | 0 | BLOCKED |
| QA56_F4 Uranus rotation tilt | Not fully inspectable | unknown | 0 | BLOCKED |
| QA56_F5 Neptune ice giant | Not fully inspectable | unknown | 0 | BLOCKED |
| QA56_F6 Mercury closest Sun | Not fully inspectable | unknown | 0 | BLOCKED |
| QA56_F7 Earth atmosphere nitrogen | Not fully inspectable, 20 matches unverified | true | 0 | BLOCKED |
| QA56_F8 Moon synchronous rotation | Complete, 20 matches | false | 0 | PASS visibility |

Tester stated pre-retry reasons: missing complete visibility of `candidate_key`, all `matches[].fact_public_id` / `material_identity`, and `review_required` for six positions. **However, no targeted follow-up call was actually made.** This is a demonstrated procedural gap *in the reported QA attempt* (not proven backend failure or reason for AI's decision). Tester did not report an actual tool error/denial preventing retry; reason for stopping is unknown. Per plugin ontology, six unresolved positions require one-candidate top-20 READs, with at most one retry of each still-clipped individual result; no repeat of complete F1/F8 or whole batch.

## Verdict and next step

- `PREFLIGHT`: PASS on tester report.
- `BATCH_TRUNCATION_REPRODUCED`: PASS (host-visible truncation reported).
- `COMPLETE_BATCH_NO_RETRY`: NOT_TRIGGERED.
- `INCOMPLETE_RESPONSE_TARGETED_RETRY`: **BLOCKED / NOT_EXECUTED** (0/6 targeted calls), **not PASS**.
- `FAIL_CLOSED_ON_PERSISTENT_TRUNCATION`: NOT_TRIGGERED.
- `HOST_RUNTIME_VERIFICATION`: UNVERIFIED.
- Business Write: 0. This is test-level hold, not proof of plugin-host fail-closed at a registration boundary.

**Next safe action:** In the **same tester chat**, make exactly the six missing one-candidate READs for QA56_F2–F7 with `max_matches_per_candidate:20`, preserving original claim, normalized identity, ontology, and candidate_key. For each, record pre-retry reason, exact call, response visibility; repeat only the same candidate once if its first targeted view is actually clipped. If tool access fails, report error and stop (never fabricate calls). No batch replay, no F1/F8 repeat, no semantic reservation, no business Write. A follow-up that stops again with zero tool calls must be classified as orchestration FAIL/BLOCKED with reason; it cannot be credited as recovery.

**Release boundaries:** Issue #56 OPEN; MAIN campaign PAUSED 9/30 (4 PASS, 5 BLOCKED), MAIN `results.jsonl` untouched. No plugin update/deploy or publication authorized.
