# Trivia formats, profiles and rendering

**Current v2 precedence:** use current Page fact count, allowed choices and hard
budgets. The five formats/two density preferences still guide composition, but
use the common sentence + one URL research path without extra source-tier or expiry gates. If a factual qualifier
cannot fit, replace the angle/fact; do not require a year on every line. V2
save/revise rejects a hard violation, computes metrics, and requires three
editorial pass results. Never bypass a v2 count or budget failure.

Frozen authority: `plans/trivia-content-dna.md` sections 7–9, 11–15, 24 and `plans/phase-0-decision-register.md` QUALITY-001/002, with CR-061's limited editorial overrides. Use only the five named `format_key` values permitted by current Page config. `architecture` describes the collection (`single_subject`, `themed`, `mixed`); it does not replace `format_key`.

## Five format contracts

Choose format from the device supported by the selected angle, not from a
topic label or a quota. A one-country collection can be single_subject_fast;
varied facts alone do not make it comparison. When the user has not fixed a
format and the device is unresolved, a new plan item may use format_key: null.
Resolve the permitted format during composition. A non-null existing item
intent or explicit requested format cannot be silently replaced.
Meaningful contrasts need to be visible in the facts; neither a heading nor
a CTA containing difference or contrast supplies the missing device.


### `single_subject_fast`

Default `fast_trivia`; prefer 7–8 facts, 8–11 words each, on **one familiar subject** when config permits. Select different reader payoffs; property, behavior, comparison and origin are options, not required slots. Begin strong and close memorably. Do not repeat a proposition or reader reaction under new wording. Wrong architecture: unrelated animals presented as one species.

### `themed_utility`

Default `practical_utility`; prefer 5–6 facts, 10–14 words each, with object + safe condition/action + outcome. One narrow practical theme with independently substantiated consequences. `themed` is default; narrow `single_subject` is allowed. A random science fact breaks collection fit. Food/pet/household safety needs credible support and cautious wording, not clever home remedies.

### `emotional_animal_collection`

Default `fast_trivia`; prefer 7–8 facts about one species or a coherent behavior theme (`single_subject` or `themed`). Progress from curiosity to observable social behavior/ability and a memorable close. Observed behavior is evidence; assumed human motives such as "more loving than humans" are not.

### `comparison`

Default `fast_trivia`; prefer 7–8 facts when config permits, honoring explicit counts. Supports `single_subject`, `themed`, or `mixed` with an honest comparison device. Compare like-for-like **within each pair**; dimensions may differ between lines. A pair can compare ear shape, another habitat, another a supported size relationship. Preserve units, denominator, direction, population, place and time where material. Never compare one city's area with another city's visitors as if they were the same metric. Replace a monotonous diameter list with different meaningful relationships unless the user explicitly requests that literal table. Do not omit a ranking year or invent scale analogies.

Comparison need not force two subjects into every line. A meaningful contrast
can emerge across adjacent lines or a clear common baseline. Ordinary
facilities paired mechanically are weak selection, not a surprise merely
because the syntax compares them. Preserve truthful format mapping.

### `myth_vs_fact`

Choose `fast_trivia` or `practical_utility` based on subject; prefer 7–8 fast or 5–6 utility corrections when allowed. The belief must actually be common or clearly framed as a misconception. Correct it directly in natural language, with short reasoning when needed, without repeating a dangerous claim as fact. Repeated `Myth:`/`Fact:` labels are optional, used when explicitly requested or useful to the format. May be `single_subject`, `themed` or a device-consistent `mixed`. Avoid medical advice; replace unsupported or unsafe claims.

## Two preferred density profiles

- `fast_trivia`: 7–8 facts, 8–11 words/fact, around 45–70 characters/fact, 65–85 words total Canva copy.
- `practical_utility`: 5–6 facts, 10–14 words/fact, around 65–90 characters/fact, 65–85 words total.

These are **preferences**, not hard gates. Page-config default counts are adaptive 5–9 (preferred 7); follow the configured count and do not silently reduce it. The hard readiness limits are at most 18 words/fact, 12 in hook, 14 in CTA, 100 Canva words, 3 wrapped lines/fact, 2 wrapped lines for hook or CTA, `replay_ratio` 2.5, `estimated_loops` 3. Total estimated visual lines remain a server-reported metric, **not** a hard limit or approval warning under CR-051. Hard failures cannot be waived.

