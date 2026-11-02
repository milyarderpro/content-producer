-- CR-053/054 P4-T1: one draft, identities, usage, checks and plan completion
-- share one transaction. Legacy creation and its evidence remain unchanged.

create or replace function internal.canonical_request_hash_v1(
  p_operation_name text,p_workspace_public_id uuid,
  p_request_schema_version integer,p_semantic_input jsonb
) returns text language plpgsql immutable strict security invoker set search_path = '' as $$
declare v_canonical jsonb;
begin
  if nullif(pg_catalog.btrim(p_operation_name),'') is null
    or pg_catalog.char_length(p_operation_name)>120
    or not (p_request_schema_version=1
      or (p_request_schema_version=2 and p_operation_name='save_post_v2'))
    or pg_catalog.jsonb_typeof(p_semantic_input)<>'object' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_canonical:=pg_catalog.jsonb_build_object(
    'operation_name',p_operation_name,
    'request_schema_version',p_request_schema_version,
    'semantic_input',p_semantic_input,
    'workspace_public_id',p_workspace_public_id);
  return pg_catalog.encode(extensions.digest(
    pg_catalog.convert_to(v_canonical::text,'UTF8'),'sha256'),'hex');
end;
$$;

create or replace function internal.assert_write_operation_name_v1(p_operation_name text)
returns void language plpgsql immutable strict security invoker set search_path = '' as $$
begin
  if p_operation_name <> all (array[
    'create_page','update_page','create_content_plan','claim_content_plan_items',
    'renew_content_plan_claim','report_content_plan_item_failure',
    'retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan',
    'trivia_register_and_reserve_facts','trivia_release_facts',
    'trivia_reverify_fact','trivia_correct_fact','save_post','save_post_v2',
    'revise_post','reschedule_post','approve_post','revoke_post_approval',
    'discard_post','mark_post_posted','archive_post','record_post_performance'
  ]) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
end;
$$;

create or replace function internal.rate_limit_group_for_write_operation_v1(p_operation_name text)
returns text language sql immutable strict security invoker set search_path = '' as $$
  select case
    when p_operation_name in (
      'claim_content_plan_items','renew_content_plan_claim',
      'report_content_plan_item_failure','trivia_register_and_reserve_facts',
      'trivia_release_facts','trivia_correct_fact','save_post','save_post_v2',
      'revise_post','discard_post','mark_post_posted') then 'contention_write'
    when p_operation_name in (
      'create_page','update_page','create_content_plan','retry_content_plan_item',
      'replace_discarded_plan_item','cancel_content_plan','trivia_reverify_fact',
      'reschedule_post','approve_post','revoke_post_approval','archive_post',
      'record_post_performance') then 'write'
    else null end;
$$;

alter table internal.post_write_history drop constraint post_write_history_operation_name_check;
alter table internal.post_write_history add constraint post_write_history_operation_name_check
  check (operation_name in ('save_post','save_post_v2','revise_post',
    'reschedule_post','approve_post','revoke_post_approval','discard_post',
    'mark_post_posted','archive_post'));
alter table internal.post_write_history drop constraint post_write_history_check;
alter table internal.post_write_history add constraint post_write_history_check check (
  (operation_name in ('save_post','save_post_v2') and prior_revision is null
    and prior_content_hash is null and reason is null and prior_status is null)
  or (operation_name in ('revise_post','reschedule_post') and prior_revision>=1
    and prior_content_hash ~ '^[0-9a-f]{64}$'
    and internal.plan_safe_reason_v1(reason) and prior_status is null)
  or (operation_name in ('approve_post','revoke_post_approval','discard_post',
    'mark_post_posted','archive_post') and prior_revision>=1
    and prior_content_hash ~ '^[0-9a-f]{64}$'
    and prior_status in ('draft','ready','posted')
    and octet_length(response::text)<=65536
    and ((operation_name in ('revoke_post_approval','discard_post','archive_post')
      and internal.plan_safe_reason_v1(reason))
      or (operation_name='approve_post'
        and (reason is null or internal.plan_safe_reason_v1(reason)))
      or (operation_name='mark_post_posted' and reason is null))));
alter table internal.post_write_history
  drop constraint post_history_lifecycle_metadata_not_null;
alter table internal.post_write_history
  add constraint post_history_lifecycle_metadata_not_null check (
    operation_name in ('save_post','save_post_v2','revise_post','reschedule_post')
    or (prior_status is not null and prior_revision is not null
      and prior_content_hash is not null));

