# Phase 5 Batch B — Audit remediation runbook

Baseline 289afe3, clean tree, 63 source/applied migrations, 33 RPCs. User authorized
the four-finding plan and required actual authenticated old/new performance on the
same 5,001-fact fixture plus additive normalization of any legacy unapproved
passed draft. CR-016 is completed before the first remediation migration.

## Sequence and live todos

1. Verify baseline, frozen contracts, accepted decisions and initial data census.
   Write CR-016 and this runbook before CLI creates any migration.
2. Add public regression tests. Run them against baseline; capture actual failures
   before each repair. Establish same-fixture old public timings, results and plans.
3. CLI-create additive repairs for non-retroactive reuse, pending draft quality and
   administrative normalization, config-aware preferred checks and parameterized
   retrieval optimization. Applied files are immutable; further faults use forward fixes.
4. Verify focused positive/negative/replay/rollback/concurrency, populated performance,
   differential candidate results and frozen public gold. Existing suite expectations
   may change only where the repaired contract requires it.
5. Finish evidence tooling and freeze candidate source. Two independent clean resets:
   A runs test-all; B runs smoke-test. Both get source/history/catalog/Advisor proof.
6. Report actual commands/counts/failures, each finding's closure and residual risk.
   Stop for independent audit. Update todos at each stage, not only at the end.

## Regression ownership

| Finding | Required proof |
| --- | --- |
| P1-01 reuse | A workspace_unique then legal B page_unique; A approve/revise/publish succeeds, new facts/re-addition remain blocked; both public commit orders; no snapshot rewrite |
| P2-01 quality | New all-pass save/revise pending; ready revision clears approval; populated legacy normalization increments/rebinds once; old response/history byte-identical and same-key replay exact |
| P2-02 profiles | Per-fact lower/upper/uneven and narrowed config for both profiles; no acceptance fails, correct warning acceptance succeeds; hard checks never waived; publish/new warning recovery |
| P1-02 search | Actual authenticated public path, unchanged 5,001 rows/candidate before/after; n=12 raw/p95 <=3s; differential results; all 150 public gold cases; normal public/helper EXPLAIN |

Administrator sessions only prepare ephemeral data, migration repairs, barriers/faults,
catalog checks and cleanup. No administrative domain action counts as RPC proof.
Capability-bearing SQL uses stdin/redacted errors; evidence never includes tokens.
Legacy-data census precedes both migration and resets. Migration's repair helper has
no caller/API-owner execution. A zero production/local census does not substitute for
a populated normalization/replay compatibility test.

## Final gate

Before reset: no active verification sessions, no unknown non-fixture user/business/
storage data, and fixture/fault cleanup complete. Freeze source SQL first.

```text
pnpm run supabase:reset                  # A
new source/history/catalog evidence A
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
pnpm run supabase:reset                  # B, same source
new source/history/catalog evidence B; deep-compare A
pnpm run smoke-test
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
new final catalog/cleanup evidence; deep-compare B
git diff --check
git diff --check 289afe3
```

New evidence filenames start phase-5-batch-b-remediation. Preserve original 5.9
JSON/reports. Record baseline SHA, complete new migration manifest and old-file
immutability, 33/15 security inventory, function bodies/ACL, exact final test counts,
old/new fixture digest/timings/plans and actual errors. Final report is an implementer
handoff, not independent re-audit approval or Phase 6 authorization.
