import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

type JsonRecord = Record<string, unknown>;

type RpcResponse = {
  data: {
    page: JsonRecord;
    config: JsonRecord;
    plan: JsonRecord;
    items: JsonRecord[];
    context_version: JsonRecord;
    replayed: boolean;
  };
};

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

function sqlJson(value: unknown): string {
  return `${sqlString(JSON.stringify(value))}::jsonb`;
}

function runCli(sql: string): string {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Supabase local command failed: ${result.stderr}\n${result.stdout}`);
  }
  return result.stdout;
}

function queryRows(sql: string): JsonRecord[] {
  const output = runCli(sql);
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) throw new Error('Expected JSON output from supabase db query.');
  const parsed: unknown = JSON.parse(output.slice(jsonStart));
  if (!isJsonRecord(parsed) || !Array.isArray(parsed.rows)) {
    throw new Error('Expected database rows.');
  }
  return parsed.rows.filter(isJsonRecord);
}

function querySingleRow(sql: string): JsonRecord {
  const rows = queryRows(sql);
  if (rows.length !== 1) throw new Error(`Expected exactly one row, got ${rows.length}.`);
  return rows[0]!;
}

function rpc(owner: string, expression: string, clientId = 'phase53-write-client'): RpcResponse {
  const rows = queryRows(`
    with setup as materialized (
      select
        set_config('role', 'authenticated', true),
        set_config(
          'request.jwt.claims',
          json_build_object(
            'sub', '${owner}',
            'role', 'authenticated',
            'client_id', '${clientId}'
          )::text,
          true
        )
    )
    select ${expression} as result
    from setup;
  `);
  const resultRow = rows.at(-1);
  if (!resultRow || !('result' in resultRow)) throw new Error('RPC result row was not returned.');
  return resultRow.result as RpcResponse;
}

function expectRpcError(owner: string, expression: string, code: string, clientId?: string): void {
  expect(rpcError(() => rpc(owner, expression, clientId ?? `phase53-error-${randomUUID()}`))).toBe(
    code,
  );
}

function rpcError(call: () => unknown): string {
  try {
    call();
  } catch (error) {
    const message = String(error);
    expect(message).not.toMatch(/SQLSTATE|internal\.|public\.|CONTEXT:|DETAIL:|select /i);
    const code = /error: ([A-Z_]+)(?:"|\s|$)/.exec(message)?.[1];
    if (!code) throw error;
    return code;
  }
  throw new Error('Expected RPC denial.');
}

function rpcClaims(expression: string, claims: unknown): RpcResponse {
  const rows = queryRows(`with setup as materialized (select
    set_config('role','authenticated',true),
    set_config('request.jwt.claims',${sqlString(typeof claims === 'string' ? claims : JSON.stringify(claims))},true))
    select ${expression} as result from setup`);
  return rows.at(-1)!.result as RpcResponse;
}

function psqlAsync(sql: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'exec',
      'supabase_db_content-producer',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-At',
      '-c',
      sql,
    ]);
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

function fixtureStatements(sql: string): void {
  const result = spawnSync(
    'docker',
    [
      'exec',
      'supabase_db_content-producer',
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
      '-c',
      sql,
    ],
    { encoding: 'utf8' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr);
}

function callerSql(owner: string, expression: string, clientId = randomUUID()): string {
  return `begin; set local role authenticated;
    select set_config('request.jwt.claims',${sqlJson({ sub: owner, role: 'authenticated', client_id: clientId })}::text,true);
    select ${expression}; commit;`;
}

function item(overrides: JsonRecord = {}): JsonRecord {
  return {
    position: 1,
    scheduled_at: null,
    topic_key: 'animals',
    format_key: 'single_subject_fast',
    interaction_goal: 'share',
    item_config: {},
    ...overrides,
  };
}

function planExpression(
  fixture: Fixture,
  pageId: unknown,
  items: unknown = [item()],
  key = randomUUID(),
  version = 1,
): string {
  return `api.create_content_plan(1,'${fixture.workspacePublicId}','${key}','${pageId}',
    'trivia',${version},${sqlJson(items)},'Audit plan',null)`;
}

function updateExpression(
  fixture: Fixture,
  page: JsonRecord,
  patch: unknown = { name: 'Updated' },
  configPatch: unknown = null,
  key = randomUUID(),
): string {
  return `api.update_page(1,'${fixture.workspacePublicId}','${key}','${page.page_public_id}',
    '${page.updated_at}'::timestamptz,${patch === null ? 'null::jsonb' : sqlJson(patch)},${configPatch === null ? 'null::jsonb' : sqlJson(configPatch)})`;
}

function configPatch(fixture: Fixture, config: JsonRecord, overrides: JsonRecord = {}): JsonRecord {
  return {
    niche_key: 'trivia',
    expected_config_updated_at: config.updated_at,
    config_schema_version: 1,
    config: fixture.config,
    is_enabled: true,
    is_default: true,
    ...overrides,
  };
}

function domainRows(fixture: Fixture): JsonRecord {
  return querySingleRow(`select
    (select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.pages p where workspace_id=w.id) as pages,
    (select coalesce(jsonb_agg(to_jsonb(c) order by id),'[]') from public.page_niche_configs c where workspace_id=w.id) as configs,
    (select coalesce(jsonb_agg(to_jsonb(p) order by id),'[]') from public.content_plans p where workspace_id=w.id) as plans,
    (select coalesce(jsonb_agg(to_jsonb(i) order by id),'[]') from public.content_plan_items i where workspace_id=w.id) as items,
    (select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from internal.operation_ledger l where workspace_id=w.id) as ledger
    from public.workspaces w where public_id='${fixture.workspacePublicId}'`);
}

function expectRpcErrorWithoutContext(expression: string, code: string): void {
  expect(() =>
    queryRows(`
      with setup as materialized (
        select set_config('role', 'authenticated', true)
      )
      select ${expression} as result
      from setup;
    `),
  ).toThrow(code);
}

function insertAuthUser(id: string, email: string): void {
  runCli(`
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
      'authenticated', '${email}', 'not-used', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
    )
  `);
}

type Fixture = {
  owner: string;
  otherOwner: string;
  workspacePublicId: string;
  config: unknown;
  configSql: string;
  slugPrefix: string;
};

function createFixture(): Fixture {
  const suffix = `${process.pid}${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const owner = randomUUID();
  const otherOwner = randomUUID();
  const slugPrefix = `phase53-${suffix}`;
  const otherSlug = `${slugPrefix}-other`;

  insertAuthUser(owner, `${slugPrefix}@example.test`);
  insertAuthUser(otherOwner, `${otherSlug}@example.test`);

  runCli(`
    insert into public.workspaces (
      owner_user_id, name, slug, settings
    ) values (
      '${owner}'::uuid,
      'Phase 5.3 write owner',
      '${slugPrefix}',
      '{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":5}'::jsonb
    )
  `);

  const workspace = querySingleRow(`
    select public_id::text as workspace_public_id
    from public.workspaces
    where slug = '${slugPrefix}'
  `);
  const configRow = querySingleRow(`select internal.default_trivia_config_v1() as config`);

  return {
    owner,
    otherOwner,
    workspacePublicId: String(workspace.workspace_public_id),
    config: configRow.config,
    configSql: sqlJson(configRow.config),
    slugPrefix,
  };
}

