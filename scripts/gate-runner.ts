import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type Mode = 'source' | 'backend' | 'full';
type ShardId = '1' | '2';
type Status = 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT RUN';
type Stage = { name: string; status: Status; durationMs: number; count?: string; reason?: string };
type Suite = { status: string; entrypoint: string; files: { path: string; status: string }[] };
type Manifest = { schemaVersion: number; suites: Record<'source' | 'mcp' | 'database', Suite> };
type Identity = {
  sha: string;
  manifestHash: string;
  lockHash: string;
  inputsHash: string;
  counts: Record<string, number>;
  shardHash: string;
};
export class GateError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: Status = 'BLOCKED',
  ) {
    super(code);
  }
}

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const hash = (data: string | Buffer) => createHash('sha256').update(data).digest('hex');
const read = (path: string) => readFileSync(join(root, path));
const fail = (code: string, status: Status = 'BLOCKED'): never => {
  throw new GateError(code, status);
};

// ANSI SGR sequences are presentation only; they must not alter evidence matching.
export function plainEvidence(output: string): string {
  return output.replace(new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g'), '');
}

export function command(
  command: string,
  args: string[],
  cwd = root,
): { output: string; durationMs: number } {
  const start = performance.now();
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    shell: process.platform === 'win32',
  });
  // Raw child output can contain JWTs, SQL, and private fixture values. Never echo it.
  if (result.error || result.status !== 0) fail('STAGE_COMMAND_FAILED', 'FAIL');
  return {
    output: plainEvidence(result.stdout ?? ''),
    durationMs: Math.round(performance.now() - start),
  };
}

function git(args: string[]): string {
  const result = spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  if (result.error || result.status !== 0) fail('GIT_IDENTITY_UNAVAILABLE');
  return result.stdout.trim();
}

function files(directory: string, suffix: string): string[] {
  const result: string[] = [];
  function walk(path: string): void {
    for (const entry of readdirSync(join(root, path), { withFileTypes: true })) {
      const child = join(path, entry.name);
      if (entry.isDirectory()) walk(child);
      else if (entry.isFile() && child.endsWith(suffix)) result.push(child.replaceAll('\\', '/'));
    }
  }
  walk(directory);
  return result.sort();
}

export function validateManifest(
  manifest: Manifest,
  packageScripts: Record<string, string>,
): Record<string, number> {
  if (
    manifest.schemaVersion !== 1 ||
    Object.keys(manifest.suites).sort().join(',') !== 'database,mcp,source'
  )
    fail('MANIFEST_SCHEMA_DRIFT');
  const expected: Record<'source' | 'mcp' | 'database', string[]> = {
    source: files('tests', '.test.ts'),
    mcp: files('supabase/functions/mcp', '_test.ts'),
    database: files('supabase/tests/database', '.test.ts'),
  };
  const entrypoints = {
    source: 'pnpm run check',
    mcp: 'pnpm run test:mcp',
    database: 'pnpm run test:database',
  };
  for (const name of ['source', 'mcp', 'database'] as const) {
    const suite = manifest.suites[name];
    const listed = suite?.files.map((file) => file.path).sort();
    if (
      suite?.status !== 'mandatory' ||
      suite.entrypoint !== entrypoints[name] ||
      suite.files.some(
        (file) => file.status !== 'mandatory' || !/^[a-z0-9/_-]+\.(?:test\.ts|ts)$/.test(file.path),
      ) ||
      !listed ||
      listed.join('\0') !== expected[name].join('\0')
    )
      fail('MANIFEST_FILE_DRIFT');
  }
  if (expected.mcp.length !== 15 || expected.database.length !== 41) fail('MANIFEST_COUNT_DRIFT');
  const mcpCommand =
    (packageScripts['test:mcp'] ?? '')
      .split(/\s*&&\s*/)
      .find((part) => /\bdeno test\b/.test(part)) ?? '';
  const invoked = mcpCommand
    .split(/\s+/)
    .filter((part) => part.startsWith('mcp/') && part.endsWith('_test.ts'))
    .map((part) => `supabase/functions/${part}`);
  const last = invoked.sort();
  if (
    invoked.length !== 15 ||
    new Set(invoked).size !== invoked.length ||
    last.join('\0') !== expected.mcp.join('\0') ||
    packageScripts['test:database'] !== 'tsx scripts/supabase-local.ts test-database'
  )
    fail('MANIFEST_ENTRYPOINT_DRIFT');
  return {
    source: expected.source.length,
    mcp: expected.mcp.length,
    database: expected.database.length,
  };
}

