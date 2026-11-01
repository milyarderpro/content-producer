import { run } from './run.js';

for (const command of [
  ['lint'],
  ['typecheck'],
  ['test'],
  ['frontend:typecheck'],
  ['frontend:build'],
  ['frontend:test'],
] as const) {
  run('pnpm', ['run', ...command]);
}
