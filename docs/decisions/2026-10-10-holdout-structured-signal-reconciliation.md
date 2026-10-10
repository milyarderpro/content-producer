# CR-008 — Holdout exact-signal reconciliation

| Field  | Value                                   |
| ------ | --------------------------------------- |
| Status | Accepted                                |
| Date   | 10 October 2026                         |
| Scope  | Phase 4 Batch A fixture correction only |

## Conflict

Holdout case `ai-dedup-v1-dyk-post-065-61` uses the `can_perform` relation.
That relation is deliberately not deterministic-safe, so it cannot produce an
`exact_structured` auto-match. The left and right claim text are identical,
however, and correctly produce an `exact_claim` signal.

The v1 fixture label therefore conflicts with the accepted structured-match
eligibility boundary. Leaving it unchanged would make the later holdout gate
test an impossible expectation.

## Accepted decision

The user approved this correction on 10 October 2026. Change that case's
expected signal from `exact_structured` to `exact_claim`; retain its claim,
canonical candidates, decision, split, threshold values, and all implementation
logic unchanged.

This is a human-approved fixture-label correction, not threshold tuning and
not an evaluation of holdout performance. Increment the fixture manifest from
v1 to v2 and regenerate the source-controlled holdout artifact and checksum.

## Effect

Only the fixture corpus, its loader validation, manifest, integrity artifact,
and related tests change. No database migration, public API/RPC, production
fact, seed, secret, or Batch B object is authorized.
