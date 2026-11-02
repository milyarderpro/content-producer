// Diagnostic negative controls on an already empty LOCAL fixture database.
// Every mutation is rolled back in the same session before evaluating evidence.
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { sql } from '../supabase/tests/database/helpers/plan-lifecycle.js';
import { assertCatalogPin, runCatalogAudit, type Catalog, type CatalogPin } from './trivia-v2-catalog-audit.js';

await runCatalogAudit();
const query = readFileSync('scripts/trivia-v2-catalog.sql', 'utf8');
const pin = JSON.parse(readFileSync('scripts/trivia-v2-catalog-pin.json', 'utf8')) as CatalogPin;
for (const [name, mutation] of [
  ['caller grant', 'grant select on public.posts to anon;'],
  ['RLS disabled', 'alter table public.posts disable row level security;'],
  ['unexpected helper', "create function internal.p7_unexpected() returns integer language sql as 'select 1';"],
  ['unsafe policy', 'create policy p7_unexpected on public.posts for select to authenticated using (true);'],
  ['constraint removed', 'alter table public.posts drop constraint posts_pkey cascade;'],
] as const) {
  const changed = JSON.parse(sql(`begin; ${mutation} ${query} rollback;`)) as Catalog;
  assert.throws(() => assertCatalogPin(changed, pin), /CATALOG_SCHEMA_SOURCE_OR_ACL_DRIFT/);
  console.info(`P7 rolled-back catalog negative control (${name}): PASS`);
}
await runCatalogAudit();