type ShardPartition = { schemaVersion: number; shards: Record<ShardId, string[]> };

export function validateShards(
  partition: ShardPartition,
  manifest: Manifest,
): Record<ShardId, string[]> {
  if (
    partition?.schemaVersion !== 1 ||
    Object.keys(partition.shards ?? {}).sort().join(',') !== '1,2'
  )
    fail('SHARD_SCHEMA_DRIFT');
  if (!Array.isArray(partition.shards['1']) || !Array.isArray(partition.shards['2']))
    fail('SHARD_SCHEMA_DRIFT');
  const expected = manifest.suites.database.files.map((file) => file.path).sort();
  const all = [...partition.shards['1'], ...partition.shards['2']];
  if (
    partition.shards['1'].length === 0 ||
    partition.shards['2'].length === 0 ||
    all.length !== 41 ||
    new Set(all).size !== 41 ||
    all.some(
      (path) =>
        typeof path !== 'string' ||
        !/^supabase\/tests\/database\/[a-z0-9/_-]+\.test\.ts$/.test(path),
    ) ||
    all.slice().sort().join('\0') !== expected.join('\0')
  )
    fail('SHARD_FILE_DRIFT');
  return partition.shards;
}

export type ShardProof = {
  shard: ShardId;
  sha: string;
  manifestSha256: string;
  lockSha256: string;
  inputsSha256: string;
  shardSha256: string;
  files: string[];
  cases: number;
  status: string;
  stages: Stage[];
};
export function validateShardProofs(
  proofs: ShardProof[],
  expectedSha: string,
  expectedHashes: {
    manifestSha256: string;
    lockSha256: string;
    inputsSha256: string;
    shardSha256: string;
  },
  partitions: Record<ShardId, string[]>,
): number {
  if (
    proofs.length !== 2 ||
    new Set(proofs.map((p) => p?.shard)).size !== 2 ||
    proofs.some(
      (p) =>
        p?.status !== 'PASS' ||
        p.sha !== expectedSha ||
        p.manifestSha256 !== expectedHashes.manifestSha256 ||
        p.lockSha256 !== expectedHashes.lockSha256 ||
        p.inputsSha256 !== expectedHashes.inputsSha256 ||
        p.shardSha256 !== expectedHashes.shardSha256 ||
        !['1', '2'].includes(p.shard) ||
        !Array.isArray(p.files) ||
        p.files.length !== partitions[p.shard]?.length ||
        p.files.join('\0') !== partitions[p.shard]?.join('\0') ||
        !Number.isSafeInteger(p.cases) ||
        p.cases <= 0 ||
        !Array.isArray(p.stages) ||
        p.stages.some((stage) => stage.status !== 'PASS'),
    )
  )
    fail('SHARD_EVIDENCE_MISMATCH', 'FAIL');
  const files = proofs.flatMap((p) => p.files);
  if (files.length !== 41 || new Set(files).size !== 41)
    fail('SHARD_EVIDENCE_MISMATCH', 'FAIL');
  return proofs.reduce((sum, p) => sum + p.cases, 0);
}

export function assertClean(status: string): void {
  if (status.trim()) fail('DIRTY_CHECKOUT');
}

export function assertSha(expected: string | undefined, actual: string): void {
  if (!/^[0-9a-f]{40}$/.test(expected ?? '') || expected !== actual) fail('SHA_MISMATCH');
}

