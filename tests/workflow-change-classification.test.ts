import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const start = workflow.indexOf('      - name: Record SHA and classify changes');
const end = workflow.indexOf('      - name: Locked dependency installation', start);
if (start < 0 || end < start) throw new Error('Blok klasifikasi workflow tidak ditemukan.');
const block = workflow.slice(start, end);
const run = block.indexOf('        run: |\n');
if (run < 0) throw new Error('Shell klasifikasi workflow tidak ditemukan.');
const script = block
  .slice(run + '        run: |\n'.length)
  .split('\n')
  .map((line) => line.replace(/^ {10}/, ''))
  .join('\n');

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function classify(before: Record<string, string>, after: Record<string, string>, event = 'push') {
  const root = mkdtempSync(join(tmpdir(), 'workflow-changes-'));
  directories.push(root);
  const repository = join(root, 'repository');
  const temporary = join(root, 'runner');
  mkdirSync(repository);
  mkdirSync(temporary);
  const git = (...args: string[]) =>
    execFileSync('git', args, {
      cwd: repository,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init');
  const write = (files: Record<string, string>) => {
    for (const [path, content] of Object.entries(files)) {
      const file = join(repository, path);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    git('add', '--all');
    return git('write-tree');
  };
  const base = write(before);
  for (const path of Object.keys(before)) rmSync(join(repository, path));
  const candidate = write(after);
  // Gunakan tree Git asli tanpa membuat commit atau mengubah konfigurasi Git.
  const treeHead = `git() {
    local args=()
    local arg
    for arg in "$@"; do
      if [[ "$arg" == HEAD ]]; then arg="$AFTER_TREE"; fi
      args+=("$arg")
    done
    command git "\${args[@]}"
  }
`;
  const output = join(temporary, 'outputs');
  execFileSync('bash', ['-c', treeHead + script], {
    cwd: repository,
    env: {
      ...process.env,
      EVENT_NAME: event,
      EVENT_BEFORE: base,
      PR_BASE_SHA: base,
      AFTER_TREE: candidate,
      RUNNER_TEMP: temporary,
      GITHUB_OUTPUT: output,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const paths = join(temporary, 'ci-formatted-paths');
  return {
    checks: Object.fromEntries(
      readFileSync(output, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split('=')),
    ),
    format: existsSync(paths) ? readFileSync(paths, 'utf8').split('\0').filter(Boolean) : [],
  };
}

describe('Light CI memilih pemeriksaan dari kedua sisi perubahan', () => {
  it('mengaktifkan project check untuk deletion TypeScript tanpa memformat file yang hilang', () => {
    const result = classify({ 'scripts/old.ts': 'export const value = 1;\n' }, {});
    expect(result.checks.need_check).toBe('true');
    expect(result.format).toEqual([]);
  });

  it('tetap memilih check TypeScript saat isi identik dipindah ke Markdown', () => {
    const content = 'export const value = 1;\n';
    const result = classify({ 'scripts/old.ts': content }, { 'docs/reference.md': content });
    expect(result.checks.need_check).toBe('true');
    expect(result.format).toEqual(['docs/reference.md']);
  });

  it('mengaktifkan MCP check dari file handler yang dihapus', () => {
    const result = classify({ 'supabase/functions/mcp/old.ts': 'export const value = 1;\n' }, {});
    expect(result.checks.mcp_changed).toBe('true');
    expect(result.format).toEqual([]);
  });

  it('tetap memilih package check ketika file plugin dipindah keluar paket', () => {
    const result = classify({ 'plugin/old.md': 'Fixture\n' }, { 'docs/reference.md': 'Fixture\n' });
    expect(result.checks.package_changed).toBe('true');
    expect(result.format).toEqual(['docs/reference.md']);
  });

  it('mempertahankan path dengan spasi sebagai satu argumen formatter', () => {
    const result = classify({}, { 'tests/with spaces.test.ts': 'export const value = 1;\n' });
    expect(result.checks.need_check).toBe('true');
    expect(result.format).toEqual(['tests/with spaces.test.ts']);
  });

  it.each(['plans/tool-inventory.md', 'plans/trivia-content-dna.md'])(
    'memilih project/package checks untuk kontrak %s',
    (path) => {
      const result = classify({}, { [path]: 'Fixture\n' });
      expect(result.checks.need_check).toBe('true');
      expect(result.checks.package_changed).toBe('true');
    },
  );

  it.each(['supabase/functions/deno.lock', 'supabase/config.toml', '.deno-version'])(
    'memilih MCP/probe dan review backend untuk dependency %s',
    (path) => {
      const result = classify({}, { [path]: 'Fixture\n' });
      expect(result.checks.need_check).toBe('true');
      expect(result.checks.mcp_changed).toBe('true');
      expect(result.checks.probe_changed).toBe('true');
      expect(result.checks.backend_review).toBe('true');
    },
  );

  it('memilih root checks untuk fixture yang dipindah keluar lokasi lama', () => {
    const result = classify(
      { 'supabase/tests/fixtures/old.json': '{}\n' },
      { 'archive/fixture.json': '{}\n' },
    );
    expect(result.checks.need_check).toBe('true');
  });

  it('menggunakan base SHA event pull_request', () => {
    const result = classify({ 'scripts/old.ts': 'Fixture\n' }, {}, 'pull_request');
    expect(result.checks.need_check).toBe('true');
  });

  it('manual dispatch memilih semua pemeriksaan ringan meski diff kosong', () => {
    const result = classify({}, {}, 'workflow_dispatch');
    for (const key of ['need_check', 'mcp_changed', 'probe_changed', 'package_changed']) {
      expect(result.checks[key]).toBe('true');
    }
    expect(result.checks.backend_review).toBe('true');
  });

  it('tetap menjalankan frontend regressions saat konfigurasi hosting diubah', () => {
    const result = classify({}, { 'auth-frontend/vercel.json': '{}\n' });
    expect(result.checks.need_check).toBe('true');
  });
});