function cleanupFixture(fixture: Fixture): void {
  runCli(`
    do $cleanup$
    begin
      delete from public.posts
      where workspace_id in (select id from public.workspaces where slug = '${fixture.slugPrefix}');
      delete from public.content_plan_items
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from public.content_plans
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from public.posts
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from public.page_niche_configs
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from public.pages
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from internal.operation_ledger
      where workspace_id in (
        select id from public.workspaces where slug = '${fixture.slugPrefix}'
      );
      delete from public.workspaces where slug = '${fixture.slugPrefix}';
      delete from auth.users where id in ('${fixture.owner}', '${fixture.otherOwner}');
    end;
    $cleanup$;
  `);
}

function state(fixture: Fixture): JsonRecord {
  return querySingleRow(`
    select
      (select count(*) from public.pages where workspace_id = workspace.id) as page_count,
      (select count(*) from public.page_niche_configs where workspace_id = workspace.id) as config_count,
      (select count(*) from public.content_plans where workspace_id = workspace.id) as plan_count,
      (select count(*) from public.content_plan_items where workspace_id = workspace.id) as item_count,
      (select count(*) from internal.operation_ledger where workspace_id = workspace.id) as ledger_count
    from public.workspaces as workspace
    where workspace.public_id = '${fixture.workspacePublicId}'::uuid
  `);
}

function createPageExpression(
  fixture: Fixture,
  operationKey: string,
  slugSuffix: string,
  makeDefault = true,
): string {
  return `api.create_page(
    1,
    '${fixture.workspacePublicId}'::uuid,
    '${operationKey}'::uuid,
    'Created Page ${slugSuffix}',
    '${fixture.slugPrefix}-${slugSuffix}',
    'UTC',
    array['US','GB']::text[],
    'trivia',
    1,
    ${fixture.configSql},
    ${makeDefault}
  )`;
}

function planItems(scheduledAt: string | null, secondScheduledAt: string | null = null): string {
  return sqlJson([
    {
      position: 1,
      scheduled_at: scheduledAt,
      topic_key: 'animals',
      format_key: 'single_subject_fast',
      interaction_goal: 'share',
      item_config: {},
    },
    {
      position: 2,
      scheduled_at: secondScheduledAt,
      topic_key: 'geography',
      format_key: 'comparison',
      interaction_goal: 'save',
      item_config: {},
    },
  ]);
}

function planItemsForCount(count: number): string {
  return sqlJson(
    Array.from({ length: count }, (_, index) => ({
      position: index + 1,
      scheduled_at: null,
      topic_key: 'animals',
      format_key: 'single_subject_fast',
      interaction_goal: 'share',
      item_config: {},
    })),
  );
}

function singlePlanItem(scheduledAt: string | null): string {
  return sqlJson([
    {
      position: 1,
      scheduled_at: scheduledAt,
      topic_key: 'animals',
      format_key: 'single_subject_fast',
      interaction_goal: 'share',
      item_config: {},
    },
  ]);
}

function insertDraftPost(fixture: Fixture, pagePublicId: string, scheduledAt: string | null): void {
  const scheduledSql = scheduledAt === null ? 'null' : `${sqlString(scheduledAt)}::timestamptz`;

  runCli(`
    insert into public.posts (
      workspace_id, page_id, niche_key, format_key, topic_key, interaction_goal,
      scheduled_at, content_payload, generation_snapshot, content_hash
    )
    select
      workspace.id,
      page.id,
      'trivia',
      'single_subject_fast',
      'animals',
      'share',
      ${scheduledSql},
      '{"schema_version":1,"hook":"Did you know?","body":{"fact_public_id":"not-a-relational-link"},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb,
      '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb,
      repeat('c', 64)
    from public.workspaces as workspace
    join public.pages as page on page.workspace_id = workspace.id
    where workspace.public_id = '${fixture.workspacePublicId}'::uuid
      and page.public_id = '${pagePublicId}'::uuid
  `);
}

