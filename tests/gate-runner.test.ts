import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { URL } from 'node:url';
import { test } from 'vitest';
import {
  assertAdvisorsReport,
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
  assert.throws(
    () => assertConfigMode('ACTIONS_EXACT_CONFIG', Buffer.from('changed'), committed),
    { code: 'EXACT_CONFIG_MISMATCH' },
  );
});
