import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { localQuery, localQueryRow as querySingleRow } from './helpers/local-query.js';
import { fixture as profileFixture, rpc as profileRpc, sql as profileSql, json as profileJson, quote as profileQuote, row as profileRow } from './helpers/trivia-rpc.js';
import { cleanup as cleanupProfileFixture, draft as profileDraft } from './helpers/trivia-v2.js';

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

// CR-062 task3: Page config2/resolver/context, plus legacy preservation.
type ProfileFixture = ReturnType<typeof profileFixture>;
type ProfileRef = { public_id: string; version: number; hash: string };
type ProfileConfig = { config_schema_version: 2; editorial_profile_ref: ProfileRef;
  overrides?: Record<string, unknown>; allowed_format_refs?: ProfileRef[]; allowed_topic_refs?: ProfileRef[];
  format_weights?: Record<string, number>; topic_weights?: Record<string, number>; fact_reuse_scope?: string };
type ProfileDefinition = { reference: ProfileRef; key: string; payload: Record<string, unknown> };
type ProfileContext = { config_public_id: string; config: ProfileConfig; generation_rules: {
  allowed_formats: string[]; allowed_topics: string[]; fact_count: Record<string, unknown>; text_budget: Record<string, number>;
  preferences: Record<string, unknown>; hard_limits: Record<string, unknown>; profile_key: string | null };
  editorial_context: { effective_rules_hash: string; profile: ProfileDefinition; definitions_complete: boolean; examples_complete: boolean };
  context_version: { page_updated_at: string; config_updated_at: string }; module: { config_schema_versions: number[]; content_schema_versions: number[] } };
type ProfileWrite = { page: { page_public_id: string; updated_at: string };
  config: { config_schema_version: number; config: ProfileConfig; effective_rules: ProfileContext['generation_rules']; effective_rules_hash: string; updated_at: string }; replayed: boolean };
function profilePrivate(f: ProfileFixture, expression: string): unknown {
  return profileSql(`begin; select set_config('request.jwt.claims',${profileJson({ sub: f.owner, role: 'authenticated', client_id: 'profile-fixture' })}::text,true);
    set local role content_producer_api_owner;select jsonb_build_object('value',${expression});commit;`)
    .split('\n').filter((line) => line.startsWith('{"value":')).map((line) => JSON.parse(line) as { value: unknown })[0]!.value;
}
function seedProfiles(f: ProfileFixture): number {
  return profilePrivate(f, `internal.editorial_seed_profiles_v2((select id from public.workspaces where public_id='${f.workspace}'))`) as number;
}
function profileDefinition(f: ProfileFixture, key = 'dyk', kind = 'profile'): ProfileDefinition {
  const response = profileRpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}',${profileJson({ kind, key, version: 1 })},true)`);
  return (response.data.definitions as ProfileDefinition[])[0]!;
}
function pageProfileContext(f: ProfileFixture, page: string, format: string | null = null): ProfileContext {
  return profileRpc(f, `api.get_page_generation_context(1,'${f.workspace}','${page}','trivia',12,null,${format ? profileQuote(format) : 'null'},null,null)`).data as unknown as ProfileContext;
}
function createProfilePage(f: ProfileFixture, input: ProfileConfig, key = randomUUID()): ProfileWrite {
  return profileRpc(f, `api.create_page(1,'${f.workspace}','${key}','Editorial Page','ed-${randomUUID()}','UTC',array['US','GB','CA','AU'],'trivia',2,${profileJson(input)},true)`).data as unknown as ProfileWrite;
}
function profilePageInput(f: ProfileFixture, key = 'dyk', overrides: Record<string, unknown> = {}): ProfileConfig {
  return { config_schema_version: 2, editorial_profile_ref: profileDefinition(f, key).reference, overrides };
}
function updateProfileExpression(f: ProfileFixture, page: string, input: ProfileConfig, context: ProfileContext, key = randomUUID()) {
  const patch = { niche_key: 'trivia', expected_config_updated_at: context.context_version.config_updated_at,
    config_schema_version: 2, config: input, is_enabled: true, is_default: true };
  return `api.update_page(1,'${f.workspace}','${key}','${page}',${profileQuote(context.context_version.page_updated_at)}::timestamptz,null,${profileJson(patch)})`;
}
function updateProfile(f: ProfileFixture, page: string, input: ProfileConfig, context = pageProfileContext(f, page), key = randomUUID()): ProfileWrite {
  return profileRpc(f, updateProfileExpression(f, page, input, context, key)).data as unknown as ProfileWrite;
}
function resolveProfile(f: ProfileFixture, page: string, item: unknown = {}, format: string | null = null): { config: ProfileConfig; rules: ProfileContext['generation_rules']; rules_hash: string } {
  return profilePrivate(f, `(select internal.editorial_resolve_v2(c.workspace_id,c.config,c.editorial_bindings,${format ? profileQuote(format) : 'null'},${profileJson(item)})
    from public.page_niche_configs c join public.pages p on p.id=c.page_id where p.public_id='${page}')`) as { config: ProfileConfig; rules: ProfileContext['generation_rules']; rules_hash: string };
}
function bindingsFor(page: string): unknown {
  return profileRow<{ bindings: unknown }>(`select c.editorial_bindings bindings from public.page_niche_configs c join public.pages p on p.id=c.page_id where p.public_id='${page}'`).bindings;
}
function publishProfile(f: ProfileFixture, key: string, payload: Record<string, unknown>, previous: number | null = null, kind = 'profile'): ProfileRef {
  const version = profileRpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}')`).data.editorial_catalog_version as string;
  return profileRpc(f, `api.update_trivia_editorial_catalog(1,'${f.workspace}','${randomUUID()}',${profileQuote(version)},${profileJson({ action: 'publish', kind, key, expected_previous_version: previous, payload })})`).data.reference as ProfileRef;
}
function retireProfileReference(f: ProfileFixture, reference: ProfileRef): void {
  const version = profileRpc(f, `api.get_trivia_editorial_catalog(1,'${f.workspace}')`).data.editorial_catalog_version as string;
  profileRpc(f, `api.update_trivia_editorial_catalog(1,'${f.workspace}','${randomUUID()}',${profileQuote(version)},${profileJson({ action: 'retire', reference, reason: 'Use a reviewed successor for new bindings.' })})`);
}

