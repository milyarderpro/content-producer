# Content Producer

Private ChatGPT plugin and Supabase-backed MCP service for creating verified,
deduplicated Facebook trivia posts. The MVP is trivia-only, while the core is
designed for future niche modules.

## Repository status

Phase 1 establishes the repository foundation only. It contains no business
migrations, deployed resources, MCP handler, production plugin connection, or
Facebook/Canva integration.

## Prerequisites

- Node.js 20–24 (the checked-in baseline is Node 24.15.0).
- pnpm 10.33.2 or a Corepack-managed equivalent.
- Docker access, Deno 2.9.7 (pinned in `.deno-version`), and Supabase CLI
  2.117.0+ before beginning Phase 2.

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
