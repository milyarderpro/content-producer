import { vi } from 'vitest';

vi.mock('node:child_process', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:child_process')>();

  return {
    ...original,
    spawnSync(command: string, args: string[], options?: Parameters<typeof original.spawnSync>[2]) {
      const isLocalDatabaseQuery =
        command === 'pnpm' &&
        args[0] === 'exec' &&
        args[1] === 'supabase' &&
        args[2] === 'db' &&
        args[3] === 'query' &&
        args.includes('--local');
      const commandArgs = isLocalDatabaseQuery
        ? [...args.slice(0, -1), '--output-format', 'json', args.at(-1)!]
        : args;
      const result = original.spawnSync(command, commandArgs, options);

      if (!isLocalDatabaseQuery || result.status !== 0 || typeof result.stdout !== 'string') {
        return result;
      }

      const jsonStart = result.stdout.indexOf('[');
      if (jsonStart === -1) return result;

      try {
        return {
          ...result,
          stdout: JSON.stringify({ rows: JSON.parse(result.stdout.slice(jsonStart)) }),
        };
      } catch {
        return result;
      }
    },
  };
});
