import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { assertRuntimeSpecs } from '../scripts/runtime-range.js';

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

  it('honors owner Node/Deno ranges and rejects unsafe drift', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      engines?: { node?: string };
    };
    const specs = {
      nodeSelector: readFileSync(join(root, '.nvmrc'), 'utf8').trim(),
      nodeEngine: packageJson.engines?.node ?? '',
      denoSelector: readFileSync(join(root, '.deno-version'), 'utf8').trim(),
    };
    expect(() => assertRuntimeSpecs(specs)).not.toThrow();
    for (const drift of [
      { ...specs, nodeSelector: '>=24' },
      { ...specs, nodeSelector: '>=22 <24.100' },
      { ...specs, denoSelector: '>=2.9.7 <2.11' },
      { ...specs, nodeEngine: '>=22' },
      { ...specs, nodeEngine: '>=22 <26' },
      { ...specs, denoSelector: '>=2.0.0' },
      { ...specs, denoSelector: '>=3.0.0' },
      { ...specs, nodeSelector: '>=22 || <25' },
      { ...specs, denoSelector: '^2.9.7' },
    ]) expect(() => assertRuntimeSpecs(drift)).toThrow();
  });
});
