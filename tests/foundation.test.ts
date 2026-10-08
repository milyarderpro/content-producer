import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

describe('Phase 1 repository foundation', () => {
  it('keeps the declared top-level boundaries', () => {
    for (const path of [
      'plugin',
      'auth-frontend',
      'supabase',
      'tests',
      'scripts',
      'docs',
      'artifacts',
    ]) {
      expect(existsSync(join(root, path))).toBe(true);
    }
  });

  it('keeps Edge Function TypeScript configuration separate from Node tooling', () => {
    expect(existsSync(join(root, 'supabase/functions/deno.json'))).toBe(true);
    expect(existsSync(join(root, 'tsconfig.json'))).toBe(true);
  });

  it('pins Node 24.15.0 as the only local and CI runtime baseline', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      engines?: { node?: string };
    };

    expect(readFileSync(join(root, '.nvmrc'), 'utf8').trim()).toBe('24.15.0');
    expect(packageJson.engines?.node).toBe('>=24.15.0 <25');
  });
});