describe('CR-062 Page editorial profiles config2', () => {
  it('provides three distinct presets and keeps bootstrap idempotent without adopting config1', () => {
    const f = profileFixture();
    try {
      const before = profileRow(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`);
      expect(seedProfiles(f)).toBe(3); expect(seedProfiles(f)).toBe(0);
      const definitions = ['curious_mind', 'dyk', 'daily_facts'].map((key) => profileDefinition(f, key));
      expect(definitions.map((d) => d.payload.hook_casing)).toEqual(['as_written', 'uppercase', 'sentence_case']);
      expect(definitions.map((d) => d.payload.emoji_policy)).toEqual(['forbidden', 'optional', 'forbidden']);
      expect(definitions.map((d) => d.payload.fact_count)).toEqual([
        { min: 6, preferred: 8, max: 10 }, { min: 5, preferred: 8, max: 11 }, { min: 5, preferred: 6, max: 7 },
      ]);
      expect(new Set(definitions.map((d) => d.payload.voice)).size).toBe(3);
      const dominant = [{ themed_curiosity: 43 }, { single_subject_fast: 38 }, { themed_utility: 45 }];
      definitions.forEach((d, i) => {
        expect(d.payload.format_weights).toMatchObject(dominant[i]!);
        for (const field of ['format_weights', 'topic_weights']) {
          const values = Object.values(d.payload[field] as Record<string, number>);
          expect(values.every((n) => Number.isInteger(n) && n >= 0 && n <= 100)).toBe(true);
          expect(values.reduce((sum, n) => sum + n, 0)).toBe(100);
        }
      });
      expect(definitions.every((d) => (d.payload.examples as unknown[]).length === 3)).toBe(true);
      expect(profileRow(`select config,updated_at::text from public.page_niche_configs where page_id=(select id from public.pages where public_id='${f.page}')`)).toEqual(before);
    } finally { cleanupProfileFixture(f); }
  });

  it('creates Pages with exact profile references and exposes hard limits separately from preferences', () => {
    const f = profileFixture();
    try {
      seedProfiles(f);
      for (const key of ['curious_mind', 'dyk', 'daily_facts']) {
        const created = createProfilePage(f, profilePageInput(f, key));
        const context = pageProfileContext(f, created.page.page_public_id);
        expect(context.config_public_id).toMatch(/^[0-9a-f-]{36}$/);
        expect(context.config.editorial_profile_ref).toEqual(profileDefinition(f, key).reference);
        expect(context.generation_rules.fact_count).toMatchObject({ mode: 'adaptive', min: 1, max: 12 });
        expect(context.generation_rules.text_budget).toMatchObject({ canva_total_max_chars: 900, fact_max_chars: 150 });
        expect(context.generation_rules.preferences).toHaveProperty('fact_count', profileDefinition(f, key).payload.fact_count);
        expect(context.editorial_context.effective_rules_hash).toBe(created.config.effective_rules_hash);
        expect(context.editorial_context.profile.key).toBe(key);
        expect(context.editorial_context.definitions_complete).toBe(false);
        expect(context.editorial_context.examples_complete).toBe(false);
        expect(context.module.config_schema_versions).toEqual([1, 2]);
        expect(context.module.content_schema_versions).toEqual([2]);
        expect(context.context_version.config_updated_at).toMatch(/\.\d{6}Z$/);
      }
    } finally { cleanupProfileFixture(f); }
  });

  it('resolves format defaults then profile then Page then bounded item overrides deterministically', () => {
    const f = profileFixture();
    try {
      seedProfiles(f);
      const created = createProfilePage(f, profilePageInput(f, 'daily_facts', {
        fact_count: { mode: 'adaptive', min: 2, preferred: 7, max: 11 }, text_budget: { fact_max_chars: 155 },
        style: { hook_casing: 'uppercase', voice: 'Explicit owner voice.', emoji_policy: 'optional',
          cta_guidance: { guidance: 'Natural invitations without a primary goal.', examples: ['Like, save, and follow!'] } },
      }));
      const page = created.page.page_public_id;
      const one = resolveProfile(f, page, { profile_key: 'fast_trivia', fact_count: { mode: 'fixed', value: 10 }, text_budget: { fact_max_chars: 130 } }, 'themed_curiosity');
      const two = resolveProfile(f, page, { profile_key: 'fast_trivia', fact_count: { mode: 'fixed', value: 10 }, text_budget: { fact_max_chars: 130 } }, 'themed_curiosity');
      expect(one).toEqual(two);
      expect(one.rules.fact_count).toEqual({ mode: 'fixed', value: 10 });
      expect(one.rules.text_budget.fact_max_chars).toBe(130);
      expect(one.rules.preferences).toMatchObject({ hook_casing: 'uppercase', voice: 'Explicit owner voice.', emoji_policy: 'optional',
        density_preferences: { fast_trivia: { words_per_fact_min: 12, words_per_fact_max: 16 } } });
      expect(one.rules.profile_key).toBe('fast_trivia');
      expect(one.config.editorial_profile_ref).toEqual(created.config.config.editorial_profile_ref);
      expect(pageProfileContext(f, page).generation_rules.text_budget.fact_max_chars).toBe(155);
    } finally { cleanupProfileFixture(f); }
  });

  it('rejects item expansion, unknown density/DNA fields, count13 and invalid Page ceilings', () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const page = createProfilePage(f, profilePageInput(f, 'dyk', { fact_count: { mode: 'fixed', value: 8 } })).page.page_public_id;
      for (const item of [{ fact_count: { mode: 'fixed', value: 9 } }, { fact_count: { mode: 'fixed', value: 13 } },
        { text_budget: { fact_max_chars: 151 } }, { profile_key: 'not_registered' }, { editorial_profile_ref: profileDefinition(f).reference },
        { render_style: 'numbered' }, { caption: { max_chars: 501 } }]) expect(() => resolveProfile(f, page, item)).toThrow('CONFIG_INVALID');
      for (const overrides of [{ text_budget: { fact_max_chars: 161 } }, { fact_count: { mode: 'fixed', value: 13 } },
        { style: { emoji_policy: null } }, { style: { english_variant: 'id-ID' } }, { density_preferences: { rogue: {} } }]) {
        expect(() => createProfilePage(f, profilePageInput(f, 'dyk', overrides))).toThrow('CONFIG_INVALID');
      }
    } finally { cleanupProfileFixture(f); }
  });

  it('allows dynamic registered format/topic keys and exact zero-weight choices without enabling profile defaults outside Page', () => {
    const f = profileFixture();
    try {
      seedProfiles(f);
      const format = publishProfile(f, 'historical_curiosities', profileDefinition(f, 'comparison', 'format').payload, null, 'format');
      const topic = publishProfile(f, 'town_origins', profileDefinition(f, 'history_origins', 'topic').payload, null, 'topic');
      const input = { ...profilePageInput(f), allowed_format_refs: [format], allowed_topic_refs: [topic],
        format_weights: { historical_curiosities: 100 }, topic_weights: { town_origins: 100 } };
      const page = createProfilePage(f, input).page.page_public_id;
      expect(pageProfileContext(f, page).generation_rules.allowed_formats).toEqual(['historical_curiosities']);
      expect(() => pageProfileContext(f, page, 'mixed_curiosity')).toThrow();
      expect(() => createProfilePage(f, { ...input, format_weights: { wrong_key: 100 } })).toThrow('CONFIG_INVALID');
      expect(() => createProfilePage(f, { ...input, format_weights: { historical_curiosities: 99 } })).toThrow('CONFIG_INVALID');
      expect(() => createProfilePage(f, { ...input, allowed_format_refs: [format, format] })).toThrow('CONFIG_INVALID');
      const zero = createProfilePage(f, profilePageInput(f, 'curious_mind')).page.page_public_id;
      expect(() => pageProfileContext(f, zero, 'comparison')).not.toThrow();
    } finally { cleanupProfileFixture(f); }
  });

  it('selects an explicitly published mixed custom profile and extra density key through the same resolver', () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const dyk = profileDefinition(f); const daily = profileDefinition(f, 'daily_facts');
      const payload = { ...dyk.payload, display_name: 'Owner mixed profile', voice: 'DYK conversational rhythm with Daily Facts explanatory detail.',
        density_preferences: { ...(daily.payload.density_preferences as Record<string, unknown>), owner_custom: { fact_count_min: 5, fact_count_max: 10,
          words_per_fact_min: 10, words_per_fact_max: 18, total_words_min: 75, total_words_max: 125 } },
        provenance: { basis: 'Explicit owner combination.', references: [dyk.reference.public_id, daily.reference.public_id] } };
      const ref = publishProfile(f, 'owner_mixed', payload);
      const page = createProfilePage(f, { config_schema_version: 2, editorial_profile_ref: ref }).page.page_public_id;
      expect(pageProfileContext(f, page).editorial_context.profile.key).toBe('owner_mixed');
      expect(resolveProfile(f, page, { profile_key: 'owner_custom' }).rules.profile_key).toBe('owner_custom');
      updateProfile(f, page, { config_schema_version: 2, editorial_profile_ref: ref, overrides: { text_budget: { fact_max_chars: 140 } } });
      expect(pageProfileContext(f, page).generation_rules.preferences.voice).toBe(payload.voice);
    } finally { cleanupProfileFixture(f); }
  });

  it('keeps pinned versions, Page timestamps and other Pages unchanged after catalog updates and adoption on one Page', () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const input = profilePageInput(f);
      const one = createProfilePage(f, input).page.page_public_id; const two = createProfilePage(f, input).page.page_public_id;
      const first = pageProfileContext(f, one); const second = pageProfileContext(f, two);
      const payload = { ...profileDefinition(f).payload, voice: 'New owner-reviewed DYK version.' };
      const ref = publishProfile(f, 'dyk', payload, 1);
      expect(seedProfiles(f)).toBe(0); // Never overwrite the owner-created second version.
      expect(pageProfileContext(f, one)).toEqual(first); expect(pageProfileContext(f, two)).toEqual(second);
      updateProfile(f, one, { config_schema_version: 2, editorial_profile_ref: ref });
      expect(pageProfileContext(f, one).config.editorial_profile_ref.version).toBe(2);
      expect(pageProfileContext(f, one).editorial_context.effective_rules_hash).not.toBe(first.editorial_context.effective_rules_hash);
      expect(pageProfileContext(f, two)).toEqual(second);
    } finally { cleanupProfileFixture(f); }
  });

  it('preserves binding times on Page-only/config override updates and keeps retired old references usable', () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const input = profilePageInput(f); const page = createProfilePage(f, input).page.page_public_id;
      const before = bindingsFor(page); const context = pageProfileContext(f, page);
      retireProfileReference(f, profileDefinition(f, 'comparison', 'format').reference);
      expect(() => pageProfileContext(f, page, 'comparison')).not.toThrow();
      retireProfileReference(f, input.editorial_profile_ref);
      expect(pageProfileContext(f, page).config.editorial_profile_ref).toEqual(input.editorial_profile_ref);
      profileRpc(f, `api.update_page(1,'${f.workspace}','${randomUUID()}','${page}',${profileQuote(context.context_version.page_updated_at)}::timestamptz,${profileJson({ name: 'Renamed only' })},null)`);
      expect(bindingsFor(page)).toEqual(before);
      updateProfile(f, page, { ...input, overrides: { text_budget: { fact_max_chars: 140 } } });
      expect(bindingsFor(page)).toEqual(before);
      expect(() => createProfilePage(f, input)).toThrow('EDITORIAL_DEFINITION_UNAVAILABLE');
    } finally { cleanupProfileFixture(f); }
  });

  it('rejects stale or rounded CAS and replays the exact original Page response after retirement', () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const input = profilePageInput(f); const page = createProfilePage(f, input).page.page_public_id;
      const context = pageProfileContext(f, page); const key = randomUUID(); const changed = { ...input, overrides: { text_budget: { fact_max_chars: 140 } } };
      const expression = updateProfileExpression(f, page, changed, context, key);
      const saved = profileRpc(f, expression).data;
      expect(() => updateProfile(f, page, input, context)).toThrow('PAGE_VERSION_CONFLICT');
      const current = pageProfileContext(f, page);
      const malformed = { ...current, context_version: { ...current.context_version, config_updated_at: current.context_version.config_updated_at.replace(/\.\d{6}Z$/, '.123Z') } };
      expect(() => updateProfile(f, page, input, malformed)).toThrow('CONFIG_INVALID');
      const rounded = { ...current, context_version: { ...current.context_version, config_updated_at: current.context_version.config_updated_at.replace(/\.\d{6}Z$/, '.000000Z') } };
      expect(() => updateProfile(f, page, input, rounded)).toThrow('PAGE_VERSION_CONFLICT');
      retireProfileReference(f, input.editorial_profile_ref);
      expect(profileRpc(f, expression).data).toEqual({ ...saved, replayed: true });
      expect(() => profileRpc(f, expression, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
    } finally { cleanupProfileFixture(f); }
  });

  it('isolates foreign references and denies anonymous/direct helper and metadata writes', () => {
    const f = profileFixture(); const other = profileFixture();
    try {
      seedProfiles(f); seedProfiles(other);
      expect(() => createProfilePage(f, profilePageInput(other))).toThrow('EDITORIAL_DEFINITION_UNAVAILABLE');
      const page = createProfilePage(f, profilePageInput(f)).page.page_public_id;
      expect(() => profileRpc(f, `api.get_page_generation_context(1,'${f.workspace}','${page}','trivia')`, f.other)).toThrow('OWNER_ACCESS_REQUIRED');
      for (const role of ['anon', 'authenticated', 'service_role']) {
        expect(() => profileSql(`begin;set local role ${role};select internal.editorial_seed_profiles_v2(1);commit;`)).toThrow();
        expect(() => profileSql(`begin;set local role ${role};update public.page_niche_configs set editorial_bindings='[]';commit;`)).toThrow();
      }
    } finally { cleanupProfileFixture(f); cleanupProfileFixture(other); }
  });

  it('supports explicit config1 adoption without changing old post history or another Page', () => {
    const f = profileFixture();
    try {
      const existing = profileDraft(f);
      const oldPost = profileRow(`select content_payload,generation_snapshot,content_hash,revision from public.posts where public_id='${existing.post_public_id}'`);
      seedProfiles(f); const another = createProfilePage(f, profilePageInput(f, 'daily_facts')).page.page_public_id;
      const beforeOther = pageProfileContext(f, another);
      const legacyContext = pageProfileContext(f, f.page);
      updateProfile(f, f.page, profilePageInput(f), legacyContext);
      expect(profileRow(`select content_payload,generation_snapshot,content_hash,revision from public.posts where public_id='${existing.post_public_id}'`)).toEqual(oldPost);
      expect(pageProfileContext(f, another)).toEqual(beforeOther);
      expect(pageProfileContext(f, f.page).config.config_schema_version).toBe(2);
    } finally { cleanupProfileFixture(f); }
  });


  it('serializes simultaneous Page config2 CAS updates and rolls back the stale operation', async () => {
    const f = profileFixture();
    try {
      seedProfiles(f); const input = profilePageInput(f); const page = createProfilePage(f, input).page.page_public_id;
      const context = pageProfileContext(f, page);
      const before = profileRow<{ n: number }>(`select count(*)::integer n from internal.operation_ledger where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).n;
      const { callerStatement, session, waitForSession } = await import('./helpers/plan-lifecycle.js');
      const name = `profile-cas-${randomUUID()}`;
      const first = session(`begin;set application_name=${profileQuote(name)};${callerStatement(f.owner,
        updateProfileExpression(f, page, { ...input, overrides: { text_budget: { fact_max_chars: 140 } } }, context))}select pg_sleep(0.4);commit;`);
      await waitForSession(name);
      const second = session(`begin;${callerStatement(f.owner,
        updateProfileExpression(f, page, { ...input, overrides: { text_budget: { fact_max_chars: 130 } } }, context))}commit;`);
      const [one, two] = await Promise.all([first, second]);
      expect(one.code).toBe(0); expect(two.error).toBe('PAGE_VERSION_CONFLICT');
      expect(pageProfileContext(f, page).generation_rules.text_budget.fact_max_chars).toBe(140);
      expect(profileRow<{ n: number }>(`select count(*)::integer n from internal.operation_ledger where workspace_id=(select id from public.workspaces where public_id='${f.workspace}')`).n).toBe(before + 1);
    } finally { cleanupProfileFixture(f); }
  });
});
