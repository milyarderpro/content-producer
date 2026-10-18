# CR-030 — Temporary anonymous MCP discovery probe for Phase 10.1

- **Date:** 2026-10-18
- **Status:** Approved for one diagnostic connection; remove after the host result is recorded
- **Authority:** Owner requested a separate unauthenticated one-tool probe on draft PR #23.
- **Scope:** New `mcp-probe` Edge Function only. The production `mcp` function, its OAuth policy, owner authorization, database RPCs, and 33 business tools remain unchanged.

## Reason and temporary exception

The owner-connected production MCP is ACTIVE v6 after a passing CR-020 gate, but ChatGPT's post-deployment metadata refresh returned “Couldn't update the app. Try again” and its catalog still showed “No tools available for this app.” This does not identify whether the failure is in basic transport discovery or the OAuth path.

AGENTS.md and the frozen Phase 10 runbook require authenticated owner access for business tools and a hard stop before write testing. This diagnostic endpoint is a narrow, temporary exception to the usual authenticated MCP transport: it accepts requests without a token solely to distinguish basic ChatGPT tool discovery from the production OAuth flow. It is not a second business MCP service and does not change the 10.1 acceptance gate.

## Boundaries and verification

`mcp-probe` registers exactly one read-only `ping` tool with empty input and constant text result `OK`. Its source imports only the pinned MCP SDK and schema library; it does not import any production MCP module, read environment variables, call `fetch`, database, RPC, or owner data, or register any other tool. The Supabase gateway JWT check is disabled for this function alone. Anonymous `initialize`, `tools/list`, and `ping` are tested locally and by focused CI; the existing Phase 10 light CI also runs. The heavy CR-020 gate is not triggered by this probe.

Deploy only `mcp-probe`, then give the owner its exact URL and instructions to create a second **private** ChatGPT custom MCP connection with **No authentication**. Stop and wait for the owner's observation. If `ping` appears, record only that anonymous discovery works and propose mixed authentication for the main server without implementing it. If it does not, collect the host discovery error and stop OAuth speculation. The probe alone cannot make 10.1 PASS. Remove the endpoint and connection after this diagnosis is resolved.
