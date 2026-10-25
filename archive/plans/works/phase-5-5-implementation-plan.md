# Checkpoint 5.5 — Implementation and verification runbook

Baseline: f2e803c; clean working tree; 36 migrations; 19 API routines.
Independent Batch A audit accepted by user. CR-012 is accepted by the user's
explicit direction to document concrete decisions before the first migration.

## Authority

Read AGENTS.md, Phase 0 decision register, tool inventory §§6/11/12, database
design, module contract, trivia DNA, acceptance traceability, Phase 5 runbook,
and accepted CR-004/005/009/010/011/012. Preserve old migrations and fixtures.
Check current Supabase docs and CLI help before unfamiliar commands.

## Sequence

1. Write this runbook and CR-012 before migration creation (completed first).
2. Create additive foundation migration through Supabase CLI: narrow grants/RLS,
   private append-only historical reservation binding, source-free retrieval,
   closed candidate/evidence/review validators, workspace/Page/identity locks,
   v5 token-free replay and safe domain errors.
3. Create registration/reservation migration: exactly find, register/reserve,
   release RPCs with typed signatures and authenticated-only execution.
4. Create reverification/correction migration: exactly reverify and correct,
   exact CAS, cross-Page post impact and bounded historical summaries.
5. Add public authenticated/request-context tests and separate-session races.
   Existing allowlists become 24 with all security assertions preserved.
6. Run focused tests; fix defects additively once applied. Any new contract
   conflict is documented specifically in CR-012 before behavior changes.
7. Clean local reset, full gate, catalog audit, security advisor and cleanup.
8. Produce results-based report and stop at 5.5.

## Test groups

- RPC-FACT-001 / RPC-DEDUP-001: capped deterministic source-free candidates,
  exact/safe/semantic identity, source/freshness/risk, strong review and collisions.
- CORE-001: all four immutable replay envelopes, token restoration from identical
  request, mismatch, faults after mutation/history and before completion.
- CON-RESERVE-001/002: ten public concurrent callers, overlapping ordered sets,
  single active owner, no duplicate canonical facts or partial reservation.
- RPC-FACT-003 / CON-REPLAY-003: release/replay/expiry/conversion/correction,
  historical inactive counts, wrong Page/actor/context and no junction mutation.
- RPC-CORRECT-001 / DB-MEANING-001: exact microsecond CAS, same-meaning reverify,
  invalidate/successor races, cross-Page ready/draft revision/approval invalidation,
  capped output with full mutation and byte-identical published history.
- CORE-007/008: auth/client/non-owner, API-owner RLS, direct/helper/history denial,
  exact 24-function ACL, rate groups, bounded recovery and safe DATABASE_BUSY.

Tests use authenticated plus request.jwt.claims with validated owner/client test
context. Administrators only create unavailable later-phase post fixtures,
control contention/faults, inspect catalogs, and clean fixtures. Token-bearing
SQL uses stdin and errors/results remain redacted.

## Gate

Focused suites, then:

```text
pnpm run supabase:reset
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
git diff --check
```

Run reproducible read-only docs/phase-5-5-catalog-audit.sql after tests. Validate
24 exact functions, security/search_path/owner, RLS/grants/default ACL, no raw
token in ledger, append-only history and no incomplete ledger or fixture rows.
Record actual test counts, commands, failures/recoveries and migration inventory.

## Deferred — not passed

Correction versus approve/publish through public RPC: **DEFERRED — NOT PASSED**
until 5.7. Save/cancel and opposite-direction reschedule remain deferred to 5.6
under CR-011. No fixtures or helpers substitute for these future public proofs.
