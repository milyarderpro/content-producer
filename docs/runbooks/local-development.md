# Local Supabase development

This runbook covers the reproducible local Supabase environment for Content
Producer. It is intentionally limited to local development: it neither links
to nor changes a hosted Supabase project.

## Prerequisites

- Node.js `24.15.x` (the repository supports `>=24.15.0 <25`).
- pnpm `10.33.x` (or Corepack-managed equivalent).
- Project-pinned Supabase CLI `2.120.0`, invoked through pnpm.
- A running Docker-compatible container runtime with permission to use its
  socket.

Install the checked-in dependencies before running a local command:

```sh
pnpm install --frozen-lockfile
```

Do not install standalone Deno for this runbook. Supabase CLI and Docker run
the local Edge Runtime when a later phase needs it.

## Start and stop

Start the local stack from the repository root:

```sh
pnpm run supabase:start
```

The first start can take longer because container images must be downloaded.
The command applies the checked-in migrations and then runs
`supabase/seed.sql`.

Stop the local stack when it is no longer needed:

```sh
pnpm run supabase:stop
```

Stopping preserves local database state. It is not a reset.

The CLI prints local development credentials in some commands. Treat them as
local runtime output: do not paste them into source, documentation, issues, or
commits. This repository contains no database password, service-role key, or
hosted-project token.

## Reset, migrations, and seed

Reset only the local database:

```sh
pnpm run supabase:reset
```

This destroys local database data, replays every checked-in migration in
order, and runs the local seed. It does not delete files in
`supabase/migrations/`; migration source is the reproducible record and must
remain under version control.

At Phase 2, `supabase/seed.sql` is deliberately a no-op. It exists so local
start and reset always have an explicit, reproducible seed step. No business
tables or business data may be added until their scheduled implementation
phase.

To run the current seed file again without resetting:

```sh
pnpm run supabase:seed
```

Before adding a future migration, inspect the CLI help, create it with the
project CLI, and edit only the generated file:

```sh
pnpm exec supabase migration new descriptive_change
```

Then reset locally and verify the migration chain. Do not manually invent a
migration filename, modify a migration that has already been shared, or use a
remote-targeting flag in this runbook.

Inspect the local migration history with:

```sh
pnpm run supabase:verify
pnpm run verify-migrations
```

The first command compares the checked-in migration history with the running
local database. The second validates migration filenames in the repository.

## Database boundary at Phase 2

`supabase/config.toml` configures `api` as the only Content Producer business
RPC schema. Supabase also includes platform schemas such as `public` and
`storage` in its local runtime. Their technical presence does not authorize a
business Data API surface:

- `public` will store future business tables, but caller roles have no direct
  business-object grants.
- `api` is reserved for the reviewed business-RPC allowlist introduced in
  Phase 5; Phase 2 creates no RPCs.
- `storage` is a platform service, not a Content Producer RPC schema.
- `internal` is neither configured as a Data API schema nor granted to caller
  roles.

Object privileges, Data API schema configuration, and row-level security are
separate controls. The Phase 2 migration establishes explicit default
privilege revokes; `auto_expose_new_tables = false` is only additional defense
in depth. Future table migrations must still set explicit grants and RLS
policies appropriate to their access model.

## Local OAuth and dynamic client registration

The local Auth service enables the OAuth 2.1 server and dynamic client
registration (DCR). Its configured authorization path is `/oauth/consent`.
This makes authorization-server discovery and DCR metadata available for local
verification, but does not create the consent frontend or execute an OAuth
flow. Those remain later-phase work.

The `mcp` Edge Function remains disabled until its Phase 6 entrypoint exists.
OAuth/DCR being enabled does not make an MCP endpoint or a business RPC
available.

## Tests and verification

Run the focused local Supabase foundation test, covering the database, Data API,
and OAuth/DCR discovery baseline:

```sh
pnpm run test:database
```

Run the Phase 2 smoke test, which checks repository structure, migration
naming, and the local database baseline:

```sh
pnpm run smoke-test
```

Run the complete repository gate before handing off a change:

```sh
pnpm run check
pnpm run test-all
pnpm run verify-migrations
pnpm run smoke-test
git diff --check
```

`test-all` includes the project checks, migration filename verification, and
the database test. The individual commands are retained so a failure can be
isolated quickly.

## Troubleshooting

### Docker permission or unavailable runtime

Start Docker (or another Docker-compatible runtime), confirm that the current
user can access its socket, then retry `pnpm run supabase:start`. Do not switch
the project to a remote database as a workaround.

### First start is slow

The initial start downloads the local Supabase images. Keep the process
running; later starts use the locally cached images.

### Reset or test fails on a migration

Read the failing migration and SQL error, correct the new migration through a
reviewed change, then run `pnpm run supabase:reset` and the verification suite
again. Do not delete existing migration source to make the history appear
clean.

### Missing `supabase/functions/mcp/index.ts`

The MCP Edge Function is a Phase 6 deliverable. In Phase 2,
`[functions.mcp]` is explicitly disabled in `supabase/config.toml`, so local
start skips it. Do not create a placeholder handler or enable the function
before Phase 6.

### Local state seems stale

Use `pnpm run supabase:reset`. This removes local database state and rebuilds
it from migrations plus seed, while preserving the migration source files.

## Local versus remote boundary

All commands above are local. Do not run `supabase login`, `supabase link`,
`supabase db push`, `supabase db reset --linked`, or any deployment command as
part of this runbook. No remote project has been linked or modified during
Phase 2.
