# CR-029 — Phase 10.1 MCP discovery profile compatibility

- **Date:** 2026-10-18
- **Status:** Accepted for one Phase 10.1 repair candidate; hosted ChatGPT discovery remains unproven
- **Authority:** Owner requested inspection and repair of proven discovery-contract mismatches on PR #23.
- **Scope:** MCP facade only. Supersedes the Phase 0 `get_account_profile` MCP input/output shape and the placement of tool OAuth schemes in `plans/tool-inventory.md` where they conflict with current ChatGPT discovery. Database RPC contracts and 33-tool identity remain frozen.

## Evidence and limits

The direct private ChatGPT connection completed OAuth but reported “Authentication succeeded, action discovery failed”, “No tools available for this app”, and then “Couldn't update the app. Try again” on one owner-requested metadata refresh. Production Edge logs showed authenticated MCP POST HTTP 200, which does not prove that ChatGPT accepted `tools/list` descriptors.

On deployed backend source SHA `be3bf04b703a4aff16510c496600c9796c13b57a`, a read-only `tools/list` call through the authenticated transport with a synthetic owner context returned HTTP 200, exactly 33 unique tool names including `create_page`, and a 292,416-byte SSE response. All 66 input/output schemas passed Draft 2020-12 structural validation, all 466 schema patterns compiled as ECMAScript Unicode regexes, and all object schemas were closed. This reproduces the deployed transport and descriptor source, **not** the live ChatGPT scan or a fresh production owner token.

Two mismatches are proven against [OpenAI's current profile-tool contract](https://developers.openai.com/plugins/build/auth): the marked `get_account_profile` requires `request_schema_version: 1` rather than accepting `{}`, and its output places `id` under `data.profile` rather than at the top level. Its current MCP result text is a status sentence rather than the same JSON profile. All 33 descriptors carry OAuth only in `_meta.securitySchemes`, while the [current tool declaration](https://developers.openai.com/plugins/build/auth) places `securitySchemes` on each tool's top level and the [tool reference](https://developers.openai.com/plugins/reference) describes `_meta.securitySchemes` as a backward-compatibility mirror. The installed MCP SDK 2.3.1 registration API does not emit the top-level property. These are proven contract mismatches, **not** a proven root cause of the empty ChatGPT catalog. The 292 KB response is measured; no supported ChatGPT size limit has been established, so size is a diagnostic fact, not a defect claim.

## Decision

Make one minimal candidate on the existing `codex/phase-10-plugin` branch and draft PR #23:

1. Keep the name `get_account_profile`, its `_meta["openai/profile"]: true` marker, and its owner-only database RPC. At the MCP facade, accept `{}`, supply `p_request_schema_version: 1` internally, validate the unchanged RPC envelope, then return the authenticated profile as top-level `{id, name, nickname}` structured content and identical serialized JSON text. Do not expose `email_hint` as a full email or change owner authorization.
2. For all 33 `tools/list` descriptors, publish the existing OAuth scheme at top-level `securitySchemes` and retain the identical `_meta.securitySchemes` compatibility mirror. Because the pinned SDK omits the top-level property, adapt only the authenticated `tools/list` transport response. Do not alter tool names, other input/output contracts, business handlers, database RPCs, migrations, or production data.
3. Add focused tests for exact 33 names, both scheme placements, profile `{}`/top-level identity/text, owner JWT forwarding and unchanged RPC parameters, and no effect on non-list responses. Run these tests and `pnpm run check` before the CR-020 full gate. If the candidate passes, run the full technical/security gate **once on its new SHA**, then deploy that exact SHA and request at most one ChatGPT metadata refresh if needed. A backend/security change cannot reuse the Phase 9 gate.

10.1 stays **BLOCKED** unless the live ChatGPT catalog exposes `create_page` and the host's owner approval capability is inspectable without a write. Only after that gate can the 33-tool count and three owner reads establish 10.1 PASS. If discovery remains empty, stop speculative changes and record the precise host error. No 10.2 or business write is authorized by this record.

## Single candidate before full gate

The MCP-only adapter and dedicated `.github/workflows/phase-10-1-technical-gate.yml` are on the same candidate branch. The new workflow copies the CR-020 Phase 9 technical/security stages, runs on the exact pushed Phase 10.1 backend SHA, and does not alter the frozen `main` gate. It is triggered only by MCP source or its own workflow file, not later documentation/package-only pushes.

Focused local evidence: all **62 MCP tests PASS**, including signed synthetic owner JWT through the HTTP transport, 33 `tools/list` descriptors, `create_page` visibility, top-level/mirrored OAuth schemes, profile `{}` and top-level identity, unchanged owner JWT and versioned profile RPC, and non-owner denial. `pnpm run check` PASS. The candidate owner-context `tools/list` response is HTTP 200, **293,921 bytes**, with 33 unique tools, 33 top-level and 33 mirrored OAuth declarations. All 66 candidate input/output schemas pass Draft 2020-12 structural validation. This is local evidence; production deployment and ChatGPT discovery are still PENDING.
