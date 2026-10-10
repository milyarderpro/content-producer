# CR-005 — Comparison direction in trivia canonical identity

| Field  | Value                                                               |
| ------ | ------------------------------------------------------------------- |
| Status | Accepted                                                            |
| Date   | 9 October 2026                                                      |
| Scope  | Phase 4 Batch A canonical identity and `TriviaCandidateV1` contract |

## Conflict

The frozen Phase 4 plan requires canonical structured serialization to include
the material field `comparison_direction`, and requires the server to derive it
from the ontology relation/key manifest. It further requires comparison
direction to remain distinct in canonical identity.

The frozen `TriviaCandidateV1` contract in `plans/tool-inventory.md` exposes
only these qualifier inputs: `negated`, `time`, `location`, `population`,
`condition`, `method`, `scope`, and `estimate`. It has no comparison-direction
field, and no existing candidate input can faithfully distinguish, for example,
an increase from a decrease while holding subject, relation, object, number,
and all listed qualifiers equal.

The current private serializer reflects that absence by emitting an empty
comparison-direction component. Inferring a value from claim prose would violate
the frozen rule against free semantic normalization and would make identity
non-reproducible from structured canonical inputs.

## Safe options

1. **Recommended — add a closed `comparison_direction` enum** to
   `TriviaCandidateV1.qualifiers`: `increase`, `decrease`, `greater_than`,
   `less_than`, `at_least`, `at_most`, `equal`, and `none`. Version the
   relevant candidate/identity contract and derive the serialized value only
   from that validated input plus the relation manifest. This preserves
   deterministic, explicit identity.
2. Split every direction-sensitive relation into separate canonical relation
   keys and keep `comparison_direction` absent. This changes the ontology and
   requires an explicit mapping for every current and future relation.
3. Keep the current field absent and declare all direction-sensitive relation
   families review-only. This does not satisfy the frozen requirement that
   comparison direction participates in canonical identity and is therefore not
   recommended.

## Accepted decision

The user explicitly approved option 1 on 9 October 2026. Add the closed
`comparison_direction` enum to the canonical qualifier input and enforce it
through an additive migration. The candidate and identity contracts remain at
their existing schema version for the MVP because this is a missing required
field reconciliation, not a semantic reinterpretation of an existing value.
Allowed values are `increase`, `decrease`, `greater_than`, `less_than`,
`at_least`, `at_most`, `equal`, and `none`; `none` is used only when the
ontology relation does not carry a directional comparison. Existing migrations
remain untouched.

## Affected implementation and tests

- `internal.trivia_canonical_qualifiers_v1` and the structured-key/hash
  derivation.
- The ontology-completeness manifest and candidate retrieval input validation.
- Candidate, identity, collision, and gold-fixture tests for direction-sensitive
  cases.
- No public `api` RPC, reservation primitive, production fact, or remote action
  is authorized by this record.