export function assertNoSkipped(output: string): void {
  if (/\b[1-9]\d* (?:skipped|ignored|failed|cancelled)\b/i.test(plainEvidence(output)))
    fail('REQUIRED_CASE_SKIPPED', 'FAIL');
}

export function assertAdvisorsReport(output: string): void {
  let report: unknown;
  try {
    report = JSON.parse(output);
  } catch {
    fail('ADVISOR_REPORT_INVALID', 'FAIL');
  }
  if (
    !report ||
    typeof report !== 'object' ||
    Array.isArray(report) ||
    typeof (report as { message?: unknown }).message !== 'string' ||
    !Array.isArray((report as { results?: unknown }).results)
  )
    fail('ADVISOR_REPORT_INVALID', 'FAIL');
}

export function preflight(expectedSha = process.env.GATE_CANDIDATE_SHA): Identity {
  const sha = git(['rev-parse', 'HEAD']);
  assertSha(expectedSha, sha);
  assertClean(git(['status', '--porcelain=v1', '--untracked-files=all']));
  const pkg = JSON.parse(read('package.json').toString()) as {
    packageManager: string;
    devDependencies: Record<string, string>;
    scripts: Record<string, string>;
  };
  const manifestBytes = read('scripts/gate-suite-manifest.json');
  const manifest = JSON.parse(manifestBytes.toString()) as Manifest;
  const counts = validateManifest(manifest, pkg.scripts);
  const shardBytes = read('scripts/gate-db-shards.json');
  validateShards(JSON.parse(shardBytes.toString()) as ShardPartition, manifest);
  if (
    pkg.packageManager !== 'pnpm@10.33.2' ||
    pkg.devDependencies.supabase !== '2.120.0' ||
    !/supabase:\s*\n\s*specifier: 2\.120\.0\s*\n\s*version: 2\.120\.0/.test(
      read('pnpm-lock.yaml').toString(),
    )
  )
    fail('LOCK_PIN_DRIFT');
  const pinned = [read('.nvmrc').toString().trim(), read('.deno-version').toString().trim()];
  if (
    command('node', ['--version']).output.trim() !== `v${pinned[0]}` ||
    command('pnpm', ['--version']).output.trim() !== '10.33.2' ||
    !command('deno', ['--version']).output.startsWith(`deno ${pinned[1]} `) ||
    command('pnpm', ['exec', 'supabase', '--version']).output.trim() !== '2.120.0'
  )
    fail('TOOL_VERSION_MISMATCH');
  const inputPaths = [
    ...files('supabase/migrations', '.sql'),
    ...files('supabase/tests/fixtures', ''),
    ...files('supabase/tests/database/fixtures', ''),
    'supabase/config.toml',
    'supabase/functions/deno.lock',
    'pnpm-lock.yaml',
  ];
  const inputsHash = hash(inputPaths.map((path) => `${path}:${hash(read(path))}`).join('\n'));
  return {
    sha,
    manifestHash: hash(manifestBytes),
    lockHash: hash(read('pnpm-lock.yaml')),
    inputsHash,
    counts,
    shardHash: hash(shardBytes),
  };
}

export function sameIdentity(a: Identity, b: Identity): void {
  if (
    a.sha !== b.sha ||
    a.manifestHash !== b.manifestHash ||
    a.lockHash !== b.lockHash ||
    a.inputsHash !== b.inputsHash ||
    a.shardHash !== b.shardHash
  )
    fail('COMPONENT_IDENTITY_MISMATCH');
}

