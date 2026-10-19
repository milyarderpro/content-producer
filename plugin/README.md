# Plugin source boundary

Phase 7 prepared the portable Content Producer plugin **source** and a local
package candidate. Phase 10.2 extends it to the final private No-auth plugin
package. Packaging does not install the plugin or unlock business writes.

- **7.0–7.3 — PASS:** tracker, manifest/MCP generator, core skill and trivia references,
  with successful checkpoint CI recorded in Issue #3.
- **7.4 — PASS after final gate and independent audit:** the strict allowlist build
  originally included plugin.json, SKILL.md and 10 core/trivia references.
  Phase 10.2 now includes one registered `.app.json` mapping (13 allowlisted files total).
  Run `pnpm run package-plugin` to validate source and create
  `artifacts/plugin-candidate/`; run
  `pnpm exec tsx scripts/verify-plugin-candidate.ts` to verify the **actual**
  generated files, SHA-256 list and bytes against the source. The hash report is
  `artifacts/plugin-candidate-filelist.json`. All are Git-ignored local
  evidence, never published packages. Tests of manifest/schema, links, path
  containment, symlinks, editorial terms and exact 33-tool ordering run in
  `pnpm run check` and `pnpm run test-all`.

**Phase 10.2 web/mobile remediation v0.2.1:** The 0.2.0 portable
`mcp.json` was installed but classified desktop-only in the owner ChatGPT
web UI; it did not appear in the Work web plugin selector. The owner
confirmed the existing PRIVATE custom MCP `mcpku` *does* appear there.

The final package now uses `extensions.com.openai.apps: "./.app.json"` and
one required registered app mapping to the exact existing `mcpku` ID
`asdk_app_6ad4ef8b42588191a749b8b9f356b662`. The `mcp.json`
source is deliberately absent and **must be deleted** from the prior
installed release, along with the generated `.mcp.json` overlay, on update.
The old Phase 7 portable No-auth generator/schema remain regression-only,
not a second MCP connection in this ZIP. The registered MCP still uses the
server-fixed No-auth pilot identity with a publicly readable endpoint and
default-closed write latch. No package secret or OAuth configuration.

`pnpm run package-plugin` builds 13 allowlisted files: `plugin.json`,
`.app.json`, one skill and 10 references. Light CI produces the
v0.2.1 ZIP, verifies extracted hashes and disallows bundled `mcp.json`.
Plugin Creator must **update** the existing PRIVATE plugin ID, never
create a second one. Desktop support or successful update alone cannot
satisfy 10.2: verify plugin selectable in Work web, 33 tools, packaged skill
and 3 read calls, then confirm mobile separately.

See [the Phase 7 runbook](../plans/works/phase-7-implementation-plan.md),
[Issue #3](https://github.com/milyarderpro/content-producer/issues/3),
and the [phase tracker](../plans/implementation-plan.md#16-phase-tracker).
