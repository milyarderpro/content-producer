# CR-045 — Bind the existing PRIVATE Content Producer plugin to owner OAuth mcpku2

- Date: 2026-10-20
- Scope: Phase 10 private plugin package and installation only; draft PR #23 / Issue #22
- Owner authority: explicitly requested updating the existing PRIVATE `@Content Producer` plugin to the already verified `mcpku2` OAuth app, retaining all 33 tools with three read-only host checks and no business write.
- Baseline: backend `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`, Edge `mcp` v29 ACTIVE, CR-020 gate #39372282908 PASS, public hosted probe #39376237298 PASS. Separate package/docs HEAD `8c45998904a1bee0f3199377a8df3fd2f793b111`.

## Verified identities and problem

Installed PRIVATE personal plugin `content-producer` backend ID `plugins_6ad5bf91a278819182951ebb312eca06`, v0.2.1, current release `pluginrel_6ad5c40b09588191842ddc1d42af957b`, still declares required `mcpku` app `asdk_app_6ad4ef8b42588191a749b8b9f356b662` in `.app.json`. Its skill erroneously describes a default No-auth fixed pilot. Owner has a separate already established and successfully tested PRIVATE OAuth `mcpku2` connection, App ID `asdk_app_6ad6ebeab5fc8191a1d2cd54b87cd96f`. In the existing OAuth session, `get_account_profile`, `get_workspace_context({})`, and `list_pages` succeeded, returning two owner Pages, with zero write.

## Decision

Update only the **same** PRIVATE Content Producer plugin to v0.2.2, mapping its single required registered app to `mcpku2`, and update its skill's authentication guidance to owner-scoped OAuth. Keep unchanged the exact 33 tool sequence, niche/editorial/source policy, permission checks, approval boundaries, name, owner, and plugin identity. Do not bundle another `mcp.json` or a credential. Strengthen package validation to reject reversion to the old app ID and reject a missing/unrequired OAuth binding. Retain Phase 10.2 historical No-auth outcome as historical evidence, not as current production configuration. Update only package/docs/tests/CI as needed, using CR-044's light CI policy; **no backend redeploy or full CR-020 gate** for package-only changes. The installed plugin may include a generated `.codex-plugin/plugin.json` compatibility overlay: preserve and synchronize its version if using a partial update.

## Acceptance

Build and verify 13-file source package; pin the exact SHA and ZIP hash; pass focused plugin tests, security/skill validation, and applicable light CI. Update the existing PRIVATE plugin release (not a new plugin) through Plugin Creator when allowed, read back its `.app.json`/skill/version. Then start a genuinely **@Content Producer**-selected ChatGPT chat and verify the connected 33-tool catalog and `get_account_profile`, `get_workspace_context({})`, and `list_pages` as owner. Direct `mcpku2` success alone does not prove the plugin package was actually activated; tool visibility/approval affordance does not authorize an invocation of a write tool. If host action is needed, request only that action and leave chat-host acceptance PENDING. Record separate backend SHA, plugin source SHA/ZIP hash, plugin release ID, CI and actual host evidence in Issue #22 and PR #23. No grants, production business writes, MAN-03/04, merge, or unrelated changes.
