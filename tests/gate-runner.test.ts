import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { test } from 'vitest';
import {
  assertAdvisorsReport,
  assertSourceTestEvidence,
  assertDatabaseTestEvidence,
  countFromOutput,
  plainEvidence,
  assertActionsEnvironment,
  assertConfigMode,
  assertClean,
  assertNoExistingStackResources,
  assertNoSkipped,
  assertSha,
  sameIdentity,
  stage,
  validateManifest,
  validateTarget,
  type ShardProof,
  validateShards,
  validateShardProofs,
  assertShardDatabaseEvidence,
} from '../scripts/gate-runner.js';

const manifest = JSON.parse(
  readFileSync(new URL('../scripts/gate-suite-manifest.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const sha = 'b'.repeat(40);

test('rejects a mismatched candidate SHA before any stage', () => {
  assert.throws(() => assertSha('0'.repeat(40), sha), { code: 'SHA_MISMATCH' });
});

test('rejects a dirty candidate checkout', () => {
  assert.throws(() => assertClean(' M package.json'), { code: 'DIRTY_CHECKOUT' });
});

test('rejects manifest drift and missing required database file', () => {
  const changed = JSON.parse(JSON.stringify(manifest));
  changed.suites.database.files.pop();
  assert.throws(() => validateManifest(changed, pkg.scripts), { code: 'MANIFEST_FILE_DRIFT' });
});

test('accepts the frozen manifest and rejects skipped required cases', () => {
  assert.deepEqual(validateManifest(manifest, pkg.scripts), { source: 12, mcp: 15, database: 41 });
  assert.throws(() => assertNoSkipped('Tests 179 passed, 1 skipped'), {
    code: 'REQUIRED_CASE_SKIPPED',
  });
});

test('rejects unsafe and user stack targets', () => {
  assert.throws(() => validateTarget('content-producer', 54320, 'content-producer'), {
    code: 'UNSAFE_DISPOSABLE_TARGET',
  });
  assert.throws(() => validateTarget('issue-88-test-disposable', 54320, 'content-producer'), {
    code: 'UNSAFE_DISPOSABLE_TARGET',
  });
});

test('rejects any existing disposable stack resource before starting or cleaning it', () => {
  const projectId = 'issue-88-runner-disposable';
  for (const [kind, name] of [
    ['containers', `supabase_rest_${projectId}`],
    ['containers', `supabase_kong_${projectId}`],
    ['containers', `supabase_realtime_${projectId}`],
    ['networks', `supabase_network_${projectId}`],
    ['volumes', `supabase_storage_${projectId}`],
  ]) {
    const listings = { containers: '', networks: '', volumes: '', [kind]: name };
    assert.throws(() => assertNoExistingStackResources(projectId, listings), {
      code: 'DISPOSABLE_TARGET_OCCUPIED',
    });
  }
});

test('rejects source/backend identity mismatch', () => {
  const identity = {
    sha,
    manifestHash: 'a',
    lockHash: 'b',
    inputsHash: 'c',
    counts: { source: 12, mcp: 15, database: 41 },
  };
  assert.throws(() => sameIdentity(identity, { ...identity, manifestHash: 'drift' }), {
    code: 'COMPONENT_IDENTITY_MISMATCH',
  });
});

test('fails closed when a required stage throws or lacks evidence', () => {
  assert.equal(
    stage('database', () => {
      throw new Error('private fixture');
    }).status,
    'FAIL',
  );
  assert.equal(
    stage('inspector', () => ({ output: '33 calls skipped' }), /33 valid and 33 invalid/).status,
    'FAIL',
  );
});

test('accepts the pinned CLI advisor report and rejects missing or malformed results', () => {
  assert.doesNotThrow(() =>
    assertAdvisorsReport('{"message":"No security issues found","results":[]}'),
  );
  for (const output of ['', '[]', '{"message":"ok"}', '{"message":"ok","results":null}']) {
    assert.throws(() => assertAdvisorsReport(output), { code: 'ADVISOR_REPORT_INVALID' });
  }
});

test('exact Actions mode needs dispatch SHA and isolated GitHub context', () => {
  const env = {
    GITHUB_ACTIONS: 'true',
    GITHUB_EVENT_NAME: 'workflow_dispatch',
    GITHUB_REF: 'refs/heads/main',
    GITHUB_SHA: sha,
    GATE_CANDIDATE_SHA: sha,
    GATE_ACTIONS_EXACT_CONFIG: '1',
    RUNNER_TEMP: '/tmp/actions',
    RUNNER_OS: 'Linux',
  };
  assert.doesNotThrow(() => assertActionsEnvironment(env));
  for (const changed of [
    { GITHUB_ACTIONS: 'false' },
    { GITHUB_EVENT_NAME: 'pull_request' },
    { GITHUB_REF: 'refs/heads/feature' },
    { GATE_CANDIDATE_SHA: '0'.repeat(40) },
    { GATE_ACTIONS_EXACT_CONFIG: '0' },
  ]) {
    assert.throws(() => assertActionsEnvironment({ ...env, ...changed }), {
      code: 'UNVERIFIED_ACTIONS_ENVIRONMENT',
    });
  }
});

test('formal config requires byte-identical committed config', () => {
  const committed = Buffer.from('project_id = "content-producer"\\n');
  assert.doesNotThrow(() => assertConfigMode('ACTIONS_EXACT_CONFIG', committed, committed));
  assert.throws(() => assertConfigMode('LOCAL_DIAGNOSTIC_OVERLAY', committed, committed), {
    code: 'EXACT_CONFIG_MISMATCH',
  });
  assert.throws(() => assertConfigMode('ACTIONS_EXACT_CONFIG', Buffer.from('changed'), committed), {
    code: 'EXACT_CONFIG_MISMATCH',
  });
});

test('source Vitest ANSI and plain summaries', () => {
  const plain = 'Test Files 12 passed\nTests 83 passed';
  const ansi = 'Test Files \x1b[32m12 passed\x1b[0m\nTests \x1b[32m83 passed\x1b[0m';
  for (const output of [plain, ansi]) {
    assert.doesNotThrow(() => assertSourceTestEvidence(output, 12));
    assert.equal(countFromOutput('source', output), 'root 12 files; root 83 cases');
  }
  assert.equal(plainEvidence(ansi), plain);
  for (const output of [
    'Test Files 11 passed\nTests 83 passed',
    'Test Files 12 passed',
    'Test Files 12 passed\nTests 82 passed, 1 failed',
    'Test Files 12 passed\nTests 82 passed, 1 cancelled',
  ]) {
    assert.throws(() => assertSourceTestEvidence(output, 12), {
      code: 'SOURCE_TEST_EVIDENCE_MISSING',
    });
  }
});

test('database Vitest ANSI and plain summaries', () => {
  const plain = 'Test Files 41 passed\nTests 179 passed';
  const ansi = 'Test Files \x1b[32m41 passed\x1b[0m\nTests \x1b[32m179 passed\x1b[0m';
  for (const output of [plain, ansi]) {
    assert.doesNotThrow(() => assertDatabaseTestEvidence(output));
    assert.equal(countFromOutput('database', output), '179');
  }
  assert.equal(plainEvidence(ansi), plain);
  for (const output of [
    'Test Files 40 passed\nTests 179 passed',
    'Test Files 41 passed',
    'Test Files 41 passed\nTests 178 passed, 1 skipped',
    'Test Files 41 passed\nTests 178 passed, 1 failed',
    'Test Files 41 passed\nTests 178 passed, 1 cancelled',
  ]) {
    assert.throws(() => assertDatabaseTestEvidence(output));
  }
});

test('partition covers all 41 mandatory files exactly once', () => {
  const partition = JSON.parse(
    readFileSync(new URL('../scripts/gate-db-shards.json', import.meta.url), 'utf8'),
  );
  const shards = validateShards(partition, manifest);
  assert.equal(shards['1'].length + shards['2'].length, 41);
  for (const broken of [
    { ...partition, shards: { ...partition.shards, '2': partition.shards['2'].slice(1) } },
    {
      ...partition,
      shards: {
        ...partition.shards,
        '2': [partition.shards['1'][0], ...partition.shards['2'].slice(1)],
      },
    },
  ])
    assert.throws(() => validateShards(broken, manifest), { code: 'SHARD_FILE_DRIFT' });
});

test('shard proof rejects missing, duplicate, skipped and wrong SHA', () => {
  const part = validateShards(
    JSON.parse(readFileSync(new URL('../scripts/gate-db-shards.json', import.meta.url), 'utf8')),
    manifest,
  );
  const hashes = {
    manifestSha256: 'a'.repeat(64),
    lockSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
    shardSha256: 'd'.repeat(64),
  };
  const mk = (shard: '1' | '2'): ShardProof => ({
    shard,
    sha,
    ...hashes,
    files: part[shard],
    cases: 90,
    status: 'PASS',
    stages: [{ name: 'database', status: 'PASS', durationMs: 1 }],
  });
  assert.equal(validateShardProofs([mk('1'), mk('2')], sha, hashes, part), 180);
  for (const bad of [
    [mk('1')],
    [mk('1'), mk('1')],
    [mk('1'), { ...mk('2'), sha: '0'.repeat(40) }],
    [mk('1'), { ...mk('2'), files: [...mk('2').files.slice(1), mk('1').files[0]!] }],
    [
      mk('1'),
      {
        ...mk('2'),
        stages: [{ name: 'database', status: 'NOT RUN' as const, durationMs: 0 }],
      },
    ],
    [mk('1'), { ...mk('2'), cases: 0 }],
  ])
    assert.throws(() => validateShardProofs(bad, sha, hashes, part), {
      code: 'SHARD_EVIDENCE_MISMATCH',
    });
  assert.equal(assertShardDatabaseEvidence('Test Files 21 passed\nTests 90 passed', 21), 90);
  for (const output of [
    'Test Files 20 passed\nTests 90 passed',
    'Test Files 21 passed\nTests 89 passed, 1 skipped',
  ]) {
    assert.throws(() => assertShardDatabaseEvidence(output, 21));
  }
});
