import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { run } from './run.js';

const requiredPaths = [
  'README.md',
  'AGENTS.md',
  '.env.example',
  '.gitignore',
  '.editorconfig',
  'plugin',
  'auth-frontend',
  'supabase',
  'supabase/functions/deno.json',
  'tests',
  'scripts',
];

for (const path of requiredPaths) {
  if (!existsSync(join(process.cwd(), path))) {
    throw new Error(`Missing required Phase 1 path: ${path}`);
  }
}

run('pnpm', ['run', 'verify-migrations']);
run('pnpm', ['run', 'test:database']);
console.log('Repository smoke test passed.');
