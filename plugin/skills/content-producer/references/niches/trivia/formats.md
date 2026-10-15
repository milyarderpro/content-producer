# Trivia formats, profiles and rendering

Frozen authority: `plans/trivia-content-dna.md` sections 7–9, 11–15, 24 and `plans/phase-0-decision-register.md` QUALITY-001/002. Use only the five named `format_key` values permitted by current Page config. `architecture` describes the collection (`single_subject`, `themed`, `mixed`); it does not replace `format_key`.

## Five format contracts

### `single_subject_fast`

Default `fast_trivia`; prefer 7–8 facts, 8–11 words each, on **one familiar subject**. Mix property/anatomy, function/behavior, number/comparison and origin; begin strong and close memorably. Do not repeat the same proposition under new wording. Wrong architecture: unrelated animals presented as one species.

### `themed_utility`

Default `practical_utility`; prefer 5–6 facts, 10–14 words each, with object + safe condition/action + outcome. One narrow practical theme with independently substantiated consequences. `themed` is default; narrow `single_subject` is allowed. A random science fact breaks collection fit. Food/pet/household safety requires [sensitive evidence](fact-checking.md), not clever home remedies.

### `emotional_animal_collection`

Default `fast_trivia`; prefer 7–8 facts about one species or a coherent behavior theme (`single_subject` or `themed`). Progress from curiosity to observable social behavior/ability and a memorable close. Observed behavior is evidence; assumed human motives such as "more loving than humans" are not.

### `comparison`

Default `fast_trivia`, commonly 5–8 facts. Supports `single_subject`, `themed`, or `mixed` **only** when each line uses a consistent comparison device and metric. Preserve units, denominator, direction, population, place and time. Do not mix "largest" by area with "busiest" by visitors or omit the ranking year.

### `myth_vs_fact`

Choose `fast_trivia` or `practical_utility` based on subject; prefer 5–7 corrections. The belief must actually be common or clearly framed as a misconception. Give the precise correction, with short reasoning when needed, without repeating a dangerous claim as fact. May be `single_subject`, `themed` or a device-consistent `mixed`. Medical claims require sensitive-topic evidence or rejection.

## Two preferred density profiles

- `fast_trivia`: 7–8 facts, 8–11 words/fact, around 45–70 characters/fact, 65–85 words total Canva copy.
- `practical_utility`: 5–6 facts, 10–14 words/fact, around 65–90 characters/fact, 65–85 words total.

These are **preferences**, not hard gates. Page-config default counts are adaptive 5–9 (preferred 7); only explicit eligible `FACT_COUNT_BELOW_CONFIG_MIN` waiver can allow 1–4, never less than one, and cannot silently override a fixed count. The hard readiness limits are at most 18 words/fact, 12 in hook, 14 in CTA, 100 Canva words, 28 estimated visual lines including blank separators, 3 wrapped lines/fact, 2 wrapped lines for hook or CTA, `replay_ratio` 2.5, `estimated_loops` 3. Hard failures cannot be waived.

## Canonical output

Renderer default `plain_lines`: hook, blank line, fact lines separated by blank lines, blank line, CTA. `numbered` is justified by genuinely ordered content, clear comparison pairs, a safe checklist or explicit user choice where budget allows. Components must be sent without internal newlines; the **server** normalizes NFC/LF, validates components, adds separators/prefixes, counts characters including punctuation/line breaks and recomputes `canva_copy`. Do not handcraft or truncate an allegedly authoritative rendering.

Page defaults: hook 45 chars, fact 90, rendered facts block 500, CTA 50, full Canva copy 600, caption 500. Configurable hard ceilings are respectively 90, 120, 650, 100, 750 and 1,000 characters. Component budgets and final budget **both** apply; fitting pieces separately can still overflow the assembled card. Estimated reading time uses 200 words/minute plus 0.35 seconds per hook/fact/CTA segment and a 13-second baseline; estimator is not a real viewing measurement.

Default hook `Did you know?` or an honest subject/count/myth hook. Never use "NOBODY KNOWS" or a misleading shock promise. CTA is one line with **one** goal: save for utility, share/follow for animal wonder, comment for safe comparisons or myths, follow for general fast trivia. Avoid "like, comment, share and follow". Caption reinforces the theme, adds **no new factual claim**, and is stored separately (default max 500 chars). Hashtags: default 3, allowed 0–5 distinct case-insensitive tags, no `#Viral`, `#FYP` or unrelated trends. Internal sources/IDs/URLs do not go into CANVA COPY or FACEBOOK CAPTION.

## Source-level examples (not yet fact-verified)

Each case is an editorial routing illustration, **not** an assertion that the sample claim has verified sources. A conforming shape still requires real verification, dedup, server checks and owner approval.

- `FMT-01` | `single_subject_fast` | ALLOW_WITH_VERIFICATION | Seven distinct, sourced octopus anatomical/behavioral angles about the same species | REJECT if one item merely restates the three-hearts claim.
- `FMT-02` | `themed_utility` | ALLOW_WITH_VERIFICATION | Six low-risk storage explanations under one theme, with supported conditions | REJECT unqualified "keeps any food fresh for weeks".
- `FMT-03` | `emotional_animal_collection` | ALLOW_WITH_VERIFICATION | Seven observed social/sensory behaviors with species and sources | REVISE "animals are more loyal than humans" to observed behavior only.
- `FMT-04` | `comparison` | ALLOW_WITH_VERIFICATION | Six same-unit, same-year scale comparisons | REVISE a line that compares different metrics or ignores time.
- `FMT-05` | `myth_vs_fact` | ALLOW_WITH_VERIFICATION | Five accurately sourced misconception corrections | REJECT invented straw man or unverified health myth.
- `FMT-06` | `comparison` | REVISE | Five otherwise accurate facts presented in random order with a dishonest "most shocking" hook | Reorder, align hook and use one relevant CTA.
- `FMT-07` | `themed_utility` | REVISE | Valid low-risk body but CTA demands "like, comment, share and follow" | Replace with a single save-oriented CTA.

A wrong architecture or weak collection fit is an editorial revise/replace decision, **not** a new format. See [quality rubric](quality-rubric.md) before attesting readiness.
