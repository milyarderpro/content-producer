import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { deepStrictEqual, strict as assert } from 'node:assert';
import { format, resolveConfig } from 'prettier';
import {
  fixture,
  cleanup,
  request,
  save,
  revise,
  rpc,
  ready,
  posted,
  get,
  evidence,
  usages,
  replayDigest,
  content,
  row,
  sql,
} from '../supabase/tests/database/helpers/post-lifecycle.js';
import { populateSearch } from '../supabase/tests/database/helpers/trivia-performance.js';

// One process keeps ephemeral save/reservation capabilities in memory across local
// migration application. Evidence stores digests/public summaries, never SQL/tokens.
const formatting = {
  ...(await resolveConfig('docs/phase-5-batch-b-remediation-before.json')),
  parser: 'json',
};
const initial = row<{
  posts: number;
  qualifying: number;
  users: number;
  workspaces: number;
}>(`select
  (select count(*) from public.posts) posts,
  (select count(*) from public.posts where status='draft' and quality_status='passed' and approval_snapshot is null) qualifying,
  (select count(*) from auth.users) users,(select count(*) from public.workspaces) workspaces`);
assert.deepEqual(initial, { posts: 0, qualifying: 0, users: 0, workspaces: 0 });
assert.equal(row(`select count(*) n from supabase_migrations.schema_migrations`).n, 63);
const search = fixture(),
  legacy = fixture(),
  inactive = fixture();
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const functionDigest = () =>
  row<{ digest: string }>(`select md5(prosrc) digest from pg_proc
  where oid='internal.trivia_candidates_v3(bigint,jsonb,jsonb,integer)'::regprocedure`).digest;
const immutable = () =>
  row(`select
  (select md5(jsonb_agg(to_jsonb(l) order by id)::text) from internal.operation_ledger l) ledger,
  (select md5(jsonb_agg(to_jsonb(h) order by id)::text) from internal.post_write_history h) history`);