create or replace function internal.plan_validate_event_v1()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_operation text;
begin
  if tg_op='UPDATE' then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  select operation_name into v_operation from internal.operation_ledger
    where id=new.operation_id and workspace_id=new.workspace_id
      and actor_user_id=new.actor_user_id and completed_at is null;
  if not (
    (new.event_type='completed' and v_operation in ('save_post','save_post_v2'))
    or v_operation is not distinct from (case new.event_type
      when 'claimed' then 'claim_content_plan_items'
      when 'reclaimed' then 'claim_content_plan_items'
      when 'renewed' then 'renew_content_plan_claim'
      when 'failed' then 'report_content_plan_item_failure'
      when 'retried' then 'retry_content_plan_item'
      when 'replaced' then 'replace_discarded_plan_item'
      when 'cancelled' then 'cancel_content_plan' end)
  ) or not exists (
    select 1 from public.content_plan_items i
    join public.content_plans p on p.id=i.plan_id
    where i.id=new.item_id and i.plan_id=new.plan_id
      and i.workspace_id=new.workspace_id and i.public_id=new.item_public_id
      and p.public_id=new.plan_public_id and i.status=new.after_status
      and i.attempt_count=new.attempt_count
  ) or (new.event_type='replaced' and not exists (
    select 1 from public.posts p where p.public_id=new.discarded_post_public_id
      and p.workspace_id=new.workspace_id and p.content_plan_item_id=new.item_id
      and p.status='discarded' and p.published_at is null
  )) then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  return new;
end;
$$;

