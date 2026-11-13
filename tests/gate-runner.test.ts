import assert from 'node:assert/strict';
import { runtimeJobOutputs } from '../scripts/gate-runtime.js';
import { spawnSync } from 'node:child_process';
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import {
  assertRuntimeSpecs,
  matchesRuntimeRange,
  resolveRuntimeEvidence,
  assertEquivalentRuntimeEvidence,
} from '../scripts/runtime-range.js';
import { URL } from 'node:url';
import { test, vi } from 'vitest';
import {
  assertCatalogPin,
  catalogSections,
  type Catalog,
} from '../scripts/trivia-v2-catalog-audit.js';
import {
  assertExactDatabaseCaseCount,
  assertAdvisorsReport,
  assertSourceTestEvidence,
  assertSourceSubchecks,
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
  validateSingleMcpInspector,
  requiredReportStages,
  assertShardDatabaseEvidence,
} from '../scripts/gate-runner.js';

vi.mock('../supabase/tests/database/helpers/plan-lifecycle.js', () => {
  throw new Error('SOURCE_PIN_VALIDATION_MUST_NOT_INITIALIZE_DATABASE');
});

const manifest = JSON.parse(
  readFileSync(new URL('../scripts/gate-suite-manifest.json', import.meta.url), 'utf8'),
);
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const sha = 'b'.repeat(40);

test('catalog pins reject function, ACL, RLS, schema section and migration drift', () => {
  const catalog = {
    functions: [
      {
        signature: 'api.create_content_plan(integer,uuid,uuid,uuid,text,integer,jsonb,text,text)',
        owner: 'content_producer_api_owner',
        definer: true,
        settings: ['search_path=""'],
        source_sha256: '54b4f0be4b302b96330d813f5e60b9093349932a9e7ba0d68b5d278625d7e41c',
        acl: '{authenticated=X/content_producer_api_owner}',
      },
    ],
    objects: [],
    policies: [{ using: 'owner_id = auth.uid()' }],
  } as Catalog;
  const pin = {
    migrationCount: 0,
    manifestSha256: '4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945',
    sections: catalogSections(catalog),
  };
  assert.doesNotThrow(() => assertCatalogPin(catalog, pin, []));
  for (const changed of [
    { ...catalog, functions: [{ signature: 'internal.unexpected()' }] },
    // The old pin came from six spaces on a blank line in the local function.
    // Metadata and semantics match, but the exact source hash must still fail.
    {
      ...catalog,
      functions: [
        {
          ...catalog.functions[0]!,
          source_sha256: 'aa281126a4e531205ed8c9542c454eb1b8a153a01cd248f5991e7b8b31191a13',
        },
      ],
    },
    { ...catalog, functions: [{ ...catalog.functions[0]!, acl: '{anon=X/postgres}' }] },
    { ...catalog, objects: [{ acl: '{anon=r/postgres}', rls: false }] },
    { ...catalog, policies: [{ using: 'true' }] },
    { ...catalog, constraints: [] },
  ])
    assert.throws(
      () => assertCatalogPin(changed as Catalog, pin, []),
      /CATALOG_SCHEMA_SOURCE_OR_ACL_DRIFT/,
    );
  assert.throws(
    () => assertCatalogPin(catalog, pin, [{ file: 'extra.sql', sha256: 'x' }]),
    /CATALOG_MIGRATION_COUNT_DRIFT/,
  );
  assert.throws(
    () => assertCatalogPin(catalog, { ...pin, manifestSha256: 'changed' }, []),
    /CATALOG_MIGRATION_SOURCE_DRIFT/,
  );
});

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

test('accepts the mandatory manifest including P1 contract tests and rejects skipped cases', () => {
  // P1-T3 and P2-T2 mandatory source files; runtime and all release coverage remain required.
  assert.deepEqual(validateManifest(manifest, pkg.scripts), { source: 14, mcp: 18, database: 33 });
  assert.throws(() => assertNoSkipped('Tests 179 passed, 1 skipped'), {
    code: 'REQUIRED_CASE_SKIPPED',
  });
});

