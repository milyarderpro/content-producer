# Content Producer v0.2.11 — First production Page saved draft

**Date:** 2026-10-28. **Scope:** real Page `corious facts` production workflow, separate from the paused INTERNAL editorial MAIN 30-case QA. **Evidence:** operator report plus independently acquired owner OAuth `mcpku2` READ of `get_post` by coordinator on 2026-10-28. No write executed by coordinator.

## Identifiers and result

- Workspace: `cad2885e-952e-41b3-9eae-d2d9d75d533d`; owner authenticated `admin` through PRIVATE Content Producer OAuth `mcpku2`.
- Page: `corious facts` / `37457236-17ec-4486-8880-6832460ae411` — NOT the internal editorial test Page.
- Post: `92f06b55-9752-4915-9b6f-8c77333411c3`, status `draft`, revision `1`, title `Mantis Shrimp: 7 Underwater Superpowers` (editorial label), format `single_subject_fast`, topic `animals`.
- `content_hash`: `8837be08b72b5698b4e30fd4a5eaeac9828a24411da929ac140798502c7c4720`. Coordinator independently matched hash, Page, text, revision, bindings and checks via LIVE `get_post(include_sources:false, include_checks:true, include_latest_metrics:false)`.
- Allocations: 7/7 facts bound with `allocation_state: allocated`; `current_fact_warnings: []`.
- `system_checks.overall_status: passed`: 19/19 checks passed; source policy, dedup/reuse, reservation conversion, renderer exact-match all passed as server-reported checks.
- `editorial_checks.overall_status: pass`: 18/18 passed, no risk flags; these are stored ChatGPT editorial evaluations, not independent source-site verification.
- `quality_status: pending`; `approval: null`, `scheduled_at: null`, `published_at: null`.
- Metrics authoritative from server: `canva_total_chars:545`, `facts_total_chars:472`, `word_count:75`, `line_count:27`, `estimated_read_seconds:25.7`, `replay_ratio:1.976923`, `estimated_loops:2`.
- Operator-reported business writes: one `trivia_register_and_reserve_facts` and one `save_post`, both succeeded; one `get_post` post-save readback. Coordinator independently confirmed saved output only, not raw write call trace.

## Persisted content (server READ)

**Hook:** Meet the ocean's tiny powerhouse.

1. Some mantis shrimp smash hard shells with hammerlike forelimbs.
2. Others ambush soft-bodied prey using sharp, barbed hunting limbs.
3. A spring-and-latch mechanism stores energy for their explosive strikes.
4. Their powerful strikes create collapsing vapor bubbles in water.
5. Their unusual stalked eyes can move independently of each other.
6. Specialized eye cells let mantis shrimp detect ultraviolet light.
7. Some mantis shrimp shield themselves with their tails during fights.

**CTA:** Which adaptation surprised you most?

**Caption:**

A powerful punch is just the beginning.

Mantis shrimp have remarkable adaptations for hunting, seeing underwater, and protecting themselves. Some smash shells, others spear their prey, and their eyes detect light we can't see.

Which of these seven facts surprised you most?

**Hashtags:** `#MantisShrimp` `#OceanFacts` `#AnimalTrivia`

`canva_copy` uses canonical `plain_lines` with blank separators and matched owner-approved payload.

## Verdict and boundaries

**PRODUCTION_DRAFT_SAVED_VERIFIED: PASS** for this specific post. This is actual product utility, not CI/fixture-only evidence or a simulated draft. No Facebook/Canva export, platform publishing, approval, scheduling, or creative visual review is established.

This real workflow used complete individual dedup READs; it does not demonstrate native host truncation recovery, so Issue #56 retains its narrowly unresolved attestation criteria. Editorial MAIN QA campaign still PAUSED 9/30 (4 PASS, 5 BLOCKED), and this production post is **not** added to the MAIN denominator/results.jsonl.

**Next gate:** owner visually reviews/reformats into Canva/video as appropriate and gives distinct explicit approval of the exact saved revision/hash if seeking `approve_post`. This record does not authorize approval/publication or additional business Writes.
