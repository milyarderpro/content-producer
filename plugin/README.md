# Plugin source boundary

Phase 7 prepares the portable Content Producer plugin **source** and a local
package candidate. It does not install, deploy, or connect a production plugin.

Checkpoint 7.0 only updates the phase tracker, this README, and lightweight CI.
Subsequent Phase 7 checkpoints will add:

- **7.1:** a portable `plugin.json` plus a schema, validator, and generator for
  the MCP server configuration.
- **7.2–7.3:** the content-producer skill and its core and trivia references.
- **7.4:** local candidate-package validation and the full Phase 7 gate,
  followed by an independent audit.

The generator may validate connection information supplied later, but
**`plugin/mcp.json` is not committed as a final configuration in Phase 7**.
The final MCP configuration and verified ChatGPT connection mapping wait until
**Phase 10**, after the production endpoint and authentication have been
verified in Phase 9. Do not add placeholder endpoints, registration IDs,
credentials, or secrets to the source package.

See [the Phase 7 implementation runbook](../plans/works/phase-7-implementation-plan.md),
[Issue #3](https://github.com/milyarderpro/content-producer/issues/3),
and the [phase tracker](../plans/implementation-plan.md#16-phase-tracker).
