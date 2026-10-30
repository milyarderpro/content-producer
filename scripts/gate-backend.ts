import { readFileSync } from 'node:fs';
import { main, validateManifest, validateShards, validateShardProofs } from './gate-runner.js';

export function assertExactDatabaseCaseCount(count: number): void {
  if (count !== 182) throw new Error('SHARD_CASE_COUNT_MISMATCH');
}

function aggregate(args: string[]): void {
  type SafeStage = { name: string; status: string; count?: string };
  const read = (path: string) => JSON.parse(readFileSync(path, 'utf8'));
  const manifest = read('scripts/gate-suite-manifest.json');
  const pkg = read('package.json');
  validateManifest(manifest, pkg.scripts);
  const partitions = validateShards(read('scripts/gate-db-shards.json'), manifest);
  const [sourcePath, onePath, twoPath, expectedSha] = args;
  if (!sourcePath || !onePath || !twoPath || !expectedSha) throw new Error('SHARD_PROOF_MISSING');

  const source = read(sourcePath);
  const one = read(onePath);
  const two = read(twoPath);
  const fields = ['manifestSha256', 'lockSha256', 'inputsSha256', 'shardSha256'] as const;
  const sourceStage = source.stages?.find((stage: SafeStage) => stage.name === 'source');
  if (
    source.status !== 'PASS' ||
    source.mode !== 'source' ||
    source.sha !== expectedSha ||
    source.evidence !== 'COMMITTED_SOURCE' ||
    sourceStage?.status !== 'PASS' ||
    fields.some((field) => !/^[0-9a-f]{64}$/.test(source[field]))
  )
    throw new Error('SOURCE_EVIDENCE_INVALID');

  const count = validateShardProofs(
    [one, two],
    expectedSha,
    {
      manifestSha256: source.manifestSha256,
      lockSha256: source.lockSha256,
      inputsSha256: source.inputsSha256,
      shardSha256: source.shardSha256,
    },
    partitions,
  );

  const required = [
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
  for (const proof of [one, two]) {
    const stages = proof.stages as SafeStage[];
    if (!Array.isArray(stages)) throw new Error('SHARD_STAGES_INVALID');
    const inspector = stages.find((stage) => stage.name === 'inspector');
    const database = stages.find((stage) => stage.name === 'database');
    if (
      proof.suites?.database !== 41 ||
      proof.mode !== 'backend' ||
      proof.evidence !== 'ACTIONS_EXACT_COMMIT_CONFIG' ||
      proof.configMode !== 'ACTIONS_EXACT_CONFIG' ||
      proof.configOverlaySha256 !== null ||
      required.some(
        (name) => !stages.some((stage) => stage.name === name && stage.status === 'PASS'),
      ) ||
      inspector?.count !== '33 valid; 33 invalid; owner denial' ||
      database?.count !== String(proof.cases)
    )
      throw new Error('SHARD_STAGES_INVALID');
  }
  assertExactDatabaseCaseCount(count);

  process.stdout.write(
    'PASS: 41 disjoint database files, ' + count + ' cases, identical exact-SHA identity\n',
  );
}

if (process.argv[2] === '--aggregate') aggregate(process.argv.slice(3));
else if (process.argv[2] === '--verify-case-count')
  assertExactDatabaseCaseCount(Number(process.argv[3]));
else await main('backend');