export function validateTarget(
  projectId: string,
  portBase: number,
  sourceProject: string,
  exactActions = false,
): void {
  if (exactActions) {
    assertActionsEnvironment();
    if (projectId !== sourceProject || portBase !== 54320) fail('ACTIONS_CONFIG_TARGET_MISMATCH');
  } else if (
    !/^issue-88-[a-z0-9-]+-disposable$/.test(projectId) ||
    projectId === sourceProject ||
    !Number.isInteger(portBase) ||
    portBase < 58000 ||
    portBase > 64000 ||
    portBase % 10 !== 0 ||
    portBase === 54320
  )
    fail('UNSAFE_DISPOSABLE_TARGET');
  for (const key of [
    'SUPABASE_ACCESS_TOKEN',
    'SUPABASE_DB_PASSWORD',
    'SUPABASE_PROJECT_ID',
    'DATABASE_URL',
  ]) {
    if (process.env[key]) fail('REMOTE_CREDENTIAL_PRESENT');
  }
  if (
    existsSync(join(root, 'supabase', '.temp', 'project-ref')) ||
    existsSync(join(root, '.supabase', 'project-ref'))
  )
    fail('LINKED_PROJECT_PRESENT');
}

export function assertActionsEnvironment(env: NodeJS.ProcessEnv = process.env): void {
  if (
    env.GITHUB_ACTIONS !== 'true' ||
    env.GITHUB_EVENT_NAME !== 'workflow_dispatch' ||
    env.GITHUB_REF !== 'refs/heads/main' ||
    !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA ?? '') ||
    env.GATE_CANDIDATE_SHA !== env.GITHUB_SHA ||
    !env.RUNNER_TEMP ||
    env.RUNNER_OS !== 'Linux' ||
    env.GATE_ACTIONS_EXACT_CONFIG !== '1'
  )
    fail('UNVERIFIED_ACTIONS_ENVIRONMENT');
}

export function assertConfigMode(
  mode: string | undefined,
  config: Buffer,
  committed: Buffer,
): void {
  if (mode !== 'ACTIONS_EXACT_CONFIG' || !config.equals(committed)) fail('EXACT_CONFIG_MISMATCH');
}

function sourceProjectId(): string {
  const match = read('supabase/config.toml')
    .toString()
    .match(/^project_id\s*=\s*"([^"]+)"/m);
  if (!match) fail('SOURCE_CONFIG_INVALID');
  return match![1]!;
}

export function assertNoExistingStackResources(
  projectId: string,
  listings: { containers: string; networks: string; volumes: string },
): void {
  const marker = `_${projectId}`;
  for (const listing of Object.values(listings)) {
    if (
      listing
        .split(/\r?\n/)
        .some(
          (name) =>
            name.startsWith('supabase_') && (name.endsWith(marker) || name.includes(`${marker}_`)),
        )
    )
      fail('DISPOSABLE_TARGET_OCCUPIED');
  }
}

function dockerVacant(projectId: string): void {
  command('docker', ['info', '--format', '{{.ServerVersion}}']);
  assertNoExistingStackResources(projectId, {
    containers: command('docker', ['container', 'ls', '--all', '--format', '{{.Names}}']).output,
    networks: command('docker', ['network', 'ls', '--format', '{{.Name}}']).output,
    volumes: command('docker', ['volume', 'ls', '--format', '{{.Name}}']).output,
  });
}

