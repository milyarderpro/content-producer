# ADR-001 — Node and Deno Tooling Baseline

| Field  | Decision                      |
| ------ | ----------------------------- |
| Status | Accepted                      |
| Date   | 8 October 2026                |
| Scope  | Phase 1 repository foundation |

## Context

Phase 1 needs one reproducible Node runtime for repository commands and a
clear distinction between Deno-compatible Edge Function source and the local
runtime that will execute it in later phases.

## Decision

- Node.js 24.15.0 is the only supported local and CI runtime baseline. The
  repository pins it in `.nvmrc` and permits `>=24.15.0 <25` in `package.json`.
- Node 26 is not adopted because it is outside the project's selected LTS
  baseline. Node 20 is not a supported project runtime.
- `@types/node` is pinned to the matching Node 24 major line.
- Standalone Deno is optional. The repository does not install, invoke, or
  require it for Phase 1 pnpm quality gates.
- `supabase/functions/deno.json`, `.deno-version`, and the Deno foundation
  test remain as optional direct tooling and editor-LSP configuration.
- Supabase CLI plus Docker Edge Runtime is the primary local execution path
  for Edge Functions once Phase 2 starts.

## When standalone Deno becomes necessary

Install Deno only when a developer needs to run `deno fmt`, `deno lint`, or
`deno test` directly, or needs Deno language-server support in an editor. It
is not needed to run the Phase 1 Node/pnpm gates or the future Docker-hosted
local Edge Runtime through Supabase CLI.

## Affected files

- `.nvmrc`
- `package.json`
- `pnpm-lock.yaml`
- `README.md`
- `plans/implementation-plan.md`
- `plans/phase-0-decision-register.md`
- `supabase/functions/deno.json`
- `supabase/functions/_shared/foundation_test.ts`
- `tests/foundation.test.ts`

## Consequences

The repository no longer advertises a broad Node support range. The Deno
configuration remains available without turning Deno into an implicit
dependency of every contributor or CI job.
