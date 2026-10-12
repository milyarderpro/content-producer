import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

type JsonRecord = Record<string, unknown>;

const businessTables = [
  'public.workspaces',
  'public.niches',
  'public.pages',
  'public.page_niche_configs',
  'public.content_plans',
  'public.content_plan_items',
  'public.posts',
  'public.post_metrics',
  'public.trivia_facts',
  'public.trivia_post_facts',
  'internal.operation_ledger',
  'internal.rate_limit_buckets',
] as const;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
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

function runCliAsync(sql: string): Promise<{ code: number; output: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
      cwd: process.cwd(),
      env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    });
    let output = '';
    child.stdout.on('data', (data) => (output += data));
    child.stderr.on('data', (data) => (output += data));
    child.on('error', reject);
    child.on('close', (code) => resolve({ code: code ?? 1, output }));
  });
}

function runLocalPsqlAsync(sql: string): Promise<{ code: number; output: string }> {
  const projectName = process.cwd().split('/').at(-1);
  return new Promise((resolve, reject) => {
    const child = spawn('docker', [
      'exec',
      `supabase_db_${projectName}`,
      'psql',
      '-U',
      'postgres',
      '-d',
      'postgres',
      '-v',
      'ON_ERROR_STOP=1',
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

function querySingleRow(sql: string): JsonRecord {
  const output = runCli(sql);
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) throw new Error('Expected JSON output from supabase db query.');

  const parsed: unknown = JSON.parse(output.slice(jsonStart));
  if (!isJsonRecord(parsed) || !Array.isArray(parsed.rows) || parsed.rows.length !== 1) {
    throw new Error('Expected exactly one database row.');
  }
  const [row] = parsed.rows;
  if (!isJsonRecord(row)) throw new Error('Expected a database object row.');
  return row;
}

function callerDo(actorUserId: string, body: string, clientId = 'phase5-test-client'): string {
  return `
    do $$
    begin
      perform set_config(
        'request.jwt.claims',
        '{"sub":"${actorUserId}","role":"authenticated","client_id":"${clientId}"}',
        true
      );
      execute 'set local role content_producer_api_owner';
      ${body}
    end;
    $$;
  `;
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

describe('Phase 5.1 API security kernel', () => {
  it('keeps the API-owner role narrow, private helpers uncallable, and no business API premature', () => {
    const catalog = querySingleRow(`
      with kernel_functions as (
        select procedure.oid, procedure.proowner, procedure.prosecdef, procedure.proconfig
        from pg_proc as procedure
        join pg_namespace as namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'internal'
          and procedure.proname in (
            'assert_request_context_v1',
            'request_actor_user_id_v1',
            'resolve_workspace_owner_v1',
            'canonical_request_hash_v1',
            'configure_write_transaction_v1',
            'safe_error_code_v1',
            'safe_error_response_v1',
            'raise_mapped_error_v1',
            'claim_operation_for_owner_v1',
            'consume_rate_limit_v1',
            'assert_write_operation_name_v1',
            'rate_limit_group_for_write_operation_v1',
            'assert_rate_limit_v1',
            'is_safe_operation_response_snapshot_v2',
            'complete_operation_for_owner_v2'
          )
      )
      select
        role.rolcanlogin as api_owner_can_login,
        role.rolbypassrls as api_owner_bypasses_rls,
        role.rolsuper as api_owner_is_superuser,
        role.rolinherit as api_owner_inherits,
        not exists (
          select 1 from pg_auth_members as membership
          where membership.member = role.oid
        ) as api_owner_has_no_role_membership,
        not exists (
          select 1 from pg_class as relation where relation.relowner = role.oid
        ) as api_owner_owns_no_tables,
        has_schema_privilege('authenticated', 'api', 'usage') as authenticated_api_usage,
        has_schema_privilege('anon', 'api', 'usage') as anon_api_usage,
        has_schema_privilege('authenticated', 'internal', 'usage') as authenticated_internal_usage,
        has_schema_privilege('service_role', 'internal', 'usage') as service_role_internal_usage,
        has_schema_privilege('content_producer_api_owner', 'internal', 'create') as api_owner_internal_create,
        has_schema_privilege('content_producer_api_owner', 'auth', 'usage') as api_owner_auth_schema_usage,
        has_table_privilege('content_producer_api_owner', 'auth.users', 'select') as api_owner_auth_users_select,
        not exists (
          select 1
          from pg_proc as procedure
          cross join lateral aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as privilege
          where procedure.oid = 'auth.uid()'::regprocedure
            and privilege.grantee = 'content_producer_api_owner'::regrole
            and privilege.privilege_type = 'EXECUTE'
        ) as api_owner_has_no_direct_auth_uid_execute,
        (select count(*) from pg_proc as procedure join pg_namespace as namespace on namespace.oid = procedure.pronamespace where namespace.nspname = 'api') as api_function_count,
        (select count(*) from kernel_functions) as kernel_function_count,
        (select count(*) from kernel_functions where proowner <> 'content_producer_api_owner'::regrole or prosecdef or coalesce(array_to_string(proconfig, ','), '') !~ 'search_path=') as unsafe_kernel_function_count,
        (select count(*) from pg_proc as procedure join pg_namespace as namespace on namespace.oid = procedure.pronamespace where namespace.nspname = 'internal' and (
          has_function_privilege('anon', procedure.oid, 'execute')
          or has_function_privilege('authenticated', procedure.oid, 'execute')
          or has_function_privilege('service_role', procedure.oid, 'execute')
          or exists (
            select 1
            from aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as privilege
            where privilege.grantee = 0 and privilege.privilege_type = 'EXECUTE'
          )
        )) as caller_executable_internal_function_count,
        (select count(*) from pg_policies where policyname in (
          'workspaces_api_owner_select',
          'operation_ledger_api_owner_select',
          'operation_ledger_api_owner_insert',
          'operation_ledger_api_owner_update',
          'rate_limit_buckets_api_owner_select',
          'rate_limit_buckets_api_owner_insert',
          'rate_limit_buckets_api_owner_update'
        )) as kernel_policy_count,
        has_table_privilege('content_producer_api_owner', 'public.workspaces', 'select') as api_owner_workspace_select,
        has_table_privilege('content_producer_api_owner', 'internal.operation_ledger', 'select,insert,update') as api_owner_ledger_write,
        has_table_privilege('content_producer_api_owner', 'internal.rate_limit_buckets', 'select,insert,update') as api_owner_rate_limit_write,
        has_table_privilege('content_producer_api_owner', 'public.pages', 'select') as api_owner_ungranted_pages_select,
        (
          select procedure.proowner = 'postgres'::regrole
            and procedure.prosecdef
            and procedure.pronargs = 0
            and coalesce(array_to_string(procedure.proconfig, ','), '') ~ 'search_path='
            and btrim(regexp_replace(procedure.prosrc, '[[:space:]]+', ' ', 'g')) = 'select auth.uid();'
            and has_function_privilege('content_producer_api_owner', procedure.oid, 'execute')
            and not has_function_privilege('anon', procedure.oid, 'execute')
            and not has_function_privilege('authenticated', procedure.oid, 'execute')
            and not has_function_privilege('service_role', procedure.oid, 'execute')
            and not exists (
              select 1
              from aclexplode(coalesce(procedure.proacl, acldefault('f', procedure.proowner))) as privilege
              where privilege.grantee = 0 and privilege.privilege_type = 'EXECUTE'
            )
          from pg_proc as procedure
          join pg_namespace as namespace on namespace.oid = procedure.pronamespace
          where namespace.nspname = 'internal'
            and procedure.proname = 'current_auth_uid_v1'
            and procedure.oid = 'internal.current_auth_uid_v1()'::regprocedure
        ) as auth_uid_bridge_is_narrow
      from pg_roles as role
      where role.rolname = 'content_producer_api_owner'
    `);

    expect(catalog.api_owner_can_login).toBe(false);
    expect(catalog.api_owner_bypasses_rls).toBe(false);
    expect(catalog.api_owner_is_superuser).toBe(false);
    expect(catalog.api_owner_inherits).toBe(false);
    expect(catalog.api_owner_has_no_role_membership).toBe(true);
    expect(catalog.api_owner_owns_no_tables).toBe(true);
    expect(catalog.authenticated_api_usage).toBe(true);
    expect(catalog.anon_api_usage).toBe(false);
    expect(catalog.authenticated_internal_usage).toBe(false);
    expect(catalog.service_role_internal_usage).toBe(false);
    expect(catalog.api_owner_internal_create).toBe(false);
    expect(catalog.api_owner_auth_schema_usage).toBe(false);
    expect(catalog.api_owner_auth_users_select).toBe(false);
    expect(catalog.api_owner_has_no_direct_auth_uid_execute).toBe(true);
    expect(catalog.api_function_count).toBe(32);
    expect(catalog.kernel_function_count).toBe(15);
    expect(catalog.unsafe_kernel_function_count).toBe(0);
    expect(catalog.caller_executable_internal_function_count).toBe(0);
    expect(catalog.kernel_policy_count).toBe(7);
    expect(catalog.api_owner_workspace_select).toBe(true);
    expect(catalog.api_owner_ledger_write).toBe(true);
    expect(catalog.api_owner_rate_limit_write).toBe(true);
    expect(catalog.api_owner_ungranted_pages_select).toBe(true);
    expect(catalog.auth_uid_bridge_is_narrow).toBe(true);
  }, 30_000);

  it('denies caller table, sequence, and internal-helper access while retaining api schema usage', () => {
    const tableList = businessTables.map((table) => `'${table}'::regclass`).join(', ');
    const permissions = querySingleRow(`
      with business_tables as (select unnest(array[${tableList}]) as relation),
      business_sequences as (
        select class.oid
        from pg_class as class
        join pg_namespace as namespace on namespace.oid = class.relnamespace
        where class.relkind = 'S' and namespace.nspname in ('public', 'internal')
      )
      select
        (select count(*) from business_tables where has_table_privilege('authenticated', relation, 'select') or has_table_privilege('authenticated', relation, 'insert') or has_table_privilege('authenticated', relation, 'update') or has_table_privilege('authenticated', relation, 'delete')) as authenticated_table_privilege_count,
        (select count(*) from business_tables where has_table_privilege('anon', relation, 'select') or has_table_privilege('anon', relation, 'insert') or has_table_privilege('anon', relation, 'update') or has_table_privilege('anon', relation, 'delete')) as anon_table_privilege_count,
        (select count(*) from business_tables where has_table_privilege('service_role', relation, 'select') or has_table_privilege('service_role', relation, 'insert') or has_table_privilege('service_role', relation, 'update') or has_table_privilege('service_role', relation, 'delete')) as service_role_table_privilege_count,
        (select count(*) from business_sequences where has_sequence_privilege('authenticated', oid, 'usage') or has_sequence_privilege('authenticated', oid, 'select') or has_sequence_privilege('authenticated', oid, 'update')) as authenticated_sequence_privilege_count,
        (select count(*) from business_sequences where has_sequence_privilege('anon', oid, 'usage') or has_sequence_privilege('anon', oid, 'select') or has_sequence_privilege('anon', oid, 'update')) as anon_sequence_privilege_count,
        (select count(*) from business_sequences where has_sequence_privilege('service_role', oid, 'usage') or has_sequence_privilege('service_role', oid, 'select') or has_sequence_privilege('service_role', oid, 'update')) as service_role_sequence_privilege_count
    `);

    expect(permissions.authenticated_table_privilege_count).toBe(0);
    expect(permissions.anon_table_privilege_count).toBe(0);
    expect(permissions.service_role_table_privilege_count).toBe(0);
    expect(permissions.authenticated_sequence_privilege_count).toBe(0);
    expect(permissions.anon_sequence_privilege_count).toBe(0);
    expect(permissions.service_role_sequence_privilege_count).toBe(0);

    expect(() =>
      runCli(
        `do $$ begin execute 'set local role authenticated'; perform count(*) from public.workspaces; end $$;`,
      ),
    ).toThrow('permission denied');
    expect(() =>
      runCli(
        `do $$ begin execute 'set local role authenticated'; perform nextval('internal.operation_ledger_id_seq'); end $$;`,
      ),
    ).toThrow('permission denied');
    expect(() =>
      runCli(
        `do $$ begin execute 'set local role authenticated'; perform * from internal.assert_request_context_v1(); end $$;`,
      ),
    ).toThrow('permission denied');
    expect(() =>
      runCli(
        `do $$ begin execute 'set local role authenticated'; perform internal.current_auth_uid_v1(); end $$;`,
      ),
    ).toThrow('permission denied');
  }, 30_000);

  it('applies request identity and owner RLS to the narrow API role', () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const ownerOne = randomUUID();
    const ownerTwo = randomUUID();
    const nonOwner = randomUUID();
    const workspaceOneSlug = `phase5-owner-one-${suffix}`;
    const workspaceTwoSlug = `phase5-owner-two-${suffix}`;

    try {
      insertAuthUser(ownerOne, `${workspaceOneSlug}@example.test`);
      insertAuthUser(ownerTwo, `${workspaceTwoSlug}@example.test`);
      insertAuthUser(nonOwner, `phase5-non-owner-${suffix}@example.test`);
      runCli(
        `insert into public.workspaces (owner_user_id, name, slug) values ('${ownerOne}', 'Owner one', '${workspaceOneSlug}'), ('${ownerTwo}', 'Owner two', '${workspaceTwoSlug}')`,
      );

      const workspaceIds = querySingleRow(`
        select
          (array_agg(public_id::text order by id) filter (where slug = '${workspaceOneSlug}'))[1] as workspace_one_public_id,
          (array_agg(public_id::text order by id) filter (where slug = '${workspaceTwoSlug}'))[1] as workspace_two_public_id
        from public.workspaces
      `);
      const workspaceOnePublicId = String(workspaceIds.workspace_one_public_id);
      const workspaceTwoPublicId = String(workspaceIds.workspace_two_public_id);

      expect(() =>
        runCli(
          callerDo(
            ownerOne,
            `
          if (select count(*) from public.workspaces) <> 1
            or not exists (select 1 from public.workspaces where public_id = '${workspaceOnePublicId}'::uuid) then
            raise exception 'owner one RLS visibility failed';
          end if;
        `,
          ),
        ),
      ).not.toThrow();
      expect(() =>
        runCli(
          callerDo(
            ownerTwo,
            `
          if (select count(*) from public.workspaces) <> 1
            or not exists (select 1 from public.workspaces where public_id = '${workspaceTwoPublicId}'::uuid) then
            raise exception 'owner two RLS visibility failed';
          end if;
        `,
          ),
        ),
      ).not.toThrow();
      expect(() =>
        runCli(
          callerDo(
            nonOwner,
            `perform * from internal.resolve_workspace_owner_v1('${workspaceOnePublicId}'::uuid);`,
          ),
        ),
      ).toThrow('OWNER_ACCESS_REQUIRED');
      expect(() =>
        runCli(
          `do $$ begin perform set_config('request.jwt.claims', '{"sub":"${ownerOne}","role":"authenticated"}', true); execute 'set local role content_producer_api_owner'; perform * from internal.assert_request_context_v1(); end $$;`,
        ),
      ).toThrow('OAUTH_CLIENT_REQUIRED');
      expect(() =>
        runCli(
          `do $$ begin execute 'set local role content_producer_api_owner'; perform * from internal.assert_request_context_v1(); end $$;`,
        ),
      ).toThrow('AUTH_REQUIRED');
    } finally {
      runCli(
        `delete from public.workspaces where slug in ('${workspaceOneSlug}', '${workspaceTwoSlug}')`,
      );
      runCli(`delete from auth.users where id in ('${ownerOne}', '${ownerTwo}', '${nonOwner}')`);
    }
  }, 30_000);

  it('canonicalizes semantic hashes and provides safe timeout mapping', () => {
    const hash = querySingleRow(`
      select
        internal.canonical_request_hash_v1('create_page', '11111111-1111-4111-8111-111111111111'::uuid, 1, '{"page":{"slug":"one","name":"One"}}'::jsonb) as first_hash,
        internal.canonical_request_hash_v1('create_page', '11111111-1111-4111-8111-111111111111'::uuid, 1, '{"page":{"name":"One","slug":"one"}}'::jsonb) as reordered_hash,
        internal.canonical_request_hash_v1('create_page', '11111111-1111-4111-8111-111111111111'::uuid, 1, '{"page":{"name":"Two","slug":"one"}}'::jsonb) as changed_hash,
        internal.safe_error_code_v1('55P03', 'lock timeout') as lock_timeout_code,
        internal.safe_error_code_v1('57014', 'statement timeout') as statement_timeout_code,
        internal.safe_error_response_v1('DATABASE_BUSY') as busy_error,
        internal.safe_error_response_v1('RATE_LIMITED', 999) as rate_error,
        pg_get_functiondef('internal.request_actor_user_id_v1()'::regprocedure) as request_actor_definition,
        btrim(
          regexp_replace(
            (select prosrc from pg_proc where oid = 'internal.current_auth_uid_v1()'::regprocedure),
            '[[:space:]]+',
            ' ',
            'g'
          )
        ) as auth_uid_bridge_source,
        internal.is_safe_operation_response_snapshot_v2(
          'create_page',
          '{"schema_version":1,"operation_name":"create_page","resources":[{"resource_type":"page","public_id":"11111111-1111-4111-8111-111111111111","status":"created","revision":1,"occurred_at":"2026-10-10T00:00:00Z"}]}'::jsonb
        ) as valid_snapshot,
        internal.is_safe_operation_response_snapshot_v2(
          'create_page',
          '{"schema_version":1,"operation_name":"create_page","resources":[{"resource_type":"page","public_id":"11111111-1111-4111-8111-111111111111"}],"authorization":"leak"}'::jsonb
        ) as unsafe_snapshot
    `);

    expect(hash.first_hash).toBe(hash.reordered_hash);
    expect(hash.first_hash).not.toBe(hash.changed_hash);
    expect(hash.lock_timeout_code).toBe('DATABASE_BUSY');
    expect(hash.statement_timeout_code).toBe('DATABASE_BUSY');
    expect(hash.busy_error).toEqual({
      code: 'DATABASE_BUSY',
      message: 'The database is temporarily busy.',
      recovery: 'Retry the same request with the same operation key.',
      retryable: true,
    });
    expect(hash.rate_error).toMatchObject({
      code: 'RATE_LIMITED',
      retryable: true,
      retry_after_seconds: 60,
    });
    expect(hash.request_actor_definition).toContain('internal.current_auth_uid_v1()');
    expect(hash.auth_uid_bridge_source).toBe('select auth.uid();');
    expect(hash.valid_snapshot).toBe(true);
    expect(hash.unsafe_snapshot).toBe(false);
    expect(() =>
      runCli(`select internal.assert_write_operation_name_v1('not_a_frozen_operation')`),
    ).toThrow('VALIDATION_FAILED');
    expect(JSON.stringify(hash.busy_error)).not.toMatch(/SQLSTATE|select |internal\.|public\./i);
  });

  it('bounds ledger lock contention and exposes only DATABASE_BUSY', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const owner = randomUUID();
    const workspaceSlug = `phase5-lock-${suffix}`;
    const operationKey = randomUUID();

    try {
      insertAuthUser(owner, `${workspaceSlug}@example.test`);
      runCli(
        `insert into public.workspaces (owner_user_id, name, slug) values ('${owner}', 'Lock owner', '${workspaceSlug}')`,
      );
      const workspace = querySingleRow(
        `select id, public_id from public.workspaces where slug = '${workspaceSlug}'`,
      );
      const workspaceId = Number(workspace.id);
      const workspacePublicId = String(workspace.public_id);
      const semanticInput = `'{"page_public_id":"11111111-1111-4111-8111-111111111111"}'::jsonb`;
      const requestHash = querySingleRow(`
        select internal.canonical_request_hash_v1('create_page', '${workspacePublicId}'::uuid, 1, ${semanticInput}) as request_hash
      `);

      runCli(`
        insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash
        ) values (
          ${workspaceId}, '${owner}'::uuid, '${operationKey}'::uuid, 'create_page', 1, '${requestHash.request_hash}'
        )
      `);

      const lockHolder = runLocalPsqlAsync(`
        begin;
        select id from internal.operation_ledger where operation_key = '${operationKey}'::uuid for update;
        select pg_sleep(8);
        commit;
      `);
      await new Promise((resolve) => setTimeout(resolve, 250));

      const startedAt = Date.now();
      const result = await runCliAsync(
        callerDo(
          owner,
          `
        perform * from internal.claim_operation_for_owner_v1(
          '${workspacePublicId}'::uuid,
          '${operationKey}'::uuid,
          'create_page',
          1,
          ${semanticInput}
        );
      `,
        ),
      );
      const elapsedMilliseconds = Date.now() - startedAt;
      const lockResult = await lockHolder;

      expect(lockResult.code).toBe(0);
      expect(result.code).not.toBe(0);
      expect(result.output).toContain('DATABASE_BUSY');
      expect(result.output).not.toMatch(/SQLSTATE|internal\.|public\.|select /i);
      expect(elapsedMilliseconds).toBeGreaterThanOrEqual(1_500);
      expect(elapsedMilliseconds).toBeLessThan(6_000);
    } finally {
      runCli(
        `delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where slug = '${workspaceSlug}')`,
      );
      runCli(`delete from public.workspaces where slug = '${workspaceSlug}'`);
      runCli(`delete from auth.users where id = '${owner}'`);
    }
  }, 30_000);

  it('serializes replay, rejects key reuse, and rolls back an uncompleted ledger claim', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const owner = randomUUID();
    const workspaceSlug = `phase5-ledger-${suffix}`;
    const operationKey = randomUUID();
    const rollbackKey = randomUUID();

    try {
      insertAuthUser(owner, `${workspaceSlug}@example.test`);
      runCli(
        `insert into public.workspaces (owner_user_id, name, slug) values ('${owner}', 'Ledger owner', '${workspaceSlug}')`,
      );
      const workspace = querySingleRow(
        `select public_id from public.workspaces where slug = '${workspaceSlug}'`,
      );
      const workspacePublicId = String(workspace.public_id);
      const semanticInput = `'{"page_public_id":"11111111-1111-4111-8111-111111111111"}'::jsonb`;
      const concurrentClaim = callerDo(
        owner,
        `
        declare v_claim record;
        begin
          select * into v_claim from internal.claim_operation_for_owner_v1('${workspacePublicId}'::uuid, '${operationKey}'::uuid, 'create_page', 1, ${semanticInput});
          if v_claim.claim_state = 'first_use' then
            perform internal.complete_operation_for_owner_v2(
              '${workspacePublicId}'::uuid,
              v_claim.operation_id,
              'create_page',
              '{"schema_version":1,"operation_name":"create_page","resources":[{"resource_type":"page","public_id":"11111111-1111-4111-8111-111111111111","status":"created","revision":1,"occurred_at":"2026-10-10T00:00:00Z"}]}'::jsonb,
              'page',
              '11111111-1111-4111-8111-111111111111'::uuid
            );
          elsif v_claim.claim_state = 'replay' and v_claim.response_snapshot ->> 'operation_name' = 'create_page' then
            null;
          else
            raise exception 'operation serialization failed';
          end if;
        end;
      `,
      );

      const firstRequest = runCliAsync(concurrentClaim);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const secondRequest = runCliAsync(concurrentClaim);
      const [firstResult, secondResult] = await Promise.all([firstRequest, secondRequest]);

      expect(firstResult.code).toBe(0);
      expect(secondResult.code).toBe(0);
      expect(() =>
        runCli(
          callerDo(
            owner,
            `
          declare v_claim record;
          begin
            select * into v_claim from internal.claim_operation_for_owner_v1('${workspacePublicId}'::uuid, '${operationKey}'::uuid, 'create_page', 1, ${semanticInput});
            if v_claim.claim_state <> 'replay' or v_claim.response_snapshot ->> 'operation_name' <> 'create_page' then raise exception 'completed replay failed'; end if;
          end;
        `,
          ),
        ),
      ).not.toThrow();
      expect(() =>
        runCli(
          callerDo(
            owner,
            `perform * from internal.claim_operation_for_owner_v1('${workspacePublicId}'::uuid, '${operationKey}'::uuid, 'update_page', 1, ${semanticInput});`,
          ),
        ),
      ).toThrow('OPERATION_KEY_REUSED');
      expect(() =>
        runCli(
          callerDo(
            owner,
            `perform * from internal.claim_operation_for_owner_v1('${workspacePublicId}'::uuid, '${rollbackKey}'::uuid, 'create_page', 1, ${semanticInput}); raise exception 'forced rollback';`,
          ),
        ),
      ).toThrow('forced rollback');
      expect(
        querySingleRow(
          `select count(*) as count from internal.operation_ledger where operation_key = '${rollbackKey}'::uuid`,
        ).count,
      ).toBe(0);
    } finally {
      runCli(
        `delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where slug = '${workspaceSlug}')`,
      );
      runCli(`delete from public.workspaces where slug = '${workspaceSlug}'`);
      runCli(`delete from auth.users where id = '${owner}'`);
    }
  }, 30_000);

  it('binds completion to the workspace and operation that claimed the ledger row', () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const owner = randomUUID();
    const otherOwner = randomUUID();
    const leftSlug = `phase5-complete-left-${suffix}`;
    const rightSlug = `phase5-complete-right-${suffix}`;
    const operationKey = randomUUID();
    const targetPublicId = randomUUID();

    try {
      insertAuthUser(owner, `phase5-complete-${suffix}@example.test`);
      insertAuthUser(otherOwner, `phase5-complete-other-${suffix}@example.test`);
      runCli(
        `insert into public.workspaces (owner_user_id, name, slug) values ('${owner}', 'Left workspace', '${leftSlug}'), ('${otherOwner}', 'Right workspace', '${rightSlug}')`,
      );
      const workspaces = querySingleRow(`
        select
          (array_agg(public_id::text order by id) filter (where slug = '${leftSlug}'))[1] as left_public_id,
          (array_agg(public_id::text order by id) filter (where slug = '${rightSlug}'))[1] as right_public_id
        from public.workspaces
      `);
      const leftPublicId = String(workspaces.left_public_id);
      const rightPublicId = String(workspaces.right_public_id);
      const snapshot = `'{"schema_version":1,"operation_name":"create_page","resources":[{"resource_type":"page","public_id":"${targetPublicId}","status":"created","revision":1,"occurred_at":"2026-10-10T00:00:00Z"}]}'::jsonb`;

      runCli(
        callerDo(
          owner,
          `perform * from internal.claim_operation_for_owner_v1('${leftPublicId}'::uuid, '${operationKey}'::uuid, 'create_page', 1, '{"name":"scope test"}'::jsonb);`,
        ),
      );
      const operationId = Number(
        querySingleRow(
          `select id from internal.operation_ledger where operation_key = '${operationKey}'::uuid`,
        ).id,
      );

      expect(() =>
        runCli(
          callerDo(
            owner,
            `perform internal.complete_operation_for_owner_v2('${rightPublicId}'::uuid, ${operationId}, 'create_page', ${snapshot}, 'page', '${targetPublicId}'::uuid);`,
          ),
        ),
      ).toThrow('OWNER_ACCESS_REQUIRED');
      expect(
        querySingleRow(
          `select completed_at is null as pending from internal.operation_ledger where id = ${operationId}`,
        ).pending,
      ).toBe(true);
      expect(() =>
        runCli(
          callerDo(
            owner,
            `perform internal.complete_operation_for_owner_v2('${leftPublicId}'::uuid, ${operationId}, 'create_page', ${snapshot}, 'page', '${targetPublicId}'::uuid);`,
          ),
        ),
      ).not.toThrow();
    } finally {
      runCli(
        `delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where slug in ('${leftSlug}', '${rightSlug}'))`,
      );
      runCli(`delete from public.workspaces where slug in ('${leftSlug}', '${rightSlug}')`);
      runCli(`delete from auth.users where id = '${owner}'`);
      runCli(`delete from auth.users where id = '${otherOwner}'`);
    }
  }, 30_000);

  it('increments rate buckets atomically and blocks writes at the limit', async () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const owner = randomUUID();
    const clientId = `phase5-rate-client-${suffix}`;
    const workspaceSlug = `phase5-rate-${suffix}`;
    const operationKey = randomUUID();

    try {
      // The implementation deliberately uses real UTC minute windows. Start
      // early in a window so this concurrency assertion cannot straddle one.
      const clock = querySingleRow(`select extract(second from clock_timestamp()) as second`);
      const seconds = Number(clock.second);
      if (seconds > 40) {
        await new Promise((resolve) => setTimeout(resolve, (61 - seconds) * 1_000));
      }
      insertAuthUser(owner, `phase5-rate-${suffix}@example.test`);
      runCli(
        `insert into public.workspaces (owner_user_id, name, slug) values ('${owner}', 'Rate owner', '${workspaceSlug}')`,
      );
      const workspacePublicId = String(
        querySingleRow(`select public_id from public.workspaces where slug = '${workspaceSlug}'`)
          .public_id,
      );
      const requestSql = callerDo(
        owner,
        `perform * from internal.consume_rate_limit_v1('contention_write');`,
        clientId,
      );
      const concurrent = await Promise.all(
        Array.from({ length: 8 }, () => runCliAsync(requestSql)),
      );
      expect(concurrent.every((result) => result.code === 0)).toBe(true);

      runCli(
        callerDo(
          owner,
          `
        for v_index in 1..13 loop
          perform * from internal.consume_rate_limit_v1('contention_write');
        end loop;
      `,
          clientId,
        ),
      );

      const bucket = querySingleRow(`
        select request_count
        from internal.rate_limit_buckets
        where actor_user_id = '${owner}'::uuid
          and oauth_client_id = '${clientId}'
          and limit_group = 'contention_write'
      `);
      expect(bucket.request_count).toBe(21);
      expect(() =>
        runCli(
          callerDo(owner, `perform internal.assert_rate_limit_v1('contention_write');`, clientId),
        ),
      ).toThrow('RATE_LIMITED');
      expect(() =>
        runCli(
          callerDo(
            owner,
            `perform * from internal.claim_operation_for_owner_v1('${workspacePublicId}'::uuid, '${operationKey}'::uuid, 'claim_content_plan_items', 1, '{"item_public_ids":[]}'::jsonb);`,
            clientId,
          ),
        ),
      ).toThrow('RATE_LIMITED');
      expect(
        querySingleRow(
          `select request_count from internal.rate_limit_buckets where actor_user_id = '${owner}'::uuid and oauth_client_id = '${clientId}' and limit_group = 'contention_write'`,
        ).request_count,
      ).toBe(21);
      expect(
        querySingleRow(
          `select count(*) as count from internal.operation_ledger where actor_user_id = '${owner}'::uuid`,
        ).count,
      ).toBe(0);
    } finally {
      runCli(
        `delete from internal.operation_ledger where workspace_id in (select id from public.workspaces where slug = '${workspaceSlug}')`,
      );
      runCli(`delete from internal.rate_limit_buckets where actor_user_id = '${owner}'::uuid`);
      runCli(`delete from public.workspaces where slug = '${workspaceSlug}'`);
      runCli(`delete from auth.users where id = '${owner}'`);
    }
  }, 90_000);
});
