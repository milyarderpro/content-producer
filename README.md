# Content Producer

Private ChatGPT plugin and Supabase-backed MCP service for creating verified,
deduplicated Facebook trivia posts. The MVP is trivia-only, while the core is
designed for future niche modules.

## Repository status

Phases 2–5 are complete on `main`. The local database has 67 checked-in
migrations and 33 owner-scoped business RPCs in `api`. Phase 6 is next: the MCP
Edge Function entrypoint and tool registry have not been implemented, and the
local `mcp` function remains disabled. No production deployment, plugin
connection, or Facebook/Canva integration has been completed. See the
[current phase tracker](plans/implementation-plan.md#16-phase-tracker) for
status and evidence; earlier phase runbooks and reports are historical records.

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

Supabase CLI with Docker is the local execution path for the Phase 6 Edge
Function.
Deno-compatible source configuration is retained for the Edge Runtime and for
developers who want direct Deno tooling, but installing standalone Deno is not
a repository prerequisite. See
[ADR-001](docs/decisions/2026-10-08-node-and-deno-tooling-baseline.md) for the
runtime decision.

## Boundaries

- `plugin/` is the portable package boundary; its manifest and skills are added
  in Phase 7.
- `auth-frontend/` is limited to login, OAuth consent, logout, and safe errors.
  It is not a product dashboard.
- `supabase/` contains local project configuration, migrations, and database
  tests from Phases 2–5. Phase 6 adds the MCP Edge Function implementation.
- `tests/` contains cross-cutting tests; `supabase/tests/` contains database and
  function fixtures.

Read [the frozen implementation plan](plans/implementation-plan.md) before
changing contracts or adding a new niche.
