# CR-007 — Canonical unit vocabulary for the Batch A deduplication fixture

| Field  | Value                                |
| ------ | ------------------------------------ |
| Status | Accepted                             |
| Date   | 9 October 2026                       |
| Scope  | Phase 4 checkpoint 4.4, Batch A only |

## Conflict

`TriviaCandidateV1` requires `numbers[].unit` to be a canonical unit string
or null. The accepted Batch A fixture contains measurements expressed in
common units used by the supplied English-language pattern datasets, including
hours, miles, feet, inches, pounds, gallons, litres, miles per hour, and
kilometres per hour. The current private canonicalizer accepts only a narrower
subset and rejects these otherwise meaningful fixture candidates.

Removing unsupported units from the fixture would erase semantic identity
evidence and make the deduplication evaluation less representative. Treating
arbitrary strings as units would weaken the fail-closed validator.

## Proposed decision

Extend the closed vocabulary in `internal.trivia_canonical_numbers_v2` through
one additive Phase 4 migration. The vocabulary remains fail-closed and maps
only explicit aliases to canonical values:

- length: `centimeter`, `millimeter`, `foot`, `inch`, `mile`;
- mass: `pound`;
- volume: `liter`, `gallon`;
- speed: `mile_per_hour`, `kilometer_per_hour`;
- time: singular canonical `second` through `year` with plural aliases;
- explicit count nouns used in fixture identities: `landing`, `serving`,
  `egg`, `room`, `passenger`, `brick`, and `sound`.

The migration must not accept unlisted unit strings. It must retain the
existing bounds, canonical number ordering, decimal normalization, and caller
privilege revocations. Focused tests must cover positive aliases and rejected
unknown units.

## Alternatives rejected

- Delete or null-out unsupported units in fixture records: loses identity
  evidence.
- Store raw source wording as arbitrary unit strings: violates fail-closed
  canonicalization.
- Change database behavior without a change record: violates the frozen-plan
  governance rule.

## Accepted decision

The user approved the proposed decision on 9 October 2026. The additive
migration and focused validator coverage described above are authorized.

## Effect

One additive migration and focused validator tests are authorized. No public
API, RPC, remote action, production fact, or seed data is added. Batch B
remains out of scope.

The one holdout fixture that expressed a ratio as `proportion` is represented
with a null unit and a `reported_proportion` role, rather than admitting an
unlisted raw unit. Its compressed integrity artifact and checksum were updated
in the same CR-007 remediation; this was a vocabulary correction, not a
threshold calibration or holdout-outcome evaluation.
