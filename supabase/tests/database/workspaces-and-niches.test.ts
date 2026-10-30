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

function expectSqlFailure(statement: string): void {
  expect(() => runCli(['exec', 'supabase', 'db', 'query', '--local', statement])).toThrow(
    'Supabase local command failed',
  );
}

describe('Phase 3 workspace and niche registry', () => {
  it('enforces tenant, registry, catalog, RLS, and privilege invariants', () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const nicheSuffix = `${process.pid}${Date.now()}`;
    const ownerOne = randomUUID();
    const ownerTwo = randomUUID();
    const ownerOneEmail = `phase3-owner-one-${suffix}@example.test`;
    const ownerTwoEmail = `phase3-owner-two-${suffix}@example.test`;
    const workspaceSlug = `phase3-workspace-${suffix}`;
    const inactiveWorkspaceSlug = `phase3-inactive-${suffix}`;

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
      insertAuthUser(ownerOne, ownerOneEmail);
      insertAuthUser(ownerTwo, ownerTwoEmail);

      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into public.workspaces (owner_user_id, name, slug)
         values ('${ownerOne}', 'Phase 3 workspace', '${workspaceSlug}')`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `insert into public.workspaces (owner_user_id, name, slug, is_active)
         values ('${ownerOne}', 'Inactive workspace', '${inactiveWorkspaceSlug}', false)`,
      ]);

      const beforeUpdate = querySingleRow(`
        select updated_at
        from public.workspaces
        where slug = '${workspaceSlug}'
      `);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `update public.workspaces
         set name = 'Phase 3 workspace updated'
         where slug = '${workspaceSlug}'`,
      ]);
      const afterUpdate = querySingleRow(`
        select updated_at
        from public.workspaces
        where slug = '${workspaceSlug}'
      `);
      expect(new Date(String(afterUpdate.updated_at)).getTime()).toBeGreaterThan(
        new Date(String(beforeUpdate.updated_at)).getTime(),
      );

      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug)
         values ('${ownerTwo}', 'Duplicate slug', '${workspaceSlug}')`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, public_id)
         select '${ownerTwo}', 'Duplicate public ID', 'phase3-public-id-${suffix}', public_id
         from public.workspaces
         where slug = '${workspaceSlug}'`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug)
         values ('${ownerOne}', 'Second active workspace', 'phase3-second-${suffix}')`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, language_code)
         values ('${ownerTwo}', 'Wrong language', 'phase3-language-${suffix}', 'id')`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, locale)
         values ('${ownerTwo}', 'Wrong locale', 'phase3-locale-${suffix}', 'en-GB')`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, target_markets)
         values ('${ownerTwo}', 'Wrong market', 'phase3-market-${suffix}', array['US', 'ID']::text[])`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, target_markets)
         values ('${ownerTwo}', 'No markets', 'phase3-empty-market-${suffix}', array[]::text[])`,
      );
      expectSqlFailure(
        `insert into public.workspaces (owner_user_id, name, slug, settings)
         values ('${ownerTwo}', 'Wrong settings', 'phase3-settings-${suffix}', '[]'::jsonb)`,
      );
      expectSqlFailure(
        `insert into public.niches (key, name, status)
         values ('phase3status${nicheSuffix}', 'Invalid', 'retired')`,
      );
      expectSqlFailure(
        `insert into public.niches (key, name, module_version)
         values ('phase3version${nicheSuffix}', 'Invalid', 0)`,
      );
      expectSqlFailure(`delete from auth.users where id = '${ownerOne}'`);

      const catalog = querySingleRow(`
        select
          (select count(*) from public.niches
            where key = 'trivia'
              and name = 'Trivia Facts'
              and status = 'active'
              and module_version = 1
              and config_schema_version = 1
              and content_schema_version = 1) as trivia_registry_count,
          (select count(*) from public.workspaces where slug = '${workspaceSlug}') as workspace_count,
          (select relrowsecurity from pg_class where oid = 'public.workspaces'::regclass) as workspaces_rls,
          (select relrowsecurity from pg_class where oid = 'public.niches'::regclass) as niches_rls,
          has_table_privilege('anon', 'public.workspaces', 'select') as anon_workspace_select,
          has_table_privilege('authenticated', 'public.workspaces', 'select') as authenticated_workspace_select,
          has_table_privilege('service_role', 'public.workspaces', 'select') as service_role_workspace_select,
          has_table_privilege('anon', 'public.niches', 'select') as anon_niche_select,
          has_table_privilege('authenticated', 'public.niches', 'select') as authenticated_niche_select,
          has_table_privilege('service_role', 'public.niches', 'select') as service_role_niche_select,
          has_sequence_privilege('anon', 'public.workspaces_id_seq', 'usage') as anon_workspace_sequence_usage,
          has_sequence_privilege('authenticated', 'public.workspaces_id_seq', 'usage') as authenticated_workspace_sequence_usage,
          has_sequence_privilege('service_role', 'public.workspaces_id_seq', 'usage') as service_role_workspace_sequence_usage,
          exists (
            select 1
            from pg_constraint
            where conname = 'workspaces_owner_user_id_fk'
              and confdeltype = 'r'
          ) as owner_fk_restrict,
          exists (
            select 1
            from pg_index
            where indexrelid = 'public.workspaces_one_active_owner_key'::regclass
              and indisunique
              and indpred is not null
          ) as active_owner_partial_unique
      `);

      expect(catalog.trivia_registry_count).toBe(1);
      expect(catalog.workspace_count).toBe(1);
      expect(catalog.workspaces_rls).toBe(true);
      expect(catalog.niches_rls).toBe(true);
      expect(catalog.anon_workspace_select).toBe(false);
      expect(catalog.authenticated_workspace_select).toBe(false);
      expect(catalog.service_role_workspace_select).toBe(false);
      expect(catalog.anon_niche_select).toBe(false);
      expect(catalog.authenticated_niche_select).toBe(false);
      expect(catalog.service_role_niche_select).toBe(false);
      expect(catalog.anon_workspace_sequence_usage).toBe(false);
      expect(catalog.authenticated_workspace_sequence_usage).toBe(false);
      expect(catalog.service_role_workspace_sequence_usage).toBe(false);
      expect(catalog.owner_fk_restrict).toBe(true);
      expect(catalog.active_owner_partial_unique).toBe(true);
    } finally {
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from public.workspaces
         where slug in ('${workspaceSlug}', '${inactiveWorkspaceSlug}')`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `delete from auth.users where id in ('${ownerOne}', '${ownerTwo}')`,
      ]);
    }
  }, 60_000);
});
