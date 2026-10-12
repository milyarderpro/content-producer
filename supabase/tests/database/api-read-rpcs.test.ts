import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';

interface JsonRecord {
  [key: string]: JsonRecord;
}

type Fixture = {
  owner: string;
  otherOwner: string;
  workspacePublicId: string;
  otherWorkspacePublicId: string;
  pagePublicIds: string[];
  primaryPagePublicId: string;
  planPublicIds: string[];
  primaryPlanPublicId: string;
  postPublicIds: string[];
  publishedPostPublicId: string;
  internalIds: string[];
  slugPrefix: string;
};

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

function rpc(owner: string, expression: string, clientId = 'phase52-read-client'): JsonRecord {
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
  return resultRow.result;
}

function expectRpcError(owner: string, expression: string, code: string): void {
  expect(() => rpc(owner, expression, `phase52-error-${randomUUID()}`)).toThrow(code);
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

function createFixture(): Fixture {
  const suffix = `${process.pid}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const owner = randomUUID();
  const otherOwner = randomUUID();
  const slugPrefix = `phase52-${suffix}`;
  const otherSlug = `${slugPrefix}-other`;

  insertAuthUser(owner, `${slugPrefix}@example.test`);
  insertAuthUser(otherOwner, `${otherSlug}@example.test`);

  runCli(`
    do $phase52$
    declare
      workspace_id bigint;
      other_workspace_id bigint;
      page_a bigint;
      page_b bigint;
      page_c bigint;
      plan_a bigint;
      plan_b bigint;
      item_a bigint;
      item_b bigint;
      item_c bigint;
      published_post bigint;
      draft_post bigint;
      second_draft_post bigint;
      valid_plan_config jsonb := '{"schema_version":1,"plan_intent":"phase 5.2 read test","requested_chunk_size":1,"schedule":{"mode":"unscheduled"},"requested_formats":[],"requested_topics":[],"requested_interaction_goals":[]}'::jsonb;
      payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{"facts":[]},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb;
      generation_snapshot jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb;
      system_checks jsonb := '{"schema_version":1,"gate_version":1,"evaluated_at":"2026-10-10T09:00:00Z","evaluator":"server","post_revision":1,"content_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","config_version":1,"renderer_version":1,"overall_status":"passed","checks":[{"id":"schema.valid","severity":"blocking","status":"passed","expected":"valid","actual":"valid","evidence":["payload"]}]}'::jsonb;
      editorial_checks jsonb := '{"schema_version":1,"rubric_version":1,"evaluated_at":"2026-10-10T09:00:00Z","evaluator":"chatgpt","post_revision":1,"content_hash":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","overall_status":"pass","criteria":[{"id":"meaning.supported","severity":"critical","status":"pass","note":"Supported.","evidence_paths":["body"]}],"risk_flags":[]}'::jsonb;
    begin
      insert into public.workspaces (
        owner_user_id, name, slug, settings
      ) values (
        '${owner}'::uuid,
        'Phase 5.2 read owner',
        '${slugPrefix}',
        '{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":5}'::jsonb
      ) returning id into workspace_id;

      insert into public.workspaces (
        owner_user_id, name, slug, settings
      ) values (
        '${otherOwner}'::uuid,
        'Phase 5.2 other owner',
        '${otherSlug}',
        '{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":5}'::jsonb
      ) returning id into other_workspace_id;

      insert into public.pages (workspace_id, name, slug, default_niche_key)
      values (workspace_id, 'Primary page', '${slugPrefix}-page-a', 'trivia') returning id into page_a;
      insert into public.pages (workspace_id, name, slug, default_niche_key)
      values (workspace_id, 'Secondary page', '${slugPrefix}-page-b', 'trivia') returning id into page_b;
      insert into public.pages (workspace_id, name, slug, default_niche_key)
      values (workspace_id, 'Tertiary page', '${slugPrefix}-page-c', 'trivia') returning id into page_c;

      insert into public.page_niche_configs (workspace_id, page_id, niche_key, config, is_default)
      values
        (workspace_id, page_a, 'trivia', internal.default_trivia_config_v1(), true),
        (workspace_id, page_b, 'trivia', internal.default_trivia_config_v1(), true),
        (workspace_id, page_c, 'trivia', internal.default_trivia_config_v1(), true);

      insert into public.content_plans (
        workspace_id, page_id, niche_key, name, status, requested_count, plan_config
      ) values (
        workspace_id, page_a, 'trivia', 'Alpha plan', 'in_progress', 2, valid_plan_config
      ) returning id into plan_a;
      insert into public.content_plans (
        workspace_id, page_id, niche_key, name, status, requested_count, plan_config
      ) values (
        workspace_id, page_b, 'trivia', 'Beta plan', 'completed', 1, valid_plan_config
      ) returning id into plan_b;

      insert into public.content_plan_items (
        workspace_id, plan_id, page_id, niche_key, position, status, topic_key, format_key, interaction_goal
      ) values (
        workspace_id, plan_a, page_a, 'trivia', 1, 'completed', 'animals', 'single_subject_fast', 'share'
      ) returning id into item_a;
      insert into public.content_plan_items (
        workspace_id, plan_id, page_id, niche_key, position, status, topic_key, format_key, interaction_goal,
        claim_token, claimed_at, claim_expires_at
      ) values (
        workspace_id, plan_a, page_a, 'trivia', 2, 'in_progress', 'geography', 'comparison', 'save',
        'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
        '2026-10-10 10:00:00+00',
        '2026-10-10 10:30:00+00'
      ) returning id into item_b;
      insert into public.content_plan_items (
        workspace_id, plan_id, page_id, niche_key, position, status, topic_key, format_key, interaction_goal
      ) values (
        workspace_id, plan_b, page_b, 'trivia', 1, 'pending', 'history_origins', 'myth_vs_fact', 'comment'
      ) returning id into item_c;

      insert into public.posts (
        workspace_id, page_id, niche_key, content_plan_item_id, format_key, topic_key,
        interaction_goal, status, quality_status, approval_snapshot, ready_at, published_at,
        content_payload, generation_snapshot, system_checks, editorial_checks, content_hash
      ) values (
        workspace_id, page_a, 'trivia', item_a, 'single_subject_fast', 'animals', 'share',
        'posted', 'passed', '{}'::jsonb, '2026-10-10 10:00:00+00', '2026-10-10 10:00:00+00',
        payload, generation_snapshot, system_checks, editorial_checks, repeat('a', 64)
      ) returning id into published_post;

      insert into public.posts (
        workspace_id, page_id, niche_key, content_plan_item_id, format_key, topic_key,
        interaction_goal, content_payload, generation_snapshot, content_hash
      ) values (
        workspace_id, page_a, 'trivia', item_b, 'comparison', 'geography', 'save',
        payload, generation_snapshot, repeat('b', 64)
      ) returning id into draft_post;

      insert into public.posts (
        workspace_id, page_id, niche_key, content_plan_item_id, format_key, topic_key,
        interaction_goal, content_payload, generation_snapshot, content_hash
      ) values (
        workspace_id, page_b, 'trivia', item_c, 'myth_vs_fact', 'history_origins', 'comment',
        payload, generation_snapshot, repeat('c', 64)
      ) returning id into second_draft_post;

      insert into public.post_metrics (
        workspace_id, page_id, post_id, captured_at, views, reach, reactions, likes,
        comments, shares, saves, follows, metrics_payload
      ) values
        (
          workspace_id, page_a, published_post, '2026-10-10 11:00:00+00', 100, 80, 10, 5,
          2, 1, 3, 1,
          '{"metric_definition_version":1,"source_type":"facebook_ui","source_reported_at":null,"timezone":"UTC","note":"routine snapshot"}'::jsonb
        ),
        (
          workspace_id, page_a, published_post, '2026-10-10 12:00:00+00', 150, 120, 15, 8,
          3, 2, 4, 2,
          '{"metric_definition_version":1,"source_type":"facebook_ui","source_reported_at":null,"timezone":"UTC","note":"routine snapshot"}'::jsonb
        );
    end;
    $phase52$;
  `);

  const row = querySingleRow(`
    select
      (select public_id::text from public.workspaces where slug = '${slugPrefix}') as workspace_public_id,
      (select public_id::text from public.workspaces where slug = '${otherSlug}') as other_workspace_public_id,
      (select public_id::text from public.pages where slug = '${slugPrefix}-page-a') as page_a_public_id,
      (select public_id::text from public.pages where slug = '${slugPrefix}-page-b') as page_b_public_id,
      (select public_id::text from public.pages where slug = '${slugPrefix}-page-c') as page_c_public_id,
      (select public_id::text from public.content_plans where name = 'Alpha plan' and workspace_id = (select id from public.workspaces where slug = '${slugPrefix}')) as plan_a_public_id,
      (select public_id::text from public.content_plans where name = 'Beta plan' and workspace_id = (select id from public.workspaces where slug = '${slugPrefix}')) as plan_b_public_id,
      (select public_id::text from public.posts where content_hash = repeat('a', 64)) as published_post_public_id,
      (select public_id::text from public.posts where content_hash = repeat('b', 64)) as draft_post_public_id,
      (select public_id::text from public.posts where content_hash = repeat('c', 64)) as second_draft_post_public_id,
      (select id::text from public.pages where slug = '${slugPrefix}-page-a') as page_a_id,
      (select id::text from public.pages where slug = '${slugPrefix}-page-b') as page_b_id,
      (select id::text from public.pages where slug = '${slugPrefix}-page-c') as page_c_id,
      (select id::text from public.content_plans where name = 'Alpha plan' and workspace_id = (select id from public.workspaces where slug = '${slugPrefix}')) as plan_a_id,
      (select id::text from public.content_plans where name = 'Beta plan' and workspace_id = (select id from public.workspaces where slug = '${slugPrefix}')) as plan_b_id,
      (select id::text from public.posts where content_hash = repeat('a', 64)) as published_post_id,
      (select id::text from public.posts where content_hash = repeat('b', 64)) as draft_post_id,
      (select id::text from public.posts where content_hash = repeat('c', 64)) as second_draft_post_id
  `);

  return {
    owner,
    otherOwner,
    workspacePublicId: String(row.workspace_public_id),
    otherWorkspacePublicId: String(row.other_workspace_public_id),
    pagePublicIds: [
      String(row.page_a_public_id),
      String(row.page_b_public_id),
      String(row.page_c_public_id),
    ],
    primaryPagePublicId: String(row.page_a_public_id),
    planPublicIds: [String(row.plan_a_public_id), String(row.plan_b_public_id)],
    primaryPlanPublicId: String(row.plan_a_public_id),
    postPublicIds: [
      String(row.published_post_public_id),
      String(row.draft_post_public_id),
      String(row.second_draft_post_public_id),
    ],
    publishedPostPublicId: String(row.published_post_public_id),
    internalIds: [
      String(row.page_a_id),
      String(row.page_b_id),
      String(row.page_c_id),
      String(row.plan_a_id),
      String(row.plan_b_id),
      String(row.published_post_id),
      String(row.draft_post_id),
      String(row.second_draft_post_id),
    ],
    slugPrefix,
  };
}

function cleanupFixture(fixture: Fixture): void {
  runCli(`
    do $cleanup$
    begin
      delete from public.post_metrics
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.posts
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.content_plan_items
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.content_plans
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.page_niche_configs
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.pages
      where workspace_id in (select id from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other'));
      delete from public.workspaces where slug in ('${fixture.slugPrefix}', '${fixture.slugPrefix}-other');
      delete from auth.users where id in ('${fixture.owner}', '${fixture.otherOwner}');
    end;
    $cleanup$;
  `);
}

function businessState(workspacePublicId: string): JsonRecord {
  return querySingleRow(`
    select
      (select count(*) from public.workspaces where public_id = '${workspacePublicId}'::uuid) as workspace_count,
      (select count(*) from public.pages where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as page_count,
      (select count(*) from public.content_plans where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as plan_count,
      (select count(*) from public.content_plan_items where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as item_count,
      (select count(*) from public.posts where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as post_count,
      (select count(*) from public.post_metrics where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as metric_count,
      (select count(*) from internal.operation_ledger where workspace_id = (select id from public.workspaces where public_id = '${workspacePublicId}'::uuid)) as ledger_count
  `);
}

describe('Phase 5.2 owner-scoped read projections', () => {
  it('exposes exactly the nineteen authenticated API RPCs with narrow catalog privileges', () => {
    const catalog = querySingleRow(`
      with api_functions as (
        select procedure.oid, procedure.proname
        from pg_proc as procedure
        join pg_namespace as namespace on namespace.oid = procedure.pronamespace
        where namespace.nspname = 'api'
      )
      select
        (select count(*) from api_functions) as api_function_count,
        (select array_agg(proname order by proname) from api_functions) as api_function_names,
        (select count(*) from api_functions where has_function_privilege('authenticated', oid, 'execute')) as authenticated_execute_count,
        (select count(*) from api_functions where has_function_privilege('anon', oid, 'execute') or has_function_privilege('service_role', oid, 'execute')) as non_authenticated_execute_count,
        (select count(*) from pg_proc as procedure join pg_namespace as namespace on namespace.oid = procedure.pronamespace where namespace.nspname = 'internal' and (has_function_privilege('anon', procedure.oid, 'execute') or has_function_privilege('authenticated', procedure.oid, 'execute') or has_function_privilege('service_role', procedure.oid, 'execute'))) as caller_internal_helper_count,
        has_schema_privilege('content_producer_api_owner', 'api', 'create') as api_owner_create,
        has_schema_privilege('content_producer_api_owner', 'internal', 'create') as api_owner_internal_create,
        has_table_privilege('authenticated', 'public.posts', 'select') as authenticated_posts_select,
        has_table_privilege('anon', 'public.pages', 'select') as anon_pages_select,
        has_table_privilege('service_role', 'public.post_metrics', 'select') as service_role_metrics_select
    `);

    expect(catalog.api_function_count).toBe(32);
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
    expect(catalog.authenticated_execute_count).toBe(32);
    expect(catalog.non_authenticated_execute_count).toBe(0);
    expect(catalog.caller_internal_helper_count).toBe(0);
    expect(catalog.api_owner_create).toBe(false);
    expect(catalog.api_owner_internal_create).toBe(false);
    expect(catalog.authenticated_posts_select).toBe(false);
    expect(catalog.anon_pages_select).toBe(false);
    expect(catalog.service_role_metrics_select).toBe(false);
  }, 30_000);

  it('serves every read projection for the owner, including safe pagination and performance output', () => {
    const fixture = createFixture();
    try {
      const before = businessState(fixture.workspacePublicId);
      const account = rpc(fixture.owner, 'api.get_account_profile(1)');
      expect(account.data.profile.workspace_public_id).toBe(fixture.workspacePublicId);
      expect(account.data.profile.email_hint).toBeNull();

      const workspace = rpc(
        fixture.owner,
        `api.get_workspace_context(1, '${fixture.workspacePublicId}'::uuid)`,
      );
      expect(workspace.data.workspace.public_id).toBe(fixture.workspacePublicId);
      expect(workspace.data.modules).toHaveLength(1);
      expect(workspace.data.modules[0].niche_key).toBe('trivia');
      expect(workspace.data.page_counts.active).toBe(3);

      const pageFirst = rpc(
        fixture.owner,
        `api.list_pages(1, '${fixture.workspacePublicId}'::uuid, null, null, null, 1, null)`,
      );
      expect(pageFirst.data.items).toHaveLength(1);
      expect(pageFirst.data.has_more).toBe(true);
      expect(String(pageFirst.data.next_cursor).length).toBeLessThanOrEqual(512);
      expect(String(pageFirst.data.next_cursor)).toMatch(/^[A-Za-z0-9+/]+=*$/);
      const pageCursor = JSON.parse(
        Buffer.from(String(pageFirst.data.next_cursor), 'base64').toString('utf8'),
      );
      expect(pageCursor.tie).toBeUndefined();
      expect(pageCursor.tie_public_id).toMatch(/^[0-9a-f-]{36}$/);
      expect(fixture.internalIds).not.toContain(String(pageCursor.tie_public_id));
      const pageSecond = rpc(
        fixture.owner,
        `api.list_pages(1, '${fixture.workspacePublicId}'::uuid, null, null, null, 1, '${pageFirst.data.next_cursor}')`,
      );
      expect(pageSecond.data.items).toHaveLength(1);
      expect(pageSecond.data.items[0].page_public_id).not.toBe(
        pageFirst.data.items[0].page_public_id,
      );

      const context = rpc(
        fixture.owner,
        `api.get_page_generation_context(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', 2, null, null, null, null)`,
      );
      expect(context.data.config.allowed_formats).toContain('single_subject_fast');
      expect(context.data.recent_variety.length).toBeGreaterThan(0);
      expect(context.data.reuse_policy.eligible_fact_count).toBe(0);

      const planFirst = rpc(
        fixture.owner,
        `api.list_content_plans(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, 1, null)`,
      );
      expect(planFirst.data.items).toHaveLength(1);
      expect(planFirst.data.has_more).toBe(true);
      const planSecond = rpc(
        fixture.owner,
        `api.list_content_plans(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, 1, '${planFirst.data.next_cursor}')`,
      );
      expect(planSecond.data.items[0].plan_public_id).not.toBe(
        planFirst.data.items[0].plan_public_id,
      );

      const plan = rpc(
        fixture.owner,
        `api.get_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPlanPublicId}'::uuid, null, 1, null)`,
      );
      expect(plan.data.items).toHaveLength(1);
      expect(plan.data.has_more).toBe(true);
      expect(plan.data.items[0].claim_token).toBeUndefined();
      expect(plan.data.items[0].claim_expires_at).toBeNull();
      const planNext = rpc(
        fixture.owner,
        `api.get_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPlanPublicId}'::uuid, null, 1, '${plan.data.next_cursor}')`,
      );
      expect(planNext.data.items[0].plan_item_public_id).not.toBe(
        plan.data.items[0].plan_item_public_id,
      );
      const activePlanItem = rpc(
        fixture.owner,
        `api.get_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPlanPublicId}'::uuid, array['in_progress']::text[], 50, null)`,
      );
      expect(activePlanItem.data.items).toHaveLength(1);
      expect(activePlanItem.data.items[0].claim_expires_at).toBe('2026-10-10T10:30:00.000000Z');

      const postsFirst = rpc(
        fixture.owner,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 1, null)`,
      );
      expect(postsFirst.data.items).toHaveLength(1);
      expect(postsFirst.data.has_more).toBe(true);
      const postsNext = rpc(
        fixture.owner,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 1, '${postsFirst.data.next_cursor}')`,
      );
      expect(postsNext.data.items[0].post_public_id).not.toBe(
        postsFirst.data.items[0].post_public_id,
      );

      const post = rpc(
        fixture.owner,
        `api.get_post(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, true, true, true)`,
      );
      expect(post.data.post.post_public_id).toBe(fixture.publishedPostPublicId);
      expect(post.data.latest_metrics.metrics.views).toBe(150);
      expect(post.data.post.editorial_checks.criteria).toHaveLength(1);
      expect(post.data.post.editorial_checks.criteria[0].id).toBe('meaning.supported');
      expect(post.data.post.editorial_checks.risk_flags).toEqual([]);
      expect(JSON.stringify(post)).not.toMatch(
        /private source document|do-not-return|raw_source_document|access_token/i,
      );

      const performanceFirst = rpc(
        fixture.owner,
        `api.get_post_performance(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, timestamptz '2026-10-10 10:00:00+00', timestamptz '2026-10-10 13:00:00+00', 1, null)`,
      );
      expect(performanceFirst.data.snapshots).toHaveLength(1);
      expect(performanceFirst.data.latest_snapshot.metrics.views).toBe(150);
      expect(performanceFirst.data.compatible_deltas).toHaveLength(1);
      expect(performanceFirst.data.compatible_deltas[0].delta.views).toBe(50);
      expect(JSON.stringify(performanceFirst)).not.toMatch(
        /private source document|do-not-return|raw_source_document|access_token/i,
      );
      const performanceNext = rpc(
        fixture.owner,
        `api.get_post_performance(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, timestamptz '2026-10-10 10:00:00+00', timestamptz '2026-10-10 13:00:00+00', 1, '${performanceFirst.data.next_cursor}')`,
      );
      expect(performanceNext.data.snapshots).toHaveLength(1);

      const insights = rpc(
        fixture.owner,
        `api.get_performance_insights(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', timestamptz '2026-10-10 10:00:00+00', timestamptz '2026-10-10 13:00:00+00', array['format']::text[], 'views', 2, 20)`,
      );
      expect(insights.data.eligible_post_count).toBe(1);
      expect(insights.data.groups[0].evidence_strength).toBe('insufficient');
      expect(insights.data.groups[0].metric_summary.median).toBe(150);

      const rateGroups = queryRows(`
        select limit_group, request_count
        from internal.rate_limit_buckets
        where actor_user_id = '${fixture.owner}'::uuid
          and oauth_client_id like 'phase52-%'
        order by limit_group
      `);
      expect([...new Set(rateGroups.map((group) => String(group.limit_group)))].sort()).toEqual([
        'expensive_read',
        'read',
      ]);
      expect(
        Number(
          rateGroups.find((group) => String(group.limit_group) === 'expensive_read')?.request_count,
        ),
      ).toBeGreaterThan(0);
      expect(businessState(fixture.workspacePublicId)).toEqual(before);
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);

  it('denies every workspace-scoped read to a non-owner without revealing resource existence', () => {
    const fixture = createFixture();
    try {
      const expressions = [
        `api.get_workspace_context(1, '${fixture.workspacePublicId}'::uuid)`,
        `api.list_pages(1, '${fixture.workspacePublicId}'::uuid, null, null, null, 20, null)`,
        `api.get_page_generation_context(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', 12, null, null, null, null)`,
        `api.list_content_plans(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, 20, null)`,
        `api.get_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPlanPublicId}'::uuid, null, 50, null)`,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 20, null)`,
        `api.get_post(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, true, true, false)`,
        `api.get_post_performance(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, null, null, 20, null)`,
        `api.get_performance_insights(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', null, null, array['format']::text[], 'views', 5, 20)`,
      ];
      for (const expression of expressions)
        expectRpcError(fixture.otherOwner, expression, 'OWNER_ACCESS_REQUIRED');
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);

  it('returns stable validation, owner-safe not-found, and empty-success responses without business mutation', () => {
    const fixture = createFixture();
    try {
      const before = businessState(fixture.workspacePublicId);

      const calls = [
        'api.get_account_profile(2)',
        `api.get_workspace_context(2, '${fixture.workspacePublicId}'::uuid)`,
        `api.list_pages(2, '${fixture.workspacePublicId}'::uuid, null, null, null, 20, null)`,
        `api.get_page_generation_context(2, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', 12, null, null, null, null)`,
        `api.list_content_plans(2, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, 20, null)`,
        `api.get_content_plan(2, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPlanPublicId}'::uuid, null, 50, null)`,
        `api.list_posts(2, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 20, null)`,
        `api.get_post(2, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, true, true, false)`,
        `api.get_post_performance(2, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, null, null, 20, null)`,
        `api.get_performance_insights(2, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', null, null, array['format']::text[], 'views', 5, 20)`,
      ];
      for (const expression of calls)
        expectRpcError(fixture.owner, expression, 'VALIDATION_FAILED');

      expectRpcError(
        fixture.otherOwner,
        `api.get_workspace_context(1, '${fixture.workspacePublicId}'::uuid)`,
        'OWNER_ACCESS_REQUIRED',
      );
      expectRpcError(
        fixture.otherOwner,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 20, null)`,
        'OWNER_ACCESS_REQUIRED',
      );
      expectRpcError(
        fixture.owner,
        `api.get_post(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, true, true, false)`,
        'POST_NOT_FOUND',
      );
      expectRpcError(
        fixture.owner,
        `api.get_content_plan(1, '${fixture.workspacePublicId}'::uuid, '${randomUUID()}'::uuid, null, 50, null)`,
        'PLAN_NOT_FOUND',
      );
      expectRpcError(
        fixture.owner,
        `api.list_pages(1, '${fixture.workspacePublicId}'::uuid, null, null, null, 0, null)`,
        'VALIDATION_FAILED',
      );
      expectRpcError(
        fixture.owner,
        `api.get_performance_insights(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', null, null, array['format','format']::text[], 'views', 5, 20)`,
        'VALIDATION_FAILED',
      );
      expectRpcError(
        fixture.owner,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, null, 20, repeat('a', 513))`,
        'VALIDATION_FAILED',
      );

      const emptyPages = rpc(
        fixture.owner,
        `api.list_pages(1, '${fixture.workspacePublicId}'::uuid, 'no-such-page', null, null, 20, null)`,
      );
      expect(emptyPages.data.items).toEqual([]);
      expect(emptyPages.data.has_more).toBe(false);
      const emptyPlans = rpc(
        fixture.owner,
        `api.list_content_plans(1, '${fixture.workspacePublicId}'::uuid, null, null, 'no-such-plan', null, null, null, 20, null)`,
      );
      expect(emptyPlans.data.items).toEqual([]);
      const emptyPosts = rpc(
        fixture.owner,
        `api.list_posts(1, '${fixture.workspacePublicId}'::uuid, null, null, null, null, null, null, null, null, null, 'no-such-hook', 20, null)`,
      );
      expect(emptyPosts.data.items).toEqual([]);
      const emptyPerformance = rpc(
        fixture.owner,
        `api.get_post_performance(1, '${fixture.workspacePublicId}'::uuid, '${fixture.publishedPostPublicId}'::uuid, timestamptz '2027-01-01 00:00:00+00', timestamptz '2027-01-02 00:00:00+00', 20, null)`,
      );
      expect(emptyPerformance.data.snapshots).toEqual([]);
      expect(emptyPerformance.data.latest_snapshot).toBeNull();
      const emptyInsights = rpc(
        fixture.owner,
        `api.get_performance_insights(1, '${fixture.workspacePublicId}'::uuid, '${fixture.primaryPagePublicId}'::uuid, 'trivia', timestamptz '2027-01-01 00:00:00+00', timestamptz '2027-01-02 00:00:00+00', array['format']::text[], 'views', 5, 20)`,
      );
      expect(emptyInsights.data.groups).toEqual([]);
      expect(emptyInsights.data.eligible_post_count).toBe(0);

      const after = businessState(fixture.workspacePublicId);
      expect(after).toEqual(before);
    } finally {
      cleanupFixture(fixture);
    }
  }, 60_000);
});
