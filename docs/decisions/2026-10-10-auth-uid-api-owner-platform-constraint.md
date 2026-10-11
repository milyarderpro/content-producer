# CR-009 — `auth.uid()` bridge for the narrow API-owner role

| Field  | Value                                          |
| ------ | ---------------------------------------------- |
| Status | Accepted                                       |
| Date   | 10 October 2026                                |
| Scope  | Phase 5 checkpoint 5.1 identity and RLS kernel |

## Conflict

The frozen authorization contract requires every API-owner policy and helper to
derive the actor from `auth.uid()`. The narrow
`content_producer_api_owner` role is intentionally `NOLOGIN`, has no role
membership, and has no direct caller or Auth-table privileges.

In the local Supabase runtime, the `auth` schema is owned and ACL-managed by
the Auth service. It grants `USAGE` only to the platform roles (`anon`,
`authenticated`, and `service_role`). A migration `GRANT USAGE ON SCHEMA auth
TO content_producer_api_owner` is accepted as a no-op (`no privileges were
granted`), so an invoker-owned helper or RLS policy that directly calls
`auth.uid()` fails with `permission denied for schema auth`.

Parsing `request.jwt.claims` in the API role is not an acceptable workaround:
it duplicates the platform helper and violates the frozen `auth.uid()`
requirement. Granting the API owner membership in a broad platform role would
also violate its narrow-role boundary.

## Proposed amendment

Create one private, argument-free identity bridge:

```text
internal.current_auth_uid_v1() returns uuid
```

It is `SECURITY DEFINER`, has `SET search_path = ''`, is owned by the local
migration executor solely because that owner can resolve `auth.uid()`, and its
entire body is exactly `SELECT auth.uid()`. It has no table, sequence, dynamic
SQL, input, or write access. Revoke `EXECUTE` from `PUBLIC`, `anon`,
`authenticated`, and `service_role`; grant it only to
`content_producer_api_owner`.

All API-owner RLS policies and internal request-context helpers use this bridge
as their sole actor source. No business `api` RPC or business helper changes
owner: they remain owned by `content_producer_api_owner`, retain RLS, and use
their existing explicit object privileges.

## Required safeguards and proof

1. Catalog tests must prove the bridge has no arguments, `SECURITY DEFINER`,
   `search_path = ''`, no caller or `PUBLIC` execute, and exactly the expected
   fixed `auth.uid()` body.
2. Catalog tests must prove no API-owner role membership, no direct Auth table
   privilege, no table ownership, and no `BYPASSRLS` were introduced.
3. RLS tests must prove the owner succeeds, a non-owner receives
   `OWNER_ACCESS_REQUIRED`, and an absent JWT receives `AUTH_REQUIRED`.
4. A complete API-owner function allowlist test must distinguish this one
   bridge exception from all business helpers, which remain security-invoker
   functions owned by `content_producer_api_owner`.
5. The bridge may never accept caller input, perform writes, or be reused as a
   generic elevated helper. Any such expansion requires a new change record.

## Alternatives rejected

- Reimplementing `auth.uid()` by parsing JWT GUC values: violates the frozen
  identity-source contract and risks semantic drift.
- Giving the API owner Auth-schema usage or membership in `authenticated`:
  the Auth service controls that ACL and the first grant is a no-op; membership
  also weakens the narrow-role proof.
- Making business RPCs or RLS policies `SECURITY DEFINER`: changes their
  intended privilege model and is materially broader than an identity-only
  bridge.

## Scope and approval condition

This record was accepted by explicit user approval on 10 October 2026. It
authorizes only this one private identity bridge and its corresponding
policy/helper substitutions in Phase 5.1. It does not authorize public API
functions, direct caller table access, new memberships, Auth-table access,
secrets, remote actions, or any later Phase 5 checkpoint.
