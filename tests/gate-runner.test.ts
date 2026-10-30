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

test('ANSI and plain Vitest evidence require exact source file count and positive case count', () => {
  const plain = 'Test Files  12 passed (12)\nTests  83 passed (83)';
  const colored =
    'Test Files  \x1b[32m12 passed\x1b[39m (12)\nTests  \x1b[32m83 passed\x1b[39m (83)';
  for (const output of [plain, colored]) {
    assert.doesNotThrow(() => assertSourceTestEvidence(output, 12));
    assert.equal(countFromOutput('source', output), 'root 12 files; root 83 cases');
  }
  assert.equal(plainEvidence(colored), plain);
  for (const output of [
    'Test Files 11 passed (12)\nTests 83 passed',
    'Test Files 12 passed (12)',
    'Test Files 12 passed (12)\nTests 82 passed, 1 failed',
    'Test Files 12 passed (12)\nTests 82 passed, \x1b[33m1 cancelled\x1b[39m',
  ])
    assert.throws(() => assertSourceTestEvidence(output, 12), {
      code: 'SOURCE_TEST_EVIDENCE_MISSING',
    });
});

test('ANSI and plain database evidence require all 41 files, cases and no skipped or failed', () => {
  const plain = 'Test Files  41 passed (41)\nTests  179 passed (179)';
  const colored =
    'Test Files  \x1b[32m41 passed\x1b[39m (41)\nTests  \x1b[32m179 passed\x1b[39m (179)';
  for (const output of [plain, colored]) {
    assert.doesNotThrow(() => assertDatabaseTestEvidence(output));
    assert.equal(countFromOutput('database', output), '179');
    assert.equal(
      stage('database', () => ({ output }), /Test Files\s+41 passed[\s\S]*Tests\s+\d+ passed/).status,
      'PASS',
    );
  }
  for (const output of [
    'Test Files 40 passed (41)\nTests 179 passed',
    'Test Files 41 passed (41)',
    'Test Files 41 passed (41)\nTests 178 passed, 1 skipped',
    'Test Files 41 passed (41)\nTests 178 passed, 1 failed',
    'Test Files 41 passed (41)\nTests 178 passed, 1 cancelled',
  ])
    assert.throws(() => assertDatabaseTestEvidence(output));
});
