# CR-001 — Data API public-schema platform constraint

| Field  | Value                             |
| ------ | --------------------------------- |
| Status | Accepted                          |
| Date   | 8 October 2026                    |
| Scope  | Phase 2 Supabase local foundation |

## Conflict

The frozen contract requires `api` to be the only Data API business RPC
surface and formerly described `public` and `internal` as not exposed. Current
Supabase CLI configuration documentation states that `public` is always
included in the local Data API, even when `api.schemas` is set to `["api"]`.

## Decision

This change record replaces only the literal interpretation of “exposed
schema.” It does not weaken the RPC-only security boundary.

The local Supabase runtime always includes platform schemas in its Data API,
including `public` and `storage`. `api` remains Content Producer's sole
business RPC surface. `public` stores business tables, but every direct
Data API access to a business object there must be denied. `storage` is a
platform surface, not a Content Producer business RPC surface. `internal` is
not configured as an exposed schema and receives no caller grants.

`graphql_public` is not retained because the project does not use GraphQL.

The implementation prevents direct business access in `public` by:

- disabling automatic exposure of new tables;
- revoking default and explicit table, sequence, and function privileges from
  `anon` and `authenticated` (and from `service_role` where direct table access
  is not intentionally required);
- granting `authenticated` only `USAGE` on `api` and explicit `EXECUTE` on the
  future RPC allowlist; and
- keeping `internal` out of `api.schemas` and without caller grants.

Schema inclusion, object privileges, and RLS are separate controls. Schema
inclusion alone never authorizes a caller; grants determine whether an object
is reachable, and RLS determines which rows can be reached after a table grant
exists. A business caller must not be able to query, mutate, or invoke a
`public` or `internal` business object through the Data API.

## Accepted verification evidence

- Local PostgREST configuration and Data API requests demonstrate that `api`
  is the only business RPC schema selected by the application.
- Direct business-object access in `public` is denied through explicit object
  privileges; RLS remains a separate row-access control when business tables
  are introduced.
- The `internal` profile/schema is rejected because it is not included in the
  Data API schema configuration and caller roles receive no grants there.
- Phase 5 integration tests will prove the allowlisted `api` RPC path and
  reject all direct table paths. No business RPC is created prematurely in
  Phase 2.

## Accepted contract synchronization

- `plans/database-design.md` section 18.2
- `plans/phase-0-decision-register.md` section 8.7
- `plans/implementation-plan.md` Phase 2 and deployment checklist

## Compatibility and migration effect

No existing data or remote project is affected. The accepted baseline is
implemented only through local migrations and explicit privilege grants.
