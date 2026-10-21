# CR-031 — Phase 10.1 mixed-auth MCP discovery

- **Date:** 2026-10-18
- **Status:** Accepted as one diagnostic repair candidate; hosted ChatGPT acceptance pending
- **Authority:** Owner confirmed the private anonymous `mcp-probe` exposes and executes `ping`, then requested one proven OAuth/discovery repair on PR #23 without unauthenticated business tools or writes.
- **Scope:** MCP transport discovery and authorization challenges only. The 33 business tool names, schemas, owner authorization, database RPCs, and production data remain unchanged.

## Evidence and limit

The no-auth probe's `ping` appeared and returned `OK` in ChatGPT. Production `mcp` remains installed with OAuth and shows no tools. On 2026-10-18, a direct unauthenticated `initialize` POST to the production MCP URL returned HTTP 401 `MISSING_CREDENTIALS` from `@supabase/server`, with an OAuth protected-resource challenge. Its internal transport also lists zero tools without a `RequestContext`. These are reproducible incompatibilities with the documented ChatGPT **OAuth or no authentication** mode: `initialize` and `tools/list` use no auth while each tool declares its own scheme. See <https://developers.openai.com/api/docs/guides/custom-mcp-server>.

One diagnostic Refresh tools on the existing OAuth-only ChatGPT connection returned “Couldn't update the app. Try again”. The function logs recorded two MCP HTTP 200 responses and a protected-resource metadata GET 200; the host did not disclose a parser error. Therefore the exact reason the **existing OAuth-only** catalog remains empty is not proven. The repair below addresses the proven mixed-mode incompatibility, not an asserted response-size or schema defect. Its ChatGPT result must be measured after deployment.

## Decision

Allow only the MCP protocol's `initialize`, `notifications/initialized`, and `tools/list` requests without a bearer token at the existing production URL. Register the same 33 descriptors for anonymous listing, all with the unchanged per-tool OAuth scheme at top level and `_meta`; no tool is declared `noauth`. The public catalog uses a non-credential sentinel context solely to register descriptors. Its transport rejects `tools/call` and every other method before a handler can execute. The regular bearer-token middleware, owner check, and RPC path remain required for every business tool call, including the three read tools. A missing-token tool call returns an OAuth challenge.

The documented tool-level OAuth handshake also requires a `tools/call` error result containing `_meta["mcp/www_authenticate"]` with `error` and `error_description`. The current no-token response is an HTTP 401 with only a top-level `_meta`. For a missing-token tool call, return the documented JSON-RPC error result and preserve the protected-resource challenge header; do not invoke the tool handler. This is part of the same mixed-mode negotiation repair.

Use focused tests to prove no-token protocol discovery, exact 33 OAuth-only descriptors including `create_page`, rejection of all anonymous business calls with a tool-level challenge, and unchanged signed owner and non-owner behavior. Run `pnpm run check` and light CI, then deliberately trigger one CR-020 final gate on the final SHA before deploying only `mcp`. After deployment, refresh or reconnect the private ChatGPT plugin in **OAuth or no authentication** mode once. Inspect the host catalog, write-approval affordance without write, and the three owner reads. If ChatGPT still shows no tools, stop and record its specific failure instead of changing another suspected cause.

The separate temporary `mcp-probe` remains diagnostic only and is removed after this diagnosis. This record does not authorize final plugin packaging, Phase 10.2, or a production business write.
