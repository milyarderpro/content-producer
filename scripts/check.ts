import { run } from './run.js';

for (const command of [['format:check'], ['lint'], ['typecheck'], ['test']] as const) {
  run('pnpm', ['run', ...command]);
}