test('range parser accepts numeric lower boundaries and rejects outside/malformed ranges', () => {
  const specs = { nodeSelector: '>=22', nodeEngine: '>=22 <25', denoSelector: '>=2.9.7' };
  assert.doesNotThrow(() => assertRuntimeSpecs(specs));
  for (const [spec, accepted, rejected] of [
    ['>=22 <25', '22.0.0', '25.0.0'],
    ['>=22 <25', '24.99.9', '21.99.99'],
    ['>=2.9.7', '2.9.7', '2.9.6'],
  ]) {
    assert.equal(matchesRuntimeRange(spec, accepted), true);
    assert.equal(matchesRuntimeRange(spec, rejected), false);
  }
  for (const malformed of ['^22', '>=22 || <25', '>=22 <', '>=22.0.0-rc.1', '>=22*', '']) {
    assert.throws(() => matchesRuntimeRange(malformed, '24.0.0'), /INVALID_RUNTIME_SPEC/);
  }
  for (const drift of [
    { ...specs, nodeSelector: '>=24' },
    { ...specs, nodeEngine: '>=22 <26' },
    { ...specs, nodeSelector: '>=22 <24.100' },
    { ...specs, denoSelector: '>=2.9.7 <2.11' },
    { ...specs, denoSelector: '>=2.0.0' },
  ])
    assert.throws(() => assertRuntimeSpecs(drift), /UNSAFE_RUNTIME_RANGE/);
});

test('resolved Node/Deno versions, pins and G4 runtime reports are fail-closed', () => {
  const specs = { nodeSelector: '>=22', nodeEngine: '>=22 <25', denoSelector: '>=2.9.7' };
  const versions = {
    node: 'v22.0.0',
    deno: 'deno 2.9.7 (stable, release)',
    pnpm: '10.33.2',
    supabase: '2.120.0',
  };
  const lower = resolveRuntimeEvidence(specs, versions);
  assert.deepEqual(lower.declared, specs);
  assert.equal(lower.resolved.node, '22.0.0');
  assert.equal(lower.resolved.deno, '2.9.7');
  assert.equal(lower.effective.deno, '>=2.9.7 <3.0.0');
  for (const narrower of [
    { ...specs, nodeSelector: '>=22 <24.100' },
    { ...specs, denoSelector: '>=2.9.7 <2.11' },
  ]) {
    assert.throws(() => resolveRuntimeEvidence(narrower, versions), /UNSAFE_RUNTIME_RANGE/);
  }
  const later = resolveRuntimeEvidence(specs, {
    ...versions,
    node: 'v24.22.1',
    deno: 'deno 2.10.0 (stable)',
  });
  assert.equal(later.resolved.node, '24.22.1');
  assert.doesNotThrow(() => assertEquivalentRuntimeEvidence(later, later, later));
  for (const bad of [
    { ...versions, node: 'v21.99.1' },
    { ...versions, node: 'v25.0.0' },
    { ...versions, deno: 'deno 2.9.6 (stable)' },
    { ...versions, deno: 'deno 3.0.0 (stable)' },
    { ...versions, node: 'v24.22' },
    { ...versions, node: 'Node version 24.22.1' },
    { ...versions, deno: 'deno broken' },
    { ...versions, pnpm: '10.33.1' },
    { ...versions, supabase: '2.119.0' },
  ])
    assert.throws(() => resolveRuntimeEvidence(specs, bad));
  assert.throws(
    () => assertEquivalentRuntimeEvidence(later, lower, later),
    /RUNTIME_EVIDENCE_MISMATCH/,
  );
  assert.throws(
    () => assertEquivalentRuntimeEvidence(later, undefined, later),
    /RUNTIME_EVIDENCE_MISSING/,
  );
  assert.throws(() =>
    assertEquivalentRuntimeEvidence(
      later,
      { ...later, resolved: { ...later.resolved, node: '26.0.0' } },
      later,
    ),
  );
});

