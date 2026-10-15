import { readFileSync } from 'node:fs';
import { generatePortableMcpConfig } from './plugin-config.js';

// Usage (Phase 10, after endpoint and OAuth discovery are verified):
// pnpm exec tsx scripts/generate-mcp-config.ts < verified-connection.json > temporary-mcp.json
// Writes JSON to stdout only; never creates plugin/mcp.json in the source tree.
try {
  if (process.argv.length !== 2) {
    throw new Error('Read connection JSON from stdin; no command-line credentials or paths.');
  }
  const input = JSON.parse(readFileSync(0, 'utf8')) as unknown;
  process.stdout.write(JSON.stringify(generatePortableMcpConfig(input), null, 2) + '\n');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Invalid connection input.');
  process.exitCode = 1;
}
