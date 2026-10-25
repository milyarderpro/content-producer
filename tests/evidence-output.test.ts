import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeCr016Evidence } from '../scripts/evidence-output.js';

const directories: string[] = [];
const fixture = () => {
  const directory = mkdtempSync(join(tmpdir(), 'cr016-evidence-'));
  directories.push(directory);
  return directory;
};
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

describe('CR-016 output evidence terpisah dari input historis', () => {
  it.each(['search', 'gold-development', 'gold-holdout'] as const)(
    'menulis %s A/B hanya ke artifacts dengan payload tetap',
    async (kind) => {
      const root = fixture();
      for (const label of ['A', 'B']) {
        const value = { label, counts: { total: 105, passed: 105 } };
        await writeCr016Evidence(kind, value, label, root);
        const file = join(root, 'artifacts', 'cr016', `${kind}-${label}.json`);
        expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual(value);
        expect(existsSync(join(root, 'docs'))).toBe(false);
      }
    },
  );

  it.each(['', 'C', '../A'])('tidak menulis output tanpa label A/B: %s', async (label) => {
    const root = fixture();
    await writeCr016Evidence('search', { sample: 1 }, label, root);
    expect(existsSync(join(root, 'artifacts'))).toBe(false);
    expect(existsSync(join(root, 'docs'))).toBe(false);
  });
});
