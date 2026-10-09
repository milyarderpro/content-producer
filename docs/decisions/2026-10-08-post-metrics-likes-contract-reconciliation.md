# CR-003 — Post-metrics `likes` contract reconciliation

| Field  | Value                 |
| ------ | --------------------- |
| Status | Accepted              |
| Date   | 8 October 2026        |
| Scope  | Phase 3 core database |

## Conflict

The Phase 3 `post_metrics` implementation initially omitted a dedicated
nullable `likes` field, while accepted frozen decision `QUALITY-006` specifies
that `likes` is an optional subset of `reactions` and must remain distinct.

## Accepted decision

`QUALITY-006` controls the implementation. Phase 3 adds `post_metrics.likes`
as a nullable `bigint`, preserves the existing `reactions` total, and enforces
`likes <= reactions` when both are known. `null` remains unknown and is never
normalized to zero.

This amendment reconciles the implementation with the frozen accepted decision
without editing the frozen Phase 0 documents.

## Verification

Focused database tests prove likes-only snapshots, valid subset values,
rejection of an oversized subset, null/zero semantics, and immutable metrics
payload validation.