describe('Phase 5.3 page and content-plan write RPCs', () => {
  it('AC-002 isolated owner workspace supports three different Page trivia configurations', () => {
    const f = createFixture();
    try {
      const base = f.config as JsonRecord;
      const cases: Array<{ suffix: string; config: JsonRecord }> = [
        { suffix: 'adaptive-workspace', config: base },
        {
          suffix: 'fixed-page',
          config: {
            ...base,
            fact_count: { mode: 'fixed', value: 7 },
            fact_reuse_scope: 'page_unique',
          },
        },
        {
          suffix: 'adaptive-page',
          config: {
            ...base,
            fact_count: { mode: 'adaptive', min: 5, preferred: 6, max: 9 },
            fact_reuse_scope: 'page_unique',
            render_style: 'numbered',
          },
        },
      ];
      const created: RpcResponse[] = [];
      const expressions: string[] = [];
      for (const testCase of cases) {
        const expression = createPageExpression(f, randomUUID(), testCase.suffix).replace(
          f.configSql,
          sqlJson(testCase.config),
        );
        const result = rpc(f.owner, expression);
        expect(result.data.replayed).toBe(false);
        expect(result.data.config.config).toEqual(testCase.config);
        expect(result.data.page.slug).toBe(`${f.slugPrefix}-${testCase.suffix}`);
        created.push(result);
        expressions.push(expression);
      }
      expect(new Set(created.map((entry) => entry.data.page.page_public_id)).size).toBe(3);
      const counts = state(f);
      expect(counts.page_count).toBe(3);
      expect(counts.config_count).toBe(3);
      expect(counts.ledger_count).toBe(3);
      expect(counts.plan_count).toBe(0);
      expect(counts.item_count).toBe(0);

      const distinctConfigs = querySingleRow(`
        select
          count(distinct config)::int as distinct_config_count,
          count(*) filter (where config->'fact_count'->>'mode' = 'fixed')::int as fixed_count,
          count(*) filter (where config->'fact_count'->>'mode' = 'adaptive')::int as adaptive_count,
          count(*) filter (where config->>'fact_reuse_scope' = 'page_unique')::int as page_scope_count
        from public.page_niche_configs
        where workspace_id = (select id from public.workspaces where public_id = '${f.workspacePublicId}'::uuid)
      `);
      expect(distinctConfigs.distinct_config_count).toBe(3);
      expect(distinctConfigs.fixed_count).toBe(1);
      expect(distinctConfigs.adaptive_count).toBe(2);
      expect(distinctConfigs.page_scope_count).toBe(2);

      const frozen = domainRows(f);
      for (let index = 0; index < expressions.length; index++) {
        const replay = rpc(f.owner, expressions[index]!);
        expect(replay).toEqual({
          ...created[index],
          data: { ...created[index]!.data, replayed: true },
        });
      }
      expect(domainRows(f)).toEqual(frozen);
      expect(state(f).page_count).toBe(3);
    } finally {
      cleanupFixture(f);
    }
  }, 90_000);

  it('CORE-001 replays all three immutable responses after Page/config/plan/item mutation and rejects mismatched payloads', () => {
    const f = createFixture();
    try {
      const create = createPageExpression(f, randomUUID(), 'snapshot');
      const created = rpc(f.owner, create);
      const update = updateExpression(
        f,
        created.data.page,
        { name: 'First update' },
        configPatch(f, created.data.config, { is_default: false }),
      );
      const updated = rpc(f.owner, update);
      const plan = planExpression(f, created.data.page.page_public_id, [
        item(),
        item({ position: 2 }),
      ]);
      const planned = rpc(f.owner, plan);
      const persisted = querySingleRow(
        `select plan_config from public.content_plans where public_id='${planned.data.plan.plan_public_id}'`,
      );
      const context = (persisted.plan_config as JsonRecord).context_snapshot as JsonRecord;
      expect((persisted.plan_config as JsonRecord).schema_version).toBe(2);
      expect(context.schema_version).toBe(1);
      expect((context.page as JsonRecord).name).toBe('First update');
      expect((context.niche_config as JsonRecord).config).toEqual(f.config);
      expect(planned.data.context_version.page_updated_at).toBe(updated.data.page.updated_at);
      const config = { ...(f.config as JsonRecord), render_style: 'numbered' };
      rpc(
        f.owner,
        updateExpression(
          f,
          updated.data.page,
          { name: 'Later update', target_markets: ['DE', 'US'] },
          configPatch(f, updated.data.config, { config }),
        ),
      );
      fixtureStatements(`update public.content_plans set name='Later plan',status='in_progress' where public_id='${planned.data.plan.plan_public_id}';
        update public.content_plan_items set status='failed',attempt_count=3,last_error_code='CONFIG_INVALID',last_error_detail='Later error',
          item_config='{"render_style":"numbered"}' where plan_id=(select id from public.content_plans where public_id='${planned.data.plan.plan_public_id}')`);
      expect(
        querySingleRow(
          `select plan_config from public.content_plans where public_id='${planned.data.plan.plan_public_id}'`,
        ),
      ).toEqual(persisted);
      const before = domainRows(f);
      for (const [expression, original] of [
        [create, created],
        [update, updated],
        [plan, planned],
      ] as const) {
        expect(rpc(f.owner, expression)).toEqual({
          ...original,
          data: { ...original.data, replayed: true },
        });
      }
      expect(domainRows(f)).toEqual(before);
      expectRpcError(
        f.owner,
        create.replace("'Created Page snapshot'", "'Changed payload'"),
        'OPERATION_KEY_REUSED',
      );
      expectRpcError(
        f.owner,
        update.replace('First update', 'Changed payload'),
        'OPERATION_KEY_REUSED',
      );
      expectRpcError(
        f.owner,
        plan.replace('Audit plan', 'Changed payload'),
        'OPERATION_KEY_REUSED',
      );
      expect(domainRows(f)).toEqual(before);
      const snapshots = queryRows(
        `select response_snapshot from internal.operation_ledger where workspace_id=(select id from public.workspaces where public_id='${f.workspacePublicId}')`,
      );
      expect(snapshots.every((r) => (r.response_snapshot as JsonRecord).schema_version === 3)).toBe(
        true,
      );
      expect(JSON.stringify(snapshots)).not.toMatch(
        /"(?:id|workspace_id|actor_user_id|claim_token|reservation_token|source_data|content_payload)":/,
      );
    } finally {
      cleanupFixture(f);
    }
  }, 90_000);

  it('SEC-5.3 denies each public write uniformly for non-owner, absent and malformed request context', () => {
    const f = createFixture();
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'security'));
      const calls = [
        createPageExpression(f, randomUUID(), 'denied'),
        updateExpression(f, page.data.page),
        planExpression(f, page.data.page.page_public_id),
      ];
      const before = domainRows(f);
      for (const call of calls) {
        const nonOwner = rpcError(() => rpc(f.otherOwner, call));
        expect(nonOwner).toBe('OWNER_ACCESS_REQUIRED');
        expect(
          rpcError(() => rpc(f.otherOwner, call.replaceAll(f.workspacePublicId, randomUUID()))),
        ).toBe(nonOwner);
        expect(
          rpcError(() =>
            rpc(f.otherOwner, call.replaceAll(String(page.data.page.page_public_id), randomUUID())),
          ),
        ).toBe(nonOwner);
        for (const claims of [
          {},
          'not-json',
          { sub: 'invalid', role: 'authenticated', client_id: 'client' },
          { sub: f.owner, role: 'anon', client_id: 'client' },
        ]) {
          expect(rpcError(() => rpcClaims(call, claims))).toBe('AUTH_REQUIRED');
        }
        for (const client of [undefined, null, 42, {}, [], '', ' ', 'a\n', 'a'.repeat(513)]) {
          expect(
            rpcError(() =>
              rpcClaims(call, { sub: f.owner, role: 'authenticated', client_id: client }),
            ),
          ).toBe('OAUTH_CLIENT_REQUIRED');
        }
      }
      expect(domainRows(f)).toEqual(before);
    } finally {
      cleanupFixture(f);
    }
  }, 180_000);

  it('accepts eight ISO Page markets including DE, rejects aliases/noncodes and preserves workspace defaults', () => {
    const f = createFixture();
    try {
      const call = createPageExpression(f, randomUUID(), 'iso').replace(
        "array['US','GB']",
        "array['US','GB','CA','AU','DE','FR','JP','ID']",
      );
      const created = rpc(f.owner, call);
      expect(created.data.page.target_markets).toEqual([
        'AU',
        'CA',
        'DE',
        'FR',
        'GB',
        'ID',
        'JP',
        'US',
      ]);
      const updated = rpc(
        f.owner,
        updateExpression(f, created.data.page, { target_markets: ['DE', 'AQ'], slug: '12-page' }),
      );
      expect(updated.data.page.target_markets).toEqual(['AQ', 'DE']);
      expect(updated.data.page.slug).toBe('12-page');
      const before = domainRows(f);
      for (const markets of [
        ['UK'],
        ['ZZ'],
        ['XK'],
        ['de'],
        ['DE', 'DE'],
        [null],
        [],
        ['US', 'GB', 'CA', 'AU', 'DE', 'FR', 'JP', 'ID', 'NZ'],
      ]) {
        expectRpcError(
          f.owner,
          createPageExpression(f, randomUUID(), 'invalid-iso').replace(
            "array['US','GB']::text[]",
            `array[${markets.map((m) => (m === null ? 'null' : sqlString(m))).join(',')}]::text[]`,
          ),
          'VALIDATION_FAILED',
        );
        expectRpcError(
          f.owner,
          updateExpression(f, updated.data.page, { target_markets: markets }),
          'VALIDATION_FAILED',
        );
      }
      expect(domainRows(f)).toEqual(before);
      expect(
        querySingleRow(
          `select target_markets from public.workspaces where public_id='${f.workspacePublicId}'`,
        ).target_markets,
      ).toEqual(['AU', 'CA', 'GB', 'US']);
    } finally {
      cleanupFixture(f);
    }
  }, 90_000);

  it('rejects closed Page patches, null fields, invalid config, slug conflict and one-microsecond stale CAS without partial writes', () => {
    const f = createFixture();
    try {
      const a = rpc(f.owner, createPageExpression(f, randomUUID(), 'patch'));
      const b = rpc(f.owner, createPageExpression(f, randomUUID(), 'slug'));
      const before = domainRows(f);
      for (const patch of [
        {},
        { unknown: true },
        [],
        null,
        { name: null },
        { slug: null },
        { timezone: null },
        { target_markets: null },
        { name: '' },
        { timezone: 'Invalid/Zone' },
      ]) {
        expectRpcError(f.owner, updateExpression(f, a.data.page, patch), 'VALIDATION_FAILED');
      }
      expectRpcError(
        f.owner,
        updateExpression(f, a.data.page, { slug: b.data.page.slug }),
        'PAGE_SLUG_CONFLICT',
      );
      expectRpcError(
        f.owner,
        updateExpression(f, a.data.page, { name: 'CAS' }).replace(
          `'${a.data.page.updated_at}'::timestamptz`,
          `('${a.data.page.updated_at}'::timestamptz + interval '1 microsecond')`,
        ),
        'PAGE_VERSION_CONFLICT',
      );
      const stale = querySingleRow(
        `select internal.iso_timestamp_v1('${a.data.config.updated_at}'::timestamptz + interval '1 microsecond') as ts`,
      ).ts;
      expectRpcError(
        f.owner,
        updateExpression(
          f,
          a.data.page,
          { name: 'Must roll back' },
          configPatch(f, a.data.config, { expected_config_updated_at: stale }),
        ),
        'PAGE_VERSION_CONFLICT',
      );
      for (const patch of [
        configPatch(f, a.data.config, { config: {} }),
        configPatch(f, a.data.config, { config: null }),
        configPatch(f, a.data.config, { is_enabled: null }),
        configPatch(f, a.data.config, { is_default: null }),
        { ...configPatch(f, a.data.config), extra: true },
      ]) {
        expectRpcError(
          f.owner,
          updateExpression(f, a.data.page, { name: 'Must roll back' }, patch),
          'CONFIG_INVALID',
        );
      }
      expectRpcError(
        f.owner,
        updateExpression(
          f,
          a.data.page,
          null,
          configPatch(f, a.data.config, { config_schema_version: 2 }),
        ),
        'CONFIG_SCHEMA_UNSUPPORTED',
      );
      for (const config of [
        { ...(f.config as JsonRecord), render_style: null },
        { ...(f.config as JsonRecord), fact_reuse_scope: null },
        { ...(f.config as JsonRecord), style: null },
        [],
        { ...(f.config as JsonRecord), extra: 1 },
      ]) {
        expectRpcError(
          f.owner,
          createPageExpression(f, randomUUID(), 'bad-config').replace(f.configSql, sqlJson(config)),
          'CONFIG_INVALID',
        );
        expectRpcError(
          f.owner,
          updateExpression(f, a.data.page, null, configPatch(f, a.data.config, { config })),
          'CONFIG_INVALID',
        );
      }
      expectRpcError(
        f.owner,
        createPageExpression(f, randomUUID(), 'module').replace("'trivia'", "'disabled'"),
        'MODULE_DISABLED',
      );
      expect(domainRows(f)).toEqual(before);
      const exact = rpc(
        f.owner,
        updateExpression(
          f,
          a.data.page,
          { name: 'Exact' },
          configPatch(f, a.data.config, { is_default: false }),
        ),
      );
      expect(exact.data.page.name).toBe('Exact');
      expect(exact.data.config.is_default).toBe(false);
      insertDraftPost(f, String(a.data.page.page_public_id), null);
      const guardBefore = domainRows(f);
      expectRpcError(
        f.owner,
        updateExpression(
          f,
          exact.data.page,
          { name: 'Rollback guard' },
          configPatch(f, exact.data.config, { is_enabled: false, is_default: false }),
        ),
        'ACTIVE_POST_CONTEXT_CONFLICT',
      );
      expect(domainRows(f)).toEqual(guardBefore);
    } finally {
      cleanupFixture(f);
    }
  }, 120_000);

  it('validates every override type/key/value and stored context ceiling through create_content_plan', () => {
    const f = createFixture();
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'overrides'));
      const valid = [
        {},
        { profile_key: 'fast_trivia' },
        { profile_key: 'practical_utility' },
        { fact_count: { mode: 'fixed', value: 7 } },
        { fact_count: { mode: 'adaptive', min: 5, preferred: 7, max: 9 } },
        { render_style: 'numbered' },
        { caption: { max_chars: 100 } },
        { hashtags: { min_count: 0, default_count: 1, max_count: 3 } },
        {
          text_budget: {
            hook_max_chars: 40,
            fact_max_chars: 80,
            facts_total_max_chars: 400,
            cta_max_chars: 40,
            canva_total_max_chars: 550,
          },
        },
      ];
      const created = rpc(
        f.owner,
        planExpression(
          f,
          page.data.page.page_public_id,
          valid.map((config, i) => item({ position: i + 1, item_config: config })),
        ),
      );
      expect(created.data.items.map((i) => i.item_config)).toEqual(valid);
      const before = domainRows(f);
      const invalid = [
        null,
        [],
        true,
        42,
        'text',
        { unknown: 1 },
        { profile_key: 'unknown' },
        { profile_key: null },
        { render_style: null },
        { render_style: 'html' },
        { fact_count: { mode: 'fixed', value: 4 } },
        { fact_count: { mode: 'fixed', value: 10 } },
        { fact_count: { mode: 'fixed', value: '7' } },
        { fact_count: { mode: 'fixed', value: 7, extra: true } },
        { fact_count: { mode: 'adaptive', min: 7, preferred: 5, max: 9 } },
        { fact_count: { mode: 'adaptive', min: 5, max: 9 } },
        { caption: { max_chars: null } },
        { caption: { max_chars: 501 } },
        { hashtags: { min_count: 3, default_count: 1, max_count: 5 } },
        { text_budget: { hook_max_chars: 40 } },
        {
          text_budget: {
            ...((f.config as JsonRecord).text_budget as JsonRecord),
            fact_max_chars: 91,
          },
        },
        { secret: 'x'.repeat(8200) },
      ];
      for (const config of invalid) {
        expectRpcError(
          f.owner,
          planExpression(f, page.data.page.page_public_id, [
            item(),
            item({ position: 2, item_config: config }),
          ]),
          'CONFIG_INVALID',
        );
      }
      expect(domainRows(f)).toEqual(before);
      const tightened = { ...(f.config as JsonRecord), caption: { max_chars: 100 } };
      const updated = rpc(
        f.owner,
        updateExpression(
          f,
          page.data.page,
          null,
          configPatch(f, page.data.config, { config: tightened }),
        ),
      );
      expectRpcError(
        f.owner,
        planExpression(f, updated.data.page.page_public_id, [
          item({ item_config: { caption: { max_chars: 101 } } }),
        ]),
        'CONFIG_INVALID',
      );
    } finally {
      cleanupFixture(f);
    }
  }, 120_000);

  it('proves 100-item success, contiguous positions, closed schedule intent and public config error mapping', () => {
    const f = createFixture();
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'limits'));
      const call = `api.create_content_plan(1,'${f.workspacePublicId}','${randomUUID()}','${page.data.page.page_public_id}','trivia',1,${planItemsForCount(100)},'Maximum',null)`;
      const created = rpc(f.owner, call);
      expect(created.data.items).toHaveLength(100);
      expect(created.data.items.map((i) => i.position)).toEqual(
        Array.from({ length: 100 }, (_, i) => i + 1),
      );
      expect(rpc(f.owner, call)).toEqual({ ...created, data: { ...created.data, replayed: true } });
      const before = domainRows(f);
      for (const items of [[], Array.from({ length: 101 }, (_, i) => item({ position: i + 1 }))]) {
        expectRpcError(
          f.owner,
          planExpression(f, page.data.page.page_public_id, items),
          'PLAN_LIMIT_EXCEEDED',
        );
      }
      for (const items of [
        [null],
        [[]],
        [item({ unknown: true })],
        [item(), item()],
        [item(), item({ position: 3 })],
        [item({ position: 0 })],
        [item({ position: 1.5 })],
        [item({ scheduled_at: 'not-a-timestamp' })],
        [item({ scheduled_at: '2026-02-30T00:00:00Z' })],
        [item({ scheduled_at: '2026-12-01' })],
        [item({ scheduled_at: { mode: 'daily' } })],
        [item({ schedule: { mode: 'daily' } })],
        [item({ interaction_goal: 'unknown' })],
      ]) {
        expectRpcError(
          f.owner,
          planExpression(f, page.data.page.page_public_id, items),
          'VALIDATION_FAILED',
        );
      }
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [item({ topic_key: 'unknown' })]),
        'CONFIG_INVALID',
      );
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [item()], randomUUID(), 2),
        'CONFIG_INVALID',
      );
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [item()], randomUUID(), 0),
        'CONFIG_INVALID',
      );
      expect(domainRows(f)).toEqual(before);
      const disabled = rpc(
        f.owner,
        updateExpression(
          f,
          page.data.page,
          null,
          configPatch(f, page.data.config, { is_enabled: false, is_default: false }),
        ),
      );
      expectRpcError(
        f.owner,
        planExpression(f, disabled.data.page.page_public_id),
        'MODULE_DISABLED',
      );
    } finally {
      cleanupFixture(f);
    }
  }, 120_000);

  it('rolls back Page/config, plan/items and ledger completion on injected downstream failures', () => {
    const f = createFixture();
    const functionName = `phase53_fault_${process.pid}`;
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'fault'));
      const key = randomUUID();
      fixtureStatements(
        `create function internal.${functionName}() returns trigger language plpgsql set search_path='' as $$
        begin raise exception 'local fixture failure'; end $$;
        revoke all on function internal.${functionName}() from public,anon,authenticated,service_role;
        create trigger phase53_config_fault after insert on public.page_niche_configs for each row
          when (new.workspace_id=(select_placeholder)) execute function internal.${functionName}()`.replace(
          '(select_placeholder)',
          String(
            querySingleRow(
              `select id from public.workspaces where public_id='${f.workspacePublicId}'`,
            ).id,
          ),
        ),
      );
      const before = domainRows(f);
      expectRpcError(f.owner, createPageExpression(f, key, 'child-failure'), 'INTERNAL_ERROR');
      expect(domainRows(f)).toEqual(before);
      fixtureStatements(`drop trigger phase53_config_fault on public.page_niche_configs;
        create trigger phase53_item_fault after insert on public.content_plan_items for each row
        when (new.position=2) execute function internal.${functionName}()`);
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [item(), item({ position: 2 })]),
        'INTERNAL_ERROR',
      );
      expect(domainRows(f)).toEqual(before);
      fixtureStatements(`drop trigger phase53_item_fault on public.content_plan_items;
        create trigger phase53_completion_fault before update on internal.operation_ledger for each row
        when (new.completed_at is not null) execute function internal.${functionName}()`);
      for (const call of [
        createPageExpression(f, key, 'completion'),
        updateExpression(f, page.data.page),
        planExpression(f, page.data.page.page_public_id),
      ]) {
        expectRpcError(f.owner, call, 'INTERNAL_ERROR');
        expect(domainRows(f)).toEqual(before);
      }
      runCli('drop trigger phase53_completion_fault on internal.operation_ledger');
      expect(rpc(f.owner, createPageExpression(f, key, 'child-failure')).data.replayed).toBe(false);
    } finally {
      fixtureStatements(`drop trigger if exists phase53_config_fault on public.page_niche_configs;
        drop trigger if exists phase53_item_fault on public.content_plan_items;
        drop trigger if exists phase53_completion_fault on internal.operation_ledger;
        drop function if exists internal.${functionName}()`);
      cleanupFixture(f);
    }
  }, 120_000);

  it('rechecks both slot tables per item, rolls back a later collision, and honors cancelled/discarded occupancy', () => {
    const f = createFixture();
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'slots'));
      const occupied = '2027-02-02T00:00:00Z';
      const free = '2027-02-01T00:00:00Z';
      const plan = rpc(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [item({ scheduled_at: occupied })]),
      );
      const before = domainRows(f);
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [
          item({ scheduled_at: free }),
          item({ position: 2, scheduled_at: occupied }),
        ]),
        'SCHEDULE_CONFLICT',
      );
      expect(domainRows(f)).toEqual(before);
      // Originating linked post is a local fixture: creation has no linked exception.
      insertDraftPost(f, String(page.data.page.page_public_id), occupied);
      runCli(`update public.posts set content_plan_item_id=(select id from public.content_plan_items where public_id='${plan.data.items[0]!.plan_item_public_id}')
        where page_id=(select id from public.pages where public_id='${page.data.page.page_public_id}')`);
      runCli(
        `update public.content_plan_items set status='cancelled' where public_id='${plan.data.items[0]!.plan_item_public_id}'`,
      );
      const postBefore = domainRows(f);
      expectRpcError(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [
          item({ scheduled_at: free }),
          item({ position: 2, scheduled_at: occupied }),
        ]),
        'SCHEDULE_CONFLICT',
      );
      expect(domainRows(f)).toEqual(postBefore);
      runCli(
        `update public.posts set status='discarded',discarded_at=now() where page_id=(select id from public.pages where public_id='${page.data.page.page_public_id}')`,
      );
      const available = rpc(
        f.owner,
        planExpression(f, page.data.page.page_public_id, [
          item({ scheduled_at: free }),
          item({ position: 2, scheduled_at: occupied }),
        ]),
      );
      expect(available.data.items.map((i) => i.scheduled_at)).toEqual([
        '2027-02-01T00:00:00.000000Z',
        '2027-02-02T00:00:00.000000Z',
      ]);
      const stored = querySingleRow(
        `select plan_config from public.content_plans where public_id='${available.data.plan.plan_public_id}'`,
      ).plan_config as JsonRecord;
      expect(stored.schedule).toEqual({ mode: 'explicit_slots' });
    } finally {
      cleanupFixture(f);
    }
  }, 60_000);

  it('maps current unsupported registry config to CONFIG_INVALID and disabled registry to MODULE_DISABLED', () => {
    const f = createFixture();
    const registry = querySingleRow(
      "select status,module_version,config_schema_version,updated_at from public.niches where key='trivia'",
    );
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'registry'));
      const before = domainRows(f);
      runCli("update public.niches set module_version=2 where key='trivia'");
      expectRpcError(f.owner, planExpression(f, page.data.page.page_public_id), 'CONFIG_INVALID');
      runCli("update public.niches set module_version=1 where key='trivia'");
      runCli("update public.niches set config_schema_version=2 where key='trivia'");
      expectRpcError(f.owner, planExpression(f, page.data.page.page_public_id), 'CONFIG_INVALID');
      expectRpcError(
        f.owner,
        createPageExpression(f, randomUUID(), 'registry-schema'),
        'CONFIG_SCHEMA_UNSUPPORTED',
      );
      runCli("update public.niches set status='disabled' where key='trivia'");
      expectRpcError(f.owner, planExpression(f, page.data.page.page_public_id), 'MODULE_DISABLED');
      expectRpcError(
        f.owner,
        updateExpression(
          f,
          page.data.page,
          null,
          configPatch(f, page.data.config, { is_default: false }),
        ),
        'MODULE_DISABLED',
      );
      expect(domainRows(f)).toEqual(before);
    } finally {
      runCli(
        `update public.niches set status=${sqlString(String(registry.status))},module_version=${registry.module_version},config_schema_version=${registry.config_schema_version} where key='trivia'`,
      );
      cleanupFixture(f);
    }
  }, 60_000);

  it('rate-limits all three public write paths before mutation, including replay requests', () => {
    const f = createFixture();
    try {
      const created = rpc(f.owner, createPageExpression(f, randomUUID(), 'rate'));
      const calls = [
        createPageExpression(f, randomUUID(), 'rate-create'),
        updateExpression(f, created.data.page),
        planExpression(f, created.data.page.page_public_id),
      ];
      for (const expression of calls) {
        const client = randomUUID();
        rpc(f.owner, expression, client);
        const before = state(f);
        // Saturate both adjacent windows for this disposable client. The
        // limiter uses clock_timestamp(), so a CI minute rollover cannot
        // turn the replay denial into an unrelated success.
        runCli(`insert into internal.rate_limit_buckets
          (actor_user_id,oauth_client_id,limit_group,window_start,request_count)
          select '${f.owner}','${client}','write',
            (date_trunc('minute',clock_timestamp() at time zone 'UTC') at time zone 'UTC')+offsets.delta,
            30
          from (values(interval '0 minutes'),(interval '1 minute')) offsets(delta)
          on conflict (actor_user_id,oauth_client_id,limit_group,window_start)
          do update set request_count=excluded.request_count`);
        expectRpcError(f.owner, expression, 'RATE_LIMITED', client);
        expect(state(f)).toEqual(before);
      }
      expect(state(f)).toEqual({
        page_count: 2,
        config_count: 2,
        plan_count: 1,
        item_count: 1,
        ledger_count: 4,
      });
    } finally {
      cleanupFixture(f);
    }
  }, 60_000);

  it('CON-003 materializes numeric multi-slot locks before writes and serializes conflicting public plans', async () => {
    const f = createFixture();
    try {
      const page = rpc(f.owner, createPageExpression(f, randomUUID(), 'locks'));
      const locks =
        queryRows(`select ts::text,hashtextextended(p.id::text||':'||((extract(epoch from ts)*1000000)::bigint)::text,0)::text as key
        from public.pages p cross join generate_series(timestamptz '2027-01-01',timestamptz '2027-01-10',interval '1 day') ts
        where p.public_id='${page.data.page.page_public_id}' order by ts`);
      const pair = locks.flatMap((a, i) =>
        locks
          .slice(i + 1)
          .filter((b) => BigInt(String(a.key)) > BigInt(String(b.key)))
          .map((b) => [a, b]),
      )[0]!;
      expect(pair).toBeDefined();
      const [high, low] = pair;
      const slots = [
        item({ scheduled_at: new Date(String(high!.ts)).toISOString() }),
        item({ position: 2, scheduled_at: new Date(String(low!.ts)).toISOString() }),
      ];
      const holder = psqlAsync(
        `begin;select pg_advisory_xact_lock(${high!.key});select pg_sleep(6);commit;`,
      );
      await new Promise((resolve) => setTimeout(resolve, 250));
      const first = psqlAsync(
        callerSql(f.owner, planExpression(f, page.data.page.page_public_id, slots)),
      );
      let observed = false;
      for (let n = 0; n < 4 && !observed; n++) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        observed =
          querySingleRow(`select exists(select 1 from pg_locks where locktype='advisory' and granted
          and classid=((${low!.key}::bigint >> 32)&4294967295)::oid and objid=(${low!.key}::bigint&4294967295)::oid) as held`)
            .held === true;
      }
      const result = await first;
      expect((await holder).code).toBe(0);
      expect(observed).toBe(true); // Lower numeric key acquired while blocked on higher, despite reverse timestamp order.
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('DATABASE_BUSY');
      expect(state(f).plan_count).toBe(0);
      const calls = await Promise.all([
        psqlAsync(callerSql(f.owner, planExpression(f, page.data.page.page_public_id, slots))),
        psqlAsync(
          callerSql(
            f.owner,
            planExpression(f, page.data.page.page_public_id, [
              { ...slots[1], position: 1 },
              { ...slots[0], position: 2 },
            ]),
          ),
        ),
      ]);
      expect(calls.filter((r) => r.code === 0)).toHaveLength(1);
      expect(calls.find((r) => r.code !== 0)!.output).toContain('SCHEDULE_CONFLICT');
      expect(state(f)).toMatchObject({ plan_count: 1, item_count: 2, ledger_count: 2 });
    } finally {
      cleanupFixture(f);
    }
  }, 60_000);

  it('serializes identical concurrent public operation keys to one mutation for all three writes', async () => {
    const f = createFixture();
    try {
      const create = createPageExpression(f, randomUUID(), 'parallel');
      const execute = async (expression: string) => {
        const results = await Promise.all([
          psqlAsync(callerSql(f.owner, expression)),
          psqlAsync(callerSql(f.owner, expression)),
        ]);
        expect(results.every((r) => r.code === 0)).toBe(true);
        const responses = results.map(
          (r) =>
            JSON.parse(r.output.split('\n').find((l) => l.startsWith('{"data"'))!) as RpcResponse,
        );
        expect(responses.map((r) => r.data.replayed).sort()).toEqual([false, true]);
        const initial = responses.find((r) => !r.data.replayed)!;
        expect(responses.find((r) => r.data.replayed)).toEqual({
          ...initial,
          data: { ...initial.data, replayed: true },
        });
        return initial;
      };
      const created = await execute(create);
      await execute(updateExpression(f, created.data.page));
      await execute(planExpression(f, created.data.page.page_public_id));
      expect(state(f)).toEqual({
        page_count: 1,
        config_count: 1,
        plan_count: 1,
        item_count: 1,
        ledger_count: 3,
      });
    } finally {
      cleanupFixture(f);
    }
  }, 60_000);
  it('exposes exactly the three new authenticated write RPCs and narrow privileges', () => {
    const catalog = querySingleRow(`
      with api_functions as (
        select procedure.oid, procedure.proname, procedure.proowner, procedure.prosecdef,
          procedure.proconfig
        from pg_proc as procedure
        join pg_namespace as namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'api'
      )
      select
        (select count(*) from api_functions) as api_function_count,
        (select array_agg(proname order by proname) from api_functions) as api_function_names,
        (select count(*) from api_functions where has_function_privilege('authenticated', oid, 'execute')) as authenticated_execute_count,
        (select count(*) from api_functions where has_function_privilege('anon', oid, 'execute') or has_function_privilege('service_role', oid, 'execute')) as non_authenticated_execute_count,
         (select count(*) from api_functions where proowner <> 'content_producer_api_owner'::regrole or not prosecdef or not coalesce(proconfig @> array['search_path=""'],false)) as unsafe_api_function_count,
         (select count(*) from api_functions f cross join lateral aclexplode(coalesce((select proacl from pg_proc where oid=f.oid),acldefault('f',f.proowner))) a where a.grantee=0 and a.privilege_type='EXECUTE') as public_execute_count,
        has_schema_privilege('content_producer_api_owner', 'api', 'create') as api_owner_create,
        has_table_privilege('authenticated', 'public.pages', 'select,insert,update') as caller_pages_access,
        has_table_privilege('authenticated', 'public.content_plan_items', 'select,insert') as caller_items_access
    `);

    expect(catalog.api_function_count).toBe(33);
    expect(String(catalog.api_function_names).replace(/[{}]/g, '').split(',')).toEqual([
      'approve_post',
      'archive_post',
      'cancel_content_plan',
      'claim_content_plan_items',
      'create_content_plan',
      'create_page',
      'discard_post',
      'get_account_profile',
      'get_content_plan',
      'get_page_generation_context',
      'get_performance_insights',
      'get_post',
      'get_post_performance',
      'get_workspace_context',
      'list_content_plans',
      'list_pages',
      'list_posts',
      'mark_post_posted',
      'record_post_performance',
      'renew_content_plan_claim',
      'replace_discarded_plan_item',
      'report_content_plan_item_failure',
      'reschedule_post',
      'retry_content_plan_item',
      'revise_post',
      'revoke_post_approval',
      'save_post',
      'trivia_correct_fact',
      'trivia_find_similar_facts',
      'trivia_register_and_reserve_facts',
      'trivia_release_facts',
      'trivia_reverify_fact',
      'update_page',
    ]);
    expect(catalog.authenticated_execute_count).toBe(33);
    expect(catalog.non_authenticated_execute_count).toBe(0);
    expect(catalog.unsafe_api_function_count).toBe(0);
    expect(catalog.public_execute_count).toBe(0);
    expect(catalog.api_owner_create).toBe(false);
    expect(catalog.caller_pages_access).toBe(false);
    expect(catalog.caller_items_access).toBe(false);
  }, 30_000);

  it('creates a Page and config atomically, replays exactly, and rejects owner/context violations', () => {
    const fixture = createFixture();
    try {
      const before = state(fixture);
      expectRpcErrorWithoutContext(
        createPageExpression(fixture, randomUUID(), 'missing-auth-context'),
        'AUTH_REQUIRED',
      );
      expect(state(fixture)).toEqual(before);

      const operationKey = randomUUID();
      const created = rpc(fixture.owner, createPageExpression(fixture, operationKey, 'page'));
      const page = created.data.page;
      expect(page.slug).toBe(`${fixture.slugPrefix}-page`);
      expect(created.data.config.niche_key).toBe('trivia');
      expect(created.data.config.is_enabled).toBe(true);
      expect(created.data.config.is_default).toBe(true);
      expect(created.data.replayed).toBe(false);

      const afterCreate = state(fixture);
      expect(afterCreate).toEqual({
        page_count: 1,
        config_count: 1,
        plan_count: 0,
        item_count: 0,
        ledger_count: 1,
      });

      const replay = rpc(
        fixture.owner,
        createPageExpression(fixture, operationKey, 'page'),
        'phase53-write-client',
      );
      expect(replay.data.replayed).toBe(true);
      expect(replay.data.page.page_public_id).toBe(page.page_public_id);
      expect(state(fixture)).toEqual(afterCreate);

      expectRpcError(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'page'),
        'PAGE_SLUG_CONFLICT',
      );
      expect(state(fixture)).toEqual(afterCreate);

      expectRpcError(
        fixture.owner,
        createPageExpression(fixture, operationKey, 'different'),
        'OPERATION_KEY_REUSED',
      );
      expectRpcError(
        fixture.otherOwner,
        createPageExpression(fixture, randomUUID(), 'other-owner'),
        'OWNER_ACCESS_REQUIRED',
      );
      expectRpcError(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'missing-client'),
        'OAUTH_CLIENT_REQUIRED',
        '',
      );

      expectRpcError(
        fixture.owner,
        `api.create_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, 'Bad', '${fixture.slugPrefix}-bad', 'UTC', array['US']::text[], 'trivia', 1, '{}'::jsonb, false)`,
        'CONFIG_INVALID',
      );
      expect(state(fixture)).toEqual(afterCreate);
      expect(before.page_count).toBe(0);
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);

  it('creates a non-default Page config without changing the default niche', () => {
    const fixture = createFixture();
    try {
      const created = rpc(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'non-default', false),
      );
      expect(created.data.config.is_enabled).toBe(true);
      expect(created.data.config.is_default).toBe(false);

      const pageDefaults = querySingleRow(`
        select page.default_niche_key,
          config.is_default
        from public.pages as page
        join public.page_niche_configs as config
          on config.page_id = page.id and config.niche_key = 'trivia'
        where page.public_id = '${created.data.page.page_public_id}'::uuid
      `);
      expect(pageDefaults).toEqual({
        default_niche_key: null,
        is_default: false,
      });
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);

  it('updates Page/config with exact CAS and rejects stale writes without partial mutation', () => {
    const fixture = createFixture();
    try {
      const created = rpc(fixture.owner, createPageExpression(fixture, randomUUID(), 'cas'));
      const pageId = created.data.page.page_public_id as string;
      const oldPageUpdatedAt = created.data.page.updated_at as string;
      const oldConfigUpdatedAt = created.data.config.updated_at as string;
      const pageUpdateOperationKey = randomUUID();
      const pageUpdate = `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${pageUpdateOperationKey}'::uuid, '${pageId}'::uuid, ${sqlString(oldPageUpdatedAt)}::timestamptz, '{"name":"Renamed Page"}'::jsonb, null::jsonb)`;

      const updated = rpc(fixture.owner, pageUpdate);
      expect(updated.data.page.name).toBe('Renamed Page');
      expect(updated.data.config).toBeUndefined();
      expect(updated.data.replayed).toBe(false);

      const updatedReplay = rpc(fixture.owner, pageUpdate, 'phase53-write-client');
      expect(updatedReplay.data.page.name).toBe('Renamed Page');
      expect(updatedReplay.data.replayed).toBe(true);

      expectRpcError(
        fixture.owner,
        `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, ${sqlString(oldPageUpdatedAt)}::timestamptz, '{"name":"Stale"}'::jsonb, null::jsonb)`,
        'PAGE_VERSION_CONFLICT',
      );

      const current = querySingleRow(`
        select internal.iso_timestamp_v1(page.updated_at) as page_updated_at,
          internal.iso_timestamp_v1(config.updated_at) as config_updated_at
        from public.pages as page
        join public.page_niche_configs as config on config.page_id = page.id and config.niche_key = 'trivia'
        where page.public_id = '${pageId}'::uuid
      `);
      const configPatch = {
        niche_key: 'trivia',
        expected_config_updated_at: String(current.config_updated_at),
        config_schema_version: 1,
        config: fixture.config,
        is_enabled: true,
        is_default: false,
      };
      const configUpdated = rpc(
        fixture.owner,
        `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, ${sqlString(String(current.page_updated_at))}::timestamptz, null::jsonb, ${sqlJson(configPatch)})`,
      );
      expect(configUpdated.data.config.is_default).toBe(false);
      expect(configUpdated.data.page.name).toBe('Renamed Page');

      expectRpcError(
        fixture.owner,
        `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, ${sqlString(String(configUpdated.data.page.updated_at))}::timestamptz, null::jsonb, ${sqlJson({ ...configPatch, expected_config_updated_at: oldConfigUpdatedAt })})`,
        'PAGE_VERSION_CONFLICT',
      );
      expectRpcError(
        fixture.owner,
        `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, ${sqlString(String(configUpdated.data.page.updated_at))}::timestamptz, null::jsonb, null::jsonb)`,
        'VALIDATION_FAILED',
      );

      const guardedPage = rpc(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'active-post'),
      );
      const guardedPageId = guardedPage.data.page.page_public_id as string;
      insertDraftPost(fixture, guardedPageId, null);
      const guardedCurrent = querySingleRow(`
        select internal.iso_timestamp_v1(page.updated_at) as page_updated_at,
          internal.iso_timestamp_v1(config.updated_at) as config_updated_at
        from public.pages as page
        join public.page_niche_configs as config on config.page_id = page.id and config.niche_key = 'trivia'
        where page.public_id = '${guardedPageId}'::uuid
      `);
      const guardedConfigPatch = {
        niche_key: 'trivia',
        expected_config_updated_at: String(guardedCurrent.config_updated_at),
        config_schema_version: 1,
        config: fixture.config,
        is_enabled: false,
        is_default: false,
      };
      expectRpcError(
        fixture.owner,
        `api.update_page(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${guardedPageId}'::uuid, ${sqlString(String(guardedCurrent.page_updated_at))}::timestamptz, null::jsonb, ${sqlJson(guardedConfigPatch)})`,
        'ACTIVE_POST_CONTEXT_CONFLICT',
      );
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);

  it('creates exact ordered plan items, links all children to one ledger row, and protects schedules atomically', () => {
    const fixture = createFixture();
    try {
      const pageCreated = rpc(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'plan-page'),
      );
      const pageId = pageCreated.data.page.page_public_id as string;
      const scheduledAt = '2026-12-01T09:00:00Z';
      const items = planItems(scheduledAt, null);
      const operationKey = randomUUID();
      const createPlan = `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${operationKey}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${items}, 'December batch', 'December plan')`;
      const created = rpc(fixture.owner, createPlan);
      expect(created.data.items).toHaveLength(2);
      expect(created.data.items[0].position).toBe(1);
      expect(created.data.items[1].position).toBe(2);
      expect(created.data.items[0].scheduled_at).toBe('2026-12-01T09:00:00.000000Z');
      expect(created.data.replayed).toBe(false);

      const linkage = querySingleRow(`
        select
          (select count(*) from public.content_plans where public_id = '${created.data.plan.plan_public_id}'::uuid) as plan_count,
          (select count(*) from public.content_plan_items where plan_id = (select id from public.content_plans where public_id = '${created.data.plan.plan_public_id}'::uuid)) as item_count,
          (select count(distinct created_by_operation_id) from public.content_plan_items where plan_id = (select id from public.content_plans where public_id = '${created.data.plan.plan_public_id}'::uuid)) as item_operation_count,
          (select count(*) from internal.operation_ledger where operation_key = '${operationKey}'::uuid and workspace_id = (select id from public.workspaces where public_id = '${fixture.workspacePublicId}'::uuid)) as ledger_count
      `);
      expect(linkage).toEqual({
        plan_count: 1,
        item_count: 2,
        item_operation_count: 1,
        ledger_count: 1,
      });

      const replay = rpc(fixture.owner, createPlan, 'phase53-write-client');
      expect(replay.data.replayed).toBe(true);
      expect(replay.data.plan.plan_public_id).toBe(created.data.plan.plan_public_id);

      const beforeLimit = state(fixture);
      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${planItemsForCount(101)}, 'Too many items', 'Limit plan')`,
        'PLAN_LIMIT_EXCEEDED',
      );
      expect(state(fixture)).toEqual(beforeLimit);

      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${singlePlanItem('not-a-timestamp')}, 'Bad schedule', 'Invalid schedule')`,
        'VALIDATION_FAILED',
      );

      const postConflictPage = rpc(
        fixture.owner,
        createPageExpression(fixture, randomUUID(), 'post-conflict'),
      );
      const postConflictPageId = postConflictPage.data.page.page_public_id as string;
      const postScheduledAt = '2026-12-03T09:00:00Z';
      insertDraftPost(fixture, postConflictPageId, postScheduledAt);
      const beforePostConflict = state(fixture);
      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${postConflictPageId}'::uuid, 'trivia', 1, ${singlePlanItem(postScheduledAt)}, 'Post collision', 'Post conflict plan')`,
        'SCHEDULE_CONFLICT',
      );
      expect(state(fixture)).toEqual(beforePostConflict);

      const beforeConflict = state(fixture);
      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${planItems(scheduledAt, null)}, 'Conflicting batch', 'Conflict plan')`,
        'SCHEDULE_CONFLICT',
      );
      expect(state(fixture)).toEqual(beforeConflict);

      const duplicateSlotItems = planItems('2026-12-02T09:00:00Z', '2026-12-02T09:00:00Z');
      const beforeDuplicate = state(fixture);
      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${duplicateSlotItems}, 'Duplicate slots', 'Rollback plan')`,
        'SCHEDULE_CONFLICT',
      );
      expect(state(fixture)).toEqual(beforeDuplicate);

      const invalidItems = sqlJson([
        {
          position: 1,
          scheduled_at: null,
          topic_key: 'animals',
          format_key: 'single_subject_fast',
          interaction_goal: 'share',
          item_config: {},
        },
        {
          position: 3,
          scheduled_at: null,
          topic_key: 'geography',
          format_key: 'comparison',
          interaction_goal: 'save',
          item_config: {},
        },
      ]);
      expectRpcError(
        fixture.owner,
        `api.create_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, '${pageId}'::uuid, 'trivia', 1, ${invalidItems}, 'Bad positions', null)`,
        'VALIDATION_FAILED',
      );
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);
});
