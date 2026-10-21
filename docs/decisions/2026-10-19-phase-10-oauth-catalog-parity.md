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

Focused Deno tests compare all 33 No-auth and OAuth input schemas to the original raw SDK catalog after only approved CR-033/034 transformations; assert no Unicode Cc escapes remain, exactly one profile marker in OAuth, all OAuth schemes remain unchanged and never noauth, and the OAuth catalog is substantially smaller than the original 292 KB SDK list without asserting an undocumented official size cap. Run focused MCP validation and `pnpm run check`. Execute CR-020 full technical/security gate **once on the final backend SHA** via the existing intentional marker. Only after SUCCESS, deploy the same MCP bundle, verify source/version and the read-only OAuth catalog, and request exactly one owner OAuth connection. If the host returns an error, report it verbatim and STOP. No MAN-03/04, no production write, no grant or RLS changes. No deployment before final-SHA gate.

## Focused measured evidence (before final gate)

- Local OAuth `tools/list` catalog: **101,846 UTF-8 bytes**, with all 33 tool descriptors, compared with the former ~292 KB full SDK catalog.
- The No-auth catalog's 100,000-byte target is **not** asserted for OAuth: OAuth schemes are required and account for the additional metadata.
- Dedicated regression also compares unauthenticated protocol discovery against authenticated OAuth listing byte-equivalent descriptors and rejects anonymous `tools/call` before a handler executes.
- Owner OAuth and ChatGPT's opaque registration validator are not exercised by these automated tests. One owner connection only after full final-SHA gate and deployment.

## CR-041 profile contract correction (owner requested, 2026-10-20)

OpenAI's [current official authentication contract](https://developers.openai.com/plugins/build/auth) explicitly requires an authenticated profile tool marked `_meta["openai/profile"]: true` to advertise its `outputSchema` and to return a top-level identity object with required stable `id`, optional `name`/`email`/`nickname` and `additionalProperties: false`. A workspace UUID is **not** one of the allowed profile properties. Earlier CR-029 profile result and CR-040 blanket `outputSchema` omission are incompatible with this current rule.

Fix: preserve `outputSchema` **only** for the OAuth-designated `get_account_profile` in the outbound MCP tools/list, with exact SDK/Zod closed schema. Drop `workspace_public_id` only from OAuth profile output (never from database RPC), keep existing OAuth identity stable and identical JSON text and structuredContent. Keep No-auth pilot's unmarked profile + workspace field unchanged. To maintain workspace discovery, OAuth `get_workspace_context({})` resolves the server-validated owner workspace from `RequestContext`, forwards unchanged RPC version 1 and workspace UUID, and returns `workspace.public_id`. Optional supplied workspace IDs still undergo mismatch rejection. No migrations, ownership changes, or business writes.

Tests validate the **serialized MCP wire catalog** (anonymous discovery and authenticated OAuth), sole profile outputSchema, 33 tools, strict schema and fields, profile call result equivalence, owner-derived workspace/bootstrap and cross-workspace denial; raw SDK output schemas remain validated independently. Local focused and one final-SHA full gate are required before a single OAuth owner connection.
