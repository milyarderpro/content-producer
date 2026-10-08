import { spawnSync } from 'node:child_process';

const actions = {
  start: ['pnpm', ['exec', 'supabase', 'start']],
  stop: ['pnpm', ['exec', 'supabase', 'stop']],
  reset: ['pnpm', ['exec', 'supabase', 'db', 'reset', '--local']],
  seed: ['pnpm', ['exec', 'supabase', 'db', 'query', '--local', '--file', 'supabase/seed.sql']],
  'verify-migrations': ['pnpm', ['exec', 'supabase', 'migration', 'list', '--local']],
  'test-database': ['pnpm', ['exec', 'vitest', 'run', '--config', 'vitest.database.config.ts']],
} as const;

type Action = keyof typeof actions;

const action = process.argv[2];

if (!(action in actions)) {
  throw new Error(`Expected one of: ${Object.keys(actions).join(', ')}.`);
}

const [command, args] = actions[action as Action];
const result = spawnSync(command, args, {
  env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  shell: process.platform === 'win32',
  stdio: 'inherit',
});

if (result.error) {
  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`Local Supabase ${action} exited with code ${result.status ?? 'unknown'}.`);
}
