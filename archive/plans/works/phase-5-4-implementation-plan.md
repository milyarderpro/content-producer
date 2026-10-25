# Checkpoint 5.4 — Implementation and verification runbook

Baseline: `2d451cf`, 31 migrations, 13 API RPCs, clean working tree.
Authority: user approved implementing 5.4 after documenting four explicit
requirements. CR-011 contains the accepted locks, immutable token replay,
transition/status tables and deferred evidence; read it before implementation.

## Sequence

1. Record CR-011 before creating migrations. Preserve frozen documents and old
   migrations. Review Supabase CLI help and current database documentation.
2. Create additive foundation migration through `supabase migration new`:
   owner UPDATE grants/policies, private event table, immutable history,
   token-free closed ledger v4, shared lease/projection/status/locking helpers.
3. Create additive RPC migration through the CLI: exactly claim, renew, failure,
   retry, replacement and cancellation, with explicit typed signatures, kernel
   rate/ledger use, fail-closed errors and narrowly granted execute.
4. Add lifecycle and separate-session RPC tests; update exact existing API
   allowlists/counts from 13 to 19 without weakening privilege tests.
5. Verify focused tests, then Batch A gates and clean-reset reproducibility.
6. Produce catalog audit and 5.4 report for independent Batch A review, with
   both 5.6 public-RPC race proofs explicitly **DEFERRED — NOT PASSED**.

## Test matrix

- CORE-001: all six immutable replays and key mismatch, empty and 1/2/3 claims,
  no token in ledger/errors/output, rollback at mutation/event/completion.
- CORE-002 / CON-LEASE: fresh claim/reclaim, short locks, skipped locked item,
  one-time renewal, expiry checked after wait, old token denial, first-start and
  attempt preservation, multiple public workers on same/different Pages.
- CORE-003 / CON-SCHEDULE: numeric slot locks before plan/item/post, cancellation
  versus new plan slot occupancy, replacement both-table recheck.
- CORE-004 / RPC-PLAN-TERM: exact transition table, all aggregate priority rows,
  explicit cancellation with completed history, published-history replacement
  rejection, multiple discarded outputs, no implicit reopening/hard deletion.
- CORE-007/008: owner/context isolation, direct/helper/event denial, NOLOGIN /
  NOBYPASSRLS API owner, RLS USING+WITH CHECK, 19-name allowlist, both rate groups,
  safe DATABASE_BUSY and bounded RATE_LIMITED recovery.
- Separate sessions: duplicate-key claim, claims without overlap, held item
  skipped by authenticated public claim, both claim/cancel commit orders,
  retry/claim, competing renewals and expired-token/reclaim.

## Gate commands

Run focused Vitest database files first, then:

```text
pnpm run supabase:reset          # independent reset 1
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
pnpm run supabase:verify
pnpm exec supabase db advisors --local --type security --fail-on error
pnpm run supabase:reset          # independent reset 2
# repeat focused suite and catalog/security verification after reset 2
git diff --check
```

The independent audit reviews actual results and the accepted evidence deferral.
Neither save-versus-cancel nor opposite-direction public reschedule is counted
as passed in 5.4. Stop at the report; do not start 5.5 or Phase 6.