function assertStartedTarget(projectId: string, base: number): void {
  const names = [
    `supabase_db_${projectId}`,
    `supabase_rest_${projectId}`,
    `supabase_kong_${projectId}`,
  ];
  const result = spawnSync('docker', ['inspect', ...names], {
    encoding: 'utf8',
    maxBuffer: 2 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) fail('DISPOSABLE_TARGET_MISMATCH');
  let containers: Array<{
    Name: string;
    State: { Running: boolean };
    HostConfig: { NetworkMode: string };
    NetworkSettings: {
      Networks: Record<string, unknown>;
      Ports: Record<string, Array<{ HostPort: string }> | null>;
    };
    Mounts: Array<{ Name?: string }>;
  }>;
  try {
    containers = JSON.parse(result.stdout);
  } catch {
    fail('DISPOSABLE_TARGET_MISMATCH');
  }
  const network = `supabase_network_${projectId}`;
  if (
    containers!.length !== 3 ||
    containers!.some(
      (item, index) =>
        item.Name !== `/${names[index]}` ||
        !item.State.Running ||
        item.HostConfig.NetworkMode !== network ||
        !Object.hasOwn(item.NetworkSettings.Networks, network),
    )
  )
    fail('DISPOSABLE_TARGET_MISMATCH');
  if (
    !containers![0]!.Mounts.some((mount) => mount.Name === `supabase_db_${projectId}`) ||
    !containers![0]!.NetworkSettings.Ports['5432/tcp']?.some(
      (port) => port.HostPort === String(base + 2),
    ) ||
    !containers![2]!.NetworkSettings.Ports['8000/tcp']?.some(
      (port) => port.HostPort === String(base + 1),
    )
  )
    fail('DISPOSABLE_TARGET_MISMATCH');
}

async function portsVacant(base: number): Promise<void> {
  for (let port = base; port <= base + 9; port++) {
    await new Promise<void>((done, reject) => {
      const server = createServer();
      server.once('error', () => reject(new GateError('DISPOSABLE_PORT_OCCUPIED')));
      server.listen(port, '127.0.0.1', () => server.close(() => done()));
    });
  }
}

function stageCopy(projectId: string, base: number): { path: string; overlayHash: string } {
  const path = mkdtempSync(join(tmpdir(), 'issue-88-gate-'));
  cpSync(root, path, {
    recursive: true,
    filter: (source: string) => {
      const rel = relative(root, source);
      return !rel
        .split('/')
        .some((part) => ['.git', 'node_modules', 'artifacts', 'dist', '.temp'].includes(part));
    },
  });
  symlinkSync(join(root, 'node_modules'), join(path, 'node_modules'), 'dir');
  mkdirSync(join(path, 'artifacts'));
  const configPath = join(path, 'supabase', 'config.toml');
  let config = readFileSync(configPath, 'utf8').replace(
    /^project_id\s*=\s*"[^"]+"/m,
    `project_id = "${projectId}"`,
  );
  for (const [from, to] of [
    [54320, base],
    [54321, base + 1],
    [54322, base + 2],
    [54323, base + 3],
    [54324, base + 4],
    [54327, base + 7],
    [54329, base + 9],
  ]) {
    config = config.replaceAll(String(from), String(to));
  }
  writeFileSync(configPath, config);
  return { path, overlayHash: hash(config) };
}

export function countFromOutput(name: string, rawOutput: string): string | undefined {
  const output = plainEvidence(rawOutput);
  if (name === 'inspector')
    return /33\/33 valid and 33\/33 invalid tool calls.*PASS/.test(output)
      ? '33 valid; 33 invalid; owner denial'
      : undefined;
  if (name === 'database')
    return /Test Files\s+\d+ passed/.test(output) && /Tests\s+\d+ passed/.test(output)
      ? output.match(/Tests\s+(\d+) passed/)?.[1]
      : undefined;
  if (name === 'mcp')
    return /\d+ passed/.test(output) ? output.match(/(\d+) passed/)?.[1] : undefined;
  if (name === 'source')
    return /Test Files\s+(\d+) passed/.test(output)
      ? `root ${output.match(/Test Files\s+(\d+) passed/)?.[1]} files; root ${output.match(/Tests\s+(\d+) passed/)?.[1]} cases`
      : undefined;
  return undefined;
}

export function assertSourceTestEvidence(output: string, sourceFiles: number): void {
  const plain = plainEvidence(output);
  if (
    !new RegExp(`Test Files\s+${sourceFiles} passed`).test(plain) ||
    !/Tests\s+[1-9]\d* passed/.test(plain) ||
    /\b[1-9]\d* (?:skipped|ignored|failed|cancelled)\b/i.test(plain)
  )
    fail('SOURCE_TEST_EVIDENCE_MISSING', 'FAIL');
}

