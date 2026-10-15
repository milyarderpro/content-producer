# CR-018 — Phase 8 staging evaluation and pre-production gate

- **Status:** Accepted
- **Date:** 2026-10-15
- **Authority:** The owner approved GitHub Actions for deterministic tests and an isolated staging connection for ChatGPT evaluation, then requested reconciliation of the affected documents.
- **Baseline:** `main` `69b3ad06346e084cd2242dd0e9ccfdf6192953f5` after Phase 7 merge. Phase 8 has not started.
- **Scope:** Verification environment, evidence classification, and ordering of Phase 8–10 gates. No change to the 33 tools, 101 frozen prompts, scoring thresholds, editorial rules, database schema, or production acceptance criteria.

## Conflict

`plans/implementation-plan.md` Phase 8 asks for all PRD acceptance criteria before production, yet `AC-001` requires a connected MCP and OAuth owner flow and `AC-012` requires a deployed Supabase Edge Function and minimal auth frontend. The same implementation plan first creates the production resources in Phase 9 and the final ChatGPT connection/plugin in Phase 10. Its environment baseline and rollback also say local only. `plans/use-case-inventory.md` separately requires E3 remote staging custom MCP and E4 installed private plugin to prove live tool choice and skill behavior. GitHub Actions and MCP Inspector can prove E1/E2 but cannot by themselves prove live ChatGPT skill/tool selection.

The Phase 7 candidate intentionally lacks a final production `mcp.json` and registered connection mapping. Reusing it as though it were already installed would make a false Phase 8 pass. Moving the 101 frozen cases to Phase 10 without a recorded contract change would create the opposite gap.

## Decision

1. **E1/E2 — deterministic verification.** GitHub Actions runs pinned dependencies, temporary local Supabase/Docker, clean migration reset, database/RPC/security/concurrency/MCP tests, Inspector, advisors, and performance measurement. The user's PC is not the required runner. Focused checks run during checkpoints; the full gate runs once on the final implementation SHA, with impact-based reruns after defects.
2. **E3 — isolated staging custom MCP.** Phase 8 uses a non-production staging environment with its own test owner, OAuth configuration, database, Edge Function, auth frontend if required, and resettable fixtures. ChatGPT connects as a custom MCP server. This proves live discovery, OAuth, tool selection, structured responses, and recovery against staging. It does not prove the production endpoint. No production data or credentials enter staging.
3. **E4 — private staging test plugin.** After E3 works, install a separately identified private **test** package from the Phase 7 skill source, connected only to staging. Its staging connection configuration and registered ID are generated from verified test values and kept outside committed source and the final production package. Use this test plugin for the 101 frozen cases and skill+tool workflow evaluation. This is an E4 test gate, not the final production plugin installation in Phase 10. Refresh/version the connection when metadata changes; start fresh conversations as the frozen protocol requires.
4. **E5 — production pilot.** The production URL, production OAuth/configuration, final `plugin/mcp.json`, final registered mapping and installed package, Facebook manual publication, and production pilot remain in Phases 9–10. The owner reviews representative editorial output in staging during Phase 8; this sign-off is not E5 production-pilot approval.
5. **Phase 8 exit means pre-production verification passed.** Its final matrix reports `PASS-pre-production`, `DEFERRED-to-Phase-9/10`, or `PASS-final-MVP` for each acceptance criterion and requirement. Phase 8 can be `Complete` only when all E1–E4 requirements allocated here, 101/101 frozen cases and thresholds, 33/33 positive and boundary paths, security/integrity/performance gates, owner staging-editorial sign-off, and independent audit pass. Deployment-dependent parts of `AC-001` and `AC-012` remain explicitly deferred; Phase 8 `Complete` is never presented as final MVP acceptance.
6. **Final MVP acceptance remains unchanged.** Phase 9 must prove the production MCP/OAuth/frontend and production security gate. Phase 10 must prove the final installed private plugin and E5 pilot, including representative regression of the 101-case behavior on the production host. Any production-dependent AC stays open until that evidence exists. Phase 9 may start only after the Phase 8 pre-production gate passes.

## Staging boundary and failure handling

Staging is selected for this project's Phase 8 verification, although the original MVP baseline did not require a hosted staging project. The resource must be isolated from production; use least-privilege test credentials, secure secret entry/storage, test-only owner accounts and fixtures, explicit cleanup, and no production data. Do not commit staging URLs with credentials, access tokens, client secrets, service-role keys, or the staging registered mapping. Do not create or link any cloud resource merely by accepting this documentation decision; provisioning belongs to the Phase 8 execution checkpoint.

If the owner account or available ChatGPT surface cannot install/use the test plugin, run fresh conversations, observe tool calls, or gather case evidence at the required scale, stop at the Phase 8 preflight. Do not replace live cases with source-text assertions, silently change the 101 frozen prompts, or transfer hundreds of assumed manual runs to the owner. A new accepted change record is required before changing the environment or gate. For staging failures, reset/dispose of staging fixtures and test connection; for local CI failures, stop its temporary containers. Neither rollback path touches production.

## Evidence and propagation

- Preserve all 31 goals, 101 frozen prompts, exact wording/expected behavior, repetition/scoring/hard-fail rules, 33-tool contract, and three separate Phase 8 reports. Record model, host surface, skill/plugin/MCP/tool-schema versions, fixture version, and redacted per-run evidence.
- Distinguish owner staging-editorial approval from approval of production pilot outputs. Mark every deferred production acceptance item as such in the 14-AC and requirement-trace reports; never count a staging success as production proof.
- Update `plans/PRD.md` environment/acceptance timing note, `plans/implementation-plan.md` environment and Phase 8–10 gates, `plans/use-case-inventory.md` E3/E4/E5 interpretation, `plans/acceptance-traceability.md` evidence classification, and the Phase 8 runbook. The Phase 0 decision register and completed Phase 7 runbook remain historical.
- Before claiming 8.0 passed, prove a real staging preflight: user/AI roles, custom MCP, test skill activation, tool-call visibility, fixture reset, and feasible fresh-conversation evidence collection. If any fails, record `BLOCKED`; Phase 8 cannot be closed.

Current official host testing guidance distinguishes custom MCP testing from full installed-plugin testing: https://developers.openai.com/plugins/deploy/connect-chatgpt . This is platform guidance; the project's frozen documents remain the contract as reconciled here.