create function internal.post_render_v2(p_payload jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare v_input jsonb; v_rendered jsonb; v_empty_caption boolean;
begin
  if internal.has_exact_json_keys(p_payload,array['schema_version','hook','body',
    'cta','canva_copy','caption','hashtags','render_style','text_metrics'])
    is distinct from true or p_payload->'schema_version' is distinct from '2'::jsonb
    or pg_catalog.jsonb_typeof(p_payload->'caption') is distinct from 'string'
    or pg_catalog.char_length(p_payload->>'caption')>500 then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID';
  end if;
  -- The shared deterministic renderer requires nonempty v1 captions. Its
  -- metrics do not use captions; restore an allowed empty v2 caption before
  -- any persisted value or hash is computed.
  v_empty_caption := p_payload->>'caption'='';
  v_input := pg_catalog.jsonb_set(p_payload,'{schema_version}','1'::jsonb);
  if v_empty_caption then
    v_input:=pg_catalog.jsonb_set(v_input,'{caption}','"temporary"'::jsonb);
  end if;
  v_rendered:=internal.post_render_v1(v_input);
  v_rendered:=pg_catalog.jsonb_set(v_rendered,'{schema_version}','2'::jsonb);
  if v_empty_caption then
    v_rendered:=pg_catalog.jsonb_set(v_rendered,'{caption}','""'::jsonb);
  end if;
  return v_rendered;
end;
$$;

create function internal.post_generation_v2(
  c public.page_niche_configs, p public.pages, content jsonb, profile text
) returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object(
    'schema_version',2,'content_schema_version',2,
    'config_schema_version',c.config_schema_version,
    'config_public_id',c.public_id,
    'config_updated_at',internal.iso_timestamp_v1(c.updated_at),
    'fact_count',c.config->'fact_count',
    'fact_count_applied',pg_catalog.jsonb_array_length(content#>'{body,facts}'),
    'text_budget',c.config->'text_budget',
    'fact_reuse_scope',c.config->'fact_reuse_scope',
    'profile_key',profile,'render_style',c.config->'render_style',
    'target_markets',pg_catalog.to_jsonb(p.target_markets),
    'locale',c.config#>>'{style,english_variant}',
    'line_width_chars',34,'target_video_seconds',13);
$$;

create function internal.post_generation_valid_v2(s jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select internal.has_exact_json_keys(s,array['schema_version',
    'content_schema_version','config_schema_version','config_public_id',
    'config_updated_at','fact_count','fact_count_applied','text_budget',
    'fact_reuse_scope','profile_key','render_style','target_markets','locale',
    'line_width_chars','target_video_seconds']) is true
    and s->'schema_version'='2'::jsonb
    and s->'content_schema_version'='2'::jsonb
    and s->'config_schema_version'='1'::jsonb
    and internal.plan_is_uuid_v1(s->'config_public_id') is true
    and s->>'config_updated_at' ~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'
    and pg_catalog.jsonb_typeof(s->'fact_count')='object'
    and internal.is_json_integer_between(s->'fact_count_applied',1,9) is true
    and pg_catalog.jsonb_typeof(s->'text_budget')='object'
    and s->>'fact_reuse_scope' in ('workspace_unique','page_unique')
    and s->>'profile_key' in ('fast_trivia','practical_utility')
    and s->>'render_style' in ('plain_lines','numbered')
    and s->>'locale'='en-US'
    and pg_catalog.jsonb_typeof(s->'target_markets')='array'
    and s->'line_width_chars'='34'::jsonb
    and s->'target_video_seconds'='13'::jsonb;
$$;

create function internal.post_content_valid_v2(content jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select content->'schema_version'='2'::jsonb
    and internal.is_valid_post_payload_v1(
      pg_catalog.jsonb_set(
        pg_catalog.jsonb_set(content,'{schema_version}','1'::jsonb),
        '{caption}',case when content->>'caption'=''
          then '"temporary"'::jsonb else content->'caption' end),1) is true;
$$;

create function internal.post_evidence_valid_v2(checks jsonb, hash text, revision integer,
  editorial boolean) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select internal.has_exact_json_keys(checks,array['schema_version','post_revision',
    'content_hash','overall_status','checks']) is true
    and checks->'schema_version'='2'::jsonb
    and checks->'post_revision'=pg_catalog.to_jsonb(revision)
    and checks->>'content_hash'=hash
    and checks->>'overall_status'='passed'
    and case when editorial then
      internal.has_exact_json_keys(checks->'checks',array['meaning_preserved',
        'caption_no_new_claim','no_known_substantive_issue']) is true
      and checks#>>'{checks,meaning_preserved}'='pass'
      and checks#>>'{checks,caption_no_new_claim}'='pass'
      and checks#>>'{checks,no_known_substantive_issue}'='pass'
    else pg_catalog.jsonb_typeof(checks->'checks')='array'
      and pg_catalog.jsonb_array_length(checks->'checks')>=1 end;
$$;

create or replace function internal.validate_post_row()
returns trigger language plpgsql set search_path = pg_catalog, internal, public as $$
declare v_config jsonb;
begin
  if new.content_schema_version=2 then
    if internal.post_content_valid_v2(new.content_payload) is distinct from true
      or internal.post_generation_valid_v2(new.generation_snapshot) is distinct from true
      or (new.system_checks<>'{}'::jsonb and not (
        internal.post_evidence_valid_v2(new.system_checks,new.content_hash,new.revision,false)
          is true
        or (new.quality_status='failed' and new.status='draft'
          and new.editorial_checks='{}'::jsonb
          and new.system_checks->>'overall_status'='failed'
          and internal.is_valid_system_checks_v1(new.system_checks,new.content_hash,new.revision)
            is true)))
      or (new.editorial_checks<>'{}'::jsonb and
        internal.post_evidence_valid_v2(new.editorial_checks,new.content_hash,new.revision,true)
          is distinct from true)
      or (new.status not in ('draft','discarded') and
        (new.system_checks='{}'::jsonb or new.editorial_checks='{}'::jsonb)) then
      raise exception using errcode='23514',message='POST_SNAPSHOT_INVALID';
    end if;
  else
    if not internal.is_valid_post_payload_v1(new.content_payload,new.content_schema_version)
      or not internal.is_valid_generation_snapshot_v1(new.generation_snapshot) then
      raise exception using errcode='23514',message='POST_SNAPSHOT_INVALID';
    end if;
    if new.system_checks='{}'::jsonb then
      if new.status not in ('draft','discarded') then
        raise exception using errcode='23514',message='SYSTEM_EVIDENCE_REQUIRED'; end if;
    -- Preserve the archived-post revision binding from the existing Phase 5.7 guard.
    elsif not internal.is_valid_system_checks_v1(new.system_checks,new.content_hash,
      case when new.status='archived' and new.generation_snapshot ? 'schema_version'
        then new.revision-1 else new.revision end) then
      raise exception using errcode='23514',message='SYSTEM_EVIDENCE_INVALID';
    end if;
    if new.editorial_checks='{}'::jsonb then
      if new.status not in ('draft','discarded') then
        raise exception using errcode='23514',message='EDITORIAL_EVIDENCE_REQUIRED'; end if;
    elsif not internal.is_valid_editorial_checks_v1(new.editorial_checks,new.content_hash,
      case when new.status='archived' and new.generation_snapshot ? 'schema_version'
        then new.revision-1 else new.revision end) then
      raise exception using errcode='23514',message='EDITORIAL_EVIDENCE_INVALID';
    end if;
  end if;
  select config into v_config from public.page_niche_configs where
    workspace_id=new.workspace_id and page_id=new.page_id and niche_key=new.niche_key;
  if not (v_config->'allowed_formats' ? new.format_key)
    or not (v_config->'allowed_topics' ? new.topic_key)
    or not (v_config->'allowed_interaction_goals' ? new.interaction_goal) then
    raise exception using errcode='23514',message='POST_CONFIG_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

create function internal.post_hash_v2(p public.posts) returns text
language sql stable security invoker set search_path = '' as $$
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    'content-producer:post:v2|'||pg_catalog.jsonb_build_object(
      'page_public_id',(select public_id from public.pages where id=p.page_id),
      'content_schema_version',p.content_schema_version,
      'format_key',p.format_key,'topic_key',p.topic_key,
      'interaction_goal',p.interaction_goal,'content_payload',p.content_payload,
      'generation_snapshot',p.generation_snapshot,
      'fact_bindings',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
        'fact_public_id',f.public_id,'position',j.position,'rendered_text',j.rendered_text,
        'usage_snapshot',j.source_snapshot) order by j.position)
        from public.trivia_post_facts j join public.trivia_facts f
          on f.id=j.fact_id and f.workspace_id=j.workspace_id
        where j.post_id=p.id and j.is_current))::text,'UTF8'),'sha256'),'hex');
