# CR-040 — OAuth tool-catalog parity with proven No-auth wire normalization

- Date: 2026-10-19
- Scope: PR #23, MCP `tools/list` serialization and focused catalog assertions only
- Owner authority: explicitly stop the rejected CR-039 general anonymous-write release and repair OAuth catalog instead
- Background: CR-029/031 OAuth discovery; CR-033 compact No-auth wire metadata; CR-034 verified `400 mcp_validation` for `mark_post_posted`.

## Evidence-based decision

A real ChatGPT connector registration attempt returned `400 Bad Request` with `{"detail":{"type":"apps_sdk_error","error_code":"mcp_validation","message":"Invalid MCP tool schema for tool 'mark_post_posted'"}}`. The existing No-auth catalog has succeeded after two data-preserving wire metadata adjustments: omit optional `outputSchema`, `title` and root `inputSchema.$schema` to fit the observed host catalog size budget, and replace `\\p{Cc}` only inside JSON Schema `pattern` metadata with the equivalent `\\x00-\\x1F\\x7F-\\x9F`. The historical host's exact internal validation algorithm and an official catalog size limit are unknown.

Apply these **same on-wire catalog transformations** to OAuth anonymous discovery and OAuth-authenticated `tools/list`. Every OAuth descriptor retains the registered `_meta.securitySchemes` and mirrors it to top-level `securitySchemes`, without replacing it with `noauth`; retain the single `get_account_profile` `_meta["openai/profile"]` marker. Only the No-auth pilot mode advertises `noauth` and omits the profile marker. Tool count, names, descriptions, required input fields, enum constraints, patterns' equivalent meaning, annotations, SDK Zod input/output validators and underlying business RPCs are unchanged.

OAuth JWT validation, OAuth owner workspace checks, bearer challenges, RLS, PostgreSQL functions, permissions and all production write locks remain unchanged. Anonymous `tools/call` must still be denied; the public OAuth discovery path advertises metadata only and does not become an anonymous write path.

## Evidence and gates

Focused Deno tests compare all 33 No-auth and OAuth input schemas to the original raw SDK catalog after only approved CR-033/034 transformations; assert no Unicode Cc escapes remain, exactly one profile marker in OAuth, all OAuth schemes remain unchanged and never noauth, and the output catalog is below 100,000 bytes. Run focused MCP validation and `pnpm run check`. Execute CR-020 full technical/security gate **once on the final backend SHA** via the existing intentional marker. Only after SUCCESS, deploy the same MCP bundle, verify source/version and the read-only OAuth catalog, and request exactly one owner OAuth connection. If the host returns an error, report it verbatim and STOP. No MAN-03/04, no production write, no grant or RLS changes. No deployment before final-SHA gate.
