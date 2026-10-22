# CR-049 — Preserve nullable source evidence in get_post

| Field | Value |
| --- | --- |
| Status | Proposed — independent Navigator/owner acceptance pending |
| Date | 22 October 2026 |
| Issue | [#40](https://github.com/milyarderpro/content-producer/issues/40) |
| Implementation | Draft [PR #41](https://github.com/milyarderpro/content-producer/pull/41) |
| Scope | Only `api.get_post` binding projection; no source or fact rewrite |

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
`numbers[*].unit`. This is a verified *local mechanism* matching the LIVE
flag differential; the exact Yellowstone payload was not inspected.

## Narrow decision

Replace recursive binding-level `jsonb_strip_nulls` with a shallow
`jsonb` key removal conditioned on `p_include_sources=false`.
Preserve nested JSON null values when source evidence is included, while
maintaining omission of the top-level `source_snapshot` key when excluded.
Do not relax strict Zod, reveal private source keys, change owner-scope,
alter stored facts, or broaden the SQL interface.

Apply a single migration that replaces only the anchored expression inside
the *existing* `api.get_post` function; fail closed if the expected anchors
have drifted. No migration modifies business rows. The stored snapshots
remain immutable. Existing grants, role, and signature are preserved.

## Verification and deployment boundary

The pre-fix regression failure is recorded in focused GitHub Actions
[run #39741806991](https://github.com/milyarderpro/content-producer/actions/runs/39741806991).
Required post-fix checks: isolated owner-JWT SQL/PostgREST `get_post`
full-source and checks-only differential, strict Zod, source counts,
owner-denial and 256-KiB size cap, plus safe diagnostics privacy suite.

The separate opt-in `foundation.ts` instrumentation is **off by default**;
it must not be deployed or enabled from this draft PR. Full CR-020/044
technical/security gate, review, merge, deployment and LIVE default/full
owner-QA retest require their own authorized decision. The full gate is
**deferred, not waived**. No production business Write or LIVE fixture
change is authorized by this CR.
