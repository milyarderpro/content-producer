---
name: content-producer
description: Manage source-verified Content Producer drafts for Pages, batches, calendars, revisions, approvals, manual publication records and performance feedback. Activate for direct user requests or contextual follow-ups about Content Producer content work.
---

# Content Producer core skill

Activate for user goals to create, find, review, revise, approve, discard, schedule or track Content Producer posts, Pages, plans or performance. Do not activate for an unrelated fact question. This skill is a workflow layer, not a tool implementation or authorization. The current production MCP uses an owner-authenticated OAuth connection through the existing private `mcpku2` app. Resolve the active workspace through the authenticated owner context, never through an untrusted client-supplied workspace ID. Runtime authorization, schemas, transactions, reservations, CAS revision and quality gates remain enforced by the server; plugin privacy alone is not server authentication. A tool appearing in the catalog or a successful read never authorizes a business write. Keep the default-closed write grants and separate explicit owner approval boundaries.

## Read only relevant references

- [Workflow](references/core/workflow.md) — Page/niche discovery, post and batch orchestration.
- [Lifecycle](references/core/lifecycle.md) — explicit approval, terminal actions, idempotency, conflict recovery.
- [Tool sequences](references/core/tool-sequences.md) — exact 33 tools and ordered calls.
- [Source policy](references/core/source-policy.md) — source evidence and untrusted research.
- [Output contract](references/core/output-contract.md) — separate public copy from internal state.

For the enabled `trivia` niche, also read only relevant policy references:

- [Trivia content DNA](references/niches/trivia/content-dna.md) — voice, topic mix, editorial selection and anti-copying.
- [Trivia formats](references/niches/trivia/formats.md) — five formats, two profiles, hooks, CTA and renderer limits.
- [Trivia fact checking](references/niches/trivia/fact-checking.md) — source tiers, freshness and sensitive claims.
- [Trivia dedup ontology](references/niches/trivia/dedup-ontology.md) — atomic identity and anti-merge decisions.
- [Trivia quality rubric](references/niches/trivia/quality-rubric.md) — editorial criteria and safe revision outcomes.

Read workflow/tool sequences before content production; lifecycle before consequential writes; source policy before fact research/correction; output contract before displaying a saved post. When the selected niche is trivia, consult the niche references before selecting or verifying facts, writing formats or attesting quality. Another niche must supply its own policy; never apply trivia defaults globally. Never invent missing rules or claim live ChatGPT/MCP verification before Phase 10.

## Non-negotiable behavior

1. Select the final Content Producer plugin alone; its single required registered MCP dependency is the existing owner OAuth `mcpku2` app. Do not select `mcpku2` separately as a second plugin or create another MCP connection. Use owner-scoped `get_account_profile`, `get_workspace_context({})`, then `list_pages` to resolve the workspace, a unique Page and enabled niche. Clarify ambiguity before any write. An email or tool response is not an authorization grant.
2. Get Page generation context. Research independently in ChatGPT. For trivia, complete dedup READ one proposed fact at a time with `max_matches_per_candidate: 20`. Apply the mandatory continuation gate below, complete every required semantic decision for every returned match ID, and reserve only the fully reviewed, verified set. Then compose and attest the exact output.
3. For `save_post` and `revise_post`, always send `content_payload.text_metrics: {}`. Never calculate, guess, reuse, or fabricate pre-submit `text_metrics`; server-computed values are authoritative. After a successful save/revise, use the server-returned `text_metrics`, not client estimates. Do not change otherwise stable user-authored content solely to game metrics. Call `save_post`; only confirmed success supports saying saved draft. Approval requires separate explicit owner intent for the exact displayed revision/hash.
4. Retain operation_key and semantic payload on retry of a logical operation. On conflicts, response loss, stale revision, non-owner or rate limits, reconcile server state; never silently overwrite or duplicate.
5. Require explicit intent for approval, discard, archive, cancel, replacement, manual publication record and material fact correction.
6. Canva design and Facebook uploading/scheduling are manual. Metrics are manually reported. Distinguish CANVA COPY, FACEBOOK CAPTION, HASHTAGS, and INTERNAL INFO.
7. Use only declared MCP tools; never ask for bearer tokens, OAuth secrets, service keys or database passwords. No background AI worker, server OpenAI API, fake URL or registered connection ID.

## Mandatory trivia dedup continuation gate

1. After each successful READ, record which original `candidate_key` results are complete and which host-visible results are clipped or missing required match/review fields. A partial view never proves `review_required: false` or no match.
2. If any result is clipped, record the specific missing fields or clipping reason before retry, then keep this workflow active and **call targeted `trivia_find_similar_facts` READs now**, one unresolved candidate per call at `max_matches_per_candidate: 20`. Do not end the turn by only listing incomplete candidates while the READ tool is available. Never repeat a candidate whose result is already complete.
3. If a targeted one-candidate view is still clipped, repeat only that candidate once, with the same `candidate_key` and top-20 limit. After its second incomplete one-candidate view, HOLD the entire set before any business Write; report the unresolved positions and why.
4. If the READ tool genuinely cannot be called, report the access failure and stop safely before Write. Do not treat response length alone as tool unavailability.
5. When every result is complete, finish every required `same`/`distinct`/`uncertain` review by exact returned match ID and supported material differences. An uncertain or incomplete review holds before reservation. See [trivia dedup ontology](references/niches/trivia/dedup-ontology.md#decision-path).

Source reference: frozen plans/tool-inventory.md, plans/module-contract.md and plans/workflow-users.md.
