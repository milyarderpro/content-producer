# CR-036 — Phase 10.2 registered-app mapping instead of bundled desktop MCP

- **Date:** 2026-10-19
- **Authority:** Owner requested recovery of Work web/mobile usability and
  update of the same PRIVATE plugin (not a duplicate).
- **Scope:** `codex/phase-10-plugin` and draft PR #23. Package metadata,
  source allowlist, validator, tests, lightweight CI, references and owner
  Plugin Creator release update only. Backend, data, RPC, RLS and default
  business-write lock are not changed.
- **Status:** Source contract decision; host acceptance pending.

## Evidence and decision

The v0.2.0 source archive passed 24 focused package tests, zip checks and
GitHub Actions, and the owner installed it PRIVATE. ChatGPT web displayed
`Installed`, one MCP server and one skill but offered only **Open in
desktop app**. The v0.2.0 plugin did not appear as a choice in the web Work
chat selector; the already-connected PRIVATE No-auth custom MCP `mcpku`
did appear. This proves that package integrity is **not** web usability.

OpenAI's official
[package specification](https://developers.openai.com/plugins/build/plugins)
describes `extensions.com.openai.apps = "./.app.json"` for registered
MCP app mappings. Its
[submission error reference](https://developers.openai.com/plugins/deploy/submission-errors)
specifies an `apps` object keyed by server alias and entry `id`
beginning with `asdk_app_`. Instead of a second bundled MCP remote,
declare precisely one required `content-producer` alias with id
`asdk_app_6ad4ef8b42588191a749b8b9f356b662`, referencing the
already-validated `mcpku` app (PRIVATE, version 1.0.0). A locator is
not a credential. Remove `mcp.json` from ZIP, delete stale legacy
`mcp.json` and derived `.mcp.json` during guarded update and preserve
the ten policy references/skill and frozen 33-tool order. Manifest version
0.2.1 distinguishes this revised package. Retain immutable plugin backend
ID `plugins_6ad5bf91a278819182951ebb312eca06`, same PRIVATE scope,
no new plugin or MCP connection.

## Security and acceptance boundary

`mcpku` No-auth server retains unauthenticated public fixed-workspace reads;
PRIVATE packaging is not an owner authentication barrier. No production
business writes may execute; server write latch remains closed.
Keep full backend CR-020 gate PASS #39142242292 on SHA
`14d4955e07a55d0d5040e647d210ddab5ca282cd` and all 14 MVP
acceptance criteria PENDING. Only the changed package is tested.

Only owner evidence in fresh ChatGPT Work web and mobile contexts can
prove cross-surface usability: Content Producer selectable, skill loaded,
33 tools available including `create_page`, and three successful reads
from the mapped MCP, with no business write. If host update/validation
rejects `.app.json`, capture verbatim error; no PASS or fallback to a
desktop-only package.
