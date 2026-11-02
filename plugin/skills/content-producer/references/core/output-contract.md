# Output contract

For v2, a successful save_post_v2 summary followed by matching get_post readback proves a saved **draft**; after revise_post_v2, read back that same post. Match Page/facts/URLs/copy/status/revision/hash/checks. A locally composed preview is **unsaved**; a lost tool response is **unconfirmed** until reconciliation/replay and readback. HTTP 200 or host approval is not proof of persistence. Legacy save_post results follow their versioned contract. A separate successful approve_post for the exact reviewed revision/hash establishes ready.

## CANVA COPY

Show the persisted module-rendered hook, fact lines and CTA, preserving exact niche rules, order and text budget. Public copy must not include source URLs, markdown bullets, internal IDs, diagnostics or credentials. Canva editing and video export are manual.

## FACEBOOK CAPTION

Display the persisted caption separately. Do not introduce unsourced claims, regenerate missing legacy fields, or claim the caption was uploaded.

## HASHTAGS

Show stored relevant hashtags separately from the caption and copy.

## INFORMASI INTERNAL / INTERNAL INFO

Show public post ID, Page/niche, topic/format, interaction goal, current status and revision, scheduled_at and Page timezone when known, source links and concise system/editorial quality checks. Internal information is not pasted into Canva/Facebook. Use the server-returned `text_metrics` from a successful `save_post` / `revise_post` or authoritative `get_post` readback; never display pre-submit client estimates as authoritative. Include current plan progress, warnings and recovery needs.

Three independent authorities govern readiness: server system checks, ChatGPT versioned editorial attestation of exact content and explicit owner approval. Critical fails/needs_review block ready; only allowlisted noncritical warnings can be accepted with an explicit reason. On failures or stale content, report the uncertainty rather than claiming approval.

For v2, display its three revision/hash-bound editorial results and mechanical
checks; style suggestions are separate nonblocking notes, not v1 warnings or
source-tier/expiry gates. Keep source URLs in internal information only.
Read sources/checks with `include_sources: true` and `include_checks: true`.

## Ringkasan Indonesia berbasis bukti

For several drafts, report requested count, readback-proven count, remaining
count and plan/post IDs from `get_content_plan`/`get_post`, never from a handler
error alone. Example (synthetic): “Diminta 5 draft; 3 terbukti melalui readback,
2 tersisa. Plan: <plan-id>; post: <three-proven-ids>. Item keempat berhenti pada
save_post_v2/domain, FACT_REUSE_BLOCKED, fakta[2]. Sudah membaca ulang plan dan
memilih calon pengganti; belum ada save baru. Tiga draft sebelumnya tetap ada.”

Unknown example: “save_post_v2/output, RPC_RESPONSE_INVALID. Hasil Write belum
dapat dipastikan; belum menyatakan rollback atau membuat draft pengganti.
Berikutnya baca post/plan atau replay key/payload identik. ID diagnostik:
<server-diag-id>.” Include only actions actually tried and changes proven by Read.
For a host refusal before MCP, describe only the observed host boundary; do not
invent structuredContent, transaction error, server diagnostic ID or database cause.

Facebook upload and scheduling are manual. mark_post_posted records user-confirmed external publication; it does **not** upload to Facebook. Manual performance records include observed metric, source and captured_at. Missing values remain null/unknown (not zero); cumulative snapshots are not summed. Insufficient sample size is not a causal insight or a virality promise.

See [lifecycle](lifecycle.md), [source policy](source-policy.md), and [tool sequences](tool-sequences.md).
