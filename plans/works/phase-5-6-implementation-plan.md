# Checkpoint 5.6 — Implementation and verification runbook

Baseline 6825175, clean tree, 46 migrations and 24 API routines. Previous 5.5
report records 98/98 database tests; this is historical evidence, not a new gate.
Authority: frozen Phase 0/core/fact/quality/tool/module/DNA contracts and accepted
CR-004/010/011/012/013. User authorized 5.6 only and requested live todo updates.

## Sequence

1. Complete CR-013 and this runbook before first CLI-created migration.
2. Add private renderer/closed validators/hash/evidence and compatibility reader.
3. Add current-junction/history persistence, minimal RLS/grants, v6 replay,
   complete lock layers and plan completed event. Preserve applied migrations.
4. Add exactly save_post/revise_post/reschedule_post, typed args, safe errors,
   authoritative draft package, allocation conversion, CAS, linked schedule.
5. Integrate current-only fact read projections; update exact allowlists to 27.
6. Run focused tests while developing; applied defects receive additive fixes.
7. One final clean reset and full gate, read-only catalog audit and cleanup.
8. Produce results-based docs/phase-5-6-checkpoint-report.md; stop at 5.6.

Lock protocol: context/input → rate/ledger → workspace → Page/config → numeric
schedule keys → plan/item/post → numeric identity AND lineage keys → ordered
facts → ordered junctions. Reschedule ready stays ready, immutable prior binding
is audited; no fresh evaluation/approval is fabricated (CR-013 §1).

## Focused suites

- api-post-render-quality: golden both styles/five formats/two profiles; NFC,
  CRLF, controls, word wrap, exact copy/metrics, hash, hard/preferred limits,
  attestation severity/duplicate/missing criteria and server-only fields.
- api-post-save-revise: standalone/plan completion, stale claim/config/facts,
  same/partial/full replacement/re-addition, immutable usage, owner/context,
  exact historical replay, mismatch, faults after mutation/completion.
- api-post-reschedule: standalone/linked move/clear, archived occupancy, CAS,
  unchanged hash/copy/quality, ready evidence/approval provenance and stale denial.
- api-post-concurrency: duplicate key, two revisions, save/cancel BOTH commit
  orders, opposite-direction two-slot reschedule, save/revise versus correction
  both directions with real public writers and advisory-lock observations,
  lock timeout/cancellation rollback and retry.

Administrative sessions set up ephemeral Auth/workspace and unavailable 5.7
status fixtures, faults, barriers and inspect catalogs only. All domain actions
run as authenticated with owner/client request.jwt.claims. Token SQL uses stdin;
errors/results stay redacted; cleanup waits for sessions and removes all fixtures.

## Final gate — run full set once after focused tests pass

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

Read-only docs/phase-5-6-catalog-audit.sql must prove exact 27 functions,
owner/search_path/ACL/RLS/default grants, immutable private history, no token in
ledger/history, no incomplete ledger/fault leftovers, zero fixture rows. Record
actual commands/counts/failures/recoveries; never mark unavailable 5.7 evidence
passed. Two deferred 5.6 races must pass through public RPC before completion.
