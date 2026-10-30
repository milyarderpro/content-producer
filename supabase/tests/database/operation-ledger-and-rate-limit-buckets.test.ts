import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { localQuery, localQueryRow } from './helpers/local-query.js';

type JsonRecord = Record<string, unknown>;

function runCli(args: string[]): string {
  if (args.length !== 6 || args.slice(0, 5).join(' ') !== 'exec supabase db query --local') {
    throw new Error('LOCAL_TEST_COMMAND_INVALID');
  }
  return localQuery(args[5]!);
}

function querySingleRow(query: string): JsonRecord {
  return localQueryRow(query);
}

function expectSqlFailure(statement: string, constraint?: string): void {
  try {
    runCli(['exec', 'supabase', 'db', 'query', '--local', statement]);
    throw new Error('Expected SQL statement to fail.');
  } catch (error) {
    expect(String(error)).toContain('Supabase local command failed');
    if (constraint) expect(String(error)).toContain(constraint);
  }
}

describe('Phase 3 operation ledger and rate-limit buckets', () => {
  it('enforces private idempotency and operational-counter invariants', () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const ownerOne = randomUUID();
    const ownerTwo = randomUUID();
    const rateActor = randomUUID();
    const operationKey = randomUUID();
    const requestHash = 'a'.repeat(64);
    const workspaceOneSlug = `phase3-ledger-one-${suffix}`;
    const workspaceTwoSlug = `phase3-ledger-two-${suffix}`;

    const insertAuthUser = (id: string, email: string) =>
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into auth.users (
          instance_id, id, aud, role, email, encrypted_password,
          email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
          created_at, updated_at
        ) values (
          '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
          'authenticated', '${email}', 'not-used', now(), '{}'::jsonb,
          '{}'::jsonb, now(), now()
        )`,
      ]);

    try {
      insertAuthUser(ownerOne, `phase3-ledger-owner-one-${suffix}@example.test`);
      insertAuthUser(ownerTwo, `phase3-ledger-owner-two-${suffix}@example.test`);
      insertAuthUser(rateActor, `phase3-rate-actor-${suffix}@example.test`);

      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into public.workspaces (owner_user_id, name, slug)
         values ('${ownerOne}', 'Ledger workspace one', '${workspaceOneSlug}')`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into public.workspaces (owner_user_id, name, slug)
         values ('${ownerTwo}', 'Ledger workspace two', '${workspaceTwoSlug}')`,
      ]);

      const workspaces = querySingleRow(`
        select
          max(id) filter (where slug = '${workspaceOneSlug}') as workspace_one_id,
          max(id) filter (where slug = '${workspaceTwoSlug}') as workspace_two_id
        from public.workspaces
      `);
      const workspaceOneId = String(workspaces.workspace_one_id);
      const workspaceTwoId = String(workspaces.workspace_two_id);

      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash
        ) values (
          ${workspaceOneId}, '${ownerOne}', '${operationKey}', 'create_page.v1', 1, '${requestHash}'
        )`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash
        ) values (
          ${workspaceTwoId}, '${ownerTwo}', '${operationKey}', 'create_page.v1', 1, '${requestHash}'
        )`,
      ]);

      expectSqlFailure(
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash
        ) values (
          ${workspaceOneId}, '${ownerOne}', '${operationKey}', 'update_page.v1', 1, '${requestHash}'
        )`,
      );
      for (const variant of ['8', '9', 'a', 'b']) {
        runCli([
          'exec',
          'supabase',
          'db',
          'query',
          '--local',
          `insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
           values (${workspaceOneId}, '${ownerOne}', '00000000-0000-4000-${variant}000-00000000000${variant}', 'create_page.v1', 1, '${requestHash}')`,
        ]);
      }
      expectSqlFailure(
        `insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
         values (${workspaceOneId}, '${ownerOne}', '00000000-0000-4000-0000-000000000000', 'create_page.v1', 1, '${requestHash}')`,
        'operation_ledger_operation_key_rfc_uuid_v4_check',
      );
      expectSqlFailure(
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash
        ) values (
          ${workspaceOneId}, '${ownerOne}', '00000000-0000-5000-8000-000000000000', 'create_page.v1', 1, '${requestHash}'
        )`,
        'operation_ledger_operation_key_rfc_uuid_v4_check',
      );
      expectSqlFailure(
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash
        ) values (
          ${workspaceOneId}, '${ownerOne}', '${randomUUID()}', 'create_page.v1', 1, '${'A'.repeat(64)}'
        )`,
        'operation_ledger_request_hash_format_check',
      );
      expectSqlFailure(
        `insert into internal.operation_ledger (
          workspace_id, actor_user_id, operation_key, operation_name,
          request_schema_version, request_hash, response_snapshot
        ) values (
          ${workspaceOneId}, '${ownerOne}', '${randomUUID()}', 'create_page.v1', 1, '${requestHash}', '[]'::jsonb
        )`,
      );

      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into internal.rate_limit_buckets (
          actor_user_id, oauth_client_id, limit_group, window_start, request_count
        ) values (
          '${rateActor}', 'phase3-client', 'write', '2026-10-08T09:00:00Z', 0
        )`,
      ]);
      expectSqlFailure(
        `insert into internal.rate_limit_buckets (
          actor_user_id, oauth_client_id, limit_group, window_start, request_count
        ) values (
          '${rateActor}', 'phase3-client', 'write', '2026-10-08T09:00:00Z', 1
        )`,
      );
      expectSqlFailure(
        `insert into internal.rate_limit_buckets (
          actor_user_id, oauth_client_id, limit_group, window_start, request_count
        ) values (
          '${rateActor}', 'phase3-client', 'write', '2026-10-08T09:00:30Z', 1
        )`,
      );
      expectSqlFailure(
        `insert into internal.rate_limit_buckets (
          actor_user_id, oauth_client_id, limit_group, window_start, request_count
        ) values (
          '${rateActor}', 'phase3-client', 'write', '2026-10-08T09:01:00Z', -1
        )`,
      );

      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from auth.users where id = '${rateActor}'`,
      ]);

      const catalog = querySingleRow(`
        select
          (select count(*) from internal.operation_ledger
            where workspace_id in (${workspaceOneId}, ${workspaceTwoId})) as ledger_count,
          (select count(*) from internal.rate_limit_buckets
            where actor_user_id = '${rateActor}') as deleted_rate_bucket_count,
          (select relrowsecurity from pg_class where oid = 'internal.operation_ledger'::regclass) as ledger_rls,
          (select relrowsecurity from pg_class where oid = 'internal.rate_limit_buckets'::regclass) as rate_bucket_rls,
          has_schema_privilege('anon', 'internal', 'usage') as anon_internal_usage,
          has_schema_privilege('authenticated', 'internal', 'usage') as authenticated_internal_usage,
          has_schema_privilege('service_role', 'internal', 'usage') as service_role_internal_usage,
          has_table_privilege('anon', 'internal.operation_ledger', 'select') as anon_ledger_select,
          has_table_privilege('authenticated', 'internal.operation_ledger', 'select') as authenticated_ledger_select,
          has_table_privilege('service_role', 'internal.operation_ledger', 'select') as service_role_ledger_select,
          has_table_privilege('anon', 'internal.rate_limit_buckets', 'select') as anon_rate_select,
          has_table_privilege('authenticated', 'internal.rate_limit_buckets', 'select') as authenticated_rate_select,
          has_table_privilege('service_role', 'internal.rate_limit_buckets', 'select') as service_role_rate_select,
          exists (
            select 1
            from pg_constraint
            where conname = 'rate_limit_buckets_actor_user_id_fk'
              and confdeltype = 'c'
          ) as rate_bucket_actor_fk_cascade,
          exists (
            select 1
            from pg_constraint
            where conname = 'operation_ledger_workspace_id_fk'
              and confdeltype = 'r'
          ) as ledger_workspace_fk_restrict,
          exists (
            select 1
            from pg_index
            where indexrelid = 'internal.operation_ledger_workspace_target_idx'::regclass
              and indpred is not null
          ) as target_lookup_partial_index
      `);

      expect(catalog.ledger_count).toBe(6);
      expect(catalog.deleted_rate_bucket_count).toBe(0);
      expect(catalog.ledger_rls).toBe(true);
      expect(catalog.rate_bucket_rls).toBe(true);
      expect(catalog.anon_internal_usage).toBe(false);
      expect(catalog.authenticated_internal_usage).toBe(false);
      expect(catalog.service_role_internal_usage).toBe(false);
      expect(catalog.anon_ledger_select).toBe(false);
      expect(catalog.authenticated_ledger_select).toBe(false);
      expect(catalog.service_role_ledger_select).toBe(false);
      expect(catalog.anon_rate_select).toBe(false);
      expect(catalog.authenticated_rate_select).toBe(false);
      expect(catalog.service_role_rate_select).toBe(false);
      expect(catalog.rate_bucket_actor_fk_cascade).toBe(true);
      expect(catalog.ledger_workspace_fk_restrict).toBe(true);
      expect(catalog.target_lookup_partial_index).toBe(true);
    } finally {
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from internal.operation_ledger
         where workspace_id in (
           select id from public.workspaces where slug in ('${workspaceOneSlug}', '${workspaceTwoSlug}')
         )`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from public.workspaces where slug in ('${workspaceOneSlug}', '${workspaceTwoSlug}')`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from auth.users where id in ('${ownerOne}', '${ownerTwo}', '${rateActor}')`,
      ]);
    }
  }, 60_000);
});
