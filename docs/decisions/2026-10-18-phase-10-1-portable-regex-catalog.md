# CR-034 — Portable equivalent control-character patterns in Phase 10.1 MCP discovery

- **Date:** 2026-10-18
- **Scope:** Phase 10 checkpoint 10.1, existing `codex/phase-10-plugin` and draft PR #23
- **Status:** Evidence-based compatibility fix proposed; actual ChatGPT registration still BLOCKED until host proof
- **Precedence:** Narrow wire-format clarification of CR-032 and CR-033. No change to their fixed pilot, 33-tool count, default-closed write latch or business contracts.

## Concrete third-attempt error, not HTTP connectivity

The owner obtained an actual ChatGPT registration response using Chrome DevTools:
`POST https://chatgpt.com/backend-api/aip/connectors/mcp` returned **400 Bad Request**:
`{"detail":{"type":"apps_sdk_error","error_code":"mcp_validation","message":"Invalid MCP tool schema for tool 'mark_post_posted'"}}`.
This identifies the ChatGPT host's registration schema validation layer; it is not a Supabase URL, name, or OAuth error. The production MCP v10 `initialize` and `tools/list` still returned HTTP 200 to ChatGPT. CR-033's size budget remains a separate, verified transport property, not an established cause of the refusal.

A new **read-only live production tools/list** inspection [run #39141721020](https://github.com/milyarderpro/content-producer/actions/runs/39141721020) confirmed exactly 33 tools and identified precisely three `inputSchema.pattern` values containing Unicode property escapes `\\p{Cc}`, not compiled by Python standard `re` (`bad escape \\p`):

1. `mark_post_posted.platform_post_id`: `^[^\\p{Cc}]+$`.
2. `mark_post_posted.published_url`: `^https:...[^\\s\\p{Cc}]*...$`.
3. `record_post_performance.source.note`: `^(?!...)[^\\p{Cc}]+$`.

Exactly two occur on **the tool explicitly rejected by ChatGPT**. Similar OpenAI-compatible provider compatibility incidents with Unicode `\\p{...}` regex have been publicly reported, but **the internal ChatGPT validator mechanism is not confirmed**. Other published patterns compiled in this specific independent Python test. Neither the password, authentication cookie, nor sensitive business payload was used.

## Narrow decision before code modification

In the **No authentication pilot `tools/list` descriptor only**, recursively replace literal `\\p{Cc}` in JSON Schema `pattern` strings with an equivalent explicit, engine-portable `\\x00-\\x1F\\x7F-\\x9F` control-codepoint range. Unicode General Category `Cc` comprises exactly U+0000–U+001F and U+007F–U+009F, so within the existing character-class occurrences the permitted set remains the same. Do **not** remove, broaden or weaken any input constraint, field, requiredness, enum, default or operation flag. Retain all tool names and user-facing instructions and the CR-033 catalog size budget. The original Zod runtime input validation, output validation, business RPCs, RLS, fixed-owner identity, and locked business writes remain authoritative and **unchanged**. Legacy OAuth catalog continues to advertise the original SDK-generated schema; only pilot wire discovery is normalized.

Add a focused regression test that checks the host-facing schemas of **all 33** tools against their full originals, allowing only CR-033 optional metadata omissions and **these three semantically equivalent string rewrites**; specifically assert that no `\\p{Cc}` remains, and `mark_post_posted` plus `record_post_performance` are the only affected tools. Verify the new hosted schema via read-only external MCP `initialize`/`tools/list` after deployment. This provides validation but cannot substitute for actual ChatGPT `Create as a plugin` acceptance.

## Controlled release and stop rule

Use only focused Deno tests/format/check and lightweight CI while editing; require **one CR-020 full technical/security gate on the final deployment SHA** if runtime source changes, then deploy only to existing `xjonnilnypchtxogtopb`. Keep per-commit test evidence tied to SHA and avoid duplicate gate runs. On slow Actions, record the exact run ID and STOP; resume the same run only after owner `lanjutkan`. After final PASS and read-only hosted proof, ask owner to retry registration **once** and report ChatGPT's exact 400 response if any. Do not assert host success in advance or ask for another uninstrumented retry. No business `tools/call`, SQL migration, production write, 10.2 package, PR merge or Phase 10.2 start until 10.1 host proof is complete. Keep 14 MVP acceptance criteria pending.