$$;

create function internal.post_response_valid_v2(r jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
  select internal.has_exact_json_keys(r,array['response_schema_version','data']) is true
    and r->'response_schema_version'='2'::jsonb
    and internal.has_exact_json_keys(r->'data',array['post','plan','replayed']) is true
    and internal.has_exact_json_keys(r#>'{data,post}',array[
      'post_public_id','page_public_id','content_schema_version','status',
      'revision','content_hash']) is true
    and internal.plan_is_uuid_v1(r#>'{data,post,post_public_id}') is true
    and internal.plan_is_uuid_v1(r#>'{data,post,page_public_id}') is true
    and r#>'{data,post,content_schema_version}'='2'::jsonb
    and r#>>'{data,post,status}'='draft'
    and r#>'{data,post,revision}'='1'::jsonb
    and r#>>'{data,post,content_hash}' ~ '^[0-9a-f]{64}$'
    and r#>'{data,replayed}'='false'::jsonb
    and (r#>'{data,plan}'='null'::jsonb or
      (internal.has_exact_json_keys(r#>'{data,plan}',array[
        'plan_public_id','requested_count','status','progress']) is true
       and internal.plan_is_uuid_v1(r#>'{data,plan,plan_public_id}') is true))
    and pg_catalog.octet_length(r::text)<=65536
    and r::text !~ '"(claim_token|reservation_token|access_token|refresh_token|operation_key|workspace_id|actor_user_id)"[[:space:]]*:';
$$;

create function internal.post_complete_v2(op bigint,p public.posts,r jsonb)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare ctx record; history uuid; snapshot jsonb;
begin
  select * into ctx from internal.assert_request_context_v1();
  if internal.post_response_valid_v2(r) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  insert into internal.post_write_history(workspace_id,page_id,post_id,
    operation_id,actor_user_id,oauth_client_id,operation_name,before_evidence,response)
  values(p.workspace_id,p.page_id,p.id,op,ctx.actor_user_id,ctx.oauth_client_id,
    'save_post_v2','{}'::jsonb,r) returning public_id into history;
  snapshot:=pg_catalog.jsonb_build_object('schema_version',6,
    'operation_name','save_post_v2','target_public_id',p.public_id,
    'history_public_id',history,'response_hash',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex'));
  update internal.operation_ledger set response_snapshot=snapshot,target_type='post',
    target_public_id=p.public_id,completed_at=pg_catalog.clock_timestamp()
    where id=op and workspace_id=p.workspace_id and actor_user_id=ctx.actor_user_id
      and operation_name='save_post_v2' and completed_at is null;
  if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end;
$$;

create function internal.post_history_validate_v2(h internal.post_write_history)
returns void language plpgsql stable security invoker set search_path = '' as $$
declare p public.posts; l internal.operation_ledger;
begin
  select * into p from public.posts where id=h.post_id and workspace_id=h.workspace_id
    and page_id=h.page_id;
  select * into l from internal.operation_ledger where id=h.operation_id
    and workspace_id=h.workspace_id;
  if p.id is null or p.content_schema_version<>2 or p.status<>'draft'
    or p.revision<>1 or p.public_id::text is distinct from
      h.response#>>'{data,post,post_public_id}'
    or p.content_hash is distinct from h.response#>>'{data,post,content_hash}'
    or l.id is null or l.actor_user_id<>h.actor_user_id
    or l.operation_name<>'save_post_v2' or l.completed_at is not null
    or h.prior_revision is not null or h.prior_content_hash is not null
    or h.prior_status is not null or h.before_evidence<>'{}'::jsonb
    or internal.post_response_valid_v2(h.response) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end;
$$;

do $$ declare src text; anchor text :=
  'if new.operation_name in (''approve_post'',''revoke_post_approval'',''discard_post'',''mark_post_posted'',''archive_post'') then';
begin
  src:=pg_catalog.pg_get_functiondef('internal.post_history_validate_v1()'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then
    raise exception 'Missing post-history version dispatch anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'if new.operation_name=''save_post_v2'' then '
      ||'perform internal.post_history_validate_v2(new); return new; end if; '
      ||anchor);
end $$;

create function internal.post_replay_v2(op bigint) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare l internal.operation_ledger; h internal.post_write_history; s jsonb;
begin
  select * into l from internal.operation_ledger where id=op
    and operation_name='save_post_v2'
    and actor_user_id=internal.request_actor_user_id_v1();
  s:=l.response_snapshot;
  if l.completed_at is null or internal.has_exact_json_keys(s,array[
    'schema_version','operation_name','target_public_id','history_public_id',
    'response_hash']) is distinct from true
    or s->'schema_version' is distinct from '6'::jsonb
    or s->>'operation_name'<>'save_post_v2' then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  select * into h from internal.post_write_history where operation_id=l.id
    and workspace_id=l.workspace_id and actor_user_id=l.actor_user_id
    and public_id=(s->>'history_public_id')::uuid
    and operation_name='save_post_v2';
  if h.id is null or l.target_public_id::text is distinct from s->>'target_public_id'
    or not exists(select 1 from public.posts p where p.id=h.post_id
      and p.workspace_id=l.workspace_id and p.public_id=l.target_public_id)
    or s->>'response_hash' is distinct from pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(h.response::text,'UTF8'),'sha256'),'hex')
    or internal.post_response_valid_v2(h.response) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  return pg_catalog.jsonb_set(h.response,'{data,replayed}','true'::jsonb);
end;
$$;

create function internal.post_fact_review_v2(
  p_workspace bigint, p_fact jsonb, p_position integer
) returns bigint language plpgsql stable security invoker set search_path = '' as $$
declare d jsonb:=p_fact->'dedup'; rev jsonb; f public.trivia_facts;
  normal text; candidate record; seen uuid[]:='{}'; same_count integer:=0;
  expected_count integer:=0; matched_id bigint;
begin
  if internal.has_exact_json_keys(p_fact,array['position','candidate_key',
    'claim_text','source_url','dedup']) is distinct from true
    or p_fact->'position' is distinct from pg_catalog.to_jsonb(p_position)
    or p_fact->>'candidate_key' !~ '^[A-Za-z0-9_-]{1,64}$'
    or pg_catalog.jsonb_typeof(p_fact->'claim_text') is distinct from 'string'
    or pg_catalog.char_length(p_fact->>'claim_text') not between 1 and 500
    or p_fact->>'claim_text'<>pg_catalog.btrim(p_fact->>'claim_text')
    or internal.trivia_web_source_url_v2(p_fact->>'source_url') is distinct from true
    or internal.has_exact_json_keys(d,array['complete','decision',
      'fact_public_id','reviews']) is distinct from true
    or d->'complete' is distinct from 'true'::jsonb
    or d->>'decision' not in ('same','distinct')
    or pg_catalog.jsonb_typeof(d->'reviews') is distinct from 'array'
    or pg_catalog.jsonb_array_length(d->'reviews')>20 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED',
      detail='facts['||p_position||']'; end if;
  if (d->>'decision'='same' and
      internal.plan_is_uuid_v1(d->'fact_public_id') is distinct from true)
    or (d->>'decision'='distinct' and d->'fact_public_id' is distinct from 'null'::jsonb)
    then raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
      detail='facts['||p_position||'].dedup'; end if;
  normal:=internal.trivia_normalize_claim_v1(p_fact->>'claim_text');
  for rev in select value from pg_catalog.jsonb_array_elements(d->'reviews') loop
    if (internal.has_exact_json_keys(rev,array['fact_public_id','decision'])
      or internal.has_exact_json_keys(rev,array['fact_public_id','decision','reason']))
      is distinct from true or internal.plan_is_uuid_v1(rev->'fact_public_id')
      is distinct from true or rev->>'decision' not in ('same','distinct')
      or (rev ? 'reason' and (pg_catalog.jsonb_typeof(rev->'reason')<>'string'
        or pg_catalog.char_length(rev->>'reason') not between 1 and 300))
      then raise exception using errcode='P0001',message='VALIDATION_FAILED',
        detail='facts['||p_position||'].dedup.reviews'; end if;
    if (rev->>'fact_public_id')::uuid=any(seen) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||p_position||'].dedup.reviews'; end if;
    seen:=pg_catalog.array_append(seen,(rev->>'fact_public_id')::uuid);
    if rev->>'decision'='same' then
      same_count:=same_count+1;
      if rev->'fact_public_id' is distinct from d->'fact_public_id' then
        raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
          detail='facts['||p_position||'].dedup'; end if;
    end if;
  end loop;
  if (d->>'decision'='same' and same_count<>1)
    or (d->>'decision'='distinct' and same_count<>0) then
    raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
      detail='facts['||p_position||'].dedup'; end if;
  for candidate in select public_id,normalized_claim from public.trivia_facts
    where workspace_id=p_workspace and (normalized_claim=normal
      or pg_catalog.ts_rank_cd(search_vector,
        pg_catalog.plainto_tsquery('simple',normal))>0
      or extensions.similarity(normalized_claim,normal)>=0.20) loop
    expected_count:=expected_count+1;
    if expected_count>20 or not candidate.public_id=any(seen) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||p_position||'].dedup'; end if;
    if candidate.normalized_claim=normal
      and (d->>'decision'='distinct'
        or candidate.public_id is distinct from (d->>'fact_public_id')::uuid) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||p_position||'].dedup'; end if;
  end loop;
  if pg_catalog.cardinality(seen)<>expected_count then
    raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
      detail='facts['||p_position||'].dedup'; end if;
  if d->>'decision'='same' then
    select * into f from public.trivia_facts where workspace_id=p_workspace
      and public_id=(d->>'fact_public_id')::uuid;
    if f.id is null or f.verification_status in ('rejected','invalidated','superseded')
      or (f.reservation_status='reserved'
        and f.reserved_until>pg_catalog.clock_timestamp())
      or exists(select 1 from public.trivia_facts successor
        where successor.workspace_id=p_workspace and successor.supersedes_fact_id=f.id
          and successor.verification_status in ('needs_review','verified')) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||p_position||']'; end if;
    matched_id:=f.id;
  end if;
  return matched_id;
end;
$$;

create function api.save_post_v2(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_operation_key uuid,
  p_page_public_id uuid,
  p_niche_key text,
  p_config_public_id uuid,
  p_expected_config_updated_at text,
  p_expected_catalog_version text,
  p_content_schema_version integer,
  p_format_key text,
  p_topic_key text,
  p_interaction_goal text,
  p_scheduled_at timestamptz,
  p_plan_item jsonb,
  p_facts jsonb,
  p_content_payload jsonb,
  p_editorial_checks jsonb
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare o record; c public.page_niche_configs; page public.pages;
  plan public.content_plans; item public.content_plan_items; post public.posts;
  fact public.trivia_facts; entry jsonb; content jsonb; snapshot jsonb;
  result jsonb; summary jsonb:='null'::jsonb; budget jsonb; metrics jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; editorial jsonb; systems jsonb;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_niche_key is distinct from 'trivia'
    or p_workspace_public_id is null or p_page_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or (p_scheduled_at is not null and not pg_catalog.isfinite(p_scheduled_at))
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 9
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED';
  end if;
  if p_plan_item is not null and p_plan_item<>'null'::jsonb and (
    internal.has_exact_json_keys(p_plan_item,array['plan_item_public_id','claim_token'])
      is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'plan_item_public_id') is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'claim_token') is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  content:=internal.post_render_v2(p_content_payload);
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;

  -- Claim first: a completed operation replays before any mutable config,
  -- catalog or claim/lease check. The semantic payload is never normalized by
  -- a JavaScript date conversion or changed on a retry.
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'save_post_v2',2,
    pg_catalog.jsonb_build_object('page_public_id',p_page_public_id,
      'niche_key',p_niche_key,'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'scheduled_at',internal.iso_timestamp_v1(p_scheduled_at),
      'plan_item',coalesce(p_plan_item,'null'::jsonb),
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks));
  if o.claim_state='replay' then return internal.post_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  c:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id);
  select * into page from public.pages where workspace_id=o.workspace_id and id=c.page_id;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  if internal.is_valid_trivia_config_v1(c.config) is distinct from true then
    raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if p_format_key is null or not(c.config->'allowed_formats' ? p_format_key) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if p_topic_key is null or not(c.config->'allowed_topics' ? p_topic_key) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if p_interaction_goal is null
    or not(c.config->'allowed_interaction_goals' ? p_interaction_goal) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if content->>'render_style' is distinct from c.config->>'render_style' then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  if not (case c.config#>>'{fact_count,mode}'
      when 'fixed' then count_facts=(c.config#>>'{fact_count,value}')::integer
      else count_facts between (c.config#>>'{fact_count,min}')::integer
        and (c.config#>>'{fact_count,max}')::integer end) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID',
      detail='facts'; end if;
  budget:=c.config->'text_budget'; metrics:=content->'text_metrics';
  if (metrics->>'hook_chars')::integer>(budget->>'hook_max_chars')::integer
    or (metrics->>'cta_chars')::integer>(budget->>'cta_max_chars')::integer
    or (metrics->>'facts_total_chars')::integer>(budget->>'facts_total_max_chars')::integer
    or (metrics->>'canva_total_chars')::integer>(budget->>'canva_total_max_chars')::integer
    or exists(select 1 from pg_catalog.jsonb_array_elements(metrics->'fact_chars') x
      where (x.value#>>'{}')::integer>(budget->>'fact_max_chars')::integer)
    or pg_catalog.char_length(content->>'caption')>
      (c.config#>>'{caption,max_chars}')::integer
    or pg_catalog.jsonb_array_length(content->'hashtags') not between
      (c.config#>>'{hashtags,min_count}')::integer and
      (c.config#>>'{hashtags,max_count}')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;

  perform internal.post_lock_slots_v1(page.id,null,p_scheduled_at);
  if p_plan_item is not null and p_plan_item<>'null'::jsonb then
    select * into item from public.content_plan_items where workspace_id=o.workspace_id
      and public_id=(p_plan_item->>'plan_item_public_id')::uuid
      and page_id=page.id and niche_key='trivia';
    if item.id is null then
      raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
    select * into plan from public.content_plans where id=item.plan_id
      and workspace_id=o.workspace_id for update;
    select * into item from public.content_plan_items where id=item.id
      and workspace_id=o.workspace_id for update;
    if plan.status='cancelled' then
      raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
    perform internal.plan_assert_current_claim_v1(item,
      (p_plan_item->>'claim_token')::uuid);
    if item.scheduled_at is distinct from p_scheduled_at
      or (item.format_key is not null and item.format_key<>p_format_key)
      or (item.topic_key is not null and item.topic_key<>p_topic_key)
      or (item.interaction_goal is not null
        and item.interaction_goal<>p_interaction_goal) then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    if plan.plan_config ? 'context_snapshot' and
      (plan.plan_config#>>'{context_snapshot,niche_config,updated_at}')::timestamptz
        <>c.updated_at then
      raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  end if;
  perform internal.assert_page_schedule_available(page.id,p_scheduled_at,item.id,null);

  -- Validate every final fact against the same locked catalog before the
  -- first identity is inserted; newly inserted facts need no invented reviews.
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    if entry->>'candidate_key'=any(seen_keys)
      or internal.trivia_normalize_claim_v1(entry->>'claim_text')=any(seen_normal)
      or content#>>array['body','facts',(i-1)::text,'text'] is null then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    seen_keys:=pg_catalog.array_append(seen_keys,entry->>'candidate_key');
    seen_normal:=pg_catalog.array_append(seen_normal,
      internal.trivia_normalize_claim_v1(entry->>'claim_text'));
    selected:=internal.post_fact_review_v2(o.workspace_id,entry,i);
    if selected is not null and selected=any(resolved) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    resolved:=pg_catalog.array_append(resolved,selected);
  end loop;

  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  insert into public.posts(workspace_id,page_id,niche_key,content_plan_item_id,
    created_by_operation_id,format_key,topic_key,interaction_goal,
    content_schema_version,content_payload,generation_snapshot,content_hash,scheduled_at)
  values(o.workspace_id,page.id,'trivia',item.id,o.operation_id,p_format_key,
    p_topic_key,p_interaction_goal,2,content,snapshot,pg_catalog.repeat('0',64),
    p_scheduled_at) returning * into post;
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    selected:=resolved[i];
    if selected is null then
      insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
        claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
        qualifiers,ontology_version,structured_key,structured_hash,topic_key,
        dedup_review_snapshot,source_data,freshness_class,risk_class)
      values(o.workspace_id,entry->>'claim_text','',pg_catalog.repeat('0',64),
        false,null,null,null,null,null,null,null,null,null,null,null,null,null)
      returning * into fact;
    else
      select * into fact from public.trivia_facts where workspace_id=o.workspace_id
        and id=selected for update;
    end if;
    if fact.id is null or fact.verification_status in
      ('invalidated','superseded','rejected')
      or (fact.reservation_status='reserved'
        and fact.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||i||']'; end if;
    if exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=o.workspace_id and u.fact_id=fact.id
        and u.is_current and u.allocation_state in ('allocated','published')
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=page.id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,page.id,post.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;
  post.content_hash:=internal.post_hash_v2(post);
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',p_editorial_checks);
  update public.posts set content_hash=post.content_hash,system_checks=systems,
    editorial_checks=editorial,quality_status='passed'
    where id=post.id returning * into post;
  if item.id is not null then
    update public.content_plan_items set status='completed',
      completed_at=pg_catalog.clock_timestamp(),claim_token=null,
      claimed_at=null,claim_expires_at=null,claim_renewal_count=0,
      last_error_code=null,last_error_detail=null
      where id=item.id returning * into item;
    perform internal.plan_append_event_v1(o.operation_id,item,plan.public_id,
      'completed','in_progress');
    perform internal.plan_refresh_status_v1(plan.id);
    summary:=internal.plan_project_summary_v1(plan.id);
    summary:=pg_catalog.jsonb_build_object('plan_public_id',summary->'plan_public_id',
      'requested_count',summary->'requested_count','status',summary->'status',
      'progress',summary->'progress');
  end if;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',post.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',post.revision,
      'content_hash',post.content_hash),'plan',summary,'replayed',false));
  perform internal.post_complete_v2(o.operation_id,post,result);
  return result;
exception when query_canceled then
  perform internal.post_raise_v1('57014','');
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  if v_message=any(array['FACT_CATALOG_CONFLICT','PAGE_VERSION_CONFLICT',
    'FACT_REVIEW_REQUIRED','EDITORIAL_REVIEW_REQUIRED','CONTENT_BUDGET_EXCEEDED'])
    then raise; end if;
  perform internal.post_raise_v1(v_state,v_message);
end;
$$;

grant create on schema api to content_producer_api_owner;
alter function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,integer,
  text,text,text,timestamptz,jsonb,jsonb,jsonb,jsonb)
  owner to content_producer_api_owner;
revoke create on schema api from content_producer_api_owner;
revoke all on function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,text,
  integer,text,text,text,timestamptz,jsonb,jsonb,jsonb,jsonb)
  from public,anon,authenticated,service_role;
grant execute on function api.save_post_v2(integer,uuid,uuid,uuid,text,uuid,text,
  text,integer,text,text,text,timestamptz,jsonb,jsonb,jsonb,jsonb)
  to authenticated;

revoke all on function internal.post_render_v2(jsonb),
  internal.post_generation_v2(public.page_niche_configs,public.pages,jsonb,text),
  internal.post_generation_valid_v2(jsonb),internal.post_content_valid_v2(jsonb),
  internal.post_evidence_valid_v2(jsonb,text,integer,boolean),
  internal.post_hash_v2(public.posts),internal.post_response_valid_v2(jsonb),
  internal.post_complete_v2(bigint,public.posts,jsonb),
  internal.post_replay_v2(bigint),internal.post_fact_review_v2(bigint,jsonb,integer),
  internal.post_history_validate_v2(internal.post_write_history)
  from public,anon,authenticated,service_role;
grant execute on function internal.post_render_v2(jsonb),
  internal.post_generation_v2(public.page_niche_configs,public.pages,jsonb,text),
  internal.post_generation_valid_v2(jsonb),internal.post_content_valid_v2(jsonb),
  internal.post_evidence_valid_v2(jsonb,text,integer,boolean),
  internal.post_hash_v2(public.posts),internal.post_response_valid_v2(jsonb),
  internal.post_complete_v2(bigint,public.posts,jsonb),
  internal.post_replay_v2(bigint),internal.post_fact_review_v2(bigint,jsonb,integer),
  internal.post_history_validate_v2(internal.post_write_history),
  internal.trivia_web_source_url_v2(text)
  to content_producer_api_owner;
