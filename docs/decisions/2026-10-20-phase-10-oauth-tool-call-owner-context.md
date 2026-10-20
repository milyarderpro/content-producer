# CR-043 — Resolve owner workspace on OAuth tool calls

- Date: 2026-10-20
- Scope: Phase 10.1 OAuth host verification after CR-042, draft PR #23, Issue #22
- Authority: Owner requested a working ChatGPT OAuth connection with three successful owner reads and no business write.

## Evidence

The private ChatGPT connection completed OAuth and displayed 33 tools. In the same read-only ChatGPT attempt, `get_account_profile` succeeded but `get_workspace_context({})` returned `OWNER_ACCESS_REQUIRED`; `list_pages` was not called. Supabase function logs for that attempt show authenticated MCP POST responses at 2026-10-20 04:20:42 and 04:20:46 UTC with HTTP 200. The tool error was inside the MCP response. The handler currently resolves `context.workspacePublicId` only for `tools/list`. Each `tools/call` starts with a fresh context where that value is null. The OAuth workspace bootstrap intentionally takes `{}` and uses that owner-resolved context, so it fails before its read RPC.

## Decision

For an authenticated `tools/call` as well as `tools/list`, resolve and validate the active owner workspace before handing the request to MCP transport. Return the existing safe owner denial when no active workspace exists, and retain the existing unavailable response for failed owner checks. Protocol initialization does not need this database read. The owner workspace ID remains server-derived, is not placed in the public profile, and cannot be overridden with another workspace ID. No tool schema, business RPC, write permission, or RLS policy changes.

## Acceptance boundary

Add a signed-owner transport regression for `get_workspace_context({})` that proves the owner workspace reaches its read RPC, plus denial for an inactive owner and foreign workspace. Re-run focused validation, the CR-020 full gate on the new final SHA, and deploy that SHA. Repeat the three reads in the real ChatGPT OAuth connection and inspect write approval without running a write. A transport HTTP 200 alone does not establish success.
