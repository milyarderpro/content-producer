# Content Producer

Private ChatGPT plugin and Supabase-backed MCP service for creating verified,
deduplicated Facebook trivia posts. The MVP is trivia-only, while the core is
designed for future niche modules.

## Repository status

**21 October 2026:** Phases 0–10 have historical evidence; Phase 10 was
independently audited as **Pilot-ready**. Production MCP uses owner OAuth,
Supabase Edge `mcp` v31, and the installed PRIVATE Content Producer v0.2.2
plugin connected through `mcpku2` with **33 tools (11 Read, 22 Write)**.
Phase 11 has **not** started and the 14 final MVP acceptance criteria remain
historically PENDING; they are **not** the active testing queue.

**Current work:** [Live Test & Fix](docs/live-test/README.md) — one test prompt in
a fresh ChatGPT plugin chat, report result, triage Issue, focused PR, GitHub
Actions, and repeat the live test. See the [33-tool test matrix](docs/live-test/test-matrix.md),
[results log](docs/live-test/results.md) and [master Issue #25](https://github.com/milyarderpro/content-producer/issues/25).
The first reported issue is [a new draft not saved](https://github.com/milyarderpro/content-producer/issues/26);
its failing tool and root cause are **unverified until the actual trace is supplied**.

Historical phase plans and acceptance evidence are preserved as reference,
not deleted or marked complete. This workflow does not assert `MVP Complete`.

## Prerequisites

- Node.js 24.15.0 is the local and CI runtime baseline. Node 20 and Node 26
  are outside the supported project range.
- pnpm 10.33.2 or a Corepack-managed equivalent.
- The project pins Supabase CLI 2.120.0. Docker access is required for local
  Supabase work and database tests.
- Standalone Deno is optional. The checked-in `.deno-version`,
  `supabase/functions/deno.json`, and Deno foundation test support developers
  who choose to run `deno fmt`, `deno lint`, `deno test`, or the Deno LSP
  directly. No Phase 1 pnpm command requires a `deno` executable.

## Commands

```sh
pnpm install --frozen-lockfile
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
```

`package-plugin` validates a package only after Phase 7 adds the plugin
manifest. `verify-migrations` validates checked-in migration filenames.

## Edge Function tooling

Supabase Edge Function `mcp` is deployed and active behind owner OAuth.
The repository retains local Supabase CLI/Docker verification and pinned
Deno-compatible sources/tests. When an implementer changes business logic,
identity, RLS, migrations or permissions, run the applicable focused tests and
CR-020/044 risk-based backend gate on the final SHA **before any authorized
production deployment**. Documentation-only PRs use lightweight PR CI.

## Boundaries

- `plugin/` contains the installed PRIVATE plugin package/skills. Its
  registered Content Producer MCP app is the owner OAuth connection `mcpku2`.
- `auth-frontend/` is limited to login, OAuth consent, logout, and safe errors,
  not a product dashboard.
- `supabase/` contains migrations, RPC/Edge MCP implementation and database
  tests; `tests/` contains cross-cutting tests.
- No automatic Canva/Facebook publishing or automatic Facebook analytics.
  Do not fabricate publication evidence, metrics, tool success, or production
  PASS from synthetic fixtures.
- No unauthorized writes, bypass of owner OAuth/RLS or unrelated production
  deployment. Follow [the live workflow](docs/live-test/README.md) for safe
  testing and [frozen contracts](plans/tool-inventory.md) for API requirements.
