import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const migrationsDir = join(process.cwd(), 'supabase', 'migrations');

if (!existsSync(migrationsDir)) {
  throw new Error('Expected supabase/migrations/ to exist.');
}

const migrations = readdirSync(migrationsDir).filter((entry) => entry.endsWith('.sql'));
const migrationName = /^\d{14}_[a-z0-9][a-z0-9_-]*\.sql$/;

for (const migration of migrations) {
  if (!migrationName.test(migration)) {
    throw new Error(`Invalid Supabase migration filename: ${migration}`);
  }
}

console.log(
  migrations.length === 0
    ? 'No migrations yet; this is expected during Phase 1.'
    : `Validated ${migrations.length} migration filename(s).`,
);