During composition, use a short hook and CTA, remove redundant wording, and prefer facts that express their meaning compactly. The 65–85-word target is not a minimum: never pad a shorter complete card to reach it. Requested draft count is not fact count; five drafts do not justify `fixed: 5`. Explicit fixed count/title/layout and current config take precedence over these preferences. Preserve material qualifiers and replace a fact that cannot fit honestly. Do not claim an exact line count before the server renders the copy, and never supply calculated `text_metrics`; send `{}` as the core workflow requires. A hard readability failure requires repair before a successful save or approval.

## Canonical output

Renderer default `plain_lines`: hook, blank line, fact lines separated by blank lines, blank line, CTA. `numbered` is justified by genuinely ordered content, clear comparison pairs, a safe checklist or explicit user choice where budget allows. Components must be sent without internal newlines; the **server** normalizes NFC/LF, validates components, adds separators/prefixes, counts characters including punctuation/line breaks and recomputes `canva_copy`. Do not handcraft or truncate an allegedly authoritative rendering.

Page defaults: hook 45 chars, fact 90, rendered facts block 500, CTA 50, full Canva copy 600, caption 500. Configurable hard ceilings are respectively 90, 120, 650, 100, 750 and 1,000 characters. Component budgets and final budget **both** apply; fitting pieces separately can still overflow the assembled card. Estimated reading time uses 200 words/minute plus 0.35 seconds per hook/fact/CTA segment and a 13-second baseline; estimator is not a real viewing measurement.

Default hook `Did you know?`. Use it literally, without an appended teaser.
Use a different title when explicitly requested or functionally necessary;
a named subject alone is not such a request. Never automatically switch
to all caps or a numbered subject title. Never use "NOBODY KNOWS" or a
misleading shock promise. CTA is one line with **one** goal: save for utility,
share/follow for animal wonder, comment for safe comparisons or myths,
follow for general fast trivia. Avoid "like, comment, share and follow".
Caption reinforces the theme, adds **no new factual claim**, and is stored
separately (default max 500 chars). Hashtags: default 3, allowed 0–5 distinct
case-insensitive tags, no `#Viral`, `#FYP` or unrelated trends.
Internal sources/IDs/URLs do not go into CANVA COPY or FACEBOOK CAPTION.

## Source-level examples (not yet fact-verified)

Each case is an editorial routing illustration, **not** an assertion that the sample claim has verified sources. A conforming shape still requires real verification, dedup, server checks and owner approval.

- `FMT-01` | `single_subject_fast` | ALLOW_WITH_VERIFICATION | Seven distinct, sourced octopus anatomical/behavioral angles about the same species | REJECT if one item merely restates the three-hearts claim.
- `FMT-02` | `themed_utility` | ALLOW_WITH_VERIFICATION | Six low-risk storage explanations under one theme, with supported conditions | REJECT unqualified "keeps any food fresh for weeks".
- `FMT-03` | `emotional_animal_collection` | ALLOW_WITH_VERIFICATION | Seven observed social/sensory behaviors with species and sources | REVISE "animals are more loyal than humans" to observed behavior only.
- `FMT-04` | `comparison` | ALLOW_WITH_VERIFICATION | Different dimensions with like-for-like scope/units inside each pair | REVISE a pair using unlike metrics or omitting material time; honor a requested literal same-metric table.
- `FMT-05` | `myth_vs_fact` | ALLOW_WITH_VERIFICATION | Five accurately sourced misconception corrections | REJECT invented straw man or unverified health myth.
- `FMT-06` | `comparison` | REVISE | Five otherwise accurate facts presented in random order with a dishonest "most shocking" hook | Reorder, align hook and use one relevant CTA.
- `FMT-07` | `themed_utility` | REVISE | Valid low-risk body but CTA demands "like, comment, share and follow" | Replace with a single save-oriented CTA.

A wrong architecture or weak collection fit is an editorial revise/replace decision, **not** a new format. See [quality rubric](quality-rubric.md) before attesting readiness.
