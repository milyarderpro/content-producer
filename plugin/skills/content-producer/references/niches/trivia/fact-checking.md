# Trivia fact checking, source policy and risk

Frozen authority: `plans/trivia-content-dna.md` sections 12, 16–17 and `plans/phase-0-decision-register.md` FACT-008. In trivia, `source_mode=required_per_item`: each atomic canonical fact needs claim-specific evidence before reserve/save. See [dedup ontology](dedup-ontology.md) to test identity only _after_ credible research. Core [source policy](../../core/source-policy.md) governs untrusted inputs and evidence shape.

## Validate the proposition, not just its topic

Break statements into atomic subject–relation–object claims with exact number, unit, comparison basis, negation, condition, scope, location/population and date. Open the original source and record what its actual text supports. Keep `supports` mapped to the entire proposition and each material qualifier. Do not turn "may" into "always", an estimate into an exact value, a subset into all species, a local record into a world record, or correlation into causation. If a needed qualifier will not fit the card, replace the candidate; never shorten it into a misleading fact.

## Source tiers and independence

- **A**: official government/dataset, primary peer-reviewed research, original data-holding or scientific institution — primary/authoritative evidence.
- **B**: credible museum, professional/scientific association, reputable reference or review publication, expert institution — strong evidence.
- **C**: high-quality secondary reporting with traceable original sources — corroboration or discovery, not a substitute for authoritative A/B when required.
- **D**: social posts, competitor datasets, AI answers, anonymous aggregators and copied blogs — discovery only, **never** verification evidence.

Stable, nonsensitive claims require at least **one A or B** source supporting the complete proposition. Periodic/volatile facts need authoritative A/B and `as_of_date`, plus one independent A/B/C confirmation for important numbers, records, superlatives or disputed claims. Medical, legal, financial, food safety, pet safety, survival and other safety-related statements require at least **one A plus independent A/B**; if absent, exclude them. Shared original research syndicated across websites is not independent confirmation. Prefer topic owners (FDA/USDA/CDC for food; veterinary authority for pets; NASA/NOAA/USGS for nature; official statistical/mapping institutions for geography; archives for origins).

Record `canonical_url`, publisher, title, source tier/type, accessed time, relevant publication/update time, `as_of`, `supports` and `independence_group` under the module evidence schema; never copy whole articles into audit snapshots. No URLs in Canva copy or public caption in the MVP. Viral reference examples cannot fill missing source evidence; substantially copied wording must be independently rewritten.

## Freshness ceilings from verification time

- `stable`: at most **24 months**.
- `periodic`: at most **12 months or the next expected update**, whichever is earlier.
- `volatile`: **30 days** by default, at most **90 days** only with documented rationale.
- Sensitive/safety facts: **the shorter applicable interval and 180 days**.

A source can demand an earlier expiry. Changing numbers, records, laws, population, prices, office holders, rankings and other contextual claims need an explicit `as_of_date` and honest public wording. Expired facts remain historical but are **not** eligible for reserve/save/publish until reverified; never bypass this with owner warning acceptance. Same-proposition evidence refresh uses `trivia_reverify_fact`. Material meaning change or invalidation needs explicit owner intent and `trivia_correct_fact`; past posted snapshots remain unchanged.

## Safety triage

- **R0**: stable trivia (documented anatomy, geography, origin); standard evidence.
- **R1**: contextual/changing ranking, record, price or law; preserve metric, jurisdiction and as-of date.
- **R2**: safety-adjacent food/pet/health, household chemicals, survival; two-source rule and conservative wording. No emergency instructions, severity generalizations or universal shelf-life claims.
- **R3**: diagnosis, treatment/dosage, legal or financial advice, dangerous chemical/fire/security/survival hacks, mental-health prescriptions; reject as unsuitable for a short MVP trivia card.

Reject stereotypes, unsupported behavioral determinism and anthropomorphic animal motives. "Best", "largest" and similar ranking language needs defined publisher/metric/geography/year; claims too qualified for the line must be replaced rather than overstated.

## Routing cases (examples are not independently verified)

- `SRC-01` | REJECT | Only a social post and an AI answer repeat a stable anatomy claim | Tier D is discovery, not A/B evidence.
- `SRC-02` | HOLD | A plausible changing record cites an old A source without current `as_of_date` | Reverify current status and obtain independent confirmation; do not reserve stale facts.
- `SRC-03` | HOLD | Two news articles copy the same primary report on a ranking | They share an `independence_group`; find independent confirmation.
- `SRC-04` | REVISE | A cited study says "some species may", but the card says "all species always" | Preserve population, modality and condition or replace claim.
- `SRC-05` | REJECT | A popular home remedy promises disease treatment even with a blog citation | R3/out-of-scope advice; use a harmless different fact.
- `SRC-06` | REJECT | A pet-safety instruction has one veterinary blog but no authoritative A plus independent A/B | Exclude until source threshold can be met; no unsafe workaround.
- `SRC-07` | ALLOW_WITH_VERIFICATION | A stable non-sensitive atomic claim is fully supported by a current Tier A source | Continue to semantic dedup, server checks and owner approval; this is not automatic ready.

Always distinguish editorial insufficiency from deterministic schema/server rejection. Unsupported or expired evidence never becomes `pass` because a draft is attractive.