export function assertShardDatabaseEvidence(output: string, expectedFiles: number): number {
  const plain = plainEvidence(output);
  assertNoSkipped(plain);
  const match = plain.match(/Test Files\s+(\d+) passed[\s\S]*Tests\s+(\d+) passed/);
  if (!match || Number(match[1]) !== expectedFiles || Number(match[2]) <= 0)
    fail('SHARD_TEST_EVIDENCE_MISSING', 'FAIL');
  return Number(match[2]);
}

export function assertDatabaseTestEvidence(output: string): void {
  const plain = plainEvidence(output);
  assertNoSkipped(plain);
  if (!/Test Files\s+41 passed[\s\S]*Tests\s+[1-9]\d* passed/.test(plain))
    fail('REQUIRED_EVIDENCE_MISSING', 'FAIL');
}

export function stage(
  name: string,
  action: () => { output?: string; durationMs?: number },
  requiredEvidence?: RegExp,
): Stage {
  const start = performance.now();
  try {
    const result = action();
    if (requiredEvidence && !requiredEvidence.test(plainEvidence(result.output ?? '')))
      fail('REQUIRED_EVIDENCE_MISSING', 'FAIL');
    return {
      name,
      status: 'PASS',
      durationMs: Math.round(performance.now() - start),
      count: countFromOutput(name, result.output ?? ''),
    };
  } catch (error) {
    return {
      name,
      status: error instanceof GateError ? error.status : 'FAIL',
      reason: error instanceof GateError ? error.code : 'UNEXPECTED_ERROR',
      durationMs: Math.round(performance.now() - start),
    };
  }
}

function requirePass(stages: Stage[]): void {
  if (stages.some((item) => item.status !== 'PASS')) fail('REQUIRED_STAGE_FAILED', 'FAIL');
}

function sourceStages(sourceFiles: number, stages: Stage[]): void {
  const item = stage('source', () => {
    const run = command('pnpm', ['run', 'check']);
    for (const subcheck of [
      'format:check',
      'lint',
      'typecheck',
      'test',
      'frontend:typecheck',
      'frontend:build',
      'frontend:test',
    ]) {
      if (!run.output.includes(` ${subcheck} ${root}`)) fail('SOURCE_SUBCHECK_MISSING', 'FAIL');
    }
    assertSourceTestEvidence(run.output, sourceFiles);
    return run;
  });
  stages.push(item);
  requirePass([item]);
}

