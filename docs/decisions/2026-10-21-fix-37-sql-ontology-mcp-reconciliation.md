# FIX-37 — MCP candidate relations aligned with frozen SQL ontology v1

**Status:** Proposed contract reconciliation; Navigator review required.
**Date:** 21 October 2026.
**Scope:** MCP candidate schema, advertised tool catalog, regression tests and plugin guidance.

## Conflict and resolution

The frozen `plans/tool-inventory.md` §11 calls `relation_key` an
“ontology relation, 1..120” without listing the allowed values. MCP
previously accepted arbitrary strings; the frozen SQL helper
`internal.trivia_relation_is_known_v1` already restricts this to 17 keys.
Unknown keys can reach SQL as `ONTOLOGY_VERSION_UNSUPPORTED` even when
`ontology_version` is 1.

This change restricts the shared MCP `TriviaCandidateV1.relation_key` to
the **existing SQL v1 allowlist** in
`20261009060516_add_trivia_identity_source_freshness.sql`:

`has_count`, `has_measurement`, `is_classified_as`, `is_located_in`, `originated_in_time_place`, `has_named_part_or_property`, `holds_record_by_metric_as_of`, `can_perform`, `behaves_as`, `communicates_by`, `affects`, `causes`, `reduces_or_increases_risk`, `is_safe_or_toxic_for`, `recommended_practice`, `is_illegal_or_required_in`, `is_best_or_safest`.

The exact same candidate schema is used by `trivia_find_similar_facts`,
`trivia_register_and_reserve_facts` and the successor of
`trivia_correct_fact`. Therefore `tools/list` must advertise the
same enum in all three paths. No new predicate, normalization, semantic
equivalence, SQL permission, migration, RPC or schema version is introduced.

CR-005 `comparison_direction` remains mandatory. SQL v1 allows
`increase`/`decrease` only for `reduces_or_increases_risk`,
comparison operators only for `holds_record_by_metric_as_of` and
`is_best_or_safest`, and `none` for other relations. MCP enum
validation does not replace domain/SQL semantic validation.
Never change the verified claim, its relational meaning or direction
silently merely to fit an accepted enum. Hold unsuitable claims for
editorial review or choose a separately verified fact.

## Catalog size guard

Advertising the full enum in three candidate inputs increases the
`tools/list` payload. The historical No-auth fallback keeps the CR-033
100,000-byte ceiling by using each tool's existing concise SDK title
as its fallback description. This is wire-presentation metadata only:
OAuth descriptions, tool names, the full 17-value input enum, output
validation, authorization and backend behavior remain unchanged.
The catalog regression checks the size and description provenance.

## Evidence and rollout limits

Issue #37 records the live F1 failure and a read-only successful
relation-only differential. Focused CI demonstrates pre-RPC rejection,
positive transport paths and advertised JSON schemas; **source/CI is not
a live fix**. Owner-authorized Edge rollout and a new ChatGPT OAuth
retest are separate Navigator decisions. No real business writes,
deploy, merge or Issue #36 changes are authorized by this record.
