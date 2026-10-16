import { run } from './run.js';

for (const command of [
  ['format:check'],
  ['lint'],
  ['typecheck'],
  ['test'],
  ['frontend:typecheck'],
  ['frontend:build'],
  ['frontend:test'],
] as const) {
  run('pnpm', ['run', ...command]);
}
