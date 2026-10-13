import { run } from './run.js';

run('pnpm', ['run', 'check']);
run('pnpm', ['run', 'verify-migrations']);
run('pnpm', ['run', 'test:mcp']);
run('pnpm', ['run', 'test:database']);
