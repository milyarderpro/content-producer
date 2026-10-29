import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { URL } from 'node:url';
import {
  assertClean,
  assertNoSkipped,
  assertSha,
  sameIdentity,
  stage,
  validateManifest,
  validateTarget,
} from '../scripts/gate-runner.ts';

const manifest = JSON.parse(
  readFileSync(new URL('../scripts/gate-suite-manifest.json', import.meta.url)),
);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
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
  assert.deepEqual(validateManifest(manifest, pkg.scripts), { source: 11, mcp: 15, database: 41 });
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

test('rejects source/backend identity mismatch', () => {
  const identity = {
    sha,
    manifestHash: 'a',
    lockHash: 'b',
    inputsHash: 'c',
    counts: { source: 11, mcp: 15, database: 41 },
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
