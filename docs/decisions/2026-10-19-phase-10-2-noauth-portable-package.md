# CR-035 — Phase 10.2 final portable plugin uses proven No authentication

- **Date:** 2026-10-19
- **Authority:** Owner's checkpoint 10.2 request; 10.1 live host PASS; CR-032.
- **Scope:** Branch `codex/phase-10-plugin` and draft PR #23; package,
  generator, validator, skill, lightweight CI and documentation only.
- **Status:** Contract alignment recorded. PRIVATE installation, fresh-chat
  skill/MCP evidence and checkpoint 10.2 PASS are still PENDING.

## Contract reconciliation

Phase 7 intentionally deferred root `mcp.json` and disallowed its bundling;
its generator used OAuth discovery input. On 2026-10-18, Phase 10.1 instead
PASSed through a PRIVATE ChatGPT custom MCP connection `mcpku`, with
**No authentication**, 11 Read + 22 Write = 33 tools including
`create_page`, and three successful live read calls. CR-032 already
superseded OAuth for this connection. The old package assumptions must
change explicitly rather than be silently retained.

The final portable Agent Plugins root `mcp.json` specifies one
`streamable-http` server named `content-producer` at the exact previously
verified HTTPS endpoint. No OAuth extension is declared; generator input
requires `authentication: {mode: "none"}` and rejects OAuth. Final source
validation pins the endpoint and requires exactly **13 allowlisted files**:
`plugin.json`, `mcp.json`, one skill and ten policy references. Retain
the frozen 33 tool names in order, contained links, no symlinks, no
credentials, query, fragment, backup or production-state files. Only
`mcp.json` may carry the validated public MCP endpoint. Manifest v0.2.0
is a candidate identity, not proof of installation.

## Residual risk, unchanged backend and manual gate

PRIVATE plugin installation does not restrict access to the public
unauthenticated MCP URL. Anyone who knows the URL can read fixed-pilot
workspace data; visible business Write tools are still server-blocked by
default, not authenticated. Any future write requires a separate
public-write risk decision and owner approval for its exact card payload.
No business write can be authorized merely by packaging.

Reuse CR-020 full technical/security [gate #39142242292](https://github.com/milyarderpro/content-producer/actions/runs/39142242292)
on backend SHA `14d4955e07a55d0d5040e647d210ddab5ca282cd`.
Edge `mcp` v11 digest:
`4b7b72da2e30ae3895b7b00e2eb6434a189b78aa2174e1807822bb9dae4fea2b`.
Package-only source changes use focused tests and light CI, no new
`test-all`, backend deployment, migrations or business writes.

Only owner manual Plugin Creator upload and a **new chat selecting the final
plugin alone** can prove skill and MCP together, exactly 33 tool descriptors
and three successful actual reads. Record ZIP SHA256, Actions artifact,
installed version and live evidence in Issue #22 / PR #23. Keep 10.2
PENDING until then, PR draft/unmerged and do not begin 10.3.
