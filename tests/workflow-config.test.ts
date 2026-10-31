import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const readWorkflow = (name: string) => readFileSync(join('.github/workflows', name), 'utf8');
const ci = readWorkflow('ci.yml');
const gate = readWorkflow('backend-technical-gate.yml');
const probe = readWorkflow('hosted-oauth-probe.yml');
const candidate = readWorkflow('backend-gate-candidate.yml');
const temporary: string[] = [];
afterEach(() => {
  for (const directory of temporary.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const identityStart = ci.indexOf('      - name: Read package artifact identity');
const identityEnd = ci.indexOf(
  '      - name: Archive and verify package entries and hashes',
  identityStart,
);
if (identityStart < 0 || identityEnd < identityStart)
  throw new Error('Tahap identitas paket tidak ditemukan.');
const identityBlock = ci.slice(identityStart, identityEnd);
const marker = '        run: |\n';
const runStart = identityBlock.indexOf(marker);
if (runStart < 0) throw new Error('Shell identitas paket tidak ditemukan.');
const identity = identityBlock
  .slice(runStart + marker.length)
  .split('\n')
  .map((line) => line.replace(/^ {10}/, ''))
  .join('\n');

describe('Workflow aktif menjaga batas CI dan gate backend', () => {
  it('menyisakan satu CI ringan dan tiga workflow manual yang terpisah', () => {
    expect(readdirSync('.github/workflows').sort()).toEqual([
      'backend-gate-candidate.yml',
      'backend-technical-gate.yml',
      'ci.yml',
      'hosted-oauth-probe.yml',
    ]);
    expect(ci).toMatch(/^ {2}push:/m);
    expect(ci).toMatch(/^ {2}pull_request:/m);
    for (const source of [gate, probe, candidate]) {
      expect(source).toMatch(/^ {2}workflow_dispatch:/m);
      expect(source).not.toMatch(/^ {2}(push|pull_request|schedule|workflow_run):/m);
      expect(source).toContain("if: github.ref == 'refs/heads/main'");
    }
    for (const source of [ci, gate, probe, candidate]) {
      expect(source).toContain('contents: read');
      expect(source).not.toMatch(/(?:contents|actions|id-token|deployments): write/);
    }
  });

  it('candidate manual mengunci SHA dan agregasi bukti dua shard', () => {
    expect(candidate).toContain('name: Backend G4 release gate - exact SHA (manual)');
    expect(candidate).toContain('name: G4 release evidence aggregate (manual exact SHA)');
    expect(candidate).toMatch(/^on:\n {2}workflow_dispatch:/m);
    expect(candidate).not.toMatch(/^ {2}(push|pull_request|schedule|workflow_run):/m);
    expect(candidate).toMatch(/^permissions:\n {2}contents: read\n/m);
    expect(candidate).not.toMatch(/(?:contents|actions|id-token|deployments): write/);
    expect(candidate).toContain('candidate_sha:');
    expect(candidate).toContain('required: true');
    for (const job of ['source', 'database']) {
      const section = candidate.split(`  ${job}:\n`)[1]?.split('\n  aggregate:')[0];
      expect(section).toBeDefined();
      expect(section).toContain("if: github.ref == 'refs/heads/main'");
      expect(section).toContain('ref: ${{ github.sha }}');
      expect(section).toContain('test "$GITHUB_SHA" = "$CANDIDATE_SHA"');
      expect(section).toContain('test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"');
      expect(section).toContain('[[ "$CANDIDATE_SHA" =~ ^[0-9a-f]{40}$ ]]');
    }
    expect(candidate).toContain(
      'git show HEAD:supabase/config.toml | cmp -s - supabase/config.toml',
    );
    expect(candidate).toContain("shard: ['1', '2']");
    expect(candidate).toContain('fail-fast: false');
    const databaseJob = candidate.split('  database:\n')[1]?.split('\n  aggregate:')[0];
    expect(databaseJob).toContain('fetch-depth: 2');
    expect(databaseJob).toContain('ref: ${{ github.sha }}');
    expect(candidate).toContain('scripts/gate-backend.ts --aggregate');
    expect(candidate).toContain('GATE_DB_SHARD: ${{ matrix.shard }}');
    expect(candidate).toContain('needs: [source, database]');
    expect(candidate).toContain('if: always()');
    expect(candidate).toContain('test "$SOURCE_JOB" = success');
    expect(candidate).toContain('test "$DATABASE_JOB" = success');
    expect(candidate).toContain('scripts/gate-backend.ts --aggregate');
    expect(candidate).toContain('candidate-db-shard-1-');
    expect(candidate).toContain('candidate-db-shard-2-');
    expect(candidate).not.toContain('continue-on-error: true');
  });

  it('full gate mengunci main SHA dan menjaga urutan CR-044 tanpa DB suite duplikat', () => {
    for (const statement of [
      'test "$GITHUB_EVENT_NAME" = workflow_dispatch',
      'test "$GITHUB_SHA" = "$CANDIDATE_SHA"',
      'test "$(git rev-parse HEAD)" = "$CANDIDATE_SHA"',
      'cancel-in-progress: false',
    ])
      expect(gate).toContain(statement);
    const ids = [...gate.matchAll(/^ {8}id: ([a-z_]+)$/gm)].map((match) => match[1]);
    expect(ids).toEqual([
      'install',
      'start',
      'reset',
      'oauth_owner',
      'audit_before',
      'inspector',
      'audit_after',
      'full',
      'history',
      'lint',
      'audit_final',
      'diff',
    ]);
    expect(gate.match(/pnpm run supabase:reset/g)).toHaveLength(1);
    expect(gate.match(/pnpm run test-all/g)).toHaveLength(1);
    expect(gate).not.toContain('pnpm run smoke-test');
    expect(gate.match(/pnpm exec tsx scripts\/phase-6-catalog-audit\.ts/g)).toHaveLength(3);
    expect(gate).toContain('pnpm run supabase:verify');
    expect(gate).toContain('pnpm exec supabase db lint --local --fail-on error');
    expect(gate).toContain('pnpm exec tsx scripts/phase-6-13.ts');
    expect(gate).toContain('if-no-files-found: error');
    expect(gate).not.toContain('continue-on-error: true');
    for (const snapshot of [
      'catalog-before-inspector.json',
      'catalog-after-inspector.json',
      'catalog-final.json',
    ]) {
      expect(gate).toContain(snapshot);
    }
  });

  it('CI ringan tidak memulai reset/full gate atau mengakses endpoint hosted', () => {
    expect(ci).not.toMatch(/pnpm run (?:supabase:start|supabase:reset|test-all|test:database)/);
    expect(ci).not.toContain('functions deploy');
    expect(ci).not.toContain('curl ');
    expect(ci).toContain('mcp-probe/handler_test.ts');
    expect(ci).toContain("steps.changes.outputs.probe_changed == 'true'");
    expect(probe).not.toMatch(/"method"\s*:\s*"tools\/call"/);
  });

  it.each(['0.2.3', '0.2.4'])('nama ZIP/artefak mengikuti versi manifest %s', (version) => {
    const root = mkdtempSync(join(tmpdir(), 'package-identity-'));
    temporary.push(root);
    mkdirSync(join(root, 'plugin'));
    writeFileSync(join(root, 'plugin/plugin.json'), JSON.stringify({ version }));
    const output = join(root, 'output');
    execFileSync('bash', ['-c', identity], {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: output },
    });
    const values = Object.fromEntries(
      readFileSync(output, 'utf8')
        .trim()
        .split('\n')
        .map((line) => line.split('=')),
    );
    expect(values).toEqual({
      version,
      archive_name: `content-producer-private-v${version}.zip`,
      artifact_name: `content-producer-private-v${version}`,
    });
    expect(ci).toContain('name: ${{ steps.package_identity.outputs.artifact_name }}');
    expect(ci).toContain('artifacts/${{ steps.package_identity.outputs.archive_name }}');
    expect(ci).not.toMatch(/content-producer-private-v\d+\.\d+\.\d+/);
  });

  it('menolak versi manifest yang tidak sah sebelum membuat nama artefak', () => {
    const root = mkdtempSync(join(tmpdir(), 'package-identity-'));
    temporary.push(root);
    mkdirSync(join(root, 'plugin'));
    writeFileSync(join(root, 'plugin/plugin.json'), JSON.stringify({ version: '../outside' }));
    const result = spawnSync('bash', ['-c', identity], {
      cwd: root,
      env: { ...process.env, GITHUB_OUTPUT: join(root, 'output') },
      stdio: 'pipe',
    });
    expect(result.status).not.toBe(0);
  });
});
