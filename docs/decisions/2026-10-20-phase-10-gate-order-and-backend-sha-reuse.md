# CR-044 — Phase 10 gate order and backend SHA reuse

- Date: 2026-10-20
- Scope: Phase 10.1 OAuth repair, PR #23, Issue #22
- Authority: Owner approved the CI rule update after full gate #39369684705 failed.
- Supersedes: CR-020's requirement to rerun a full gate merely because a documentation-only commit changes the repository SHA. All CR-020 release security checks remain required for a changed backend candidate.

## Evidence

CR-020 gate #39369684705 on `f403931eee4304b29b6af91a28b37d00f6bb6505` completed with **FAIL**. `test-all`, migration history, local lint, and catalog/RLS/grant audit passed. The Inspector step failed immediately with `MCP_TOOL_HTTP_STATUS`, after the long database suite. Focused local reproduction emitted the same label. The first inactive-workspace `tools/call` in the Phase 6.13 harness expected a tool-level HTTP 200 error. CR-043 now denies that call before transport with HTTP 403. The stronger owner denial is intentional; the harness assumption is stale. Production remains MCP v28 from `b098460f9c8012fabff69c1c369a5130853f7f86`.

## Decision

During development, run `pnpm run check` after TypeScript/configuration changes and focused tests for the changed behavior. Do not run the full gate on each trial commit. In the full gate, after one clean local reset, run focused OAuth/owner tests and the authenticated Inspector 33 valid/invalid and non-owner paths **before** the long `test-all` database suite. Keep locked install, migration history, local lint, catalog/RLS/grant audit before and after Inspector, whitespace check, and redacted evidence. A gate fails closed if any required stage fails.

Documentation-only and plugin-package-only changes use lightweight CI. A transport-only MCP change that does not alter permission decisions uses focused protocol/security tests. Changes to migrations, RLS, privileges, identity or owner authorization, write permissions, or business RPC logic require one full CR-020 gate on the final candidate before deployment. CR-043 changes owner authorization context, so its final candidate requires that full gate.

The full gate result is bound to the **backend source SHA** that was tested and deployed. Later documentation or plugin-package commits may reuse that result only if the deployed backend code, migrations, security configuration, and relevant runtime dependencies are unchanged. Record the backend SHA and the later documentation/package SHA separately in Issue and PR; run focused package/MCP tests and affected manual cards as applicable. Do not trigger the full gate merely for a documentation commit.

## Acceptance boundary

Update the Phase 6.13 harness for the intentional HTTP 403 inactive-owner denial, while preserving non-owner denial, all 33 Inspector valid/invalid calls, write security checks, and post-run clean fixture audit. Reproduce and pass the Inspector locally before another full gate. Do not deploy `f403931`; deploy only a later candidate that passes the full gate on its exact SHA. A successful CI run is still distinct from real ChatGPT OAuth acceptance.
