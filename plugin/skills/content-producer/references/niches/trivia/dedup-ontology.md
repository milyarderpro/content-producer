# Trivia canonical identity and dedup decisions

Frozen authority: `plans/trivia-content-dna.md` section 18, `plans/phase-0-decision-register.md` FACT-007 and `plans/database-design.md` section 11. Facts are reusable **atomic propositions**; hooks, CTA, caption wording, theme, and style are not canonical fact identity. No embeddings, vector search or automatic semantic certainty is permitted.

## Material identity

Compare `subject_entity`, `subject_type`, `relation`, `object_entity_or_value`, `object_type`, `normalized_number`, `normalized_unit`, `comparison_operator_and_direction`, `negation`, `time_qualifier`, `location_qualifier`, `population_qualifier`, `condition_qualifier`, `method_or_metric`, `estimate_or_range_flag` and `scope`. Missing fields serialize explicitly; do not infer that unknown is equivalent to global/unqualified.

**CR-005 / LT-016 live regression:** Every trivia candidate sent to
`trivia_find_similar_facts`, `trivia_register_and_reserve_facts`, or as a
correction successor **must** include
`qualifiers.comparison_direction`. Choose only the supported values
`increase`, `decrease`, `greater_than`, `less_than`, `at_least`,
`at_most`, `equal`, or `none`, consistent with the relation and the
verified atomic proposition. Use `"none"` only when no directional comparison
is asserted (such as a plain `has_count` fact); **do not guess or silently
default** it for directional claims. Omission is invalid even though earlier
plugin/MCP schema advertised this field as optional. Units, including
`null`, must preserve the verified meaning: never change `null` to
`"count"` solely to improve dedup matching scores.

**FIX-37 — SQL v1 closed ontology.** `relation_key` must be one of the
following **17 case-sensitive official keys**; it is not a free-text predicate:

- Measurement/classification/context: `has_count`, `has_measurement`,
  `is_classified_as`, `is_located_in`, `originated_in_time_place`,
  `has_named_part_or_property`, `holds_record_by_metric_as_of`.
- Behavior/impact: `can_perform`, `behaves_as`, `communicates_by`,
  `affects`, `causes`, `reduces_or_increases_risk`.
- Safety/practice/comparison: `is_safe_or_toxic_for`,
  `recommended_practice`, `is_illegal_or_required_in`,
  `is_best_or_safest`.

Choose only a key that accurately represents the sourced atomic claim.
For example `greets_via_trunk_touch` is unsupported; `communicates_by`
may represent an explicitly verified communicative greeting, with its
trunk-touch method retained in the object/qualifier. If the source only
supports physical contact, **do not assert** communication. Hold for
editorial review, reword with verified evidence, or choose a different
fact with the owner's agreement. Never broaden an assertion or silently
change its relation simply to pass validation.

SQL v1 permits `increase`/`decrease` only with
`reduces_or_increases_risk`, and `greater_than`, `less_than`,
`at_least`, `at_most` or `equal` only with
`holds_record_by_metric_as_of` and `is_best_or_safest`. Every other
relation requires comparison direction `none`. **Do not** change a
verified directional claim to `none` or misclassify it as a record or
superlative. If no official relation faithfully expresses the claim,
seek editorial clarification instead of registering it. The legacy SQL
error `ONTOLOGY_VERSION_UNSUPPORTED` can also mean an unknown relation key.

When complete, deterministic-safe relation families include `has_count`, `has_measurement`, `is_classified_as`, `is_located_in`, `originated_in_time_place`, `has_named_part_or_property` and `holds_record_by_metric_as_of`. Potentially ambiguous behavioral, causal, safety, comparative and normative relations such as `can_perform`, `behaves_as`, `causes`, `is_safe_or_toxic_for` and `recommended_practice` require semantic review or stricter discrimination. Changing the relation allowlist/ontology requires a contract change and dedicated fixtures, not an editorial shortcut.

## Decision path

