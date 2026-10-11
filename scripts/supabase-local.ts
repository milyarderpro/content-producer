import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

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

if (action === 'reset') {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];

  if (!projectId || !/^[a-zA-Z0-9_-]+$/.test(projectId)) {
    throw new Error('Expected a safe project_id in supabase/config.toml.');
  }

  const realtimeContainer = `supabase_realtime_${projectId}`;
  const running = spawnSync(
    'docker',
    ['ps', '--filter', `name=^/${realtimeContainer}$`, '--format', '{{.Names}}'],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] },
  );

  if (running.error) throw running.error;
  if (running.status !== 0) {
    throw new Error('Could not inspect the local Realtime container before reset.');
  }

  if (running.stdout.trim() === realtimeContainer) {
    // Avoid racing the CLI's temporary Realtime migration job during db reset.
    const stopped = spawnSync('docker', ['stop', realtimeContainer], { stdio: 'inherit' });
    if (stopped.error) throw stopped.error;
    if (stopped.status !== 0) {
      throw new Error('Could not stop the local Realtime container before reset.');
    }
  }
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