async function backendStages(
  identity: Identity,
  stages: Stage[],
  onOverlay: (hash: string) => void,
): Promise<void> {
  const shard = process.env.GATE_DB_SHARD as ShardId | undefined;
  if (shard && !['1', '2'].includes(shard)) fail('SHARD_INVALID');
  const manifest = JSON.parse(read('scripts/gate-suite-manifest.json').toString()) as Manifest;
  const partitions = validateShards(
    JSON.parse(read('scripts/gate-db-shards.json').toString()) as ShardPartition,
    manifest,
  );
  const exactActions = process.env.GATE_CONFIG_MODE === 'ACTIONS_EXACT_CONFIG';
  const projectId = exactActions
    ? sourceProjectId()
    : (process.env.GATE_DISPOSABLE_PROJECT_ID ?? '');
  const base = exactActions ? 54320 : Number(process.env.GATE_PORT_BASE ?? NaN);
  validateTarget(projectId, base, sourceProjectId(), exactActions);
  if (exactActions) {
    const committed = spawnSync('git', ['show', 'HEAD:supabase/config.toml'], { cwd: root });
    if (committed.status !== 0 || !committed.stdout) fail('EXACT_CONFIG_UNAVAILABLE');
    assertConfigMode('ACTIONS_EXACT_CONFIG', read('supabase/config.toml'), committed.stdout);
  }
  stages.push(
    stage('cli-help', () => {
      for (const args of [
        ['start', '--help'],
        ['stop', '--help'],
        ['db', 'reset', '--help'],
        ['migration', 'list', '--help'],
        ['db', 'lint', '--help'],
        ['db', 'advisors', '--help'],
      ])
        command('pnpm', ['exec', 'supabase', ...args]);
      return { output: 'CLI help checked' };
    }),
  );
  requirePass(stages.filter((item) => item.name === 'cli-help'));
  dockerVacant(projectId);
  await portsVacant(base);
  const stageRoot = exactActions ? { path: root, overlayHash: '' } : stageCopy(projectId, base);
  if (!exactActions) onOverlay(stageRoot.overlayHash);
  let started = false;
  const run = (name: string, cmd: string, args: string[], evidence?: RegExp) => {
    if (started && name !== 'start') assertStartedTarget(projectId, base);
    const item = stage(
      name,
      () => {
        const result = command(cmd, args, stageRoot.path);
        if (['mcp', 'database'].includes(name)) assertNoSkipped(result.output);
        if (name === 'database') {
          if (shard) assertShardDatabaseEvidence(result.output, partitions[shard].length);
          else assertDatabaseTestEvidence(result.output);
        }
        if (name === 'security-advisors') assertAdvisorsReport(result.output);
        return result;
      },
      evidence,
    );
    stages.push(item);
    requirePass([item]);
  };
  try {
    started = true;
    run('start', 'pnpm', ['run', 'supabase:start']);
    assertStartedTarget(projectId, base);
    run('reset', 'pnpm', ['run', 'supabase:reset']);
    run('migration-names', 'pnpm', ['run', 'verify-migrations'], /Validated 72 migration filename/);
    run('mcp', 'pnpm', ['run', 'test:mcp'], /\b[1-9]\d* passed/);
    run(
      'audit-before',
      'pnpm',
      ['exec', 'tsx', 'scripts/phase-6-catalog-audit.ts'],
      /PASS|catalog/i,
    );
    run(
      'inspector',
      'pnpm',
      ['exec', 'tsx', 'scripts/phase-6-13.ts'],
      /33\/33 valid and 33\/33 invalid tool calls.*PASS/,
    );
    run(
      'audit-after',
      'pnpm',
      ['exec', 'tsx', 'scripts/phase-6-catalog-audit.ts'],
      /PASS|catalog/i,
    );
    run(
      'database',
      'pnpm',
      shard
        ? [
            'exec',
            'vitest',
            'run',
            '--config',
            'vitest.database.config.ts',
            '--no-file-parallelism',
            ...partitions[shard],
          ]
        : ['run', 'test:database'],
      /Test Files\s+\d+ passed[\s\S]*Tests\s+\d+ passed/,
    );
    run('migration-history', 'pnpm', ['run', 'supabase:verify'], /\d{14}/);
    run('db-lint', 'pnpm', ['exec', 'supabase', 'db', 'lint', '--local', '--fail-on', 'error']);
    run('security-advisors', 'pnpm', [
      'exec',
      'supabase',
      'db',
      'advisors',
      '--local',
      '--type',
      'security',
      '--level',
      'info',
      '--fail-on',
      'error',
      '--output-format',
      'json',
    ]);
    run(
      'audit-final',
      'pnpm',
      ['exec', 'tsx', 'scripts/phase-6-catalog-audit.ts'],
      /PASS|catalog/i,
    );
    stages.push(
      stage('whitespace', () => command('git', ['diff', '--check', 'HEAD^', 'HEAD'], root)),
    );
    requirePass(stages);
    sameIdentity(identity, preflight());
    return;
  } finally {
    if (started)
      stages.push(
        stage('cleanup', () => {
          const result = command(
            'pnpm',
            ['exec', 'supabase', 'stop', '--project-id', projectId, '--no-backup'],
            stageRoot.path,
          );
          dockerVacant(projectId);
          return result;
        }),
      );
    if (!exactActions) rmSync(stageRoot.path, { recursive: true, force: true });
    requirePass(stages.filter((item) => item.name === 'cleanup'));
  }
}