try {
  const harness = populateSearch(search);
  const makeDraft = (f: typeof legacy) => {
    const r = request(f, 7);
    r.bindings = r.bindings.map((b) => ({
      ...b,
      rendered_text: 'One two three four five six seven eight.',
    }));
    r.content = content(r.bindings);
    const call = save(f, r),
      result = rpc(f, call);
    assert.equal(result.data.post.quality_status, 'passed');
    return { r, call, result };
  };
  const a = makeDraft(legacy),
    b = makeDraft(inactive);
  const revisionCall = revise(inactive, b.result.data.post, b.r);
  const revisionResult = rpc(inactive, revisionCall);
  const approved = ready(legacy, rpc(legacy, save(legacy, request(legacy))).data.post);
  const published = posted(
    legacy,
    ready(legacy, rpc(legacy, save(legacy, request(legacy))).data.post),
  );
  sql(`update public.workspaces set is_active=false where public_id='${inactive.workspace}'`);
  const prior = [evidence(a.result.data.post), evidence(revisionResult.data.post)];
  const priorUsage = [usages(a.result.data.post), usages(revisionResult.data.post)];
  const protectedRows = [evidence(approved), evidence(published)];
  const fixtureBefore = harness.fixtureDigest(),
    resultsBefore = harness.results();
  const before = {
    baseline: '289afe31d7700cdee962ce8e8d014c449100041c',
    initial_census: initial,
    populated_census: row(
      `select count(*) n from public.posts where status='draft' and quality_status='passed' and approval_snapshot is null`,
    ),
    fixture: fixtureBefore,
    result_digest: digest(resultsBefore),
    function_digest: functionDigest(),
    timing: harness.measure(),
    plans: { public_rpc: harness.publicPlan(), private_diagnostic: harness.helperPlan() },
    enable_seqscan: sql('show enable_seqscan'),
  };
  const historyBefore = immutable();
  writeFileSync(
    'docs/phase-5-batch-b-remediation-before.json',
    await format(JSON.stringify(before), formatting),
  );
  console.info(
    `Baseline authenticated p95=${before.timing.p95_ms.toFixed(1)}ms; SAME fixture=${fixtureBefore.n}; legacy census=2 (one inactive).`,
  );
  assert.ok(
    before.timing.p95_ms > 3000,
    'Baseline must reproduce populated RPC performance failure.',
  );
  const applied = spawnSync('pnpm', ['exec', 'supabase', 'migration', 'up', '--local'], {
    stdio: 'inherit',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  assert.equal(applied.status, 0, 'Local migration application failed.');
  deepStrictEqual(
    harness.fixtureDigest(),
    fixtureBefore,
    'Old/new must use identical 5,001 facts.',
  );
  deepStrictEqual(
    harness.results(),
    resultsBefore,
    'Public ranking, score/signal/freshness outputs must remain exact.',
  );
  deepStrictEqual(
    immutable(),
    historyBefore,
    'Normalization must not change ANY ledger/history byte.',
  );
  assert.equal(
    row(
      `select count(*) n from public.posts where status='draft' and quality_status='passed' and approval_snapshot is null`,
    ).n,
    0,
  );
  assert.equal(Number(sql('select internal.normalize_unapproved_drafts_v1()')), 0);
  sql(`update public.workspaces set is_active=true where public_id='${inactive.workspace}'`);
  const current = [
    get(legacy, a.result.data.post.post_public_id),
    get(inactive, revisionResult.data.post.post_public_id),
  ];
  for (const [i, p] of current.entries()) {
    assert.equal(p.quality_status, 'pending');
    assert.equal(
      p.revision,
      Number((prior[i]!.system_checks as { post_revision: number }).post_revision) + 1,
    );
    deepStrictEqual(evidence(p), {
      ...prior[i],
      system_checks: { ...(prior[i]!.system_checks as object), post_revision: p.revision },
      editorial_checks: { ...(prior[i]!.editorial_checks as object), post_revision: p.revision },
      quality_status: 'pending',
    });
    deepStrictEqual(usages(p), priorUsage[i]);
  }
  deepStrictEqual([evidence(approved), evidence(published)], protectedRows);
  assert.equal(replayDigest(rpc(legacy, a.call)), replayDigest(a.result));
  assert.equal(replayDigest(rpc(inactive, b.call)), replayDigest(b.result));
  assert.equal(replayDigest(rpc(inactive, revisionCall)), replayDigest(revisionResult));
  const after = {
    baseline: before.baseline,
    fixture: harness.fixtureDigest(),
    result_digest: digest(harness.results()),
    function_digest: functionDigest(),
    timing: harness.measure(),
    nine_candidate_timing: harness.measure(
      Array.from({ length: 9 }, (_, i) => ({ ...harness.c, candidate_key: `stress_${i}` })),
    ),
    plans: { public_rpc: harness.publicPlan(), private_diagnostic: harness.helperPlan() },
    enable_seqscan: sql('show enable_seqscan'),
    normalization: {
      before: 2,
      after: 0,
      second_run: 0,
      inactive_included: true,
      revision_increment: 1,
      ledger_history_unchanged: true,
      original_passed_save_replays_exact: true,
      approved_published_unchanged: true,
    },
  };
  writeFileSync(
    'docs/phase-5-batch-b-remediation-after.json',
    await format(JSON.stringify(after), formatting),
  );
  assert.ok(after.timing.p95_ms <= 3000, 'Repaired populated RPC p95 target failed.');
  assert.ok(
    after.nine_candidate_timing.p95_ms <= 3000,
    'Nine-candidate public RPC p95 target failed.',
  );
  console.info(
    `Repaired authenticated p95=${after.timing.p95_ms.toFixed(1)}ms, nine inputs=${after.nine_candidate_timing.p95_ms.toFixed(1)}ms; identical fixture/results, actual legacy normalization and historical replay passed.`,
  );
} finally {
  cleanup(search);
  cleanup(legacy);
  cleanup(inactive);
}
