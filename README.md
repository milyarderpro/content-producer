# Content Producer

Private ChatGPT plugin and Supabase-backed MCP service for creating verified,
deduplicated Facebook trivia posts. The MVP is trivia-only, while the core is
designed for future niche modules.

## Repository status

Phase 1 establishes the repository foundation only. It contains no business
migrations, deployed resources, MCP handler, production plugin connection, or
Facebook/Canva integration.

## Prerequisites

- Node.js 24.15.0 is the local and CI runtime baseline. Node 20 and Node 26
  are outside the supported project range.
- pnpm 10.33.2 or a Corepack-managed equivalent.
- Supabase CLI 2.117.0+ and Docker access are required before beginning Phase
  2, when the local Supabase stack and its Docker Edge Runtime are introduced.
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
manifest. `verify-migrations` accepts an empty migrations folder during Phase
1 and validates migration naming once migrations exist.

## Edge Function tooling

Supabase CLI with Docker is the local execution path for future Edge Functions.
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
- `supabase/` contains local project configuration, migrations, Edge Functions,
  and database tests. Phase 2 initializes the Supabase project.
- `tests/` contains cross-cutting tests; `supabase/tests/` contains database and
  function fixtures.

Read [the frozen implementation plan](plans/implementation-plan.md) before
changing contracts or adding a new niche.
