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

function queryRows(sql: string): Array<Record<string, unknown>> {
  return (JSON.parse(query(sql)) as { rows: Array<Record<string, unknown>> }).rows;
}

function concurrentQuery(sql: string): Promise<number | null> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'supabase', 'db', 'query', '--local', '--output-format', 'json', sql],
      {
        cwd: process.cwd(),
        env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
      },
    );
    child.once('error', reject);
    child.once('close', resolve);
  });
}

describe('Phase 4 checkpoint 4.7 trivia lineage and reverification', () => {
  it('refreshes only same-meaning facts and preserves published evidence through corrections', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      query(`
        do $$
        #variable_conflict use_variable
        declare
          owner_id uuid := extensions.gen_random_uuid();
          workspace_id bigint;
          other_workspace_id bigint;
          page_id bigint;
          post_id bigint;
          refresh_fact_id uuid;
          invalidate_fact_id uuid;
          predecessor_fact_id uuid;
          successor_fact_id uuid;
          fact_id bigint;
          snapshot jsonb;
          original_snapshot jsonb;
          identity_before jsonb;
          correction record;
          source jsonb := '[{"schema_version":1,"url":"https://example.test/lineage","canonical_url":"https://example.test/lineage","title":"Lineage source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"lineage"}]'::jsonb;
          refreshed_source jsonb := '[{"schema_version":1,"url":"https://example.test/lineage-refresh","canonical_url":"https://example.test/lineage-refresh","title":"Refreshed lineage source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-11T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"lineage-refresh"}]'::jsonb;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-10T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
          payload jsonb := '{"schema_version":1,"hook":"Did you know?","body":{},"cta":"Share this.","canva_copy":"Did you know? Share this.","caption":"Trivia.","hashtags":[],"render_style":"plain_lines","text_metrics":{}}'::jsonb;
          generation jsonb := '{"config_schema_version":1,"fact_count":{},"fact_count_applied":5,"fact_count_override":false,"text_budget":{},"fact_reuse_scope":"workspace_unique","profile_key":"fast_trivia","render_style":"plain_lines","target_markets":["US"],"locale":"en-US"}'::jsonb;
        begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','phase4-lineage-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces (owner_user_id,name,slug) values (owner_id,'Lineage','phase4-lineage-${suffix}') returning id into workspace_id;
          insert into public.workspaces (owner_user_id,name,slug,is_active) values (owner_id,'Lineage other','phase4-lineage-other-${suffix}',false) returning id into other_workspace_id;
          insert into public.pages (workspace_id,name,slug) values (workspace_id,'Lineage','phase4-lineage-page-${suffix}') returning id into page_id;
          insert into public.page_niche_configs (workspace_id,page_id,niche_key,config)
          values (workspace_id,page_id,'trivia',internal.default_trivia_config_v1());
          insert into public.posts (workspace_id,page_id,niche_key,format_key,topic_key,interaction_goal,content_payload,generation_snapshot,content_hash)
          values (workspace_id,page_id,'trivia','single_subject_fast','animals','share',payload,generation,repeat('a',64)) returning id into post_id;

          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,verified_at,expires_at)
          values
            (workspace_id,'Refresh fact has three markers.','ignored',repeat('0',64),'refresh_subject','has_count','3','[{"value":"3","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals',review,source,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days')),
            (workspace_id,'Invalidated fact has four markers.','ignored',repeat('0',64),'invalidated_subject','has_count','4','[{"value":"4","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals',review,source,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days')),
            (workspace_id,'Corrected fact has five markers.','ignored',repeat('0',64),'corrected_subject','has_count','5','[{"value":"5","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals',review,source,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days'));
          select public_id into refresh_fact_id from public.trivia_facts where public.trivia_facts.workspace_id = workspace_id and subject_key = 'refresh_subject';
          select public_id into invalidate_fact_id from public.trivia_facts where public.trivia_facts.workspace_id = workspace_id and subject_key = 'invalidated_subject';
          select public_id into predecessor_fact_id from public.trivia_facts where public.trivia_facts.workspace_id = workspace_id and subject_key = 'corrected_subject';

          select jsonb_build_object(
            'claim_text',claim_text,'normalized_claim',normalized_claim,'claim_hash',claim_hash,
            'subject_key',subject_key,'relation_key',relation_key,'object_key',object_key,
            'numbers',numbers,'qualifiers',qualifiers,'structured_key',structured_key,
            'structured_hash',structured_hash,'topic_key',topic_key
          ) into identity_before from public.trivia_facts where public_id = refresh_fact_id;
          perform internal.trivia_reverify_fact_v1(
            workspace_id,refresh_fact_id,'Refresh fact has three markers.','refresh_subject','has_count','3',
            '[{"value":"3","unit":null,"role":"count"}]','{"comparison_direction":"none"}','animals',
            refreshed_source,'stable',date_trunc('second',now()),null,date_trunc('second',now()+interval '60 days'),'Refreshed source evidence.'
          );
          if identity_before is distinct from (
            select jsonb_build_object(
              'claim_text',claim_text,'normalized_claim',normalized_claim,'claim_hash',claim_hash,
              'subject_key',subject_key,'relation_key',relation_key,'object_key',object_key,
              'numbers',numbers,'qualifiers',qualifiers,'structured_key',structured_key,
              'structured_hash',structured_hash,'topic_key',topic_key
            ) from public.trivia_facts where public_id = refresh_fact_id
          ) then
            raise exception 'reverification changed fact identity';
          end if;
          begin
            perform internal.trivia_reverify_fact_v1(
              workspace_id,refresh_fact_id,'Refresh fact has four markers.','refresh_subject','has_count','4',
              '[{"value":"4","unit":null,"role":"count"}]','{"comparison_direction":"none"}','animals',
              refreshed_source,'stable',date_trunc('second',now()),null,date_trunc('second',now()+interval '60 days'),null
            );
            raise exception 'meaning change through reverification was accepted';
          exception when check_violation then null;
          end;

          perform internal.trivia_invalidate_fact_v1(workspace_id,invalidate_fact_id,'Source withdrew support.');
          if (select verification_status = 'invalidated' and supersedes_fact_id is null from public.trivia_facts where public_id = invalidate_fact_id) is not true then
            raise exception 'invalidation state is incorrect';
          end if;

          select id into fact_id from public.trivia_facts where public_id = predecessor_fact_id;
          select jsonb_build_object(
            'schema_version',1,'canonical_claim',claim_text,'normalized_claim',normalized_claim,
            'normalization_version',normalization_version,'claim_hash',claim_hash,'subject_key',subject_key,
            'relation_key',relation_key,'object_key',object_key,'numbers',numbers,'qualifiers',qualifiers,
            'ontology_version',ontology_version,'structured_key',structured_key,'structured_hash',structured_hash,
            'structured_match_eligible',structured_match_eligible,'topic_key',topic_key,'risk_class',risk_class,
            'source_schema_version',1,'sources',source_data,'verification_status',verification_status,
            'verified_at',to_char(verified_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'as_of_date',coalesce(to_jsonb(as_of_date),'null'::jsonb),
            'expires_at',to_char(expires_at at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
            'dedup_review_schema_version',(dedup_review_snapshot->>'schema_version')::integer
          ) into snapshot from public.trivia_facts where id = fact_id;
          insert into public.trivia_post_facts (workspace_id,page_id,post_id,fact_id,position,rendered_text,allocation_state,published_at,claim_hash_snapshot,source_snapshot,verified_at_snapshot)
          select workspace_id,page_id,post_id,id,1,'Published lineage evidence.','published',now(),claim_hash,snapshot,verified_at
          from public.trivia_facts where id = fact_id;
          select source_snapshot into original_snapshot from public.trivia_post_facts where public.trivia_post_facts.post_id = post_id;

          select * into correction from internal.trivia_correct_fact_v1(
            workspace_id,predecessor_fact_id,'Corrected fact has six markers.','corrected_subject','has_count','6',
            '[{"value":"6","unit":null,"role":"count"}]','{"comparison_direction":"none"}','animals',review,
            refreshed_source,'stable','standard',date_trunc('second',now()),null,date_trunc('second',now()+interval '60 days'),
            'Correction evidence refreshed.','The marker count was corrected.'
          );
          successor_fact_id := correction.successor_public_id;
          if correction.predecessor_public_id <> predecessor_fact_id
            or (select verification_status = 'superseded' from public.trivia_facts where public_id = predecessor_fact_id) is not true
            or (select verification_status = 'verified' and supersedes_fact_id = fact_id from public.trivia_facts where public_id = successor_fact_id) is not true
            or original_snapshot is distinct from (select source_snapshot from public.trivia_post_facts where public.trivia_post_facts.post_id = post_id) then
            raise exception 'atomic correction or published snapshot protection failed';
          end if;
          begin
            perform internal.trivia_correct_fact_v1(
              workspace_id,predecessor_fact_id,'Second correction has seven markers.','corrected_subject','has_count','7',
              '[{"value":"7","unit":null,"role":"count"}]','{"comparison_direction":"none"}','animals',review,
              refreshed_source,'stable','standard',date_trunc('second',now()),null,date_trunc('second',now()+interval '60 days'),null,'Second correction.'
            );
            raise exception 'second correction accepted';
          exception when check_violation then null;
          end;
          begin
            update public.trivia_facts set supersedes_fact_id = (select id from public.trivia_facts where public_id = successor_fact_id) where public_id = predecessor_fact_id;
            raise exception 'lineage cycle accepted';
          exception when check_violation then null;
          end;
          begin
            insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,supersedes_fact_id,correction_reason,corrected_at)
            values (other_workspace_id,'Cross workspace successor.','ignored',repeat('0',64),'cross_workspace','has_count','1','[{"value":"1","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals',review,source,fact_id,'Cross workspace.',now());
            raise exception 'cross-workspace successor accepted';
          exception when foreign_key_violation or unique_violation then null;
          end;

          if has_function_privilege('authenticated','internal.trivia_reverify_fact_v1(bigint,uuid,text,text,text,text,jsonb,jsonb,text,jsonb,text,timestamptz,date,timestamptz,text)','execute')
            or has_function_privilege('anon','internal.trivia_invalidate_fact_v1(bigint,uuid,text)','execute')
            or has_function_privilege('service_role','internal.trivia_correct_fact_v1(bigint,uuid,text,text,text,text,jsonb,jsonb,text,jsonb,jsonb,text,text,timestamptz,date,timestamptz,text,text)','execute')
            or has_function_privilege('public','internal.trivia_validate_lineage_v1()','execute')
            or to_regclass('public.trivia_facts_current_successor_key') is null then
            raise exception 'lineage primitive privilege or catalog boundary failed';
          end if;

          delete from public.trivia_post_facts where public.trivia_post_facts.workspace_id = workspace_id;
          delete from public.posts where public.posts.workspace_id = workspace_id;
          delete from public.trivia_facts where public.trivia_facts.workspace_id in (workspace_id,other_workspace_id);
          delete from public.page_niche_configs where public.page_niche_configs.workspace_id = workspace_id;
          delete from public.pages where public.pages.workspace_id = workspace_id;
          delete from public.workspaces where public.workspaces.id in (workspace_id,other_workspace_id);
          delete from auth.users where id = owner_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);

  it('permits one concurrent correction winner and no partial successor', async () => {
    const suffix = `${process.pid}${Date.now()}`;
    const slug = `phase4-correction-race-${suffix}`;
    const source =
      '[{"schema_version":1,"url":"https://example.test/correction-race","canonical_url":"https://example.test/correction-race","title":"Correction race source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"correction-race"}]';
    const review =
      '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-10T00:00:00Z","evaluator":"chatgpt","decisions":[]}';

    try {
      query(`
        do $$
        declare owner_id uuid := extensions.gen_random_uuid(); w bigint;
        begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','${slug}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces (owner_user_id,name,slug) values (owner_id,'Correction race','${slug}') returning id into w;
          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,verified_at,expires_at)
          values (w,'Correction race fact has three markers.','ignored',repeat('0',64),'correction_race','has_count','3','[{"value":"3","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals','${review}'::jsonb,'${source}'::jsonb,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days'));
        end $$;
      `);
      const [fixture] = queryRows(`
        select jsonb_build_object('workspace_id',id,'fact_public_id',(select public_id from public.trivia_facts where workspace_id = workspaces.id)) as fixture
        from public.workspaces where slug = '${slug}'
      `);
      const values = fixture.fixture as Record<string, string>;
      const correctSql = (number: number) => `
        with timeout_settings as materialized (
          select set_config('lock_timeout','2s',true), set_config('statement_timeout','10s',true)
        )
        select * from internal.trivia_correct_fact_v1(
          ${values.workspace_id},'${values.fact_public_id}'::uuid,'Correction race fact has ${number} markers.','correction_race','has_count','${number}',
          '[{"value":"${number}","unit":null,"role":"count"}]','{"comparison_direction":"none"}','animals','${review}'::jsonb,
          '${source}'::jsonb,'stable','standard',date_trunc('second',now()),null,date_trunc('second',now()+interval '60 days'),null,'Concurrent correction.'
        ) where exists (select 1 from timeout_settings)
      `;
      const startedAt = Date.now();
      const statuses = await Promise.all([
        concurrentQuery(correctSql(4)),
        concurrentQuery(correctSql(5)),
      ]);
      expect(Date.now() - startedAt).toBeLessThan(30_000);
      expect(statuses.filter((status) => status === 0)).toHaveLength(1);
      const [result] = queryRows(`
        select
          (select verification_status from public.trivia_facts where public_id = '${values.fact_public_id}'::uuid) as predecessor_status,
          count(*)::integer as successor_count
        from public.trivia_facts
        where supersedes_fact_id = (select id from public.trivia_facts where public_id = '${values.fact_public_id}'::uuid)
      `);
      expect(result.predecessor_status).toBe('superseded');
      expect(result.successor_count).toBe(1);
    } finally {
      query(`
        do $$
        declare w bigint := (select id from public.workspaces where slug = '${slug}'); u uuid := (select owner_user_id from public.workspaces where id = w);
        begin
          delete from public.trivia_facts where workspace_id = w;
          delete from public.workspaces where id = w;
          delete from auth.users where id = u;
        end $$;
      `);
    }
  }, 90_000);

  it('keeps candidate retrieval and simple reserve-release below the local p95 target', () => {
    const suffix = `${process.pid}${Date.now()}`;

    expect(() =>
      query(`
        do $$
        declare
          owner_id uuid := extensions.gen_random_uuid();
          actor_id uuid := '00000000-0000-4000-8000-000000000001';
          v_workspace_id bigint;
          v_page_id bigint;
          fact_public_id uuid;
          config_version integer;
          config_updated_at timestamptz;
          started_at timestamptz;
          candidate_durations double precision[] := array[]::double precision[];
          reservation_durations double precision[] := array[]::double precision[];
          candidate_p95 double precision;
          reservation_p95 double precision;
          source jsonb := '[{"schema_version":1,"url":"https://example.test/performance","canonical_url":"https://example.test/performance","title":"Performance source","publisher":"Authority","tier":"A","source_type":"official","accessed_at":"2026-10-10T00:00:00Z","published_at":null,"updated_at":null,"as_of":null,"language":"en","supports":"Supports the complete proposition.","independence_group":"performance"}]'::jsonb;
          review jsonb := '{"schema_version":1,"identity_schema_version":1,"reviewed_at":"2026-10-10T00:00:00Z","evaluator":"chatgpt","decisions":[]}'::jsonb;
        begin
          insert into auth.users (instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at)
          values ('00000000-0000-0000-0000-000000000000',owner_id,'authenticated','authenticated','phase4-performance-${suffix}@example.test','x',now(),'{}','{}',now(),now());
          insert into public.workspaces (owner_user_id,name,slug) values (owner_id,'Performance','phase4-performance-${suffix}') returning id into v_workspace_id;
          insert into public.pages (workspace_id,name,slug) values (v_workspace_id,'Performance','phase4-performance-page-${suffix}') returning id into v_page_id;
          insert into public.page_niche_configs (workspace_id,page_id,niche_key,config) values (v_workspace_id,v_page_id,'trivia',internal.default_trivia_config_v1());
          select config_schema_version,updated_at into config_version,config_updated_at from public.page_niche_configs where public.page_niche_configs.page_id = v_page_id and niche_key = 'trivia';
          insert into public.trivia_facts (workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,freshness_class,verified_at,expires_at)
          values (v_workspace_id,'Performance fact has three markers.','ignored',repeat('0',64),'performance_subject','has_count','3','[{"value":"3","unit":null,"role":"count"}]','{"comparison_direction":"none"}','ignored',repeat('1',64),'animals',review,source,'verified','stable',date_trunc('second',now()-interval '1 day'),date_trunc('second',now()+interval '30 days'))
          returning public_id into fact_public_id;
          for i in 1..20 loop
            started_at := clock_timestamp();
            perform * from internal.trivia_find_candidates_v2(v_workspace_id,'animals','Performance fact has three markers.','performance_subject','has_count','3','[{"value":"3","unit":null,"role":"count"}]','{"comparison_direction":"none"}',source,20);
            candidate_durations := array_append(candidate_durations,extract(epoch from clock_timestamp() - started_at) * 1000);
            started_at := clock_timestamp();
            perform * from internal.trivia_reserve_facts_v1(v_workspace_id,v_page_id,actor_id,extensions.gen_random_uuid(),config_version,config_updated_at,'workspace_unique',jsonb_build_array(jsonb_build_object('position',1,'fact_public_id',fact_public_id::text)),repeat('a',64));
            perform internal.trivia_release_facts_v1((select reservation_token from public.trivia_facts where public_id = fact_public_id),actor_id);
            reservation_durations := array_append(reservation_durations,extract(epoch from clock_timestamp() - started_at) * 1000);
          end loop;
          select percentile_cont(0.95) within group (order by duration) into candidate_p95 from unnest(candidate_durations) as sample(duration);
          select percentile_cont(0.95) within group (order by duration) into reservation_p95 from unnest(reservation_durations) as sample(duration);
          if candidate_p95 > 3000 or reservation_p95 > 3000 then
            raise exception 'local p95 exceeded candidate=%ms reservation=%ms',candidate_p95,reservation_p95;
          end if;
          delete from public.trivia_facts where public.trivia_facts.workspace_id = v_workspace_id;
          delete from public.page_niche_configs where public.page_niche_configs.workspace_id = v_workspace_id;
          delete from public.pages where public.pages.workspace_id = v_workspace_id;
          delete from public.workspaces where id = v_workspace_id;
          delete from auth.users where id = owner_id;
        end $$;
      `),
    ).not.toThrow();
  }, 60_000);
});
