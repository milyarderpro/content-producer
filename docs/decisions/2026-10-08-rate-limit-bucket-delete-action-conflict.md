# CR-002 — Rate-limit bucket foreign-key delete action

| Field  | Value                 |
| ------ | --------------------- |
| Status | Accepted              |
| Date   | 8 October 2026        |
| Scope  | Phase 3 core database |

## Conflict

`plans/database-design.md` section 5.6 states that every foreign key uses
`ON DELETE RESTRICT`. The reference DDL in section 20 instead defines
`internal.rate_limit_buckets.actor_user_id` with `ON DELETE CASCADE` to
`auth.users(id)`.

The Phase 3 execution request repeats the all-foreign-key `ON DELETE RESTRICT`
requirement. These clauses cannot both be implemented for the same foreign key.

## Options

1. Preserve the reference DDL exception and use `ON DELETE CASCADE` only for
   `internal.rate_limit_buckets.actor_user_id`. This automatically removes
   ephemeral rate-limit counters when an Auth user is removed, but creates one
   documented exception to the generic deletion rule.
2. Apply `ON DELETE RESTRICT` to the rate-limit bucket foreign key. This keeps
   the all-foreign-key rule literal, but an Auth-user deletion must first remove
   the related operational counters through a separately authorized process.

## Accepted decision

Option 1 is accepted. `internal.rate_limit_buckets.actor_user_id` uses
`ON DELETE CASCADE` to `auth.users(id)` as the only narrowly scoped exception
to the general `ON DELETE RESTRICT` rule. Rate-limit buckets are
operational, non-business counter rows with no audit-retention requirement;
cascading their deletion on Auth-user removal avoids orphaned cleanup work.
This record is the official amendment for the conflict; the frozen Phase 0
documents remain unchanged.

## Implementation effect

Phase 3 must use the accepted delete action consistently in its migration and
focused database tests. Those tests must prove that deleting an Auth user
removes that user's rate-limit buckets, while business and audit foreign keys
continue to use `ON DELETE RESTRICT`.
