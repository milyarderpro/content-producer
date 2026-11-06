import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertRuntimeSpecs } from '../scripts/runtime-range.js';
import { CANDIDATE_FILES, createCandidate, saveCandidateIndex, verifyCandidate } from '../scripts/plugin-package.js';

const checkScript = readFileSync('scripts/check.ts', 'utf8');

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

const archiveStart = ci.indexOf('      - name: Archive and verify package entries and hashes');
const archiveEnd = ci.indexOf('      - name: Upload verified package', archiveStart);
if (archiveStart < 0 || archiveEnd < archiveStart) throw new Error('Tahap ZIP tidak ditemukan.');
const archiveBlock = ci.slice(archiveStart, archiveEnd);
const archiveRun = archiveBlock.indexOf(marker);
if (archiveRun < 0) throw new Error('Shell ZIP tidak ditemukan.');
const archiveScript = archiveBlock.slice(archiveRun + marker.length)
  .split('\n').map(line => line.replace(/^ {10}/, '')).join('\n');

// Execute the real workflow shell against isolated files; no Actions dispatch,
// hosted calls, commits or credentials. Only git rev-parse reads the real HEAD.
function packageZip(mutate?: (root: string) => void) {
  const root = mkdtempSync(join(tmpdir(), 'workflow-package-'));
  temporary.push(root);
  cpSync('plugin', join(root, 'plugin'), { recursive: true });
  mkdirSync(join(root, 'plans'));
  cpSync('plans/tool-inventory.md', join(root, 'plans/tool-inventory.md'));
  const index = createCandidate(root, join(root, 'artifacts/plugin-candidate'));
  saveCandidateIndex(join(root, 'artifacts/plugin-candidate-filelist.json'), index);
  mutate?.(root);
  const version = (JSON.parse(readFileSync(join(root, 'plugin/plugin.json'), 'utf8')) as { version: string }).version;
  const archiveName = 'content-producer-private-v' + version + '.zip';
  const result = spawnSync('bash', ['-c', archiveScript], {
    cwd: root,
    env: { ...process.env, ARCHIVE_NAME: archiveName, PLUGIN_VERSION: version,
      RUNNER_TEMP: root, GITHUB_STEP_SUMMARY: join(root, 'summary'),
      GIT_DIR: join(process.cwd(), '.git'), GIT_WORK_TREE: root },
    encoding: 'utf8',
  });
  return { root, index, result, archive: join(root, 'artifacts', archiveName) };
}

