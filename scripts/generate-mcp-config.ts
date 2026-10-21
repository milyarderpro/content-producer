import { readFileSync } from 'node:fs';
import { generatePortableMcpConfig } from './plugin-config.js';

// Usage: pnpm exec tsx scripts/generate-mcp-config.ts < verified-noauth-input.json
// Input requires authentication.mode = 'none' and no OAuth/credentials.
// Source plugin/mcp.json must match the known Phase 10.1 production endpoint.
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
