# Workflow — niche-agnostic orchestration

See [tool sequences](tool-sequences.md), [lifecycle](lifecycle.md), and [source policy](source-policy.md). The core owns workspace, Page, plan, post status, metrics, authentication and concurrency. The niche owns editorial rules, facts, source thresholds and renderer.

## Resolve user goal and context

get_account_profile → get_workspace_context if needed → list_pages when Page not uniquely known. Ask the user to choose between similar Pages. Never create a Page from an empty search; create_page requires express intent. Choose the configured uniquely enabled niche (MVP: trivia), or clarify. Unsupported format, topic or niche must not be silently replaced. Ask for exact scheduling time in Page timezone when material.

## Single post

1. get_page_generation_context loads current Page+niche config, reuse scope, format, topics, timing and relevant performance.
2. ChatGPT independently researches credible candidates and uses the installed niche source and safety policy; reference viral examples are style only.
3. For trivia, trivia_find_similar_facts → semantic same/distinct/uncertain decision → trivia_register_and_reserve_facts of the exact verified ordered set. Do not force uncertain identity into a new fact. Reservations are atomic.
4. Compose original copy and editorial attestation; save_post with current config, exact reservation token, fact bindings and optional plan claim. Server computes authoritative checks. Save creates draft, never ready.
5. On confirmed save success, display persisted ID, revision, checks and public copy sections. On failure label copy unsaved. Release an abandoned reservation through trivia_release_facts; do not wait for TTL by default.

For revision: get_post → optional research/find/reserve if fact replacement → revise_post using expected revision/hash. Editing ready returns it to draft. Approval/discard/publication require [lifecycle](lifecycle.md). Record performance manually with record_post_performance; review with get_post_performance / get_performance_insights, with sample-size caveats.

## Batch and calendar

create_content_plan stores ordered intent and up to 100 slots before generation. get_content_plan or list_content_plans discovers persisted progress. claim_content_plan_items immediately before active work: 1 item by default, maximum 3, 30-minute lease. Run the single-post flow per item and save with plan_item_public_id and claim_token; save successful items immediately. On failure report_content_plan_item_failure with a safe reason; do not erase completed output. renew_content_plan_claim only once on a live claim, capped at 60 minutes from first claim.

For resumption, reload plan progress from server and claim pending/reclaimable expired items only. No automatic background AI worker. retry_content_plan_item is for failed items; replace_discarded_plan_item needs explicit intent and only applies to discarded prepublication outputs, never posted/archived. cancel_content_plan explicitly cancels remaining items but preserves completed posts.

No Facebook upload/scheduling API, Canva video generation, automatic Facebook analytics, arbitrary SQL, other niche or server OpenAI API is in MVP. Explain scope rather than inventing actions.