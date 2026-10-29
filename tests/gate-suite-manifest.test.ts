import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const read = (path: string) => readFileSync(join(root, path), 'utf8');

type Entry = { path: string; status: string };
type Suite = { status: string; entrypoint: string; files: Entry[] };
const manifest = JSON.parse(read('scripts/gate-suite-manifest.json')) as {
  schemaVersion: number;
  baseSha: string;
  suites: { source: Suite; mcp: Suite; database: Suite };
};

function walk(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(join(root, directory), { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(path));
    } else if (entry.isFile()) {
      files.push(path.split(sep).join('/'));
    }
  }
  return files;
}

function assertMandatory(suite: Suite, prefix: string): void {
  expect(suite.status).toBe('mandatory');
  const paths = suite.files.map((file) => file.path);
  expect(new Set(paths).size).toBe(paths.length);
  for (const file of suite.files) {
    expect(file.status).toBe('mandatory');
    expect(file.path.startsWith(prefix)).toBe(true);
    expect(file.path).not.toMatch(/\\|(^|\/)\.\.?($|\/)/);
    const absolute = resolve(root, file.path);
    expect(relative(root, absolute).startsWith('..')).toBe(false);
    expect(existsSync(absolute)).toBe(true);
  }
}

describe('mandatory suite inventory (not a release gate)', () => {
  it('has distinct mandatory source, MCP, and database groups', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.baseSha).toMatch(/^[0-9a-f]{40}$/);
    expect(Object.keys(manifest.suites).sort()).toEqual(['database', 'mcp', 'source']);
    assertMandatory(manifest.suites.source, 'tests/');
    assertMandatory(manifest.suites.mcp, 'supabase/functions/mcp/');
    assertMandatory(manifest.suites.database, 'supabase/tests/database/');
    expect(manifest.suites.mcp.files).toHaveLength(15);
    expect(manifest.suites.database.files).toHaveLength(41);
  });

  it('matches all source files discovered by the root Vitest include', () => {
    expect(read('vitest.config.ts')).toContain("include: ['tests/**/*.test.ts']");
    const discovered = walk('tests').filter((path) => path.endsWith('.test.ts')).sort();
    const paths = manifest.suites.source.files.map((file) => file.path);
    expect(paths.sort()).toEqual(discovered);
  });

  // prettier-ignore
  it('matches the database Vitest include, including new and removed files', () => {
    expect(read('vitest.database.config.ts')).toContain(
      "include: ['supabase/tests/database/**/*.test.ts']",
    );
    const discovered = walk('supabase/tests/database')
      .filter((path) => path.endsWith('.test.ts'))
      .sort();
    const paths = manifest.suites.database.files.map((file) => file.path);
    expect(paths.sort()).toEqual(discovered);
  });

  // prettier-ignore
  it('matches the exact files executed by the test:mcp Deno command', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const command = pkg.scripts['test:mcp'];
    expect(command).toBeDefined();
    const parts = command.split(/\s*&&\s*/);
    const testCommand = parts.find((part) => /\bdeno test\b/.test(part));
    expect(testCommand).toBeDefined();
    const tokens = testCommand!.trim().split(/\s+/);
    const deno = tokens.indexOf('deno');
    expect(tokens[deno + 1]).toBe('test');
    const paths = tokens.slice(deno + 2).filter((token) => token.endsWith('.ts'));
    expect(paths.every((path) => path.endsWith('_test.ts'))).toBe(true);
    const invoked = paths.map((path) => 'supabase/functions/' + path);
    expect(new Set(invoked).size).toBe(invoked.length);
    const manifestPaths = manifest.suites.mcp.files.map((file) => file.path);
    expect(manifestPaths.sort()).toEqual(invoked.sort());
  });
});