export async function main(mode: Mode): Promise<void> {
  const started = performance.now();
  const stages: Stage[] = [];
  let identity: Identity | undefined;
  let overlayHash: string | undefined;
  let status: Status;
  let failureReason: string | undefined;
  const exactActions = process.env.GATE_CONFIG_MODE === 'ACTIONS_EXACT_CONFIG';
  const shard = process.env.GATE_DB_SHARD as ShardId | undefined;
  try {
    if (shard && (mode !== 'backend' || !['1', '2'].includes(shard))) fail('SHARD_INVALID');
    if (exactActions) assertActionsEnvironment();
    identity = preflight();
    stages.push(stage('locked-install', () => command('pnpm', ['install', '--frozen-lockfile'])));
    requirePass(stages);
    if (mode !== 'backend') sourceStages(identity.counts.source, stages);
    if (mode !== 'source') {
      await backendStages(identity, stages, (hash) => {
        overlayHash = hash;
      });
    }
    requirePass(stages);
    sameIdentity(identity, preflight());
    status = 'PASS';
  } catch (error) {
    status = error instanceof GateError ? error.status : 'FAIL';
    failureReason = error instanceof GateError ? error.code : 'UNEXPECTED_ERROR';
    process.exitCode = 1;
  }
  const required =
    mode === 'source'
      ? ['locked-install', 'source']
      : [
          'locked-install',
          'cli-help',
          'start',
          'reset',
          'migration-names',
          'mcp',
          'audit-before',
          'inspector',
          'audit-after',
          'database',
          'migration-history',
          'db-lint',
          'security-advisors',
          'audit-final',
          'whitespace',
          'cleanup',
        ];
  for (const name of required) {
    if (!stages.some((item) => item.name === name))
      stages.push({ name, status: 'NOT RUN', durationMs: 0 });
  }
  const top = [...stages]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)
    .map((s) => s.name);
  const report = {
    mode,
    status,
    failureReason,
    evidence: exactActions
      ? 'ACTIONS_EXACT_COMMIT_CONFIG'
      : mode === 'source'
        ? 'COMMITTED_SOURCE'
        : 'DIAGNOSTIC_CONFIG_OVERLAY',
    sha: identity?.sha ?? 'UNVERIFIED',
    manifestSha256: identity?.manifestHash ?? 'UNVERIFIED',
    lockSha256: identity?.lockHash ?? 'UNVERIFIED',
    inputsSha256: identity?.inputsHash ?? 'UNVERIFIED',
    shardSha256: identity?.shardHash ?? 'UNVERIFIED',
    shard: shard ?? null,
    files: shard
      ? (JSON.parse(read('scripts/gate-db-shards.json').toString()) as ShardPartition).shards[shard]
      : null,
    cases:
      shard && status === 'PASS'
        ? Number(stages.find((s) => s.name === 'database')?.count ?? 0)
        : null,
    configOverlaySha256: overlayHash ?? null,
    configMode: exactActions
      ? 'ACTIONS_EXACT_CONFIG'
      : mode === 'source'
        ? 'COMMITTED_SOURCE'
        : 'LOCAL_DIAGNOSTIC_OVERLAY',
    suites: identity?.counts ?? null,
    toolPins: {
      node: read('.nvmrc').toString().trim(),
      pnpm: '10.33.2',
      deno: read('.deno-version').toString().trim(),
      supabase: '2.120.0',
    },
    stages,
    topFiveSlowest: top,
    durationMs: Math.round(performance.now() - started),
    limits:
      'Candidate only; not G4 equivalence, hosted OAuth, production, or release authorization.',
  };
  const serialized = JSON.stringify(report);
  if (process.env.GATE_EVIDENCE_FILE) {
    mkdirSync(resolve(process.env.GATE_EVIDENCE_FILE, '..'), { recursive: true });
    writeFileSync(process.env.GATE_EVIDENCE_FILE, `${serialized}\n`);
  }
  console.log(serialized);
}
