# Workflow — niche-agnostic orchestration

See [tool sequences](tool-sequences.md), [lifecycle](lifecycle.md), and [source policy](source-policy.md). The core owns workspace, Page, plan, post status, metrics, authentication and concurrency. The niche owns editorial rules, facts, source thresholds and renderer.

## Resolve user goal and context

get_account_profile → get_workspace_context if needed → list_pages when Page not uniquely known. Ask the user to choose between similar Pages. Never create a Page from an empty search; create_page requires express intent. Choose the configured uniquely enabled niche (MVP: trivia), or clarify. Unsupported format, topic or niche must not be silently replaced. Ask for exact scheduling time in Page timezone when material.

## Primary trivia v2 — one or multiple drafts

Parse Page/count/theme from ordinary instructions. One without a number means one;
clarify ambiguous Page/count or a request above 100 before Write. Use allowed
topics/formats and Page fact count, locale `en-US`, reuse and hard budgets.
Verify the three v2 tool names in the actual catalog; never assume deployment.

1. One draft needs no plan. For 2–100 drafts, create one unscheduled plan of the
   exact size, theme in `plan_intent`; claim one item before researching it.
   Choose a non-null format only after the angle supports its device; otherwise
   use format_key: null when no explicit format was requested. Do not allocate
   comparison merely to meet a batch weight. Resolve item intent before save;
   never silently rewrite an existing completed plan item.
   Draft count does not set fact count. Preserve Page adaptive settings unless
   a legitimate explicit count/item override applies; honor fixed count/title.
   For trivia, read DNA and the pattern index before choosing the angle, then
   two relevant complete cards and one anti-example before writing. Follow
   the niche playbook for curation, editing and final review.
2. Research more candidate sentences than final facts. Open real source pages;
   one supporting `source_url` per final fact is sufficient. No tier/expiry,
   ontology input, year on every line or separate reservation is required by v2.
3. `trivia_find_similar_facts_v2` precedes final copy. Review all visible matches
   as SAME/DISTINCT/UNCERTAIN. Replace used, uncertain, ineligible or incomplete
   candidates, including host clipping; research replacements when reserves run
   out. SAME uses the old ID if eligible, never a parallel identity.
   Curate for distinct reader value; replace filler, repeated measurements or
   repeated reactions before copy. Semantic eligibility alone is not DNA fit.
4. Finish the niche's writing review before save/revise: angle, opening,
   contributions, order, closing, naturalness and reference fit on the exact
   payload copy. Repair wording or research/dedup replacements before Write,
   even when the server could accept the old copy. After two directed editorial
   repair rounds still fail, report the limitation and proven progress without
   filler, silent count reduction, forced DISTINCT or a replacement post.
   This adds no routine preview/GO checkpoint or server attestation.
   Assess exactly the three v2 editorial checks with unchanged meanings.
   `no_known_substantive_issue` is not a DNA/style score. Read current generation
   context immediately before `save_post_v2`/`revise_post_v2`; preserve six-digit
   config timestamp and catalog string exactly. Send `text_metrics: {}`; the
   server computes metrics/bindings/snapshots and rejects stale catalog/config.
   Revalidate changed config and fresh dedup/catalog before submission. Any
   further editing/research requires another immediate pre-Write context Read.
5. `get_post` with sources/checks after every save/revise, then `get_content_plan`
   before the next item. Match IDs, Page, content, URL snapshots, draft status,
   revision/hash and checks. If readback fails, reconcile that same post before
   proceeding; do not create a replacement merely to make readback succeed.
   Compare reviewed copy, submitted copy and authoritative rendered readback.
   If they differ, do not claim persisted DNA success or silently rewrite the
   displayed copy. Reconcile the same post under CAS and scope; no automatic
   revise, approval, replacement or new intent is granted by a mismatch.
6. Resume starts with `get_content_plan`; if several plans match, ask which.
   Completed output is never regenerated. Preserve successful earlier drafts;
   report exact requested/proven/remaining counts with plan/post IDs. No worker.

The request grants only its scoped draft count and related plan work, not
approval, cancellation, discard, replacement, correction, publication or metrics.
Lease remains 30 minutes, one renewal, max 60 minutes from first claim. Failure
report/retry follows a live attempt and persisted state. A lost create-plan/save
response requires reconciliation or identical key/payload replay. Successful-save
replay remains valid after claim expiry, while a new save needs a live claim.
Catalog conflict calls for fresh dedup Read/review, not unnecessary source
research when meaning/support remain valid. Revision/hash conflict requires
get_post and review, not a silent CAS refresh.

## Batch and calendar

create_content_plan stores ordered intent and up to 100 slots before generation. get_content_plan or list_content_plans discovers persisted progress. claim_content_plan_items immediately before active work: 1 item by default, maximum 3, 30-minute lease. Run the single-post flow per item and save with plan_item_public_id and claim_token; save successful items immediately. On failure report_content_plan_item_failure with a safe reason; do not erase completed output. renew_content_plan_claim only once on a live claim, capped at 60 minutes from first claim.

For resumption, reload plan progress from server and claim pending/reclaimable expired items only. No automatic background AI worker. retry_content_plan_item is for failed items; replace_discarded_plan_item needs explicit intent and only applies to discarded prepublication outputs, never posted/archived. cancel_content_plan explicitly cancels remaining items but preserves completed posts.

No Facebook upload/scheduling API, Canva video generation, automatic Facebook analytics, arbitrary SQL, other niche or server OpenAI API is in MVP. Explain scope rather than inventing actions.
