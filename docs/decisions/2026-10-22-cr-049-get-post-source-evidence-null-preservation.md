# CR-049 — Preserve nullable source evidence in get_post

| Field          | Value                                                             |
| -------------- | ----------------------------------------------------------------- |
| Status         | Applied and LIVE verified in production on 22 October 2026        |
| Date           | 22 October 2026                                                   |
| Issue          | [#40](https://github.com/milyarderpro/content-producer/issues/40) |
| Reconciliation | [#42](https://github.com/milyarderpro/content-producer/issues/42) |
| Scope          | Only `api.get_post` binding projection; no source or fact rewrite |

## Evidence and cause

LIVE owner-QA attempts on Yellowstone (2026-10-22 07:07 UTC) show
`include_sources=true` fails as `DATABASE_UNAVAILABLE`, whereas
checks-only succeeds. Read-only production unified logs show all three
`POST /rest/v1/rpc/get_post` calls returned HTTP 200; no Edge
classification, Zod paths or response sizes were logged.

The prior Moon fixture only used `numbers:[]`. The targeted isolated fixture
adds nonempty numeric evidence (including `unit:null`), time/location and
estimate qualifiers, dated and undated official sources, and source counts
1–2. Pre-fix focused CI proves `api.get_post` **returns HTTP 200** while strict
Zod fails only for source-enabled modes, at
`data.post.fact_bindings.[].source_snapshot.numbers.[].unit:invalid_type`.
The direct SQL result fails identically. The root cause is recursive
`jsonb_strip_nulls` wrapped around the entire `jsonb_build_object` for
one fact binding: it strips required nested nullable keys like
`numbers[*].unit`. This is a verified _local mechanism_ matching the LIVE
flag differential; the exact Yellowstone payload was not inspected.

## Narrow decision

Replace recursive binding-level `jsonb_strip_nulls` with a shallow
`jsonb` key removal conditioned on `p_include_sources=false`.
Preserve nested JSON null values when source evidence is included, while
maintaining omission of the top-level `source_snapshot` key when excluded.
Do not relax strict Zod, reveal private source keys, change owner-scope,
alter stored facts, or broaden the SQL interface.

Apply a single migration that replaces only the anchored expression inside
the _existing_ `api.get_post` function; fail closed if the expected anchors
have drifted. No migration modifies business rows. The stored snapshots
remain immutable. Existing grants, role, and signature are preserved.

## Verification and deployment boundary

The pre-fix regression failure is recorded in focused GitHub Actions
[run #39741806991](https://github.com/milyarderpro/content-producer/actions/runs/39741806991).
Required post-fix checks: isolated owner-JWT SQL/PostgREST `get_post`
full-source and checks-only differential, strict Zod, source counts,
owner-denial and 256-KiB size cap, plus safe diagnostics privacy suite.

The candidate SHA `1a4e755a48f3c77eb557b931fd6bd99d5e1b24fd` passed the
[CR-020/044 full gate](https://github.com/milyarderpro/content-producer/actions/runs/39768822314).
The Product Owner then authorized the migration-only rollout. Production
recorded 70 migrations, and the function definition hash changed from
`681378e064badd9cd333866a6eade0edf1f47d825c48e899b501f18af21d0dae`
to `617b37cf98a6d861d00a4631a0df93d37c1663a83969dbde1429438eb0a3d39e`
without changing Edge MCP v33. The [deployment evidence](https://github.com/milyarderpro/content-producer/issues/40#issuecomment-6343097749)
and independent [LIVE retest](https://github.com/milyarderpro/content-producer/issues/40#issuecomment-6343479114)
are recorded in Issue #40.

Issue #42 reconciles the already-applied SQL into `main`. This source-only
reconciliation does not ship the optional `foundation.ts` diagnostics from
draft PR #41. A different merge SHA must not be reported as an exact-SHA
full-gate PASS merely because the earlier candidate passed.
