import { activeMcpToolNames, mcpTestCaseCount } from '../scripts/mcp-catalog-inventory.js';
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
  cutoverEvidence: {
    apiNames: number;
    mcpCases: number;
    inspectorValid: number;
    inspectorInvalid: number;
    retiredV1NamesRejected: number;
    ownerDenialRequired: boolean;
    databaseFiles: number;
    databaseCases: number;
  };
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
    expect(manifest.cutoverEvidence).toEqual({
      apiNames: 33,
      mcpCases: 131,
      inspectorValid: 33,
      inspectorInvalid: 33,
      retiredV1NamesRejected: 5,
      ownerDenialRequired: true,
      databaseFiles: 33,
      databaseCases: 238,
    });
    expect(Object.keys(manifest.suites).sort()).toEqual(['database', 'mcp', 'source']);
    assertMandatory(manifest.suites.source, 'tests/');
    assertMandatory(manifest.suites.mcp, 'supabase/functions/mcp/');
    assertMandatory(manifest.suites.database, 'supabase/tests/database/');
    expect(manifest.suites.mcp.files).toHaveLength(18);
    expect(manifest.suites.database.files).toHaveLength(33);
  });

  it('matches all source files discovered by the root Vitest include', () => {
    expect(read('vitest.config.ts')).toContain("include: ['tests/**/*.test.ts']");
    const discovered = walk('tests')
      .filter((path) => path.endsWith('.test.ts'))
      .sort();
    const paths = manifest.suites.source.files.map((file) => file.path);
    expect(paths.sort()).toEqual(discovered);
  });

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
    const discovered = walk('supabase/functions/mcp')
      .filter((path) => path.endsWith('_test.ts'))
      .sort();
    const manifestPaths = manifest.suites.mcp.files.map((file) => file.path);
    expect(invoked.sort()).toEqual(discovered);
    expect(manifestPaths.sort()).toEqual(discovered);
  });
});

it('derives the closed CR-062 census and MCP case target from registered source', () => {
  const names = activeMcpToolNames();
  expect(names).toHaveLength(33);
  expect(new Set(names).size).toBe(33);
  expect(names).toContain('get_trivia_editorial_catalog');
  expect(names).toContain('update_trivia_editorial_catalog');
  for (const name of [
    'trivia_find_similar_facts',
    'trivia_register_and_reserve_facts',
    'trivia_release_facts',
    'save_post',
    'revise_post',
  ])
    expect(names).not.toContain(name);
  expect(manifest.cutoverEvidence.apiNames).toBe(names.length);
  expect(manifest.cutoverEvidence.mcpCases).toBe(
    mcpTestCaseCount(manifest.suites.mcp.files.map((f) => f.path)),
  );
});


describe('CR-062 task9 acceptance matrix inventory', () => {
  it('counts every data-driven case in addition to the 222 existing runtime cases', () => {
    const fixture = JSON.parse(read('supabase/tests/fixtures/editorial-profile-acceptance.json')) as {
      cases: Array<{ id: string; profile: string; facts: unknown[] }>
    };
    expect(fixture.cases).toHaveLength(16);
    expect(new Set(fixture.cases.map(c => c.id)).size).toBe(16);
    expect([...new Set(fixture.cases.map(c => c.profile))].sort())
      .toEqual(['curious_mind', 'custom', 'daily_facts', 'dyk']);
    expect(manifest.cutoverEvidence.databaseCases).toBe(222 + fixture.cases.length);
  });
});