describe('Workflow aktif menjaga batas CI dan gate backend', () => {
  it('semua setup Node/Deno memakai irisan bounded file/engine/gate yang direview', () => {
    const declared = {
      nodeSelector: readFileSync('.nvmrc', 'utf8').trim(),
      nodeEngine: (JSON.parse(readFileSync('package.json', 'utf8')) as {
        engines: { node: string };
      }).engines.node,
      denoSelector: readFileSync('.deno-version', 'utf8').trim(),
    };
    expect(declared).toEqual({
      nodeSelector: '>=22', nodeEngine: '>=22 <25', denoSelector: '>=2.9.7',
    });
    expect(() => assertRuntimeSpecs(declared)).not.toThrow();

    const assertSelectors = (source: string, requiredNode: number, requiredDeno: number, sharedRuntime = false) => {
      const lines = source.split('\n');
      const found = { node: 0, deno: 0 };
      let job = '';
      for (let i = 0; i < lines.length; i++) {
        const jobMatch = /^ {2}([a-z]+):$/.exec(lines[i]!);
        if (jobMatch) job = jobMatch[1]!;
        const action = /^ {6}- uses: (actions\/setup-node@v4|denoland\/setup-deno@v2)$/.exec(lines[i]!);
        if (!action) continue;
        const block: string[] = [];
        for (let j = i + 1; j < lines.length && !/^ {6}- /.test(lines[j]!); j++) {
          block.push(lines[j]!);
        }
        const selectors = block.filter(line =>
          /^ {10}(?:node-version|node-version-file|deno-version|deno-version-file):/.test(line));
        const isNode = action[1] === 'actions/setup-node@v4';
        expect(block).toContain('        with:');
        const expected = sharedRuntime && job !== 'runtime'
          ? (isNode ? '          node-version: ${{ needs.runtime.outputs.node }}'
            : '          deno-version: ${{ needs.runtime.outputs.deno }}')
          : (isNode ? "          node-version: '>=22 <25'" : "          deno-version: '>=2.9.7 <3'");
        expect(selectors).toEqual([expected]);
        found[isNode ? 'node' : 'deno']++;
      }
      expect(found).toEqual({ node: requiredNode, deno: requiredDeno });
    };
    const workflows = [
      { value: ci, node: 1, deno: 1 },
      { value: candidate, node: 4, deno: 3 },
      { value: gate, node: 1, deno: 1 },
    ];
    for (const workflow of workflows) {
      assertSelectors(workflow.value, workflow.node, workflow.deno, workflow.value === candidate);
      for (const mutated of [
        workflow.value.replace("node-version: '>=22 <25'", "node-version: '>=22'"),
        workflow.value.replace("node-version: '>=22 <25'", 'node-version-file: .nvmrc'),
        workflow.value.replace("deno-version: '>=2.9.7 <3'", "deno-version: '>=2.9.7'"),
        workflow.value.replace("deno-version: '>=2.9.7 <3'", 'deno-version-file: .deno-version'),
      ]) expect(() => assertSelectors(mutated, workflow.node, workflow.deno, workflow.value === candidate)).toThrow();
    }
  });

  it('G4 resolves one validated toolchain and wires exact outputs to every consumer', () => {
    const validate = (source: string) => {
      const job = (name: string) => {
        const body = source.split(`  ${name}:\n`)[1]?.split(/\n {2}[a-z]+:\n/)[0];
        expect(body).toBeDefined();
        return body!;
      };
      const resolver = job('runtime');
      expect(resolver).toContain('node: ${{ steps.versions.outputs.node }}');
      expect(resolver).toContain('deno: ${{ steps.versions.outputs.deno }}');
      expect(resolver).toContain("node-version: '>=22 <25'");
      expect(resolver).toContain("deno-version: '>=2.9.7 <3'");
      expect(resolver).toContain('check-latest: true');
      expect(resolver).toContain('id: versions');
      expect(resolver).toContain('pnpm exec tsx scripts/gate-runtime.ts');
      expect(resolver).toContain('test "$GITHUB_SHA" = "$CANDIDATE_SHA"');
      for (const name of ['source', 'database', 'aggregate']) {
        const body = job(name);
        expect(body).toContain(name === 'aggregate'
          ? 'needs: [runtime, source, database]' : 'needs: runtime');
        expect(body).toContain('node-version: ${{ needs.runtime.outputs.node }}');
        if (name !== 'aggregate')
          expect(body).toContain('deno-version: ${{ needs.runtime.outputs.deno }}');
        expect(body).not.toMatch(/(?:node|deno)-version: ['"]?>=/);
      }
      expect(job('aggregate')).toContain('RUNTIME_JOB: ${{ needs.runtime.result }}');
      expect(job('aggregate')).toContain('test "$RUNTIME_JOB" = success');
    };
    validate(candidate);
    for (const mutated of [
      candidate.replace('    needs: runtime', ''),
      candidate.replace('needs: [runtime, source, database]', 'needs: [source, database]'),
      candidate.replace('node-version: ${{ needs.runtime.outputs.node }}', "node-version: '>=22 <25'"),
      candidate.replace('deno-version: ${{ needs.runtime.outputs.deno }}', "deno-version: '>=2.9.7 <3'"),
      candidate.replace('node: ${{ steps.versions.outputs.node }}', 'node: 24.22.0'),
      candidate.replace('pnpm exec tsx scripts/gate-runtime.ts', 'node --version'),
      candidate.replace('test "$RUNTIME_JOB" = success', 'true'),
    ]) expect(() => validate(mutated)).toThrow();
  });

  it('focused runtime checks are mandatory before the full source check when source is changed', () => {
    const focused = '      - name: Focused Node Deno runtime and workflow selector regressions';
    const full = '      - name: Project checks including frontend and root regressions';
    expect(ci.indexOf(focused)).toBeGreaterThan(ci.indexOf('      - name: Locked dependency installation'));
    expect(ci.indexOf(full)).toBeGreaterThan(ci.indexOf(focused));
    expect(ci).toContain(`${focused}\n        if: steps.changes.outputs.need_check == 'true'\n        run: pnpm exec vitest run tests/foundation.test.ts tests/gate-runner.test.ts tests/workflow-config.test.ts`);
  });

  it('Prettier opsional dan enam source check tetap wajib berurutan', () => {
    expect(ci).not.toMatch(/(?:ci-formatted-paths|prettier --check|Format changed files)/);
    expect(checkScript).not.toContain("['format:check']");
    expect(ci).toContain('git diff --check "$base" HEAD');
    expect(ci).toContain('pnpm install --frozen-lockfile');
    expect(ci).toContain('run: pnpm run check');
    const commands = [...checkScript.matchAll(/\['([^']+)'\]/g)].map((match) => match[1]);
    expect(commands).toEqual([
      'lint',
      'typecheck',
      'test',
      'frontend:typecheck',
      'frontend:build',
      'frontend:test',
    ]);
    expect(checkScript).toContain("run('pnpm', ['run', ...command])");
  });

  it.each(['lint', 'test'])('entrypoint check berhenti gagal saat %s gagal', (failed) => {
    const root = mkdtempSync(join(tmpdir(), 'check-fail-closed-'));
    temporary.push(root);
    const executable = join(root, 'pnpm');
    const calls = join(root, 'calls');
    writeFileSync(
      executable,
      '#!/bin/sh\nprintf "%s\\n" "$2" >> "$CHECK_CALLS"\nif [ "$2" = "$FAIL_SUBCHECK" ]; then exit 7; fi\n',
    );
    chmodSync(executable, 0o755);
    const result = spawnSync(join(process.cwd(), 'node_modules/.bin/tsx'), ['scripts/check.ts'], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PATH: `${root}:${process.env.PATH ?? ''}`,
        CHECK_CALLS: calls,
        FAIL_SUBCHECK: failed,
      },
      encoding: 'utf8',
    });
    expect(result.status).not.toBe(0);
    const invoked = readFileSync(calls, 'utf8').trim().split('\n');
    expect(invoked.at(-1)).toBe(failed);
    expect(invoked).not.toContain('frontend:test');
  });

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
    expect(candidate).toContain('needs: [runtime, source, database]');
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

  it.each(['0.2.3', '0.2.4', '0.5.0'])('nama ZIP/artefak mengikuti versi manifest %s', (version) => {
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

  it('ZIP nyata memuat 15 file, dua referensi baru dan hash yang identik, tanpa corpus QA', () => {
    const fixture = packageZip();
    expect(fixture.result.status, fixture.result.stderr).toBe(0);
    expect(ci).toContain('test "$(find artifacts/plugin-candidate -type f | wc -l)" -eq 15');
    const entries = execFileSync('unzip', ['-Z1', fixture.archive], { encoding: 'utf8' }).trim().split('\n');
    expect(entries.sort()).toEqual(CANDIDATE_FILES);
    for (const name of ['reference-patterns.md', 'writing-playbook.md']) {
      expect(entries).toContain('skills/content-producer/references/niches/trivia/' + name);
    }
    expect(entries.some(path => /docs\/|dataset-reference\/|CHANGELOG|README/.test(path))).toBe(false);
    const extracted = join(fixture.root, 'extracted');
    execFileSync('unzip', ['-q', fixture.archive, '-d', extracted]);
    expect(verifyCandidate(fixture.root, extracted)).toEqual(fixture.index);
    expect(readFileSync(join(fixture.root, 'summary'), 'utf8')).toContain('15 file dan hash');
  });

  it.each(['missing-reference', 'tampered-reference', 'qa-leak'])(
    'shell ZIP menolak %s tanpa mengurangi pemeriksaan hash/filelist', (mode) => {
      const fixture = packageZip(root => {
        const candidate = join(root, 'artifacts/plugin-candidate');
        const atlas = join(candidate, 'skills/content-producer/references/niches/trivia/reference-patterns.md');
        if (mode === 'tampered-reference') writeFileSync(atlas, readFileSync(atlas, 'utf8') + '\nTamper.\n');
        else {
          rmSync(atlas);
          if (mode === 'qa-leak') {
            mkdirSync(join(candidate, 'docs'));
            // Keep the count at 15 so the exact filelist, not count alone, rejects it.
            writeFileSync(join(candidate, 'docs/evaluation.md'), 'Synthetic QA corpus.\n');
          }
        }
      });
      expect(fixture.result.status).not.toBe(0);
    },
  );
});
