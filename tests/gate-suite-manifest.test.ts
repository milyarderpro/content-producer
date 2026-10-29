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
  return readdirSync(join(root, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : entry.isFile() ? [path.split(sep).join('/')] : [];
  });
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
  });

  it('matches all source files discovered by the root Vitest include', () => {
    expect(read('vitest.config.ts')).toContain("include: ['tests/**/*.test.ts']");
    const discovered = walk('tests').filter((path) => path.endsWith('.test.ts')).sort();
    expect(manifest.suites.source.files.map((file) => file.path).sort()).toEqual(discovered);
  });

  it('matches the database Vitest include, including new and removed files', () => {
    expect(read('vitest.database.config.ts')).toContain(
      "include: ['supabase/tests/database/**/*.test.ts']",
    );
    const discovered = walk('supabase/tests/database')
      .filter((path) => path.endsWith('.test.ts'))
      .sort();
    expect(manifest.suites.database.files.map((file) => file.path).sort()).toEqual(discovered);
  });

  it('matches only actual deno test entries in the test:mcp command', () => {
    const pkg = JSON.parse(read('package.json')) as { scripts: Record<string, string> };
    const command = pkg.scripts['test:mcp'];
    expect(command).toBeDefined();
    const testCommand = command.split(/\s*&&\s*/).find((part) => /\bdeno test\b/.test(part));
    expect(testCommand).toBeDefined();
    const tokens = testCommand!.trim().split(/\s+/);
    const deno = tokens.indexOf('deno');
    expect(tokens[deno + 1]).toBe('test');
    const invoked = tokens
      .slice(deno + 2)
      .filter((token) => token.endsWith('_test.ts'))
      .map((path) => 'supabase/functions/' + path);
    expect(new Set(invoked).size).toBe(invoked.length);
    expect(manifest.suites.mcp.files.map((file) => file.path).sort()).toEqual(invoked.sort());
  });
});
