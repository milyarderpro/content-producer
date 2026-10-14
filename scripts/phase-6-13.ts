import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  completeFixtureItem,
  createPlan,
  insertPost,
  row,
  sql,
  stateDigest,
} from '../supabase/tests/database/helpers/plan-lifecycle.js';
import {
  request as postRequest,
  cleanup as postCleanup,
} from '../supabase/tests/database/helpers/post-rpc.js';
import {
  candidate,
  factInput,
  fixture,
  postFixture,
  secondPage,
  source,
  time,
} from '../supabase/tests/database/helpers/trivia-rpc.js';

// No remote URL or cloud project accepted. Reuse only the local stack's image/network/DB URI.
const resource = 'http://127.0.0.1:54330/mcp';
const issuer = 'http://127.0.0.1:54330/auth/v1';
const dir = mkdtempSync(join(tmpdir(), 'phase-6-batch-a-'));
const container = 'phase-6-batch-a-postgrest';
const f = fixture();
const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwks = {
  keys: [
    { ...publicKey.export({ format: 'jwk' }), kid: 'batch-a-local', alg: 'RS256', use: 'sig' },
  ],
};
const client = randomUUID();
function token(actor = f.owner, audience = resource) {
  const now = Math.floor(Date.now() / 1000);
  const part = (v: object) => Buffer.from(JSON.stringify(v)).toString('base64url');
  const unsigned =
    part({ alg: 'RS256', kid: 'batch-a-local', typ: 'JWT' }) +
    '.' +
    part({
      sub: actor,
      role: 'authenticated',
      client_id: client,
      scope: 'openid email',
      iss: issuer,
      aud: audience,
      iat: now,
      exp: now + 3600,
    });
  return (
    unsigned + '.' + sign('RSA-SHA256', Buffer.from(unsigned), privateKey).toString('base64url')
  );
}
const bearer = token();
const foreignBearer = token(f.other);
function docker(args: string[]) {
  const result = spawnSync('docker', args, { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error('LOCAL_DOCKER_OPERATION_FAILED');
  return result.stdout;
}
function check(condition: unknown, label: string): asserts condition {
  if (!condition) throw new Error(label);
}
let logs = '';
let host: ReturnType<typeof spawn> | undefined;
const timings: number[] = [];
async function rpcHttp(method: string, params?: object, auth = bearer) {
  const started = performance.now();
  const response = await fetch(resource, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: 'Bearer ' + auth,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 66, method, ...(params ? { params } : {}) }),
  });
  timings.push(performance.now() - started);
  const raw = await response.text();
  check(!raw.includes(bearer) && !raw.includes(foreignBearer), 'BEARER_RESPONSE_LEAK');
  const frame = raw.split('\n').find((line) => line.startsWith('data: '));
  return { status: response.status, body: JSON.parse(frame ? frame.slice(6) : raw) };
}
async function call(name: string, input: object, error?: string) {
  const response = await rpcHttp('tools/call', { name, arguments: input });
  check(response.status === 200, 'MCP_TOOL_HTTP_STATUS');
  const result = response.body.result;
  if (error) {
    const received = String(result?.structuredContent?.error?.code ?? 'NONE');
    const safeReceived = /^[A-Z_]{1,60}$/.test(received) ? received : 'NO_SAFE_ERROR';
    check(
      result?.isError === true && result.structuredContent?.error?.code === error,
      'EXPECTED_' + error + '_GOT_' + safeReceived,
    );
  } else
    check(
      result?.isError !== true && result?.structuredContent?.data,
      'TOOL_FAILED_' + name.toUpperCase(),
    );
  return result?.structuredContent?.data;
}
async function rejectToolInput(name: string, input: object) {
  const response = await rpcHttp('tools/call', { name, arguments: input });
  check(response.status === 200, 'MCP_INVALID_TOOL_HTTP_STATUS');
  const result = response.body.result;
  check(
    result?.isError === true && !result?.structuredContent?.data,
    'INVALID_TOOL_INPUT_NOT_REJECTED',
  );
}
const common = () => ({ request_schema_version: 1, workspace_public_id: f.workspace });
const write = () => ({ ...common(), operation_key: randomUUID() });
const itemArgs = (id: string) => ({
  ...write(),
  plan_item_public_id: id,
  reason: 'The user requested recovery.',
});
function clearFixtureBuckets() {
  sql(`delete from internal.rate_limit_buckets where actor_user_id='${f.owner}'`);
}
async function inspector(method: string, name?: string, input?: object, expectedExit = 0) {
  const configPath = join(dir, 'inspector.json');
  writeFileSync(
    configPath,
    JSON.stringify({
      mcpServers: {
        local: {
          type: 'http',
          url: resource,
          headers: { Authorization: 'Bearer ' + bearer },
          suppressNotificationStream: true,
        },
      },
    }),
    { mode: 0o600 },
  );
  const argv = [
    '--yes',
    '@modelcontextprotocol/inspector@2.5.0',
    '--cli',
    '--config',
    configPath,
    '--server',
    'local',
    '--connect-timeout',
    '10000',
    '--stored-auth-only',
    '--format',
    'json',
    '--method',
    method,
  ];
  if (name) argv.push('--tool-name', name, '--tool-args-json', JSON.stringify(input));
  const result = await new Promise<{ code: number; output: string }>((resolve, reject) => {
    const child = spawn('npx', argv, {
      env: {
        ...process.env,
        MCP_STORAGE_DIR: dir,
        MCP_INSPECTOR_OAUTH_STATE_PATH: join(dir, 'oauth.json'),
        MCP_AUTO_OPEN_ENABLED: 'false',
      },
    });
    let output = '';
    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', () => {}); // Never emit CLI payload/error output or tokens.
    child.on('error', () => reject(new Error('INSPECTOR_PROCESS_FAILED')));
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
  check(!result.output.includes(bearer), 'INSPECTOR_BEARER_LEAK');
  check(
    result.code === expectedExit,
    `INSPECTOR_EXIT_${method}_${name ?? 'handshake'}_${result.code}_EXPECTED_${expectedExit}`,
  );
  const parsed = result.output.trim() ? JSON.parse(result.output) : {};
  console.info(`Inspector 2.5.0 ${method} ${name ?? ''}: exit ${result.code}`);
  return parsed.result;
}
try {
  const local = JSON.parse(docker(['inspect', 'supabase_rest_content-producer']))[0];
  const network = Object.keys(local.NetworkSettings.Networks)[0];
  const env: string[] = local.Config.Env.filter(
    (s: string) => s.startsWith('PGRST_') && !s.startsWith('PGRST_JWT_'),
  );
  env.push('PGRST_JWT_SECRET=' + JSON.stringify(jwks), 'PGRST_JWT_AUD=' + resource);
  const envFile = join(dir, 'postgrest.env');
  writeFileSync(envFile, env.join('\n'), { mode: 0o600 });
  docker([
    'run',
    '-d',
    '--name',
    container,
    '--network',
    network,
    '-p',
    '127.0.0.1:54329:3000',
    '--env-file',
    envFile,
    local.Config.Image,
  ]);
  const fixtureFile = join(dir, 'fixture.json');
  writeFileSync(
    fixtureFile,
    JSON.stringify({
      jwks,
      config: {
        resource,
        issuer,
        jwksUrl: issuer + '/.well-known/jwks.json',
        ownerUserId: f.owner,
        supabaseUrl: 'http://127.0.0.1:54330',
        publishableKey: 'local-fixture-public-key',
      },
    }),
    { mode: 0o600 },
  );
  host = spawn(
    'deno',
    [
      'run',
      '--allow-env=NODE_ENV,AI_AGENT,APPVEYOR,CI,DEBUG,TEST,MODE,MINIMAL,NO_COLOR,FORCE_COLOR,TERM',
      '--allow-net=127.0.0.1:54329,127.0.0.1:54330',
      '--allow-read=' + fixtureFile,
      '--config',
      'supabase/functions/deno.json',
      'supabase/functions/batch_a_server.ts',
      fixtureFile,
    ],
    {
      env: {
        PATH: process.env.PATH,
        HOME: process.env.HOME,
        NODE_ENV: 'test',
        AI_AGENT: 'none',
        APPVEYOR: '1',
      },
    },
  );
  host.stdout?.on('data', (chunk) => {
    logs += String(chunk);
  });
  host.stderr?.on('data', (chunk) => {
    logs += String(chunk);
  });
  let ready = false;
  for (let n = 0; n < 600; n++) {
    check(host.exitCode === null, 'LOCAL_HTTP_HOST_EXITED');
    try {
      ready = (await fetch(resource + '/health')).ok;
    } catch {
      /* starting */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  check(ready, 'LOCAL_HTTP_HOST_NOT_READY');
  check(
    (
      await rpcHttp('initialize', {
        protocolVersion: '2025-11-25',
        capabilities: {},
        clientInfo: { name: 'batch-a', version: '1' },
      })
    ).status === 200,
    'INITIALIZE',
  );
  const tools = (await rpcHttp('tools/list')).body.result.tools;
  check(tools.length === 33, 'EXACT_33_TOOLS');
  const defaultConfig = row<{ config: object }>(
    'select internal.default_trivia_config_v1() config',
  ).config;
  const inactiveWorkspaceListing = await (async () => {
    sql(`update public.workspaces set is_active=false where public_id='${f.workspace}'`);
    try {
      const before = stateDigest(f);
      const pageCount = () =>
        row<{ count: number }>(
          `select count(*)::integer count from public.pages
           where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
        ).count;
      const pagesBefore = pageCount();
      const listing = await rpcHttp('tools/list');
      // A direct tools/call must remain owner-scoped even without prior tools/list.
      await call('get_account_profile', { request_schema_version: 1 }, 'OWNER_ACCESS_REQUIRED');
      await call(
        'create_page',
        {
          ...write(),
          name: 'Inactive workspace must not create a Page',
          slug: f.prefix + '-inactive-denied',
          timezone: 'UTC',
          target_markets: ['US'],
          niche_key: 'trivia',
          config_schema_version: 1,
          config: defaultConfig,
          make_default: false,
        },
        'OWNER_ACCESS_REQUIRED',
      );
      check(stateDigest(f) === before && pageCount() === pagesBefore, 'INACTIVE_WORKSPACE_MUTATED');
      return listing;
    } finally {
      sql(`update public.workspaces set is_active=true where public_id='${f.workspace}'`);
    }
  })();
  check(
    inactiveWorkspaceListing.status === 403 &&
      inactiveWorkspaceListing.body.error?.code === 'OWNER_ACCESS_REQUIRED',
    'INACTIVE_WORKSPACE_LIST_DENIAL',
  );
  const foreignDenied = await rpcHttp('tools/list', undefined, foreignBearer);
  check(
    foreignDenied.status === 403 && foreignDenied.body.error?.code === 'OWNER_ACCESS_REQUIRED',
    'NON_OWNER_DENIAL',
  );
  check(
    (await rpcHttp('tools/list', undefined, token(f.owner, 'authenticated'))).status === 401,
    'EXACT_AUDIENCE_DENIAL',
  );
  const unauth = await fetch(resource, { method: 'POST', body: '{}' });
  check(unauth.status === 401, 'MISSING_TOKEN_DENIAL');
  console.info(
    'Public HTTP auth, initialize, exact 33-tool census: PASS; original RS256 user JWT accepted by real local PostgREST.',
  );

  const createPageInput = {
    ...write(),
    name: 'Batch A MCP Page',
    slug: f.prefix + '-mcp-page',
    timezone: 'UTC',
    target_markets: ['US'],
    niche_key: 'trivia',
    config_schema_version: 1,
    config: defaultConfig,
    make_default: false,
  };
  const createdPage = await call('create_page', createPageInput);
  check(createdPage.replayed === false, 'CREATE_PAGE_INITIAL');
  const createdPageId = createdPage.page.page_public_id;
  const pageReplay = await call('create_page', createPageInput);
  check(
    pageReplay.replayed === true && pageReplay.page.page_public_id === createdPageId,
    'CREATE_PAGE_REPLAY',
  );
  await call(
    'create_page',
    { ...createPageInput, name: 'Changed request under same key' },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'create_page',
    { ...write(), ...createPageInput, operation_key: randomUUID() },
    'PAGE_SLUG_CONFLICT',
  );
  const afterPage = row<{ read_count: number; write_count: number }>(
    `select
      coalesce(max(request_count) filter (where limit_group='read'), 0)::integer read_count,
      coalesce(max(request_count) filter (where limit_group='write'), 0)::integer write_count
      from internal.rate_limit_buckets
      where actor_user_id='${f.owner}' and oauth_client_id='${client}'`,
  );
  check(
    afterPage.read_count === 1 && afterPage.write_count > 0,
    'WORKSPACE_DISCOVERY_MUST_USE_ONE_READ_AND_NOT_PROBE_EACH_TOOL_CALL',
  );

  const updatePageInput = {
    ...write(),
    page_public_id: createdPageId,
    expected_page_updated_at: createdPage.page.updated_at,
    page_patch: { name: 'Batch A MCP Page updated' },
  };
  const updatedPage = await call('update_page', updatePageInput);
  check(updatedPage.replayed === false, 'UPDATE_PAGE_INITIAL');
  const updateReplay = await call('update_page', updatePageInput);
  check(updateReplay.replayed === true, 'UPDATE_PAGE_REPLAY');
  await call(
    'update_page',
    { ...updatePageInput, page_patch: { name: 'Different name under same key' } },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'update_page',
    {
      ...write(),
      page_public_id: createdPageId,
      expected_page_updated_at: createdPage.page.updated_at,
      page_patch: { name: 'stale update' },
    },
    'PAGE_VERSION_CONFLICT',
  );

  const scheduledAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const createPlanInput = {
    ...write(),
    page_public_id: createdPageId,
    niche_key: 'trivia',
    config_schema_version: 1,
    plan_intent: 'Batch A public MCP plan proof.',
    items: [
      {
        position: 1,
        scheduled_at: scheduledAt,
        topic_key: 'animals',
        format_key: 'single_subject_fast',
        interaction_goal: 'share',
        item_config: {},
      },
    ],
  };
  const createdPublicPlan = await call('create_content_plan', createPlanInput);
  check(createdPublicPlan.replayed === false, 'CREATE_PLAN_INITIAL');
  const createdPublicPlanId = createdPublicPlan.plan.plan_public_id;
  const planReplay = await call('create_content_plan', createPlanInput);
  check(
    planReplay.replayed === true && planReplay.plan.plan_public_id === createdPublicPlanId,
    'CREATE_PLAN_REPLAY',
  );
  await call(
    'create_content_plan',
    { ...createPlanInput, plan_intent: 'Changed plan intent under same key' },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'create_content_plan',
    {
      ...write(),
      page_public_id: createdPageId,
      niche_key: 'trivia',
      config_schema_version: 1,
      plan_intent: 'Schedule collision proof.',
      items: createPlanInput.items,
    },
    'SCHEDULE_CONFLICT',
  );
  console.info(
    'Public MCP→PostgREST→database Page/create/update and plan/create: owner scope, replay, payload mismatch, CAS, slug/schedule conflicts PASS.',
  );

  const p = createPlan(f, 2);
  const planId = p.data.plan.plan_public_id;
  const claimInput = { ...write(), plan_public_id: planId, limit: 1, lease_minutes: 30 };
  const claimed = await call('claim_content_plan_items', claimInput);
  const claimReplay = await call('claim_content_plan_items', claimInput);
  check(
    claimReplay.replayed === true &&
      claimReplay.claimed_items[0].claim_token === claimed.claimed_items[0].claim_token,
    'CLAIM_REPLAY_TOKEN',
  );
  await call('claim_content_plan_items', { ...claimInput, limit: 2 }, 'OPERATION_KEY_REUSED');
  const c = claimed.claimed_items[0];
  await call('report_content_plan_item_failure', {
    ...write(),
    plan_item_public_id: c.item.plan_item_public_id,
    claim_token: c.claim_token,
    failure_code: 'FACT_SOURCE_INSUFFICIENT',
    failure_detail: 'Sources were insufficient.',
    retry_recommended: true,
  });
  const retryInput = itemArgs(c.item.plan_item_public_id);
  const retried = await call('retry_content_plan_item', retryInput);
  check(
    retried.item.status === 'pending' && retried.item.attempt_count === 1,
    'RETRY_ATTEMPT_HISTORY',
  );
  const beforeReplay = stateDigest(f);
  const replay = await call('retry_content_plan_item', retryInput);
  check(replay.replayed === true && stateDigest(f) === beforeReplay, 'RETRY_REPLAY_MUTATED');
  await call(
    'retry_content_plan_item',
    { ...retryInput, reason: 'Changed reason.' },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'retry_content_plan_item',
    itemArgs(c.item.plan_item_public_id),
    'PLAN_STATUS_CONFLICT',
  );
  const completed = p.data.items[1]!.plan_item_public_id;
  completeFixtureItem(completed);
  const discarded = insertPost(completed);
  await call('retry_content_plan_item', itemArgs(completed), 'PLAN_STATUS_CONFLICT');
  const replacementInput = {
    ...itemArgs(completed),
    discarded_post_public_id: discarded,
    explicit_replacement: true,
  };
  const replaced = await call('replace_discarded_plan_item', replacementInput);
  check(
    replaced.item.status === 'pending' && !!replaced.replacement_history_public_id,
    'REPLACEMENT_REFERENCE',
  );
  check(
    (await call('replace_discarded_plan_item', replacementInput)).replayed === true,
    'REPLACEMENT_REPLAY',
  );
  const publishedPlan = createPlan(f, 1);
  const published = publishedPlan.data.items[0]!.plan_item_public_id;
  completeFixtureItem(published);
  insertPost(published, 'posted');
  await call(
    'replace_discarded_plan_item',
    { ...itemArgs(published), discarded_post_public_id: randomUUID(), explicit_replacement: true },
    'POST_NOT_FOUND',
  );
  const mixed = createPlan(f, 2);
  const keptItem = mixed.data.items[0]!.plan_item_public_id;
  completeFixtureItem(keptItem);
  const keptPost = insertPost(keptItem, 'draft');
  const cancelInput = {
    ...write(),
    plan_public_id: mixed.data.plan.plan_public_id,
    reason: 'The user requested cancellation.',
    explicit_cancellation: true,
  };
  const cancelled = await call('cancel_content_plan', cancelInput);
  check(
    cancelled.changed_count === 1 && cancelled.preserved_completed_count === 1,
    'CANCEL_COMPLETED_COUNTS',
  );
  check(
    row<{ kept: boolean }>(
      `select exists(select 1 from public.posts where public_id='${keptPost}') kept`,
    ).kept,
    'CANCEL_DELETED_POST',
  );
  check((await call('cancel_content_plan', cancelInput)).replayed === true, 'CANCEL_REPLAY');
  // Two independent HTTP requests share the real RPC's locking rules.
  const race = createPlan(f, 2);
  const raceId = race.data.plan.plan_public_id;
  const raced = await Promise.all([
    rpcHttp('tools/call', {
      name: 'claim_content_plan_items',
      arguments: { ...write(), plan_public_id: raceId, limit: 2, lease_minutes: 30 },
    }),
    rpcHttp('tools/call', {
      name: 'cancel_content_plan',
      arguments: {
        ...write(),
        plan_public_id: raceId,
        reason: 'Cancel this batch.',
        explicit_cancellation: true,
      },
    }),
  ]);
  check(
    raced.every((r) => r.status === 200),
    'RACE_HTTP',
  );
  check(raced[1].body.result.isError !== true, 'RACE_CANCEL_FAILED');
  check(
    raced[0].body.result.isError !== true ||
      raced[0].body.result.structuredContent.error.code === 'PLAN_STATUS_CONFLICT',
    'RACE_CLAIM_OUTCOME',
  );
  check(
    row<{ safe: boolean }>(
      `select bool_and(status='cancelled' and claim_token is null) safe from public.content_plan_items where plan_id=(select id from public.content_plans where public_id='${raceId}')`,
    ).safe,
    'CLAIM_CANCEL_RACE',
  );
  console.info(
    'Real HTTP MCP recovery/replacement/cancel, replay/mismatch, completed preservation and claim/cancel race: PASS.',
  );

  // Phase 6.13: public HTTP MCP -> signed owner JWT -> real PostgREST -> public trivia RPCs.
  clearFixtureBuckets();
  const triviaCandidate = candidate();
  const findInput = {
    ...common(),
    page_public_id: f.page,
    candidates: [triviaCandidate],
    max_matches_per_candidate: 10,
  };
  const beforeTrivia = stateDigest(f);
  const initialMatches = await call('trivia_find_similar_facts', findInput);
  check(initialMatches.candidates.length === 1, 'TRIVIA_SEARCH_CENSUS');
  check(stateDigest(f) === beforeTrivia, 'TRIVIA_SEARCH_MUTATED');
  const configTime = row<{ t: string }>(`
    select internal.iso_timestamp_v1(n.updated_at) t
    from public.page_niche_configs n join public.pages p on p.id=n.page_id
    where p.public_id='${f.page}' and n.niche_key='trivia'`).t;
  const reservationInput = {
    ...write(),
    page_public_id: f.page,
    reservation_token: randomUUID(),
    expected_config_updated_at: configTime,
    fact_reuse_scope: 'workspace_unique',
    reservation_ttl_minutes: 30,
    facts: [factInput(triviaCandidate)],
  };
  const firstReserve = await rpcHttp('tools/call', {
    name: 'trivia_register_and_reserve_facts',
    arguments: reservationInput,
  });
  check(
    firstReserve.status === 200 && firstReserve.body.result?.isError !== true,
    'TRIVIA_RESERVE',
  );
  const reservedTrivia = firstReserve.body.result.structuredContent.data;
  check(reservedTrivia.reservation_token === reservationInput.reservation_token, 'RESERVE_TOKEN');
  check(
    !JSON.stringify(firstReserve.body.result.content).includes(reservationInput.reservation_token),
    'RESERVE_TEXT_PRIVACY',
  );
  check(reservedTrivia.facts.length === 1 && reservedTrivia.replayed === false, 'RESERVE_ATOMIC');
  const replayReserve = await call('trivia_register_and_reserve_facts', reservationInput);
  check(
    replayReserve.replayed === true &&
      replayReserve.reservation_token === reservationInput.reservation_token,
    'RESERVE_REPLAY',
  );
  await call(
    'trivia_register_and_reserve_facts',
    {
      ...reservationInput,
      reservation_ttl_minutes: 31,
    },
    'OPERATION_KEY_REUSED',
  );
  const conflicting = {
    ...reservationInput,
    operation_key: randomUUID(),
    reservation_token: randomUUID(),
  };
  await call('trivia_register_and_reserve_facts', conflicting, 'FACT_RESERVATION_CONFLICT');
  const foundReserved = await call('trivia_find_similar_facts', findInput);
  check(
    foundReserved.candidates[0].matches.some(
      (m: { reuse_eligibility: string }) => m.reuse_eligibility === 'actively_reserved',
    ),
    'SEARCH_RESERVATION_SIGNAL',
  );
  const denied = await rpcHttp(
    'tools/call',
    {
      name: 'trivia_release_facts',
      arguments: {
        ...write(),
        page_public_id: f.page,
        reservation_token: reservationInput.reservation_token,
        reason: 'Abandon the attempt.',
      },
    },
    foreignBearer,
  );
  check(
    denied.status === 403 ||
      (denied.body.result?.isError === true &&
        denied.body.result.structuredContent.error.code === 'OWNER_ACCESS_REQUIRED'),
    'TRIVIA_OWNER_DENIAL',
  );
  const releaseInput = {
    ...write(),
    page_public_id: f.page,
    reservation_token: reservationInput.reservation_token,
    reason: 'Abandon the attempt.',
  };
  const releasedTrivia = await call('trivia_release_facts', releaseInput);
  check(releasedTrivia.released_fact_public_ids.length === 1, 'RELEASE_TOKEN_BOUND');
  check((await call('trivia_release_facts', releaseInput)).replayed === true, 'RELEASE_REPLAY');
  const tokenInLedger = row<{ n: number }>(`
    select count(*)::integer n from internal.operation_ledger
    where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')
    and response_snapshot::text like '%${reservationInput.reservation_token}%'`).n;
  check(tokenInLedger === 0, 'TRIVIA_TOKEN_IN_LEDGER');
  const afterRelease = await call('trivia_find_similar_facts', findInput);
  check(afterRelease.candidates[0].matches.length > 0, 'SEARCH_RETURNS_CANONICAL');
  // Two authenticated MCP calls contend for the same candidate; only one reserve may win.
  clearFixtureBuckets();
  const raceCandidate = candidate();
  const raceBase = {
    ...write(),
    page_public_id: f.page,
    reservation_token: randomUUID(),
    expected_config_updated_at: configTime,
    fact_reuse_scope: 'workspace_unique',
    reservation_ttl_minutes: 30,
    facts: [factInput(raceCandidate)],
  };
  const raceResults = await Promise.all(
    [
      raceBase,
      {
        ...raceBase,
        operation_key: randomUUID(),
        reservation_token: randomUUID(),
      },
    ].map((input) =>
      rpcHttp('tools/call', {
        name: 'trivia_register_and_reserve_facts',
        arguments: input,
      }),
    ),
  );
  check(
    raceResults.every((r) => r.status === 200),
    'TRIVIA_RACE_HTTP',
  );
  check(
    raceResults.filter((r) => r.body.result?.isError !== true).length === 1,
    'TRIVIA_RACE_ONE_WINNER',
  );
  check(
    raceResults.filter(
      (r) => r.body.result?.structuredContent?.error?.code === 'FACT_RESERVATION_CONFLICT',
    ).length === 1,
    'TRIVIA_RACE_CONFLICT',
  );
  console.info(
    'Public MCP trivia search/read-only, reserve/replay/mismatch, release/replay, owner and ledger token privacy, contention: PASS.',
  );
  // Phase 6.13: HTTP MCP -> original owner JWT -> public RPC, including real CAS
  // and cross-Page correction effects. DB tests separately cover fault rollback.
  clearFixtureBuckets();
  const refreshedCandidate = candidate();
  const refreshReservation = {
    ...write(),
    page_public_id: f.page,
    reservation_token: randomUUID(),
    expected_config_updated_at: configTime,
    fact_reuse_scope: 'workspace_unique',
    reservation_ttl_minutes: 30,
    facts: [factInput(refreshedCandidate)],
  };
  const refreshedCreated = await call('trivia_register_and_reserve_facts', refreshReservation);
  const refreshId = refreshedCreated.facts[0].fact_public_id;
  console.info('6.12 HTTP stage A: reserved reverify fixture');
  const identityBefore = row<{
    hash: string;
  }>(`select md5(row(claim_text,claim_hash,structured_key,structured_hash)::text) hash
    from public.trivia_facts where public_id='${refreshId}'`).hash;
  const oldCas = time(refreshId);
  const reverifyInput = {
    ...write(),
    fact_public_id: refreshId,
    expected_fact_updated_at: oldCas,
    confirmed_claim_text: String(refreshedCandidate.claim_text),
    sources: [source('A', 'fresh-evidence')],
    freshness_class: 'stable',
    as_of_date: null,
    requested_expires_at: '2027-01-11T00:00:00Z',
    risk_class: 'standard',
    review_note: 'Confirmed unchanged meaning with new sources.',
  };
  const refreshed = await call('trivia_reverify_fact', reverifyInput);
  console.info('6.12 HTTP stage B: refreshed canonical evidence');
  check(
    refreshed.replayed === false && refreshed.verification_status === 'verified',
    'REVERIFY_CURRENT',
  );
  check(refreshed.fact_updated_at !== oldCas, 'REVERIFY_ADVANCES_CAS');
  check(
    row<{
      hash: string;
    }>(`select md5(row(claim_text,claim_hash,structured_key,structured_hash)::text) hash
    from public.trivia_facts where public_id='${refreshId}'`).hash === identityBefore,
    'REVERIFY_IDENTITY_UNCHANGED',
  );
  check((await call('trivia_reverify_fact', reverifyInput)).replayed === true, 'REVERIFY_REPLAY');
  await call('trivia_reverify_fact', { ...reverifyInput, ...write() }, 'FACT_CORRECTION_CONFLICT');
  await call(
    'trivia_reverify_fact',
    {
      ...reverifyInput,
      ...write(),
      expected_fact_updated_at: refreshed.fact_updated_at,
      confirmed_claim_text: 'This changes the proposition.',
    },
    'FACT_CORRECTION_REQUIRED',
  );
  await call(
    'trivia_reverify_fact',
    { ...reverifyInput, review_note: 'Different source review.' },
    'OPERATION_KEY_REUSED',
  );
  const reverifyDenied = await rpcHttp(
    'tools/call',
    { name: 'trivia_reverify_fact', arguments: { ...reverifyInput, ...write() } },
    foreignBearer,
  );
  check(
    reverifyDenied.status === 403 ||
      reverifyDenied.body.result?.structuredContent?.error?.code === 'OWNER_ACCESS_REQUIRED',
    'REVERIFY_OWNER_DENIED',
  );
  await call('trivia_release_facts', {
    ...write(),
    page_public_id: f.page,
    reservation_token: refreshReservation.reservation_token,
    reason: 'Release before post snapshot fixtures.',
  });
  console.info('6.12 HTTP stage C: reverify denial/release verified');
  const draftPost = postFixture(f, refreshId);
  const readyPost = postFixture(secondPage(f), refreshId, 'ready');
  const postedPost = postFixture(secondPage(f), refreshId, 'posted');
  const archivedPost = postFixture(secondPage(f), refreshId, 'archived');
  const historyBefore = row<{ hash: string }>(`select md5((
      (select jsonb_agg(to_jsonb(p) order by p.id) from public.posts p
       where p.public_id in ('${postedPost}','${archivedPost}'))::text ||
      (select jsonb_agg(to_jsonb(j) order by j.id) from public.trivia_post_facts j
       where j.fact_id=(select id from public.trivia_facts where public_id='${refreshId}'))::text
    )) hash`).hash;
  console.info('6.12 HTTP stage D: post snapshots recorded');
  const correctionInput = {
    ...write(),
    fact_public_id: refreshId,
    // Release and binding changes may advance fact.updated_at. Enforce CAS on current row.
    expected_fact_updated_at: time(refreshId),
    action: 'invalidate',
    correction_reason: 'Fresh external evidence invalidated this claim.',
    explicit_correction: true,
  };
  const invalidated = await call('trivia_correct_fact', correctionInput);
  console.info('6.12 HTTP stage E: invalidation RPC succeeded');
  check(
    invalidated.old_status === 'invalidated' && invalidated.successor_public_id === null,
    'CORRECTION_INVALIDATE',
  );
  check(
    invalidated.affected_posts.draft.count === 1 &&
      invalidated.affected_posts.ready.count === 1 &&
      invalidated.affected_posts.posted.count === 2,
    'CORRECTION_CROSS_PAGE_COUNTS',
  );
  check(
    row<{ count: number }>(`select count(*)::integer count from public.posts
    where public_id in ('${draftPost}','${readyPost}') and status='draft'
      and quality_status='failed' and revision=2 and approval_snapshot is null`).count === 2,
    'CORRECTION_REVOKES_READY',
  );
  const historyAfter = row<{ hash: string }>(`select md5((
      (select jsonb_agg(to_jsonb(p) order by p.id) from public.posts p
       where p.public_id in ('${postedPost}','${archivedPost}'))::text ||
      (select jsonb_agg(to_jsonb(j) order by j.id) from public.trivia_post_facts j
       where j.fact_id=(select id from public.trivia_facts where public_id='${refreshId}'))::text
    )) hash`).hash;
  check(historyBefore === historyAfter, 'IMMUTABLE_POSTED_ARCHIVED_SNAPSHOTS');
  check(
    (await call('trivia_correct_fact', correctionInput)).replayed === true,
    'CORRECTION_REPLAY',
  );
  await call(
    'trivia_correct_fact',
    { ...correctionInput, correction_reason: 'Altered reason.' },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'trivia_correct_fact',
    { ...correctionInput, ...write(), expected_fact_updated_at: oldCas },
    'FACT_CORRECTION_CONFLICT',
  );
  await call(
    'trivia_correct_fact',
    { ...correctionInput, ...write(), expected_fact_updated_at: time(refreshId) },
    'FACT_NOT_ELIGIBLE',
  );
  console.info('6.12 HTTP stage F: correction replay/CAS/immutable snapshots verified');
  const supersedeCandidate = candidate();
  const oldFact = (
    await call('trivia_register_and_reserve_facts', {
      ...write(),
      page_public_id: f.page,
      reservation_token: randomUUID(),
      expected_config_updated_at: configTime,
      fact_reuse_scope: 'workspace_unique',
      reservation_ttl_minutes: 30,
      facts: [factInput(supersedeCandidate)],
    })
  ).facts[0].fact_public_id;
  const correctedCandidate = {
    ...supersedeCandidate,
    candidate_key: 'corrected-' + randomUUID().replaceAll('-', '').slice(0, 12),
    claim_text: randomUUID().replaceAll('-', ''),
    object_key: '4',
    numbers: [{ value: '4', unit: 'count', role: 'count' }],
  };
  const successor = factInput(correctedCandidate);
  delete successor.position;
  const superseded = await call('trivia_correct_fact', {
    ...write(),
    fact_public_id: oldFact,
    expected_fact_updated_at: time(oldFact),
    action: 'supersede',
    correction_reason: 'A different proposition is correct.',
    successor,
    explicit_correction: true,
  });
  check(
    superseded.old_status === 'superseded' && !!superseded.successor_public_id,
    'CORRECTION_SUCCESSOR',
  );
  check(
    row<{ count: number }>(`select count(*)::integer count from public.trivia_facts n
    join public.trivia_facts o on n.supersedes_fact_id=o.id
    where o.public_id='${oldFact}' and n.public_id='${superseded.successor_public_id}'`).count ===
      1,
    'CORRECTION_LINEAGE',
  );
  console.info('6.12 HTTP stage G: correction successor lineage verified');
  console.info(
    'Phase 6.13 public MCP correction: CAS/replay/semantic denial, owner isolation, lineage, draft-ready transition, posted-archived immutability PASS.',
  );

  // 6.9: real authenticated Streamable HTTP -> public PostgREST -> Phase 5 RPCs.
  // Local fixture hygiene only; production rate-limit thresholds remain unchanged.
  clearFixtureBuckets();
  const postsBefore = () =>
    row<{ count: number }>(
      `select count(*)::integer count from public.posts where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`,
    ).count;
  function draftArgs(r: ReturnType<typeof postRequest>) {
    return {
      ...write(),
      page_public_id: f.page,
      niche_key: 'trivia',
      reservation_token: r.token,
      expected_config_updated_at: r.configTime,
      plan_item: r.plan,
      scheduled_at: r.schedule,
      content_schema_version: 1,
      format_key: r.format,
      topic_key: r.topic,
      interaction_goal: r.goal,
      content_payload: r.content,
      generation_snapshot: r.generation,
      fact_bindings: r.bindings,
      editorial_checks: r.editorial,
    };
  }
  console.info('POST_P0_FIXTURE_BEGIN');
  const draftRequest = postRequest(f);
  console.info('POST_P1_FIXTURE_READY');
  const draft = draftArgs(draftRequest);
  const beforeSave = postsBefore();
  await call(
    'save_post',
    {
      ...draft,
      reservation_token: randomUUID(),
    },
    'FACT_RESERVATION_MISMATCH',
  );
  check(postsBefore() === beforeSave, 'SAVE_BAD_TOKEN_ROLLBACK');
  await call(
    'save_post',
    {
      ...draft,
      plan_item: { plan_item_public_id: randomUUID(), claim_token: randomUUID() },
    },
    'PLAN_ITEM_NOT_FOUND',
  );
  check(postsBefore() === beforeSave, 'SAVE_BAD_PLAN_ROLLBACK');
  console.info('POST_P2_NEGATIVE_CASES_PASSED');
  const saved = await call('save_post', draft);
  console.info('POST_P3_DRAFT_SAVED');
  check(
    saved.post.status === 'draft' &&
      saved.post.revision === 1 &&
      saved.post.fact_bindings.length === draftRequest.bindings.length &&
      saved.post.quality_status !== undefined &&
      saved.plan === null &&
      saved.replayed === false,
    'SAVE_ONLY_DRAFT',
  );
  const saveReplay = await call('save_post', draft);
  check(
    saveReplay.replayed === true &&
      saveReplay.post.post_public_id === saved.post.post_public_id &&
      postsBefore() === beforeSave + 1,
    'SAVE_REPLAY_DEDUP',
  );
  await call('save_post', { ...draft, topic_key: 'geography' }, 'OPERATION_KEY_REUSED');
  check(postsBefore() === beforeSave + 1, 'SAVE_KEY_MISMATCH_ROLLBACK');
  console.info('POST_P4_REPLAY_PASSED');
  const fetched = await call('get_post', {
    ...common(),
    post_public_id: saved.post.post_public_id,
  });
  check(
    fetched.post.status === 'draft' &&
      fetched.post.content_hash === saved.post.content_hash &&
      fetched.post.content_payload.canva_copy === draftRequest.content.canva_copy &&
      fetched.post.fact_bindings.length === draftRequest.bindings.length &&
      fetched.latest_metrics === null &&
      fetched.approval === null,
    'GET_FULL_OWNER_PACKAGE',
  );
  const noSources = await call('get_post', {
    ...common(),
    post_public_id: saved.post.post_public_id,
    include_sources: false,
    include_checks: false,
    include_latest_metrics: false,
  });
  check(
    noSources.post.fact_bindings.every((b: Record<string, unknown>) => !('source_snapshot' in b)),
    'GET_SOURCES_REDACTED',
  );
  check(
    !JSON.stringify(fetched).includes(draftRequest.token) &&
      !JSON.stringify(fetched).includes(bearer),
    'GET_PRIVATE_TOKEN_REDACTION',
  );
  console.info('POST_P5_POST_READ_PASSED');
  const another = postRequest(f);
  const second = await call('save_post', draftArgs(another));
  check(second.post.status === 'draft', 'SECOND_DRAFT');
  console.info('POST_P6_SECOND_DRAFT_SAVED');
  const pageList = await call('list_posts', {
    ...common(),
    page_public_id: f.page,
    niche_key: 'trivia',
    statuses: ['draft'],
    limit: 1,
  });
  check(
    pageList.items.length === 1 && pageList.has_more && !!pageList.next_cursor,
    'LIST_BOUNDED_CURSOR',
  );
  const next = await call('list_posts', {
    ...common(),
    page_public_id: f.page,
    niche_key: 'trivia',
    statuses: ['draft'],
    limit: 1,
    cursor: pageList.next_cursor,
  });
  check(
    next.items.length === 1 && next.items[0].post_public_id !== pageList.items[0].post_public_id,
    'LIST_NEXT_PAGE_UNIQUE',
  );
  const emptyPosts = await call('list_posts', {
    ...common(),
    query: 'no-such-hook-6-9-fixture',
    limit: 1,
  });
  check(emptyPosts.items.length === 0 && !emptyPosts.has_more, 'LIST_EMPTY');
  await call(
    'get_post',
    {
      ...common(),
      post_public_id: randomUUID(),
    },
    'POST_NOT_FOUND',
  );
  await call(
    'list_posts',
    {
      ...common(),
      limit: 1,
      cursor: 'malformed',
    },
    'VALIDATION_FAILED',
  );
  for (const [name, args] of [
    ['list_posts', { ...common() }],
    ['get_post', { ...common(), post_public_id: saved.post.post_public_id }],
    ['save_post', draft],
  ] as const) {
    const denied = await rpcHttp('tools/call', { name, arguments: args }, foreignBearer);
    check(
      denied.status === 403 && denied.body.error?.code === 'OWNER_ACCESS_REQUIRED',
      'POST_FOREIGN_OWNER_DENIAL',
    );
  }
  console.info('POST_P7_READ_AND_ISOLATION_PASSED');
  // Real claimed plan item: save converts reservation and finishes only the claimed slot.
  const planForSave = await call('create_content_plan', {
    ...write(),
    page_public_id: f.page,
    niche_key: 'trivia',
    config_schema_version: 1,
    plan_intent: '6.12 local claim-to-draft acceptance.',
    items: [
      {
        position: 1,
        topic_key: 'animals',
        format_key: 'single_subject_fast',
        interaction_goal: 'share',
        item_config: {},
        scheduled_at: null,
      },
    ],
  });
  const claimForSave = await call('claim_content_plan_items', {
    ...write(),
    plan_public_id: planForSave.plan.plan_public_id,
    lease_minutes: 30,
    limit: 1,
  });
  const lease = claimForSave.claimed_items[0];
  check(!!lease?.claim_token, 'CLAIM_FOR_DRAFT');
  const claimedRequest = postRequest(f);
  const claimedArgs = {
    ...draftArgs(claimedRequest),
    plan_item: {
      plan_item_public_id: lease.item.plan_item_public_id,
      claim_token: lease.claim_token,
    },
  };
  console.info('POST_P8_PLAN_CLAIM_READY');
  const completedDraft = await call('save_post', claimedArgs);
  check(
    completedDraft.post.status === 'draft' &&
      completedDraft.plan?.progress.completed === 1 &&
      completedDraft.plan.status === 'completed',
    'CLAIM_COMPLETE_DRAFT',
  );
  const claimedReplay = await call('save_post', claimedArgs);
  check(
    claimedReplay.replayed &&
      claimedReplay.post.post_public_id === completedDraft.post.post_public_id,
    'CLAIM_SAVE_REPLAY',
  );
  console.info(
    '6.12 authenticated public HTTP: save draft, atomic rollback, replay, plan claim, safe reads, pagination and foreign denial PASS.',
  );

  // Phase 6.13: public MCP -> verified user JWT -> real local PostgREST RPC.
  clearFixtureBuckets();
  const revisionInput = {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: saved.post.revision,
    expected_content_hash: saved.post.content_hash,
    reservation_token: null,
    content_schema_version: 1,
    format_key: draft.format_key,
    topic_key: draft.topic_key,
    interaction_goal: draft.interaction_goal,
    content_payload: { ...draft.content_payload, caption: 'Revised caption for checkpoint 6.12.' },
    generation_snapshot: draft.generation_snapshot,
    fact_bindings: draft.fact_bindings,
    editorial_checks: draft.editorial_checks,
    revision_reason: 'Improve the reviewed caption.',
  };
  await call('revise_post', { ...revisionInput, expected_revision: 999 }, 'REVISION_CONFLICT');
  await call(
    'revise_post',
    { ...revisionInput, expected_content_hash: '0'.repeat(64) },
    'CONTENT_HASH_CONFLICT',
  );
  const revised = await call('revise_post', revisionInput);
  check(
    revised.post.revision === 2 &&
      revised.post.content_hash !== saved.post.content_hash &&
      revised.post.status === 'draft' &&
      revised.approval_invalidated === false &&
      revised.replaced_fact_public_ids.length === 0 &&
      revised.released_fact_public_ids.length === 0,
    'REVISE_EXACT_CAS_AND_QUALITY',
  );
  check((await call('revise_post', revisionInput)).replayed, 'REVISE_EXACT_REPLAY');
  await call(
    'revise_post',
    { ...revisionInput, revision_reason: 'Changed reason.' },
    'OPERATION_KEY_REUSED',
  );
  await call('revise_post', { ...revisionInput, ...write() }, 'REVISION_CONFLICT');
  const revisionRead = await call('get_post', {
    ...common(),
    post_public_id: saved.post.post_public_id,
    include_sources: false,
  });
  check(
    revisionRead.post.revision === 2 &&
      revisionRead.post.content_hash === revised.post.content_hash &&
      revisionRead.post.content_payload.caption === 'Revised caption for checkpoint 6.12.' &&
      revised.post.system_checks.post_revision === 2 &&
      revised.post.editorial_checks.post_revision === 2 &&
      revisionRead.post.system_checks.content_hash === revised.post.content_hash &&
      revisionRead.post.editorial_checks.content_hash === revised.post.content_hash &&
      !revisionRead.post.fact_bindings.some((b: Record<string, unknown>) => 'source_snapshot' in b),
    'REVISE_QUALITY_SOURCE_PRIVACY',
  );
  const movedAt = new Date(Date.now() + 90 * 86400000).toISOString();
  const move = {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: revised.post.revision,
    scheduled_at: movedAt,
    reason: 'Move the planned time.',
  };
  const moved = await call('reschedule_post', move);
  check(
    moved.revision === 3 &&
      Date.parse(moved.scheduled_at) === Date.parse(movedAt) &&
      moved.content_hash_unchanged &&
      moved.plan_item_schedule === null,
    'RESCHEDULE_EXACT_REVISION_AND_HASH',
  );
  check((await call('reschedule_post', move)).replayed, 'RESCHEDULE_REPLAY');
  await call('reschedule_post', { ...move, reason: 'Different reason.' }, 'OPERATION_KEY_REUSED');
  await call('reschedule_post', { ...move, ...write() }, 'REVISION_CONFLICT');
  await call(
    'reschedule_post',
    {
      ...write(),
      post_public_id: second.post.post_public_id,
      expected_revision: second.post.revision,
      scheduled_at: movedAt,
      reason: 'Colliding slot.',
    },
    'SCHEDULE_CONFLICT',
  );
  const cleared = await call('reschedule_post', {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: moved.revision,
    scheduled_at: null,
    reason: 'Clear the planned slot.',
  });
  check(
    cleared.revision === 4 && cleared.scheduled_at === null && cleared.content_hash_unchanged,
    'CLEAR_SCHEDULE',
  );
  const finalRead = await call('get_post', {
    ...common(),
    post_public_id: saved.post.post_public_id,
  });
  check(
    finalRead.post.content_hash === revised.post.content_hash && finalRead.post.revision === 4,
    'SCHEDULE_DOES_NOT_CHANGE_CONTENT',
  );
  await call(
    'revise_post',
    { ...revisionInput, ...write(), post_public_id: randomUUID() },
    'POST_NOT_FOUND',
  );
  await call(
    'reschedule_post',
    {
      ...write(),
      post_public_id: randomUUID(),
      expected_revision: 1,
      scheduled_at: null,
      reason: 'Reject unknown post.',
    },
    'POST_NOT_FOUND',
  );
  console.info(
    '6.13 real public HTTP post revise/reschedule: CAS, quality, source privacy, replay, schedule conflict, clear and rollback PASS.',
  );

  clearFixtureBuckets();
  const approvalArgs = {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: finalRead.post.revision,
    expected_content_hash: finalRead.post.content_hash,
    explicit_approval: true,
    accepted_warning_ids: ['trivia.profile.preferred_band'],
    warning_acceptance_reason: 'Accept the reviewed preferred profile warning.',
  };
  await rejectToolInput('approve_post', { ...approvalArgs, explicit_approval: false });
  await call('approve_post', { ...approvalArgs, expected_revision: 999 }, 'REVISION_CONFLICT');
  await call(
    'approve_post',
    { ...approvalArgs, expected_content_hash: '0'.repeat(64) },
    'CONTENT_HASH_CONFLICT',
  );
  const approved = await call('approve_post', approvalArgs);
  check(
    approved.status === 'ready' &&
      approved.revision === finalRead.post.revision + 1 &&
      approved.approval.approved_revision === approved.revision &&
      approved.approval.content_hash === finalRead.post.content_hash &&
      approved.recomputed_checks.post_revision === approved.revision &&
      approved.recomputed_checks.content_hash === finalRead.post.content_hash,
    'APPROVE_EXACT_CURRENT_EVIDENCE',
  );
  check((await call('approve_post', approvalArgs)).replayed, 'APPROVE_REPLAY');
  await call(
    'approve_post',
    { ...approvalArgs, expected_revision: approvalArgs.expected_revision + 1 },
    'OPERATION_KEY_REUSED',
  );
  const revokeArgs = {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: approved.revision,
    expected_content_hash: finalRead.post.content_hash,
    reason: 'Withdraw approval after current review.',
    explicit_revocation: true,
  };
  const revoked = await call('revoke_post_approval', revokeArgs);
  check(
    revoked.status === 'draft' &&
      revoked.revision === approved.revision + 1 &&
      revoked.approval_revoked,
    'REVOKE_TO_DRAFT',
  );
  check((await call('revoke_post_approval', revokeArgs)).replayed, 'REVOKE_REPLAY');
  await call(
    'revoke_post_approval',
    { ...revokeArgs, reason: 'Different reason.' },
    'OPERATION_KEY_REUSED',
  );
  const reapproved = await call('approve_post', {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: revoked.revision,
    expected_content_hash: finalRead.post.content_hash,
    explicit_approval: true,
    accepted_warning_ids: ['trivia.profile.preferred_band'],
    warning_acceptance_reason: 'Accept the reviewed preferred profile warning.',
  });
  const discardArgs = {
    ...write(),
    post_public_id: saved.post.post_public_id,
    expected_revision: reapproved.revision,
    reason: 'Abandon this pre-publication post.',
    explicit_discard: true,
  };
  const discardResult = await call('discard_post', discardArgs);
  check(
    discardResult.status === 'discarded' &&
      discardResult.revision === reapproved.revision + 1 &&
      discardResult.released_fact_public_ids.length === draft.fact_bindings.length &&
      discardResult.plan_item === null,
    'DISCARD_RELEASES_ALLOCATIONS',
  );
  check((await call('discard_post', discardArgs)).replayed, 'DISCARD_REPLAY');
  await call(
    'discard_post',
    {
      ...write(),
      post_public_id: saved.post.post_public_id,
      expected_revision: discardResult.revision,
      reason: 'Discard again.',
      explicit_discard: true,
    },
    'INVALID_STATUS_TRANSITION',
  );
  const discardedRead = await call('get_post', {
    ...common(),
    post_public_id: saved.post.post_public_id,
  });
  check(
    discardedRead.post.status === 'discarded' &&
      discardedRead.post.fact_bindings.every(
        (binding: Record<string, unknown>) => binding.allocation_state === 'released',
      ) &&
      discardedRead.approval === null,
    'DISCARD_TERMINAL_CURRENT_STATE',
  );
  console.info(
    '6.13 real public HTTP approval/revoke/discard: explicit intent, CAS, current evidence, replay and allocation release PASS.',
  );

  // Phase 6.13: a separate ready post is manually recorded, never sent to Facebook.
  clearFixtureBuckets();
  const manualRequest = postRequest(f);
  const manualSaved = await call('save_post', draftArgs(manualRequest));
  const manualPostId = manualSaved.post.post_public_id;
  const prematurePublication = {
    ...write(),
    post_public_id: manualPostId,
    expected_revision: manualSaved.post.revision,
    expected_content_hash: manualSaved.post.content_hash,
    published_at: new Date().toISOString(),
    explicit_publication_confirmation: true,
  };
  await call('mark_post_posted', prematurePublication, 'INVALID_STATUS_TRANSITION');
  const manualReady = await call('approve_post', {
    ...write(),
    post_public_id: manualPostId,
    expected_revision: manualSaved.post.revision,
    expected_content_hash: manualSaved.post.content_hash,
    explicit_approval: true,
    accepted_warning_ids: ['trivia.profile.preferred_band'],
    warning_acceptance_reason: 'Accept the reviewed preferred profile warning.',
  });
  const publicationArgs = {
    ...write(),
    post_public_id: manualPostId,
    expected_revision: manualReady.revision,
    expected_content_hash: manualSaved.post.content_hash,
    published_at: new Date().toISOString(),
    platform_post_id: 'manual-612',
    published_url: 'https://example.test/manual-post',
    explicit_publication_confirmation: true,
  };
  await rejectToolInput('mark_post_posted', {
    ...publicationArgs,
    explicit_publication_confirmation: false,
  });
  await rejectToolInput('mark_post_posted', {
    ...publicationArgs,
    published_url: 'http://insecure.test/post',
  });
  await call('mark_post_posted', { ...publicationArgs, expected_revision: 1 }, 'REVISION_CONFLICT');
  await call(
    'mark_post_posted',
    { ...publicationArgs, expected_content_hash: '0'.repeat(64) },
    'CONTENT_HASH_CONFLICT',
  );
  const manualPosted = await call('mark_post_posted', publicationArgs);
  check(
    manualPosted.status === 'posted' &&
      manualPosted.revision === manualReady.revision + 1 &&
      manualPosted.platform_post_id === 'manual-612' &&
      manualPosted.published_url === publicationArgs.published_url &&
      Date.parse(manualPosted.published_at) === Date.parse(publicationArgs.published_at) &&
      manualPosted.published_fact_public_ids.length === manualRequest.bindings.length,
    'PUBLICATION_PROVENANCE_AND_FACTS',
  );
  check((await call('mark_post_posted', publicationArgs)).replayed, 'PUBLICATION_REPLAY');
  await call(
    'mark_post_posted',
    { ...publicationArgs, published_url: 'https://example.test/different' },
    'OPERATION_KEY_REUSED',
  );
  const manualUsageCount = row<{ count: number }>(
    "select count(*)::integer count from public.trivia_post_facts j join public.posts p on p.id=j.post_id where p.public_id='" +
      manualPostId +
      "' and j.is_current and j.allocation_state='published'",
  ).count;
  check(
    manualUsageCount === manualPosted.published_fact_public_ids.length,
    'PUBLISHED_FACT_ALLOCATION_PERMANENT',
  );
  const preservedEvidence = () =>
    row<{ digest: string }>(
      "select md5(row(system_checks,editorial_checks,approval_snapshot,quality_status,ready_at,published_at,platform_post_id,published_url,content_hash,content_payload,generation_snapshot)::text) digest from public.posts where public_id='" +
        manualPostId +
        "'",
    ).digest;
  const beforeArchive = preservedEvidence();
  const archiveArgs = {
    ...write(),
    post_public_id: manualPostId,
    expected_revision: manualPosted.revision,
    reason: 'Archive this verified publication without rewriting its history.',
    explicit_archive: true,
  };
  await rejectToolInput('archive_post', { ...archiveArgs, explicit_archive: false });
  await call('archive_post', { ...archiveArgs, expected_revision: 1 }, 'REVISION_CONFLICT');
  const archived = await call('archive_post', archiveArgs);
  check(
    archived.status === 'archived' &&
      archived.revision === manualPosted.revision + 1 &&
      Date.parse(archived.archived_at) > 0 &&
      preservedEvidence() === beforeArchive,
    'ARCHIVE_IMMUTABLE_PUBLICATION_EVIDENCE',
  );
  check((await call('archive_post', archiveArgs)).replayed, 'ARCHIVE_REPLAY');
  await call(
    'archive_post',
    { ...archiveArgs, reason: 'Different archive intent.' },
    'OPERATION_KEY_REUSED',
  );
  await call(
    'archive_post',
    {
      ...write(),
      post_public_id: manualPostId,
      expected_revision: archived.revision,
      reason: 'Archive twice.',
      explicit_archive: true,
    },
    'INVALID_STATUS_TRANSITION',
  );
  check(
    row<{ count: number }>(
      "select count(*)::integer count from public.trivia_post_facts j join public.posts p on p.id=j.post_id where p.public_id='" +
        manualPostId +
        "' and j.is_current and j.allocation_state='published'",
    ).count === manualUsageCount,
    'ARCHIVE_PRESERVES_PUBLISHED_FACT_USAGE',
  );
  const archiveRead = await call('get_post', { ...common(), post_public_id: manualPostId });
  check(
    archiveRead.post.status === 'archived' &&
      archiveRead.post.content_hash === manualSaved.post.content_hash,
    'ARCHIVE_OWNER_READ',
  );
  const foreignPublication = await rpcHttp(
    'tools/call',
    { name: 'archive_post', arguments: archiveArgs },
    foreignBearer,
  );
  check(foreignPublication.status === 403, 'FOREIGN_ARCHIVE_DENIED');
  console.info(
    '6.12 public MCP manual publication/archival: approval, CAS, provenance, replay, immutable evidence, permanent usage and owner privacy PASS.',
  );

  // Phase 6.13: verified public MCP -> owner JWT -> local PostgREST -> metrics RPC.
  clearFixtureBuckets();
  const observedAt = new Date(Date.parse(manualPosted.published_at) + 60_000).toISOString();
  const observedLater = new Date(Date.parse(manualPosted.published_at) + 120_000).toISOString();
  const metricSource = { source_type: 'facebook_ui', metric_definition_version: 1 };
  const metricArgs = {
    ...write(),
    post_public_id: manualPostId,
    captured_at: observedAt,
    metrics: { views: 100, reach: null, reactions: 12, likes: 10, watch_time_seconds: 0 },
    source: metricSource,
  };
  for (const bad of [
    { ...metricArgs, metrics: {} },
    { ...metricArgs, metrics: { views: null } },
    { ...metricArgs, metrics: { reactions: 2, likes: 3 } },
    { ...metricArgs, metrics: { views: -1 } },
    { ...metricArgs, metrics: { views: 1, secret: 3 } },
    { ...metricArgs, source: { ...metricSource, metric_definition_version: 2 } },
  ])
    await rejectToolInput('record_post_performance', bad);
  const beforeMetrics = preservedEvidence();
  const recorded = await call('record_post_performance', metricArgs);
  check(
    recorded.metrics.views === 100 &&
      recorded.metrics.reach === null &&
      recorded.metrics.watch_time_seconds === 0 &&
      !recorded.replayed,
    'METRIC_NULL_VERSUS_ZERO',
  );
  const replayed = await call('record_post_performance', metricArgs);
  check(
    replayed.replayed && replayed.metric_snapshot_public_id === recorded.metric_snapshot_public_id,
    'METRIC_EXACT_REPLAY',
  );
  await call(
    'record_post_performance',
    { ...metricArgs, metrics: { views: 101 } },
    'OPERATION_KEY_REUSED',
  );
  await call('record_post_performance', { ...metricArgs, ...write() }, 'METRIC_SNAPSHOT_CONFLICT');
  const nextMetric = await call('record_post_performance', {
    ...write(),
    post_public_id: manualPostId,
    captured_at: observedLater,
    metrics: { views: 80, reactions: 11, likes: 10 },
    source: metricSource,
  });
  check(nextMetric.metrics.views === 80, 'METRIC_APPEND_SECOND_SNAPSHOT');
  const count = row<{ count: number }>(
    "select count(*)::integer count from public.post_metrics where post_id=(select id from public.posts where public_id='" +
      manualPostId +
      "')",
  ).count;
  check(count === 2 && preservedEvidence() === beforeMetrics, 'METRICS_APPEND_ONLY_POST_IMMUTABLE');
  const first = await call('get_post_performance', {
    ...common(),
    post_public_id: manualPostId,
    limit: 1,
  });
  check(
    first.snapshots.length === 1 &&
      first.has_more === true &&
      first.next_cursor &&
      first.latest_snapshot.metric_snapshot_public_id === nextMetric.metric_snapshot_public_id &&
      first.snapshots[0].metrics.views === 80 &&
      first.snapshots[0].anomaly_flags.includes('negative_cumulative_delta'),
    'METRIC_HISTORY_LATEST_AND_FLAGS',
  );
  const metricsSecondPage = await call('get_post_performance', {
    ...common(),
    post_public_id: manualPostId,
    limit: 1,
    cursor: first.next_cursor,
  });
  check(
    metricsSecondPage.snapshots.length === 1 &&
      !metricsSecondPage.has_more &&
      metricsSecondPage.snapshots[0].metrics.views === 100 &&
      metricsSecondPage.snapshots[0].metrics.reach === null,
    'METRIC_HISTORY_PAGINATION',
  );
  const full = await call('get_post_performance', {
    ...common(),
    post_public_id: manualPostId,
    limit: 100,
  });
  check(
    full.compatible_deltas.length === 1 &&
      full.compatible_deltas[0].delta.views === -20 &&
      full.compatible_deltas[0].negative_delta === true,
    'METRIC_SIGNED_COMPATIBLE_DELTAS',
  );
  const insightsArgs = {
    ...common(),
    page_public_id: f.page,
    niche_key: 'trivia',
    dimensions: ['format'],
    metric: 'views',
    minimum_sample_size: 5,
    limit: 20,
  };
  const insights = await call('get_performance_insights', insightsArgs);
  check(
    insights.scope.page_public_id === f.page &&
      insights.eligible_post_count >= 1 &&
      insights.excluded_post_count >= 1 &&
      insights.groups.some(
        (g: { evidence_strength: string; caveats: string[] }) =>
          g.evidence_strength === 'insufficient' && g.caveats.some((x) => /causal/i.test(x)),
      ) &&
      insights.eligible_post_count + insights.excluded_post_count >= 2,
    'INSIGHTS_SAMPLE_EXCLUSIONS_CAVEATS',
  );
  await rejectToolInput('get_performance_insights', {
    ...insightsArgs,
    dimensions: ['format', 'format'],
  });
  await rejectToolInput('get_post_performance', {
    ...common(),
    post_public_id: manualPostId,
    limit: 101,
  });
  const foreignMetrics = await rpcHttp(
    'tools/call',
    { name: 'get_post_performance', arguments: { ...common(), post_public_id: manualPostId } },
    foreignBearer,
  );
  check(foreignMetrics.status === 403, 'FOREIGN_METRICS_DENIED');
  clearFixtureBuckets();
  console.info(
    '6.13 owner JWT metrics: immutable append/replay, null/zero, likes subset, signed deltas, pagination, insufficient insights and owner denial PASS.',
  );

  clearFixtureBuckets();
  if (!process.argv.includes('--preflight')) {
    await inspector('initialize');
    const listed = await inspector('tools/list');
    check(listed.tools.length === 33, 'INSPECTOR_CENSUS');
    await inspector('tools/call', 'get_account_profile', { request_schema_version: 1 });
    await inspector('tools/call', 'get_workspace_context', common());
    await inspector('tools/call', 'list_pages', common());
    await inspector('tools/call', 'get_page_generation_context', {
      ...common(),
      page_public_id: f.page,
      niche_key: 'trivia',
    });
    const config = row<{ config: unknown }>(
      'select internal.default_trivia_config_v1() config',
    ).config;
    const newPage = (
      await inspector('tools/call', 'create_page', {
        ...write(),
        name: 'Inspector Page',
        slug: f.prefix + '-inspector',
        timezone: 'UTC',
        target_markets: ['US'],
        niche_key: 'trivia',
        config_schema_version: 1,
        config,
      })
    ).structuredContent.data.page;
    await inspector('tools/call', 'update_page', {
      ...write(),
      page_public_id: newPage.page_public_id,
      expected_page_updated_at: newPage.updated_at,
      page_patch: { name: 'Inspector Page updated' },
    });
    await inspector('tools/call', 'list_content_plans', common());
    const newPlan = (
      await inspector('tools/call', 'create_content_plan', {
        ...write(),
        page_public_id: newPage.page_public_id,
        niche_key: 'trivia',
        config_schema_version: 1,
        plan_intent: 'Create a local test plan.',
        items: [1, 2].map((position) => ({
          position,
          topic_key: 'animals',
          format_key: 'single_subject_fast',
          interaction_goal: 'share',
          item_config: {},
          scheduled_at: null,
        })),
      })
    ).structuredContent.data;
    await inspector('tools/call', 'get_content_plan', {
      ...common(),
      plan_public_id: newPlan.plan.plan_public_id,
    });
    const leased = (
      await inspector('tools/call', 'claim_content_plan_items', {
        ...write(),
        plan_public_id: newPlan.plan.plan_public_id,
        lease_minutes: 30,
        limit: 1,
      })
    ).structuredContent.data.claimed_items[0];
    const leaseArgs = {
      plan_item_public_id: leased.item.plan_item_public_id,
      claim_token: leased.claim_token,
    };
    await inspector('tools/call', 'renew_content_plan_claim', { ...write(), ...leaseArgs });
    await inspector('tools/call', 'report_content_plan_item_failure', {
      ...write(),
      ...leaseArgs,
      failure_code: 'FACT_SOURCE_INSUFFICIENT',
      failure_detail: 'Sources were insufficient.',
      retry_recommended: true,
    });
    await inspector(
      'tools/call',
      'retry_content_plan_item',
      itemArgs(leased.item.plan_item_public_id),
    );
    const replacementItem = newPlan.items[1].plan_item_public_id;
    completeFixtureItem(replacementItem);
    const replacementPost = insertPost(replacementItem);
    await inspector('tools/call', 'replace_discarded_plan_item', {
      ...itemArgs(replacementItem),
      discarded_post_public_id: replacementPost,
      explicit_replacement: true,
    });
    await inspector('tools/call', 'cancel_content_plan', {
      ...write(),
      plan_public_id: newPlan.plan.plan_public_id,
      reason: 'Cancel the local fixture.',
      explicit_cancellation: true,
    });
    const inspectorCandidate = candidate();
    await inspector('tools/call', 'trivia_find_similar_facts', {
      ...common(),
      page_public_id: f.page,
      candidates: [inspectorCandidate],
    });
    const inspectorReservation = {
      ...write(),
      page_public_id: f.page,
      reservation_token: randomUUID(),
      expected_config_updated_at: configTime,
      fact_reuse_scope: 'workspace_unique',
      reservation_ttl_minutes: 30,
      facts: [factInput(inspectorCandidate)],
    };
    const inspectorReserved = (
      await inspector('tools/call', 'trivia_register_and_reserve_facts', inspectorReservation)
    ).structuredContent.data;
    check(
      inspectorReserved.reservation_token === inspectorReservation.reservation_token,
      'INSPECTOR_TRIVIA_TOKEN',
    );
    await inspector('tools/call', 'trivia_release_facts', {
      ...write(),
      page_public_id: f.page,
      reservation_token: inspectorReservation.reservation_token,
      reason: 'Abandon Inspector fixture.',
    });
    const inspectorFactId = inspectorReserved.facts[0].fact_public_id;
    const verifiedInspector = (
      await inspector('tools/call', 'trivia_reverify_fact', {
        ...write(),
        fact_public_id: inspectorFactId,
        expected_fact_updated_at: time(inspectorFactId),
        confirmed_claim_text: String(inspectorCandidate.claim_text),
        sources: [source('A', 'inspector-fresh')],
        freshness_class: 'stable',
        as_of_date: null,
        requested_expires_at: '2027-01-11T00:00:00Z',
        risk_class: 'standard',
        review_note: 'Inspector verified the same proposition.',
      })
    ).structuredContent.data;
    await inspector('tools/call', 'trivia_correct_fact', {
      ...write(),
      fact_public_id: inspectorFactId,
      expected_fact_updated_at: verifiedInspector.fact_updated_at,
      action: 'invalidate',
      correction_reason: 'Inspector correction fixture.',
      explicit_correction: true,
    });

    clearFixtureBuckets();
    const inspectedRequest = postRequest(f);
    const inspectedSave = (await inspector('tools/call', 'save_post', draftArgs(inspectedRequest)))
      .structuredContent.data;
    check(inspectedSave.post.status === 'draft', 'INSPECTOR_DRAFT_STATUS');
    const inspectedList = (
      await inspector('tools/call', 'list_posts', {
        ...common(),
        page_public_id: f.page,
        statuses: ['draft'],
        limit: 2,
      })
    ).structuredContent.data;
    check(inspectedList.items.length > 0, 'INSPECTOR_LIST_POSTS');
    const inspectedGet = (
      await inspector('tools/call', 'get_post', {
        ...common(),
        post_public_id: inspectedSave.post.post_public_id,
        include_sources: false,
      })
    ).structuredContent.data;
    check(
      inspectedGet.post.post_public_id === inspectedSave.post.post_public_id,
      'INSPECTOR_GET_POST',
    );

    const inspectorRevision = {
      ...write(),
      post_public_id: inspectedSave.post.post_public_id,
      expected_revision: inspectedSave.post.revision,
      expected_content_hash: inspectedSave.post.content_hash,
      reservation_token: null,
      content_schema_version: 1,
      format_key: 'single_subject_fast',
      topic_key: 'animals',
      interaction_goal: 'share',
      content_payload: { ...inspectedRequest.content, caption: 'Inspector revised caption.' },
      generation_snapshot: inspectedRequest.generation,
      fact_bindings: inspectedRequest.bindings,
      editorial_checks: inspectedRequest.editorial,
      revision_reason: 'Inspector caption revision.',
    };
    const inspectedRevised = (await inspector('tools/call', 'revise_post', inspectorRevision))
      .structuredContent.data;
    check(inspectedRevised.post.revision === 2, 'INSPECTOR_REVISE');
    const inspectedSchedule = (
      await inspector('tools/call', 'reschedule_post', {
        ...write(),
        post_public_id: inspectedSave.post.post_public_id,
        expected_revision: inspectedRevised.post.revision,
        scheduled_at: null,
        reason: 'Inspector schedule cleared.',
      })
    ).structuredContent.data;
    check(
      inspectedSchedule.revision === 3 && inspectedSchedule.content_hash_unchanged,
      'INSPECTOR_RESCHEDULE',
    );

    const inspectedApproval = (
      await inspector('tools/call', 'approve_post', {
        ...write(),
        post_public_id: inspectedSave.post.post_public_id,
        expected_revision: inspectedSchedule.revision,
        expected_content_hash: inspectedRevised.post.content_hash,
        explicit_approval: true,
        accepted_warning_ids: ['trivia.profile.preferred_band'],
        warning_acceptance_reason: 'Accept the reviewed preferred profile warning.',
      })
    ).structuredContent.data;
    check(
      inspectedApproval.status === 'ready' &&
        inspectedApproval.approval.approved_revision === inspectedApproval.revision,
      'INSPECTOR_APPROVE',
    );
    const inspectedRevocation = (
      await inspector('tools/call', 'revoke_post_approval', {
        ...write(),
        post_public_id: inspectedSave.post.post_public_id,
        expected_revision: inspectedApproval.revision,
        expected_content_hash: inspectedRevised.post.content_hash,
        reason: 'Inspector withdraws approval.',
        explicit_revocation: true,
      })
    ).structuredContent.data;
    check(
      inspectedRevocation.status === 'draft' && inspectedRevocation.approval_revoked,
      'INSPECTOR_REVOKE',
    );
    const inspectedDiscard = (
      await inspector('tools/call', 'discard_post', {
        ...write(),
        post_public_id: inspectedSave.post.post_public_id,
        expected_revision: inspectedRevocation.revision,
        reason: 'Inspector abandons the draft.',
        explicit_discard: true,
      })
    ).structuredContent.data;
    check(inspectedDiscard.status === 'discarded', 'INSPECTOR_DISCARD');

    // Inspector valid execution of both Phase 6.13 tools, using real owner JWT.
    const publishedInspectorRequest = postRequest(f);
    const publishedInspectorSave = (
      await inspector('tools/call', 'save_post', draftArgs(publishedInspectorRequest))
    ).structuredContent.data;
    const publishedInspectorApproval = (
      await inspector('tools/call', 'approve_post', {
        ...write(),
        post_public_id: publishedInspectorSave.post.post_public_id,
        expected_revision: publishedInspectorSave.post.revision,
        expected_content_hash: publishedInspectorSave.post.content_hash,
        explicit_approval: true,
        accepted_warning_ids: ['trivia.profile.preferred_band'],
        warning_acceptance_reason: 'Accept the reviewed preferred profile warning.',
      })
    ).structuredContent.data;
    const inspectorPosted = (
      await inspector('tools/call', 'mark_post_posted', {
        ...write(),
        post_public_id: publishedInspectorSave.post.post_public_id,
        expected_revision: publishedInspectorApproval.revision,
        expected_content_hash: publishedInspectorSave.post.content_hash,
        published_at: new Date().toISOString(),
        platform_post_id: null,
        published_url: 'https://example.test/inspector-publication',
        explicit_publication_confirmation: true,
      })
    ).structuredContent.data;
    check(inspectorPosted.status === 'posted', 'INSPECTOR_MANUAL_POSTED');
    const inspectorArchived = (
      await inspector('tools/call', 'archive_post', {
        ...write(),
        post_public_id: publishedInspectorSave.post.post_public_id,
        expected_revision: inspectorPosted.revision,
        reason: 'Inspector archives already published content.',
        explicit_archive: true,
      })
    ).structuredContent.data;
    check(inspectorArchived.status === 'archived', 'INSPECTOR_ARCHIVED');

    // Phase 6.13: three remaining Inspector valid calls on the archived published post.
    const inspectorMetric = (
      await inspector('tools/call', 'record_post_performance', {
        ...write(),
        post_public_id: publishedInspectorSave.post.post_public_id,
        captured_at: new Date(Date.parse(inspectorPosted.published_at) + 60_000).toISOString(),
        metrics: { views: 0, reactions: 2, likes: 1 },
        source: metricSource,
      })
    ).structuredContent.data;
    check(
      inspectorMetric.metrics.views === 0 && inspectorMetric.metrics.likes === 1,
      'INSPECTOR_METRIC_RECORD',
    );
    const inspectedHistory = (
      await inspector('tools/call', 'get_post_performance', {
        ...common(),
        post_public_id: publishedInspectorSave.post.post_public_id,
        limit: 10,
      })
    ).structuredContent.data;
    check(
      inspectedHistory.snapshots.some(
        (s: { metric_snapshot_public_id: string }) =>
          s.metric_snapshot_public_id === inspectorMetric.metric_snapshot_public_id,
      ),
      'INSPECTOR_METRIC_HISTORY',
    );
    const inspectedInsights = (
      await inspector('tools/call', 'get_performance_insights', {
        ...common(),
        page_public_id: f.page,
        niche_key: 'trivia',
        dimensions: ['format'],
        metric: 'views',
        minimum_sample_size: 5,
      })
    ).structuredContent.data;
    check(
      inspectedInsights.groups.every(
        (g: { evidence_strength: string; caveats: string[] }) =>
          g.evidence_strength === 'insufficient' && g.caveats.length > 0,
      ),
      'INSPECTOR_METRIC_INSIGHTS',
    );

    clearFixtureBuckets();
    for (const tool of tools) await inspector('tools/call', tool.name, {}, 5);
  }
  check(
    !logs.includes(bearer) &&
      !logs.includes(foreignBearer) &&
      !logs.includes(c.claim_token) &&
      !/SQLSTATE|internal_id|private key/i.test(logs),
    'HTTP_LOG_PRIVACY',
  );
  timings.sort((a, b) => a - b);
} catch (error) {
  // Print safe assertion labels only, never raw child stdout, SQL or payloads.
  console.error(
    error instanceof Error && /^[A-Z][A-Z_0-9/ -]*$/.test(error.message)
      ? error.message
      : 'BATCH_A_GATE_FAILED',
  );
  process.exitCode = 1;
} finally {
  host?.kill();
  spawnSync('docker', ['rm', '-f', container], { stdio: 'ignore' });
  postCleanup(f);
  rmSync(dir, { recursive: true, force: true });
}

if (process.exitCode !== 1) {
  console.info(
    `Phase 6.13 ${process.argv.includes('--preflight') ? 'preflight: real HTTP recovery/race' : 'gate: Inspector initialize/list, 33/33 valid and 33/33 invalid tool calls'} PASS; HTTP log privacy PASS; typical local latency median ${Math.round(timings[Math.floor(timings.length / 2)])}ms, max ${Math.round(timings.at(-1)!)}ms (fixture scope).`,
  );
}
