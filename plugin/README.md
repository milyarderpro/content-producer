# Plugin source boundary

Phase 7 prepared the portable Content Producer plugin **source** and a local
package candidate. Phase 10.2 extends it to the final private No-auth plugin
package. Packaging does not install the plugin or unlock business writes.

- **7.0–7.3 — PASS:** tracker, manifest/MCP generator, core skill and trivia references,
  with successful checkpoint CI recorded in Issue #3.
- **7.4 — PASS after final gate and independent audit:** the strict allowlist build
  originally included plugin.json, SKILL.md and 10 core/trivia references.
  Phase 10.2 adds root mcp.json (13 allowlisted files total).
  Run `pnpm run package-plugin` to validate source and create
  `artifacts/plugin-candidate/`; run
  `pnpm exec tsx scripts/verify-plugin-candidate.ts` to verify the **actual**
  generated files, SHA-256 list and bytes against the source. The hash report is
  `artifacts/plugin-candidate-filelist.json`. All are Git-ignored local
  evidence, never published packages. Tests of manifest/schema, links, path
  containment, symlinks, editorial terms and exact 33-tool ordering run in
  `pnpm run check` and `pnpm run test-all`.

The connection-input schema (`schemas/mcp-connection-input.schema.json`),
`scripts/generate-mcp-config.ts` and strict package validator require
`authentication.mode = "none"`. Root `mcp.json` contains one portable
`streamable-http` server using the public production URL that passed ChatGPT
10.1. OAuth extensions, bearer tokens, connection IDs and query credentials
are forbidden. The 10.1 live host result (not generator input) proves the
actual connection; public-read exposure remains, with server-side write
latch CLOSED.

`pnpm run package-plugin` stages the final files at
`artifacts/plugin-candidate/`. Phase 10 light CI builds a 13-file ZIP and
verifies each extracted file against SHA-256. The owner must separately
install via Plugin Creator and pass fresh-chat skill + MCP checks.

See [the Phase 7 runbook](../plans/works/phase-7-implementation-plan.md),
[Issue #3](https://github.com/milyarderpro/content-producer/issues/3),
and the [phase tracker](../plans/implementation-plan.md#16-phase-tracker).
