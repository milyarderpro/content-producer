# Plugin source boundary

Phase 7 prepares the portable Content Producer plugin **source** and a local
package candidate. It does not install, deploy, or connect a production plugin.

- **7.0–7.3 — PASS:** tracker, manifest/MCP generator, core skill and trivia references,
  with successful checkpoint CI recorded in Issue #3.
- **7.4 — PASS after final gate and independent audit:** the strict allowlist build
  includes only plugin.json, SKILL.md and 10 core/trivia references.
  Run `pnpm run package-plugin` to validate source and create
  `artifacts/plugin-candidate/`; run
  `pnpm exec tsx scripts/verify-plugin-candidate.ts` to verify the **actual**
  generated files, SHA-256 list and bytes against the source. The hash report is
  `artifacts/plugin-candidate-filelist.json`. All are Git-ignored local
  evidence, never published packages. Tests of manifest/schema, links, path
  containment, symlinks, editorial terms and exact 33-tool ordering run in
  `pnpm run check` and `pnpm run test-all`.

The connection-input schema (`schemas/mcp-connection-input.schema.json`),
validators and `scripts/generate-mcp-config.ts` prepare a future `mcp.json`.
The generator reads verified Phase 10 connection input from stdin and emits
portable JSON to stdout, never writes into the plugin source or candidate.
The Phase 7 generator emits only a named `streamable-http` server and URL.
It does **not** yet emit the OpenAI-specific OAuth authentication extension
supported by the current plugin package format. Phase 10 must compare the
live custom connection with the host schema and extend the final package and
validator if that declaration is required. OAuth 2.1, protected-resource
discovery, PKCE, scopes, and owner verification remain a server/host
responsibility under AUTH-002/003. The generator's
`oauth.mode = "discovery"` is not live handshake proof.

**`plugin/mcp.json` is deliberately absent until Phase 10**, after the
production endpoint and owner OAuth were proven in Phase 9 and the actual
ChatGPT custom connection is verified in checkpoint 10.1. Follow
[the Phase 10 runbook](../plans/works/phase-10-implementation-plan.md),
including its initial host write-capability check. Never
bundle secrets, raw datasets, local/production database state, registered
connection IDs, credentials, placeholders or fictional endpoints.

See [the Phase 7 runbook](../plans/works/phase-7-implementation-plan.md),
[Issue #3](https://github.com/milyarderpro/content-producer/issues/3),
and the [phase tracker](../plans/implementation-plan.md#16-phase-tracker).
