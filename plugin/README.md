# Plugin source boundary

Phase 7 prepares the portable Content Producer plugin **source** and a local
package candidate. It does not install, deploy, or connect a production plugin.

- **7.0 — PASS:** phase tracker, this README, and lightweight CI.
- **7.1:** `plugin.json` uses the Agent Plugins 1.0 portable root schema; the
  connection-input schema (`schemas/mcp-connection-input.schema.json`), validators,
  and `scripts/generate-mcp-config.ts` prepare a future `mcp.json`. Run the
  generator only with connection data verified in Phase 10; it reads JSON
  from stdin and emits JSON to stdout, never writes to the plugin directory.
- **7.2–7.3:** the content-producer skill and its core and trivia references.
- **7.4:** local candidate-package validation and the full Phase 7 gate,
  followed by an independent audit.

The portable MCP v1.0 schema supports named `streamable-http` servers with a
URL but no portable OAuth client-registration fields. The generator requires
`oauth.mode = "discovery"` as a strict input precondition; OAuth 2.1,
protected-resource metadata, PKCE, scopes, and owner verification remain the
server/host responsibility under the frozen AUTH-002/003 contract. This input
flag is not an assertion that authentication has already been tested.
Client registration mode, connection ID, and host-specific extensions will be
determined only after host testing; do not smuggle them into portable v1 MCP
entries or invent them in the manifest.

**`plugin/mcp.json` is not committed as final configuration in Phase 7.**
The final MCP configuration and verified ChatGPT connection mapping wait until
**Phase 10**, after the production endpoint and authentication have been
verified in Phase 9. Do not add placeholder endpoints, registration IDs,
credentials, or secrets to the source package.

See [the Phase 7 implementation runbook](../plans/works/phase-7-implementation-plan.md),
[Issue #3](https://github.com/milyarderpro/content-producer/issues/3),
and the [phase tracker](../plans/implementation-plan.md#16-phase-tracker).
