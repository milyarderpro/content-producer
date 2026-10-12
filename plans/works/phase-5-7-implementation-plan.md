# Checkpoint 5.7 — Implementation and verification runbook

Baseline e06f473, clean tree, 55 migrations, 27 API RPCs. User authorized exactly
5.7 and CR-014's concrete decisions before any migration; requested live todos.
Frozen Phase 0/tool/database/module/DNA/traceability contracts and accepted
CR-004/009/010/011/012/013/014 govern implementation. Historical 122/122 is not a gate.

## Sequence

1. Finish CR-014 and this runbook before CLI-created migration.
2. Private effective warning gate/current fact/source/hash validation, explicit
   evidence/approval binding and additive historical archive validator.
3. Additive history constraints/validators and isolated v7 completion/replay;
   preserve v6's three-operation contract; minimal column grants and owner RLS.
4. Exactly approve/revoke/discard/manual-posted/archive typed RPCs; 27 → 32.
5. Public success/denial/replay/mismatch/rollback suites during development.
6. Separate-session races: correction/reverify × approve/publish × both commit
   orders; duplicate operation keys, CAS, revoke/publish, discard/publish,
   schedule/replacement; observed locks and legal committed outcomes.
7. Integrate exact catalog allowlists/grant assertions, public post-status helpers,
   historical v6 regression and immutable published usage/metrics evidence.
8. Run one final clean reset and full gate; read-only catalog audit and cleanup.
9. Write results-based docs/phase-5-7-checkpoint-report.md and stop at 5.7.

## Focused suites

- api-post-lifecycle: all five transitions, public intent/context, CAS/hash,
  exact immutable replay after later transitions, mismatched payloads, corrupted
  history/envelope, faults after business mutation and ledger completion,
  original v6 replay, discard allocation/schedule/replacement, archive metrics.
- api-post-approval-quality: five warning IDs and reasons, adaptive count 1..9
  below min with original failed check, fixed/above-max/hard/source/integrity/
  critical denial, all 18 criteria, current config, canonical/usage expiry,
  source snapshots, changed conditions at publish and provenance bindings.
- api-post-lifecycle-concurrency: public writers in both commit orders, clients
  separated to expose business rather than rate-bucket waits, actual workspace
  and identity/lineage lock observations, no deadlock, rollback/same-key retry.

All domain actions use authenticated request.jwt.claims owner/client contexts.
Admin sessions only set up ephemeral fixtures/faults/barriers and inspect state.
Capability-bearing SQL uses stdin, logs/results remain sanitized. Cleanup awaits
all running sessions and removes history before parent business fixtures.

## Final gate — once after focused and targeted regressions pass

```text
pnpm run supabase:reset
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
git diff --check
```

Read CLI help before unfamiliar invocations. Applied defects receive additive
fixes, not migration rewrites. Failed gates and recoveries must be reported;
never claim a failed/incomplete sequence passed. Avoid redundant verification
beyond required commands unless failures/new changes justify it.

docs/phase-5-7-catalog-audit.sql proves exact 32 functions, owner/search_path/
ACL/RLS/defaults, lifecycle-only column delta, application append-only history,
closed v6/v7 replay, no token/unfinished ledger/fault leftovers and zero fixtures.
Report actual counts/results including failures/recoveries and race outcomes.
No 5.8, Phase 6, commit/push/deploy/cloud work; independent Batch B audit after 5.9.
