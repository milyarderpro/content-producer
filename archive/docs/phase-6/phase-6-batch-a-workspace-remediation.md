# Phase 6 Batch A — active workspace remediation

This note records the remediation for the independent Batch A re-audit finding that an allowlisted user without an active workspace could reach `tools/list`.

## Behavior

- The MCP HTTP layer verifies the caller's active owner workspace only for `tools/list`, using `api.get_account_profile` with the original user JWT.
- If no active owner workspace is returned, `tools/list` fails closed with `OWNER_ACCESS_REQUIRED`.
- Business tool invocations continue to be authorized by their owner-scoped public RPCs. The active-workspace discovery check does not run on every business tool call, avoiding an extra read-rate-limit charge per operation.
- No database migration, RPC contract, or rate limit was changed.

The contract placement is reconciled in [CR-017](../../../docs/decisions/2026-10-14-phase-6-batch-a-owner-workspace-reconciliation.md). Direct tool calls remain protected by owner-scoped public RPCs under RLS.

## Regression evidence

- HTTP regression covers an allowlisted identity whose workspace check returns no active workspace; discovery returns HTTP 403 with the safe owner error.
- The Batch A real HTTP → PostgREST → local database test disables the active workspace, verifies discovery denial plus direct read and write `tools/call` denials, checks no Page or ledger mutation, then restores the fixture in a `finally` block.
- The real create/replay tool path verifies exactly one read bucket charge for the workspace discovery check, not one charge per business operation.
- The test-only injected checker keeps unit tests independent from database state; production defaults to the PostgREST workspace check.

- Existing Phase 5 rate-limit test fixtures now seed the current and next minute for disposable OAuth clients. This removes a CI minute-boundary race while preserving the production thresholds and the denial assertions.

## Gate status

A full Batch A gate was requested for this remediation commit. Its result must be read from the linked GitHub Actions run; this note alone does not mark the gate or the independent audit as passed.
