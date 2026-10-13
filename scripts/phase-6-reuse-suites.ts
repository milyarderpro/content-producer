import { execFileSync } from 'node:child_process';
import { strict as assert } from 'node:assert';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

// Reuse is limited to an audit/CI-only repair with verified Actions evidence.
// Any difference in product code, SQL, configuration or product tests fails closed.
const sha = '1196287b936221ddb9be21288c71c42152385321';
const runId = 38432808104;
const repository = 'milyarderpro/content-producer';
assert.equal(process.env.GITHUB_REPOSITORY, repository);
assert.ok(process.env.GITHUB_TOKEN && process.env.RUNNER_TEMP);
async function get(path: string) {
  const response = await fetch('https://api.github.com/repos/' + repository + path, {
    headers: {
      Authorization: 'Bearer ' + process.env.GITHUB_TOKEN,
      Accept: 'application/vnd.github+json',
    },
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(response.status, 200, 'Required Actions evidence must be readable');
  return response.json();
}
const previous = await get('/actions/runs/' + runId);
assert.equal(previous.head_sha, sha);
assert.equal(previous.status, 'completed');
assert.equal(previous.head_branch, 'codex/phase-6-mcp');
const { jobs } = await get('/actions/runs/' + runId + '/jobs');
assert.equal(jobs.length, 1);
const steps: Array<{ name: string; conclusion: string }> = jobs[0].steps;
for (const name of [
  'Batch A - test-all after clean reset (includes check, migration names, MCP, database)',
  'Batch A - smoke-test (duplicates database suite in test-all)',
  'Batch A - verify applied local migration history',
]) {
  assert.equal(steps.find((step) => step.name === name)?.conclusion, 'success', name);
}
assert.deepEqual(
  steps.filter((step) => step.conclusion === 'failure').map((step) => step.name),
  ['Batch A - security catalog and fixture cleanup audit'],
);
execFileSync('git', ['fetch', '--no-tags', 'origin', sha], { stdio: 'pipe' });
const changed = execFileSync('git', ['diff', '--name-only', sha, 'HEAD'], { encoding: 'utf8' })
  .trim()
  .split('\n')
  .filter(Boolean);
const allowed = new Set([
  '.github/workflows/phase-6-ci-baseline.yml',
  'scripts/phase-6-catalog-audit.ts',
  'scripts/phase-6-reuse-suites.ts',
]);
assert.ok(
  changed.length > 0 && changed.every((path) => allowed.has(path)),
  'Only catalog audit / CI files may differ from the passed full-suite commit',
);
const report = {
  full_suite_commit: sha,
  full_suite_run: 'https://github.com/' + repository + '/actions/runs/' + runId,
  current_commit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  test_all: 'success',
  smoke_test: 'success (duplicates the database suite)',
  migration_history: 'success',
  unchanged: ['ALL MCP source', 'SQL', 'configuration', 'dependencies', 'product tests'],
  changed_paths: changed,
};
writeFileSync(
  join(process.env.RUNNER_TEMP!, 'phase-6-evidence', 'reused-full-suites.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.info(
  'Verified prior full-suite PASS and exact unchanged product/SQL/config/tests; reuse proof saved.',
);
