import { spawn, spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function query(sql: string): string {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (result.status !== 0) throw new Error(`${result.stderr}\n${result.stdout}`);
  return result.stdout;
}

function queryAsync(sql: string): Promise<{ code: number; output: string }> {
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

describe('Phase 3 core validators and private primitives', () => {
  it('validates versions and classifies private replay and schedule conflicts', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
      do $$ declare u uuid := extensions.gen_random_uuid(); other_actor uuid := extensions.gen_random_uuid(); w bigint; p bigint; plan bigint; item bigint; first_id bigint; state text; replay_snapshot jsonb; begin
        if not internal.is_valid_workspace_settings_v1('{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":4}'::jsonb) then raise exception 'valid workspace settings rejected'; end if;
        if internal.is_valid_workspace_settings_v1('{"schema_version":1}'::jsonb) then raise exception 'incomplete workspace settings accepted'; end if;
        if not internal.is_valid_trivia_config_v1(internal.default_trivia_config_v1()) then raise exception 'valid trivia config rejected'; end if;
        if internal.is_valid_trivia_config_v1(internal.default_trivia_config_v1() || '{"unknown":true}'::jsonb) then raise exception 'unknown trivia key accepted'; end if;
        insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','phase3-core-${suffix}@example.test','x',now(),'{}','{}',now(),now());
        insert into public.workspaces(owner_user_id,name,slug) values(u,'Core','phase3-core-${suffix}') returning id into w;
        insert into public.pages(workspace_id,name,slug) values(w,'Core','phase3-core-page-${suffix}') returning id into p;
        insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,p,'trivia',internal.default_trivia_config_v1());
        insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,p,'trivia',1) returning id into plan;
        insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) values(w,plan,p,'trivia',1,'2040-01-01 00:00+00') returning id into item;
        select claim_state, operation_id into state, first_id from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'first_use' then raise exception 'first claim failed'; end if;
        create temporary table replay_mutation_markers (operation_id bigint primary key, marker text not null) on commit drop;
        insert into replay_mutation_markers(operation_id, marker) values(first_id, 'created-once');
        select claim_state into state from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'in_progress' then raise exception 'in-progress replay failed'; end if;
        if (select count(*) from replay_mutation_markers where operation_id = first_id) <> 1 then raise exception 'in-progress replay duplicated mutation'; end if;
        update internal.operation_ledger set completed_at = now(), response_snapshot = '{"mutation_marker":"once"}'::jsonb where id = first_id;
        select claim_state, response_snapshot into state, replay_snapshot from internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64));
        if state <> 'replay' or replay_snapshot <> '{"mutation_marker":"once"}'::jsonb then raise exception 'completed replay mismatch'; end if;
        if (select count(*) from internal.operation_ledger where workspace_id = w and operation_key = '00000000-0000-4000-8000-000000000001'::uuid) <> 1 then raise exception 'replay created another ledger row'; end if;
        if (select count(*) from replay_mutation_markers where operation_id = first_id) <> 1 then raise exception 'completed replay duplicated mutation'; end if;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','other.v1',1,repeat('a',64)); raise exception 'mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,other_actor,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('a',64)); raise exception 'actor mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',2,repeat('a',64)); raise exception 'schema mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.claim_operation(w,u,'00000000-0000-4000-8000-000000000001','save_post.v1',1,repeat('b',64)); raise exception 'hash mismatch accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'OPERATION_KEY_REUSED' then raise; end if; end;
        begin perform internal.assert_page_schedule_available(p,'2040-01-01 00:00+00',null,null); raise exception 'cross-table schedule accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'SCHEDULE_CONFLICT' then raise; end if; end;
        if has_function_privilege('authenticated','internal.claim_operation(bigint,uuid,uuid,text,integer,text)','execute') or has_function_privilege('anon','internal.assert_page_schedule_available(bigint,timestamp with time zone,bigint,bigint)','execute') then raise exception 'caller helper privilege'; end if;
        delete from public.content_plan_items where id=item; delete from public.content_plans where id=plan; delete from internal.operation_ledger where id=first_id; delete from public.page_niche_configs where page_id=p; delete from public.pages where id=p; delete from public.workspaces where id=w; delete from auth.users where id=u;
      end $$;
    `),
    ).not.toThrow();
  }, 60_000);

  it('serializes cross-session Page schedule contention', async () => {
    const suffix = `${process.pid}${Date.now()}`;
    const slug = `phase3-lock-${suffix}`;
    query(
      `do $$ declare u uuid := extensions.gen_random_uuid(); w bigint; p bigint; begin insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','${slug}@example.test','x',now(),'{}','{}',now(),now()); insert into public.workspaces(owner_user_id,name,slug) values(u,'Lock','${slug}') returning id into w; insert into public.pages(workspace_id,name,slug) values(w,'Lock','${slug}-page') returning id into p; insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,p,'trivia',internal.default_trivia_config_v1()); insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,p,'trivia',1); end $$;`,
    );
    const writePlanItem = `do $$ declare p bigint := (select pages.id from public.pages join public.workspaces on workspaces.id = pages.workspace_id where workspaces.slug = '${slug}'); plan_id bigint := (select content_plans.id from public.content_plans join public.pages on pages.id = content_plans.page_id where pages.id = p); begin perform internal.assert_page_schedule_available(p,'2041-01-01 00:00+00'); insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) select workspace_id,plan_id,p,'trivia',1,'2041-01-01 00:00+00' from public.pages where id=p; perform pg_sleep(1); end $$;`;
    const writePost = `do $$ declare p bigint := (select pages.id from public.pages join public.workspaces on workspaces.id = pages.workspace_id where workspaces.slug = '${slug}'); payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'; snapshot jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'; begin perform internal.assert_page_schedule_available(p,'2041-01-01 00:00+00'); insert into public.posts(workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,scheduled_at,content_payload,generation_snapshot,content_hash) select workspace_id,p,'trivia','single_subject_fast','animals','share','2041-01-01 00:00+00',payload,snapshot,repeat('b',64) from public.pages where id=p; end $$;`;
    try {
      const first = queryAsync(writePlanItem);
      await new Promise((resolve) => setTimeout(resolve, 150));
      const second = queryAsync(writePost);
      const results = await Promise.all([first, second]);
      expect(results.filter((result) => result.code === 0)).toHaveLength(1);
      expect(results.find((result) => result.code !== 0)?.output).toContain('SCHEDULE_CONFLICT');
    } finally {
      query(
        `do $$ declare u uuid := (select owner_user_id from public.workspaces where slug = '${slug}'); w bigint := (select id from public.workspaces where slug = '${slug}'); begin delete from public.posts where workspace_id = w; delete from public.content_plan_items where workspace_id = w; delete from public.content_plans where workspace_id = w; delete from public.page_niche_configs where workspace_id = w; delete from public.pages where workspace_id = w; delete from public.workspaces where id = w; delete from auth.users where id = u; end $$;`,
      );
    }
  }, 60_000);

  it('permits independent slots and supports self-exclusion', () => {
    const suffix = `${process.pid}${Date.now()}`;
    expect(() =>
      query(`
        do $$ declare u uuid := extensions.gen_random_uuid(); w bigint; one_page bigint; two_page bigint; plan bigint; item bigint; begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values ('00000000-0000-0000-0000-000000000000',u,'authenticated','authenticated','phase3-slots-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces(owner_user_id,name,slug) values(u,'Slots','phase3-slots-${suffix}') returning id into w;
          insert into public.pages(workspace_id,name,slug) values(w,'One','phase3-slots-one-${suffix}') returning id into one_page;
          insert into public.pages(workspace_id,name,slug) values(w,'Two','phase3-slots-two-${suffix}') returning id into two_page;
          insert into public.page_niche_configs(workspace_id,page_id,niche_key,config) values(w,one_page,'trivia',internal.default_trivia_config_v1()),(w,two_page,'trivia',internal.default_trivia_config_v1());
          insert into public.content_plans(workspace_id,page_id,niche_key,requested_count) values(w,one_page,'trivia',1) returning id into plan;
          insert into public.content_plan_items(workspace_id,plan_id,page_id,niche_key,position,scheduled_at) values(w,plan,one_page,'trivia',1,'2043-01-01 00:00+00') returning id into item;
          perform internal.assert_page_schedule_available(two_page,'2043-01-01 00:00+00');
          perform internal.assert_page_schedule_available(one_page,'2043-01-01 01:00+00');
          perform internal.assert_page_schedule_available(one_page,'2043-01-01 00:00+00',item,null);
          begin perform internal.assert_page_schedule_available(one_page,'2043-01-01 00:00+00',null,null); raise exception 'other slot conflict accepted'; exception when sqlstate 'P0001' then if sqlerrm <> 'SCHEDULE_CONFLICT' then raise; end if; end;
          delete from public.content_plan_items where id=item; delete from public.content_plans where id=plan; delete from public.page_niche_configs where workspace_id=w; delete from public.pages where workspace_id=w; delete from public.workspaces where id=w; delete from auth.users where id=u;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
