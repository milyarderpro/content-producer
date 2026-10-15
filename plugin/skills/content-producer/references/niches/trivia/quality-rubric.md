# Trivia editorial rubric and safe outcomes

Frozen authority: `plans/trivia-content-dna.md` sections 19–21 and `plans/phase-0-decision-register.md` QUALITY-003/004. Apply after [fact checking](fact-checking.md), [dedup review](dedup-ontology.md) and [format selection](formats.md), before attesting the current saved revision. The [core lifecycle](../../core/lifecycle.md) governs approval and state transitions.

## Three separate authorities

1. **ChatGPT editorial judgment** compares exact source-supported canonical facts against public wording; checks semantic meaning, quality, natural en-US style, collection fit and safety. Supply structured, rubric-versioned `editorial_checks` tied to the current `content_hash` and revision, with evidence paths and risk flags.
2. **Server deterministic checks** verify schemas, allowed format/topic/profile, current verified facts, source policy/freshness, dedup/reuse, reservation/junction, exact renderer, character and hard readability limits. Only the server sets authoritative system `pass` and timestamps; an eloquent editorial rationale cannot bypass a failure.
3. **Owner approval** must be an explicit command for the exact reviewed post revision/hash. A saved draft is not automatically `ready`. A critical failure, stale attestation or unwaivable hard gate cannot be approved via waiver.

## Critical criteria — `fail` or `needs_review` blocks `ready`

- `trivia.meaning_preserved`: public fact wording keeps negation, unit, scope, time and other canonical qualifiers.
- `trivia.source_supported`: source evidence supports the exact proposition, not merely the topic.
- `trivia.time_context_valid`: changing claims include valid as-of/time context.
- `trivia.safety_appropriate`: no dangerous guidance, misleading hazard claims or prohibited topic.
- `trivia.caption_no_new_claim`: caption does not introduce independent unsourced numbers/facts.
- `trivia.substantial_copying_absent`: source and viral dataset wording are not substantially copied.

## Noncritical criteria — improve, then reassess

- `trivia.hook_honest`, `trivia.collection_coherent`, `trivia.fact_atomic` and `trivia.surprise_substantive`.
- `trivia.variety_sufficient`, `trivia.english_global_clear` and `trivia.number_context_clear`.
- `trivia.cta_goal_aligned`, `trivia.caption_supportive`, `trivia.hashtags_relevant`.
- `trivia.visual_rhythm_clear` and `trivia.format_conformant`.

A noncritical style warning is not secretly changed to `pass`. Only a server-allowlisted warning with explicit owner reasoning may be accepted; serious grammar/layout failure may still block ready. Hard budgets, source, safety, copying and critical editorial status have **no waiver**.

Optional editorial DNA strength score: 0–2 each for familiarity, surprise, specificity, coherence, scanability and utility/emotion. 10–12 is strong, 8–9 improvable, 0–7 weak. A high score does **not** override critical safety/source/dedup/renderer failure. Prefer revise/replace weak facts rather than artificially boost claims.

## Final review checklist

- Exact post/Page/niche, format/profile and provenance match; no unverified addition in hook, facts or caption.
- Facts are atomic, varied, coherent, and numbered only when justified. Sentence-case `en-US` is understandable globally.
- Hook aligns with the actual body and does not overpromise; CTA has exactly one safe interaction goal, with no guilt bait.
- Renderer output is server-confirmed within both component and final budgets; Canva copy, caption, hashtags and internal URLs are separate.
- The current `content_hash`, editorial rubric version, server checks and owner-facing review are aligned. After a revision or material fact correction, repeat current checks and request a **new** explicit approval; never reuse a stale pass.

## Scenario outcomes (illustrations, not live-host acceptance tests)

- `QUAL-01` | REJECT | Tier-D-only source and a catchy hook | Critical `trivia.source_supported` fails; find eligible evidence or replace fact.
- `QUAL-02` | HOLD | Changing record once verified but now expired | Reverify as-of/source; no approval with stale evidence.
- `QUAL-03` | REJECT | New caption claim not represented by canonical facts | Remove unsupported claim before attestation.
- `QUAL-04` | REVISE | Hook promises "the world's best" but facts show no ranking | Correct or replace the hook, then re-evaluate.
- `QUAL-05` | REVISE | CTA says "Like, comment, share and follow if you're smart" | Replace with one natural interaction goal, no manipulation.
- `QUAL-06` | REVISE | Correct facts copied closely from a competitor post | Independently reword original prose; reject if substantial copying persists.
- `QUAL-07` | REVISE | Components fit individually but rendered separators exceed final character budget | Shorten without dropping essential qualifiers or replace candidates; server remains authoritative.
- `QUAL-08` | HOLD | Editorial quality is sound, but server check failed or approval refers to stale hash | Resolve system/revision conflict and re-attest; do not mark ready.
- `QUAL-09` | ALLOW_WITH_VERIFICATION | All critical criteria pass and noncritical criteria pass | Still require current server checks and express owner approval for `ready`.

No test sample is a validated, postable factual claim. Production evaluation's frozen 50 full-post editorial fixtures, 150 dedup cases and independent host checks remain Phase 8–10 work, not proven by these source-level examples.
