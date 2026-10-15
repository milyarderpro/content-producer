# Trivia canonical identity and dedup decisions

Frozen authority: `plans/trivia-content-dna.md` section 18, `plans/phase-0-decision-register.md` FACT-007 and `plans/database-design.md` section 11. Facts are reusable **atomic propositions**; hooks, CTA, caption wording, theme, and style are not canonical fact identity. No embeddings, vector search or automatic semantic certainty is permitted.

## Material identity

Compare `subject_entity`, `subject_type`, `relation`, `object_entity_or_value`, `object_type`, `normalized_number`, `normalized_unit`, `comparison_operator_and_direction`, `negation`, `time_qualifier`, `location_qualifier`, `population_qualifier`, `condition_qualifier`, `method_or_metric`, `estimate_or_range_flag` and `scope`. Missing fields serialize explicitly; do not infer that unknown is equivalent to global/unqualified.

When complete, deterministic-safe relation families include `has_count`, `has_measurement`, `is_classified_as`, `is_located_in`, `originated_in_time_place`, `has_named_part_or_property` and `holds_record_by_metric_as_of`. Potentially ambiguous behavioral, causal, safety, comparative and normative relations such as `can_perform`, `behaves_as`, `causes`, `is_safe_or_toxic_for` and `recommended_practice` require semantic review or stricter discrimination. Changing the relation allowlist/ontology requires a contract change and dedicated fixtures, not an editorial shortcut.

## Decision path

1. Research and verify the exact atomic claim with [fact checking](fact-checking.md).
2. Call `trivia_find_similar_facts`; inspect exact/hash, structured, full-text and trigram candidates, including their material qualifiers. Similar words, entity overlap, sources or topics are candidate signals, **not proof of identity**.
3. ChatGPT assigns **`same`**, **`distinct`** (with a concrete distinguishing field) or **`uncertain`** (with reason). Surface ambiguity rather than guessing. An `uncertain` candidate must **not be registered/reserved**; refine evidence or ask for a safer alternative.
4. For `same`, use the eligible existing canonical fact subject to freshness, reuse scope and current status. For `distinct`, register and reserve the actual new proposition atomically via `trivia_register_and_reserve_facts`. Do not create duplicates to avoid the reuse rule.
5. Preserve a single ordered fact set, token and matching junctions into `save_post`. Release an abandoned reservation via `trivia_release_facts`. No duplicated reservation or unsanctioned retry of an operation with a new `operation_key`.

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
