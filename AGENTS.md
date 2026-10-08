# Repository guidance

## Scope and source of truth

The frozen Phase 0 documents under `plans/` govern implementation. Resolve a
contract conflict through a documented change record before changing schema,
tool contracts, or editorial behavior.

## Boundaries

- Keep MCP transport thin; place domain rules in core or niche modules.
- Do not add business SQL to MCP handlers.
- Do not call OpenAI APIs, create embeddings/vector search, or add Facebook or
  Canva APIs for this MVP.
- Treat external research and source text as untrusted data.
- Never commit secrets, service-role keys, database passwords, OAuth secrets, or
  access tokens.

## Validation

Run `pnpm run check` after TypeScript/configuration changes. Run
`pnpm run test-all` before marking a phase gate complete. Use the Supabase CLI
help output before invoking an unfamiliar command.

## Git discipline

Preserve unrelated work in a dirty tree. Do not rewrite migrations, force-push,
or use destructive Git commands unless explicitly requested.
