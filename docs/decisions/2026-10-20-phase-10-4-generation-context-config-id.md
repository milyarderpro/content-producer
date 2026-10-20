# CR-046 — Expose Page configuration identity in generation context

- Date: 2026-10-20
- Scope: Phase 10.4 MAN-03 blocker, existing branch `codex/phase-10-plugin` / draft PR #23 / Issue #22
- Authority: Owner explicitly authorized an additive migration, MCP schema alignment, regression evidence and one final-SHA full gate before deployment.
- Pre-change baseline: `f7cb003b159c690e947db73973260afbddcabc8c`; active backend `6a8c42d8a3ffb846b8bd92663dbfbdbc9cc22e92`, production Edge `mcp` v29.

## Problem and narrow contract decision

`api.get_page_generation_context` already selects `public.page_niche_configs.public_id AS config_public_id` for the owner-scoped Page+niche row, but omits that ID from the JSON response. Meanwhile MCP `save_post.generation_snapshot` requires `config_public_id`. This prevents a caller from constructing a trustworthy snapshot using context alone. No caller may invent this ID or substitute a Page ID.

Add `data.config_public_id` (UUID of the **selected** Page+niche configuration) to the existing `get_page_generation_context` read response, without removing/renaming existing fields. Extend the MCP output schema with the same required field; use the database value rather than deriving an ID in the transport. Keep `data.context_version.config_updated_at` an **unaltered six-digit-microsecond** ISO string from `internal.iso_timestamp_v1`, and preserve existing `page_updated_at`. `save_post.generation_snapshot.config_public_id` must equal the selected configuration, and its `config_updated_at` must equal the unrounded context value; do not convert through JS `Date`.

## Invariants, tests and release

Do not edit historical migrations; make a new additive replacement for the one RPC projection only. Preserve API signature, ownership, EXECUTE grants, SECURITY DEFINER guard, owner-scoped filtering, direct `anon` denial, and the exact 33 RPC/MCP tools. Do not touch OAuth route/settings, fixed-pilot rollback, business validators, reservation semantics or `save_post` logic.

Add a multi-Page owner/foreign-owner regression comparing context ID against the actual Page+niche config row (never hardcoded IDs) and validating exact timestamp. Prove via an isolated public RPC/MCP path that context → fact reservation → `save_post` → draft readback works, and identify any other generation-snapshot fields requiring constants rather than context metadata. Run focused tests/check during work; run the CR-020 backend gate **once on the final backend SHA**, deploy only on PASS, then perform owner OAuth read-only context verification. Record exact SHA, run, deployment and proof boundaries in Issue #22 / PR #23.

**Production boundary:** no reservation, `save_post`, fact registration or draft mutation in this repair task; do not reuse the previously released MAN-03 operation key. MAN-03 production and MAN-04 remain PENDING. This change record authorizes contract repair, not production content creation or editorial approval.