1. Research and verify the exact atomic claim with [fact checking](fact-checking.md).
2. Call `trivia_find_similar_facts`; inspect exact/hash, structured, full-text and trigram candidates, including their material qualifiers. Similar words, entity overlap, sources or topics are candidate signals, **not proof of identity**.
   Request `max_matches_per_candidate: 20` (the tool's allowed maximum) so the READ covers the same top-20 candidate window checked by reservation; omitting it uses a narrower default of 10. Before any reservation, account for every requested candidate position and its `review_required` value. If the displayed/tool response is truncated or a position is missing, issue a targeted `trivia_find_similar_facts` READ for the missing candidate(s); do not interpret unseen matches as none. For every candidate requiring review, inspect the returned matches and provide explicit, evidence-based `same` or `distinct` decisions with the material differences the schema requires. Use `dedup_reviews: []` only for a candidate whose complete result needs no explicit review. An incomplete or uncertain review holds the set before `trivia_register_and_reserve_facts`; never send an empty review array merely to move the workflow forward. This preflight is part of the existing single-post flow, not an extra owner approval checkpoint.
3. ChatGPT assigns **`same`**, **`distinct`** (with a concrete distinguishing field) or **`uncertain`** (with reason). Surface ambiguity rather than guessing. An `uncertain` candidate must **not be registered/reserved**; refine evidence or ask for a safer alternative.
   Before reservation, validate **each submitted review against the exact candidate returned by READ and the proposed fact's structured fields**. Include the candidate's exact `candidate_fact_public_id` once. For `distinct`, every entry in `material_differences` must name a difference that actually exists: `relation` only when `relation_key` differs; `other` only when `subject_key` or `object_key` differs; `number`/`unit` only when the corresponding normalized numbers/units differ; and qualifier labels (`negation`, `time`, `location`, `population`, `condition`, `comparison_direction`, `method`, `scope`) only when that qualifier differs. Do not copy one generic difference list across all matches. For `same`, use an empty difference list. If a pair has the same `relation_key` but a different subject, `material_differences: ["other"]` may be justified; **do not add `"relation"`** merely because the prose or subject differs. Verify every ID, decision, reason, and asserted difference before the single Write; a false asserted difference can reject the entire set with `FACT_REVIEW_REQUIRED` even when all candidate IDs are present.
4. For `same`, use the eligible existing canonical fact subject to freshness, reuse scope and current status. For `distinct`, register and reserve the actual new proposition atomically via `trivia_register_and_reserve_facts`. Do not create duplicates to avoid the reuse rule.
5. Preserve a single ordered fact set, token and matching junctions into `save_post`. Release an abandoned reservation via `trivia_release_facts`. No duplicated reservation or unsanctioned retry of an operation with a new `operation_key`.

If reservation returns `FACT_REVIEW_REQUIRED` with `facts[index].dedup_reviews`, inspect that position's complete `trivia_find_similar_facts` result and the submitted decision. The error does not prove the candidate is distinct or identify a safe automatic replacement. Without a field position, report the generic hold and reconcile the full ordered set; do not guess or retry the same rejected payload with a new operation key.

**Live regression DNA-SSF-01/retest-v027-01:** F1 submitted 20 distinct decisions with valid, complete candidate IDs, but four asserted `"relation"` while both sides had `relation_key: "has_named_part_or_property"`. Those four also had genuinely different subjects, so `"other"` was supportable; the added `"relation"` was not. Audit the fields, not just the count of reviews. This example explains a concrete invalid payload; it does not prove there were no other rejection conditions in that live request.

Materially changed meaning creates a successor through explicitly authorized `trivia_correct_fact`, with old fact `superseded` or `invalidated` as appropriate. Mere fresh evidence for the same meaning uses `trivia_reverify_fact`. Correction can invalidate a ready approval; posted snapshots are immutable. Server enforces version, owner scope, reservation and reuse, not this reference.

## Identity decision pairs (synthetic examples, not verified facts)

- `DUP-01` | SAME | "An octopus has three hearts" / "Octopuses have a total of 3 hearts" | Same subject–relation–count, surface paraphrase.
- `DUP-02` | DISTINCT | "An octopus has three hearts" / "Two octopus hearts pump blood to the gills" | `relation` and predicate differ.
- `DUP-03` | DISTINCT | "Some deer may jump about 10 feet" / "All deer jump more than 10 feet" | `population_qualifier`, strength, operator and estimate differ; do not falsely merge.
- `DUP-04` | DISTINCT | "A record was reported in 2024" / "That record is current in 2026" | `time_qualifier` and present-validity claim differ.
- `DUP-05` | DISTINCT | "A location is north of another" / "A location is south of another" | `comparison_operator_and_direction` differs.
- `DUP-06` | UNCERTAIN | Two vague animal intelligence claims with different wording but undefined measures | Do not auto-merge or reserve; seek measurement and source.
- `DUP-07` | SAME | "3 feet" / "36 inches" for the same subject, metric and condition | Unit alias alone is not new identity after accurate conversion.

Labels test semantic **identity only**, not factual truth, source eligibility or reuse permission. Never cite example pairs as evidence for production.
