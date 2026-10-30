import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { localQuery, localQueryRow as querySingleRow } from './helpers/local-query.js';

function expectSqlFailure(statement: string): void {
  expect(() => localQuery(statement)).toThrow('Supabase local command failed');
}

describe('Phase 3 Pages and Page niche configs', () => {
  it('enforces workspace-scoped Page and niche-config ownership', () => {
    const suffix = `${process.pid}-${Date.now()}`;
    const nicheSuffix = `${process.pid}${Date.now()}`;
    const ownerOne = randomUUID();
    const ownerTwo = randomUUID();
    const workspaceOneSlug = `phase3-page-workspace-one-${suffix}`;
    const workspaceTwoSlug = `phase3-page-workspace-two-${suffix}`;
    const pageOneSlug = `phase3-page-one-${suffix}`;
    const pageTwoSlug = `phase3-page-two-${suffix}`;
    const pageThreeSlug = `phase3-page-three-${suffix}`;
    const secondNicheKey = `phase3niche${nicheSuffix}`;

    const insertAuthUser = (id: string, email: string) =>
      localQuery(`insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at
      ) values (
        '00000000-0000-0000-0000-000000000000', '${id}', 'authenticated',
        'authenticated', '${email}', 'not-used', now(), '{}'::jsonb,
        '{}'::jsonb, now(), now()
      )`);

    try {
      insertAuthUser(ownerOne, `phase3-page-owner-one-${suffix}@example.test`);
      insertAuthUser(ownerTwo, `phase3-page-owner-two-${suffix}@example.test`);
      localQuery(`insert into public.workspaces (owner_user_id, name, slug)
        values ('${ownerOne}', 'Page workspace one', '${workspaceOneSlug}')`);
      localQuery(`insert into public.workspaces (owner_user_id, name, slug)
        values ('${ownerTwo}', 'Page workspace two', '${workspaceTwoSlug}')`);
      localQuery(`insert into public.niches (key, name, status)
        values ('${secondNicheKey}', 'Phase 3 test niche', 'development')`);

      const workspaces = querySingleRow(`
        select
          max(id) filter (where slug = '${workspaceOneSlug}') as workspace_one_id,
          max(id) filter (where slug = '${workspaceTwoSlug}') as workspace_two_id
        from public.workspaces
      `);
      const workspaceOneId = String(workspaces.workspace_one_id);
      const workspaceTwoId = String(workspaces.workspace_two_id);

      localQuery(`insert into public.pages (workspace_id, name, slug, default_niche_key)
        values (${workspaceOneId}, 'Page one', '${pageOneSlug}', 'trivia')`);
      localQuery(`insert into public.pages (workspace_id, name, slug)
        values (${workspaceOneId}, 'Page two', '${pageTwoSlug}')`);
      localQuery(`insert into public.pages (workspace_id, name, slug)
        values (${workspaceTwoId}, 'Page three', '${pageThreeSlug}')`);

      const pages = querySingleRow(`
        select
          max(id) filter (where slug = '${pageOneSlug}' and workspace_id = ${workspaceOneId}) as page_one_id,
          max(id) filter (where slug = '${pageTwoSlug}') as page_two_id
        from public.pages
      `);
      const pageOneId = String(pages.page_one_id);
      const pageTwoId = String(pages.page_two_id);

      localQuery(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config, is_default
      ) values (${workspaceOneId}, ${pageOneId}, 'trivia', internal.default_trivia_config_v1(), true)`);
      localQuery(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config, is_default
      ) values (${workspaceOneId}, ${pageTwoId}, 'trivia', internal.default_trivia_config_v1(), true)`);

      expectSqlFailure(`insert into public.pages (workspace_id, name, slug)
        values (${workspaceOneId}, 'Duplicate Page', '${pageOneSlug}')`);
      localQuery(`insert into public.pages (workspace_id, name, slug)
        values (${workspaceTwoId}, 'Same slug in another workspace', '${pageOneSlug}')`);
      expectSqlFailure(`insert into public.pages (workspace_id, name, slug)
        values (999999999, 'Missing workspace', 'phase3-missing-${suffix}')`);
      expectSqlFailure(`insert into public.pages (workspace_id, name, slug, platform)
        values (${workspaceOneId}, 'Wrong platform', 'phase3-platform-${suffix}', 'instagram')`);
      expectSqlFailure(`insert into public.pages (workspace_id, name, slug, language_code)
        values (${workspaceOneId}, 'Wrong language', 'phase3-language-${suffix}', 'id')`);
      expectSqlFailure(`insert into public.pages (workspace_id, name, slug, locale)
        values (${workspaceOneId}, 'Wrong locale', 'phase3-locale-${suffix}', 'en-GB')`);
      expectSqlFailure(`insert into public.pages (workspace_id, name, slug, platform_config)
        values (${workspaceOneId}, 'Wrong config', 'phase3-config-${suffix}', '[]'::jsonb)`);
      expectSqlFailure(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config
      ) values (${workspaceTwoId}, ${pageOneId}, 'trivia', internal.default_trivia_config_v1())`);
      expectSqlFailure(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config
      ) values (${workspaceOneId}, ${pageOneId}, 'unknown_niche', '{}'::jsonb)`);
      expectSqlFailure(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config
      ) values (${workspaceOneId}, ${pageOneId}, 'trivia', internal.default_trivia_config_v1())`);
      expectSqlFailure(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config, is_default
      ) values (${workspaceOneId}, ${pageOneId}, '${secondNicheKey}', '{}'::jsonb, true)`);
      expectSqlFailure(`insert into public.page_niche_configs (
        workspace_id, page_id, niche_key, config
      ) values (${workspaceOneId}, ${pageTwoId}, '${secondNicheKey}', '[]'::jsonb)`);

      const catalog = querySingleRow(`
        select
          (select count(*) from public.pages
            where workspace_id = ${workspaceTwoId} and slug = '${pageOneSlug}') as cross_workspace_slug_count,
          (select count(*) from public.page_niche_configs
            where page_id in (${pageOneId}, ${pageTwoId}) and niche_key = 'trivia' and is_default) as separate_default_count,
          (select relrowsecurity from pg_class where oid = 'public.pages'::regclass) as pages_rls,
          (select relrowsecurity from pg_class where oid = 'public.page_niche_configs'::regclass) as configs_rls,
          has_table_privilege('anon', 'public.pages', 'select') as anon_pages_select,
          has_table_privilege('authenticated', 'public.pages', 'select') as authenticated_pages_select,
          has_table_privilege('service_role', 'public.pages', 'select') as service_role_pages_select,
          has_table_privilege('anon', 'public.page_niche_configs', 'select') as anon_configs_select,
          has_table_privilege('authenticated', 'public.page_niche_configs', 'select') as authenticated_configs_select,
          has_table_privilege('service_role', 'public.page_niche_configs', 'select') as service_role_configs_select,
          exists (
            select 1 from pg_constraint
            where conname = 'page_niche_configs_page_fk' and confdeltype = 'r'
          ) as scoped_page_fk_restrict,
          exists (
            select 1 from pg_index
            where indexrelid = 'public.page_niche_configs_one_enabled_default_per_page_key'::regclass
              and indisunique and indpred is not null
          ) as default_partial_unique
      `);

      expect(catalog.cross_workspace_slug_count).toBe(1);
      expect(catalog.separate_default_count).toBe(2);
      expect(catalog.pages_rls).toBe(true);
      expect(catalog.configs_rls).toBe(true);
      expect(catalog.anon_pages_select).toBe(false);
      expect(catalog.authenticated_pages_select).toBe(false);
      expect(catalog.service_role_pages_select).toBe(false);
      expect(catalog.anon_configs_select).toBe(false);
      expect(catalog.authenticated_configs_select).toBe(false);
      expect(catalog.service_role_configs_select).toBe(false);
      expect(catalog.scoped_page_fk_restrict).toBe(true);
      expect(catalog.default_partial_unique).toBe(true);
    } finally {
      localQuery(`delete from public.page_niche_configs
        where page_id in (
          select id from public.pages where slug in ('${pageOneSlug}', '${pageTwoSlug}', '${pageThreeSlug}')
        )`);
      localQuery(`delete from public.pages
        where slug in ('${pageOneSlug}', '${pageTwoSlug}', '${pageThreeSlug}')`);
      localQuery(`delete from public.niches where key = '${secondNicheKey}'`);
      localQuery(`delete from public.workspaces
        where slug in ('${workspaceOneSlug}', '${workspaceTwoSlug}')`);
      localQuery(`delete from auth.users where id in ('${ownerOne}', '${ownerTwo}')`);
    }
  }, 60_000);
});