test('runtime resolver exports exact validated versions and rejects invalid output injection', () => {
  const declared = { nodeSelector: '>=22', nodeEngine: '>=22 <25', denoSelector: '>=2.9.7' };
  const actual = {
    node: 'v24.22.2',
    deno: 'deno 2.9.8 (stable)',
    pnpm: '10.33.2',
    supabase: '2.120.0',
  };
  assert.equal(runtimeJobOutputs(declared, actual), 'node=24.22.2\ndeno=2.9.8\n');
  for (const node of ['', 'v24.22.2\nnode=25.0.0', 'v25.0.0', 'v24.22.2-rc.1']) {
    assert.throws(() => runtimeJobOutputs(declared, { ...actual, node }));
  }
  for (const deno of ['', 'deno 3.0.0', 'deno 2.9.6', 'deno 2.9.8\nnode=25.0.0']) {
    if (deno.includes('\n')) {
      // Multiline deno --version is expected; only the validated first line is exported.
      assert.equal(runtimeJobOutputs(declared, { ...actual, deno }), 'node=24.22.2\ndeno=2.9.8\n');
    } else assert.throws(() => runtimeJobOutputs(declared, { ...actual, deno }));
  }
  const report = resolveRuntimeEvidence(declared, actual);
  for (const node of ['24.22.1', '24.22.0']) {
    const different = { ...report, resolved: { ...report.resolved, node } };
    assert.throws(
      () => assertEquivalentRuntimeEvidence(report, different, report),
      /RUNTIME_EVIDENCE_MISMATCH/,
    );
  }
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
    shardHash: 'd',
    counts: { source: 12, mcp: 17, database: 33 },
    runtime: resolveRuntimeEvidence(
      { nodeSelector: '>=22', nodeEngine: '>=22 <25', denoSelector: '>=2.9.7' },
      { node: 'v24.22.1', deno: 'deno 2.9.7 (stable)', pnpm: '10.33.2', supabase: '2.120.0' },
    ),
  };
  assert.throws(() => sameIdentity(identity, { ...identity, manifestHash: 'drift' }), {
    code: 'COMPONENT_IDENTITY_MISMATCH',
  });
  assert.throws(
    () =>
      sameIdentity(identity, {
        ...identity,
        runtime: {
          ...identity.runtime,
          resolved: { ...identity.runtime.resolved, node: '22.0.0' },
        },
      }),
    {
      code: 'COMPONENT_IDENTITY_MISMATCH',
    },
  );
});

test('fails closed when a required stage throws or lacks evidence', () => {
  assert.equal(
    stage('database', () => {
      throw new Error('private fixture');
    }).status,
    'FAIL',
  );
  assert.equal(
    stage('inspector', () => ({ output: '31 calls skipped' }), /33 valid and 33 invalid/).status,
    'FAIL',
  );
});

