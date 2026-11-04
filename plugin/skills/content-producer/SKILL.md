---
name: content-producer
description: Manage source-verified Content Producer drafts for Pages, batches, calendars, revisions, approvals, manual publication records and performance feedback. Activate for direct user requests or contextual follow-ups about Content Producer content work.
---

# Content Producer core skill

Activate for user goals to create, find, review, revise, approve, discard, schedule or track Content Producer posts, Pages, plans or performance. Do not activate for an unrelated fact question. This skill is a workflow layer, not a tool implementation or authorization. The current production MCP uses an owner-authenticated OAuth connection through the existing private `mcpku2` app. Resolve the active workspace through the authenticated owner context, never through an untrusted client-supplied workspace ID. Runtime authorization, schemas, transactions, CAS revision and quality gates remain enforced by the server; plugin privacy alone is not server authentication. A tool appearing in the catalog or a successful read never authorizes a business write. Keep the default-closed write grants and separate explicit owner approval boundaries.

## Read only relevant references

- [Workflow](references/core/workflow.md) — Page/niche discovery, post and batch orchestration.
- [Lifecycle](references/core/lifecycle.md) — explicit approval, terminal actions, idempotency, conflict recovery.
- [Tool sequences](references/core/tool-sequences.md) — 31 active tools and versioned ordered calls.
- [Source policy](references/core/source-policy.md) — source evidence and untrusted research.
- [Output contract](references/core/output-contract.md) — separate public copy from internal state.

For the enabled `trivia` niche, also read only relevant policy references:

- [Trivia content DNA](references/niches/trivia/content-dna.md) — voice, topic mix, editorial selection and anti-copying.
- [Trivia formats](references/niches/trivia/formats.md) — five formats, two profiles, hooks, CTA and renderer limits.
- [Trivia fact checking](references/niches/trivia/fact-checking.md) — one supported sentence and source URL per fact.
- [Trivia dedup ontology](references/niches/trivia/dedup-ontology.md) — semantic identity, reuse and replacement.
- [Trivia quality rubric](references/niches/trivia/quality-rubric.md) — editorial criteria and safe revision outcomes.

Read workflow/tool sequences before content production; lifecycle before consequential writes; source policy before fact research/correction; output contract before displaying a saved post. When the selected niche is trivia, consult the niche references before selecting or verifying facts, writing formats or attesting quality. Another niche must supply its own policy; never apply trivia defaults globally. Never infer live ChatGPT/MCP behavior from the source package or a successful build.

## Non-negotiable behavior

1. Select the final Content Producer plugin alone; its single required registered MCP dependency is the existing owner OAuth `mcpku2` app. Do not select `mcpku2` separately as a second plugin or create another MCP connection. Use owner-scoped `get_account_profile`, `get_workspace_context({})`, then `list_pages` to resolve the workspace, a unique Page and enabled niche. Clarify ambiguity before any write. An email or tool response is not an authorization grant.
2. Resolve Page, draft count and optional theme from ordinary language. A singular request without a number means one; clarify “several”, ambiguous Pages or a count above 100 before Write. Map the theme to allowed Page topics/formats; do not silently change it. For two or more drafts, create one unscheduled content plan with exactly that many items and the theme in `plan_intent`, then claim one item per turn.
3. Verify that the runtime catalog exposes all three v2 tools before creating drafts. Research extra candidates in ChatGPT, opening one real supporting `source_url` per final sentence. Use `trivia_find_similar_facts_v2` before final copy. Replace used, uncertain, invalidated/superseded/rejected or incomplete/clipped candidates in the same workflow; research additional candidates if needed. Use the existing canonical ID when a found match is SAME and eligible. Never manufacture a new identity or force DISTINCT to evade reuse. `complete=true` means retrieval completeness, not perfect semantic dedup.
4. Compose within current Page rules and attest exactly `meaning_preserved`, `caption_no_new_claim`, `no_known_substantive_issue`, all `pass`; `needs_revision` requires repair before Write. Immediately before fact-bearing Write, read generation context again. Copy `config_public_id`, six-digit `config_updated_at` and string catalog version without JavaScript Date conversion or rounding. Send `save_post_v2` for one draft (or `revise_post_v2` for an existing v2 post), `content_payload.text_metrics: {}`, sentence/URL/dedup per fact, current config/catalog and claim if applicable. No tier, expiry, ontology or separate reservation token is required by v2; no year is mandatory on every line. The server builds bindings/snapshots and authoritative metrics.
5. After every save/revise, call `get_post` with sources/checks and match Page, facts/URLs/copy, status, revision/hash and quality. Read plan progress before the next item. HTTP 200, host approval, or a write summary without readback is not proof of a fully verified saved result. A saved draft is not Setujui/ready. Do not automatically approve, correct, discard, replace or publish. On resume, read `get_content_plan` first, reconcile outputs and never recreate completed items. Report requested/proven/remaining counts and plan/post IDs.
6. Retain operation_key and semantic payload on retry of a logical operation. On conflicts, response loss, stale revision, non-owner or rate limits, reconcile server state; never silently overwrite or duplicate. For `unknown`, read state or replay only the identical key/payload before changing facts or starting another operation. Claim expiry does not prevent replay of a successful save; a new save still needs a live claim. Respect the wait and use bounded retries.
7. Require explicit intent for approval, discard, archive, cancel, replacement, manual publication record and material fact correction. A scoped draft request covers only its requested count and related plan/claim/renew/failure/retry work.
8. Canva design and Facebook uploading/scheduling are manual. Metrics are manually reported. Distinguish CANVA COPY, FACEBOOK CAPTION, HASHTAGS, and INTERNAL INFO. Summarize errors in Indonesian: tool/stage/code, known cause/location, actions tried, readback-proven changes, remaining work and diagnostic ID when supplied; do not invent causes or server responses to host-only refusal.
9. Use only declared MCP tools; never ask for bearer tokens, OAuth secrets, service keys or database passwords. No background AI worker, server OpenAI API, fake URL or registered connection ID.
10. When asked for a post from before the v2 cutover, check it through `list_posts` or `get_post` under owner OAuth. If the ID is absent after reset, explain that the post is unavailable. Do not recreate, restore, or manage it through a retired trivia v1 tool; offer a new v2 draft only after a new scoped request.