test('Inspector evidence requires all v2 calls, retired names, and owner denial', () => {
  const evidence =
    'V2 Inspector gate: 33/33 valid and 33/33 invalid tool calls; five retired v1 rejected; owner denial PASS';
  assert.equal(
    countFromOutput('inspector', evidence),
    '33 valid; 33 invalid; five retired v1 rejected; owner denial',
  );
  for (const missing of ['five retired v1 rejected; ', 'owner denial ', '33/33 invalid ']) {
    assert.equal(countFromOutput('inspector', evidence.replace(missing, '')), undefined);
  }
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

test('source evidence accepts six mandatory subchecks without formatter and rejects each omission', () => {
  const required = [
    'lint',
    'typecheck',
    'test',
    'frontend:typecheck',
    'frontend:build',
    'frontend:test',
  ];
  const output = required
    .map((name) => `> content-producer@0.1.0 ${name} ${process.cwd()}`)
    .join('\n');
  assert.doesNotThrow(() => assertSourceSubchecks(output));
  for (const name of required) {
    assert.throws(
      () => assertSourceSubchecks(output.replace(` ${name} ${process.cwd()}`, ' missing')),
      {
        code: 'SOURCE_SUBCHECK_MISSING',
        status: 'FAIL',
      },
    );
  }
  for (const outcome of ['1 failed', '1 skipped']) {
    assert.throws(() => assertSourceSubchecks(`${output}\n${outcome}`), {
      code: 'REQUIRED_CASE_SKIPPED',
      status: 'FAIL',
    });
  }
  assert.throws(
    () => assertSourceTestEvidence('Test Files 13 passed\nTests 90 passed, 1 failed', 13),
    {
      code: 'SOURCE_TEST_EVIDENCE_MISSING',
    },
  );
  assert.throws(
    () => assertSourceTestEvidence('Test Files 13 passed\nTests 90 passed, 1 skipped', 13),
    {
      code: 'SOURCE_TEST_EVIDENCE_MISSING',
    },
  );
});

test('database Vitest ANSI and plain summaries', () => {
  const plain = 'Test Files 33 passed\nTests 132 passed';
  const ansi = 'Test Files \x1b[32m33 passed\x1b[0m\nTests \x1b[32m132 passed\x1b[0m';
  for (const output of [plain, ansi]) {
    assert.doesNotThrow(() => assertDatabaseTestEvidence(output));
    assert.equal(countFromOutput('database', output), '132');
  }
  assert.equal(plainEvidence(ansi), plain);
  for (const output of [
    'Test Files 40 passed\nTests 179 passed',
    'Test Files 33 passed',
    'Test Files 33 passed\nTests 132 passed, 1 skipped',
    'Test Files 33 passed\nTests 132 passed, 1 failed',
    'Test Files 33 passed\nTests 132 passed, 1 cancelled',
  ]) {
    assert.throws(() => assertDatabaseTestEvidence(output));
  }
});

test('partition covers all 33 mandatory files exactly once', () => {
  const partition = JSON.parse(
    readFileSync(new URL('../scripts/gate-db-shards.json', import.meta.url), 'utf8'),
  );
  const shards = validateShards(partition, manifest);
  assert.equal(shards['1'].length + shards['2'].length, 33);
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
  assert.equal(assertShardDatabaseEvidence('Test Files 15 passed\nTests 90 passed', 15), 90);
  for (const output of [
    'Test Files 20 passed\nTests 90 passed',
    'Test Files 15 passed\nTests 89 passed, 1 skipped',
  ]) {
    assert.throws(() => assertShardDatabaseEvidence(output, 15));
  }
});

test('v2 shards retain distinct hotspot files in shard 2 with no duplicates', () => {
  const partition = validateShards(
    JSON.parse(readFileSync(new URL('../scripts/gate-db-shards.json', import.meta.url), 'utf8')),
    manifest,
  );
  assert.equal(partition['1'].length + partition['2'].length, 33);
  assert.equal(new Set([...partition['1'], ...partition['2']]).size, 33);
  for (const file of [
    'supabase/tests/database/api-trivia-public-gold.test.ts',
    'supabase/tests/database/api-trivia-v2-maintenance.test.ts',
  ]) {
    assert.equal(partition['1'].includes(file), false);
    assert.equal(partition['2'].includes(file), true);
  }
});

test('backend candidate aggregate accepts exactly 238 database cases', () => {
  for (const count of [237, 239, 216, 200, 132, 221])
    assert.throws(() => assertExactDatabaseCaseCount(count), /SHARD_CASE_COUNT_MISMATCH/);
  assert.doesNotThrow(() => assertExactDatabaseCaseCount(238));
  for (const [count, expectedExit] of [
    [238, 0],
    [239, 1],
  ]) {
    const result = spawnSync(
      'pnpm',
      ['exec', 'tsx', 'scripts/gate-backend.ts', '--verify-case-count', String(count)],
      { encoding: 'utf8' },
    );
    assert.equal(result.status, expectedExit === 0 ? 0 : 1, `count ${count}`);
    if (expectedExit) assert.match(result.stderr, /SHARD_CASE_COUNT_MISMATCH/);
  }
});

test('MCP 18 files/130 cases and authenticated v2 Inspector belong to shard 1 exactly once', () => {
  const stages: ShardProof['stages'] = [
    { name: 'mcp', status: 'PASS' as const, durationMs: 1, count: '130' },
    {
      name: 'inspector',
      status: 'PASS' as const,
      durationMs: 1,
      count: '33 valid; 33 invalid; five retired v1 rejected; owner denial',
    },
  ];
  const make = (shard: '1' | '2', items: typeof stages): ShardProof => ({
    shard,
    sha,
    manifestSha256: 'a'.repeat(64),
    lockSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
    shardSha256: 'd'.repeat(64),
    files: [],
    cases: 91,
    status: 'PASS',
    stages: items,
  });
  const owner = make('1', stages);
  const other = make('2', []);
  assert.doesNotThrow(() => validateSingleMcpInspector([owner, other]));
  for (const proofs of [
    [make('1', []), other],
    [make('1', stages.slice(0, 1)), other],
    [owner, make('2', stages)],
    [make('1', [{ ...stages[0]!, count: '81' }, stages[1]!]), other],
    [make('1', [{ ...stages[0]!, status: 'FAIL' as const }, stages[1]!]), other],
    [other, make('2', stages)],
  ]) {
    assert.throws(() => validateSingleMcpInspector(proofs), {
      code: 'SHARD_SINGLE_OWNER_EVIDENCE_INVALID',
    });
  }
});

test('final two-shard reports satisfy both validators', () => {
  const partition = validateShards(
    JSON.parse(readFileSync(new URL('../scripts/gate-db-shards.json', import.meta.url), 'utf8')),
    manifest,
  );
  const hashes = {
    manifestSha256: 'a'.repeat(64),
    lockSha256: 'b'.repeat(64),
    inputsSha256: 'c'.repeat(64),
    shardSha256: 'd'.repeat(64),
  };
  const report = (shard: '1' | '2', cases: number): ShardProof => ({
    shard,
    sha,
    ...hashes,
    files: partition[shard],
    cases,
    status: 'PASS',
    stages: requiredReportStages('backend', shard).map((name) => ({
      name,
      status: 'PASS',
      durationMs: 1,
      ...(name === 'mcp' ? { count: '130' } : {}),
      ...(name === 'inspector'
        ? { count: '33 valid; 33 invalid; five retired v1 rejected; owner denial' }
        : {}),
      ...(name === 'database' ? { count: String(cases) } : {}),
    })),
  });
  const one = report('1', 158);
  const two = report('2', 80);
  assert.equal(validateShardProofs([one, two], sha, hashes, partition), 238);
  assert.doesNotThrow(() => validateSingleMcpInspector([one, two]));
  assert.deepEqual(
    two.stages.filter((item) => ['mcp', 'inspector'].includes(item.name)),
    [],
  );
  assert.equal(requiredReportStages('backend').includes('mcp'), true);
  assert.equal(requiredReportStages('full').includes('inspector'), true);

  for (const stageName of ['mcp', 'inspector']) {
    const missing: ShardProof = {
      ...one,
      stages: one.stages.filter((stage) => stage.name !== stageName),
    };
    assert.doesNotThrow(() => validateShardProofs([missing, two], sha, hashes, partition));
    assert.throws(() => validateSingleMcpInspector([missing, two]), {
      code: 'SHARD_SINGLE_OWNER_EVIDENCE_INVALID',
    });
    const duplicate: ShardProof = {
      ...two,
      stages: [...two.stages, one.stages.find((stage) => stage.name === stageName)!],
    };
    assert.doesNotThrow(() => validateShardProofs([one, duplicate], sha, hashes, partition));
    assert.throws(() => validateSingleMcpInspector([one, duplicate]), {
      code: 'SHARD_SINGLE_OWNER_EVIDENCE_INVALID',
    });
  }
  const broken: ShardProof = {
    ...two,
    stages: [...two.stages, { name: 'cleanup', status: 'NOT RUN', durationMs: 0 }],
  };
  assert.throws(() => validateShardProofs([one, broken], sha, hashes, partition), {
    code: 'SHARD_EVIDENCE_MISMATCH',
  });
});

test('Inspector private JSON is injected only after launch and never enters OS argv', () => {
  const dir = mkdtempSync(join(tmpdir(), 'inspector-private-input-'));
  try {
    const entry = join(dir, '@modelcontextprotocol/inspector/clients/launcher/build/index.js');
    mkdirSync(join(entry, '..'), { recursive: true });
    const input = join(dir, 'private.json');
    writeFileSync(input, JSON.stringify({ claim_token: 'synthetic-token-marker' }), {
      mode: 0o600,
    });
    writeFileSync(
      entry,
      `const fs=require('node:fs');console.log(JSON.stringify({inMemory:process.argv.at(-1).includes('synthetic-token-marker'),inOsArguments:fs.readFileSync('/proc/self/cmdline','utf8').includes('synthetic-token-marker')}));`,
    );
    const result = spawnSync(
      process.execPath,
      ['--import', resolve('scripts/inspector-input.mjs'), entry],
      { encoding: 'utf8', env: { ...process.env, CP_INSPECTOR_ARGUMENT_FILE: input } },
    );
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), { inMemory: true, inOsArguments: false });
    writeFileSync(input, '[]', { mode: 0o600 });
    const denied = spawnSync(
      process.execPath,
      ['--import', resolve('scripts/inspector-input.mjs'), entry],
      { encoding: 'utf8', env: { ...process.env, CP_INSPECTOR_ARGUMENT_FILE: input } },
    );
    assert.notEqual(denied.status, 0);
    assert.match(denied.stderr, /INSPECTOR_INPUT_FILE_INVALID/);
    assert.equal(denied.stderr.includes('synthetic-token-marker'), false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
