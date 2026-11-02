-- CR-053 P4-T3: revise v2, version-aware readback, and discard of unpublished v2.
-- Existing v1 rows, snapshots, replay, and maintenance keep their contracts.

create or replace function internal.canonical_request_hash_v1(
  p_operation_name text,p_workspace_public_id uuid,
  p_request_schema_version integer,p_semantic_input jsonb
) returns text language plpgsql immutable strict security invoker set search_path = '' as $$
declare v_canonical jsonb;
begin
  if nullif(pg_catalog.btrim(p_operation_name),'') is null
    or pg_catalog.char_length(p_operation_name)>120
    or not (p_request_schema_version=1
      or (p_request_schema_version=2 and p_operation_name in
        ('save_post_v2','revise_post_v2')))
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
    'revise_post','revise_post_v2','reschedule_post','approve_post',
    'revoke_post_approval','discard_post','mark_post_posted','archive_post',
    'record_post_performance'
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
      'revise_post','revise_post_v2','discard_post','mark_post_posted')
      then 'contention_write'
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
    'revise_post_v2','reschedule_post','approve_post','revoke_post_approval',
    'discard_post','mark_post_posted','archive_post'));
alter table internal.post_write_history drop constraint post_write_history_check;
alter table internal.post_write_history add constraint post_write_history_check check (
  (operation_name in ('save_post','save_post_v2') and prior_revision is null
    and prior_content_hash is null and reason is null and prior_status is null)
  or (operation_name in ('revise_post','revise_post_v2','reschedule_post')
    and prior_revision>=1 and prior_content_hash ~ '^[0-9a-f]{64}$'
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
    operation_name in ('save_post','save_post_v2','revise_post',
      'revise_post_v2','reschedule_post')
    or (prior_status is not null and prior_revision is not null
      and prior_content_hash is not null));

create function internal.post_revise_response_valid_v2(r jsonb)
returns boolean language sql immutable security invoker set search_path = '' as $$
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
    and internal.is_json_integer_between(r#>'{data,post,revision}',2,2147483647) is true
    and r#>>'{data,post,content_hash}' ~ '^[0-9a-f]{64}$'
    and r#>'{data,plan}'='null'::jsonb
    and r#>'{data,replayed}'='false'::jsonb
    and pg_catalog.octet_length(r::text)<=65536
    and r::text !~ '"(claim_token|reservation_token|access_token|refresh_token|operation_key|workspace_id|actor_user_id)"[[:space:]]*:';
$$;

create function internal.post_revise_history_validate_v2(h internal.post_write_history)
returns void language plpgsql stable security invoker set search_path = '' as $$
declare p public.posts; l internal.operation_ledger;
begin
  select * into p from public.posts where id=h.post_id and workspace_id=h.workspace_id
    and page_id=h.page_id;
  select * into l from internal.operation_ledger where id=h.operation_id
    and workspace_id=h.workspace_id;
  if p.id is null or p.content_schema_version<>2 or p.status<>'draft'
    or h.prior_revision+1<>p.revision
    or h.prior_content_hash !~ '^[0-9a-f]{64}$'
    or h.prior_schedule is distinct from p.scheduled_at
    or h.prior_status is not null
    or internal.has_exact_json_keys(h.before_evidence,array[
      'status','system_checks','editorial_checks','approval_snapshot']) is distinct from true
    or h.before_evidence->>'status' not in ('draft','ready')
    or p.public_id::text is distinct from h.response#>>'{data,post,post_public_id}'
    or p.content_hash is distinct from h.response#>>'{data,post,content_hash}'
    or p.revision is distinct from (h.response#>>'{data,post,revision}')::integer
    or l.id is null or l.actor_user_id<>h.actor_user_id
    or l.operation_name<>'revise_post_v2' or l.completed_at is not null
    or internal.post_revise_response_valid_v2(h.response) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end;
$$;

do $$ declare src text; anchor text:='if new.operation_name=''save_post_v2'' then';
begin
  src:=pg_catalog.pg_get_functiondef('internal.post_history_validate_v1()'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then
    raise exception 'Missing v2 history dispatch anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'if new.operation_name=''revise_post_v2'' then '
      ||'perform internal.post_revise_history_validate_v2(new); return new; end if; '
      ||anchor);
end $$;

create function internal.post_revise_complete_v2(
  op bigint,p public.posts,r jsonb,old public.posts,reason text
) returns void language plpgsql volatile security invoker set search_path = '' as $$
declare ctx record; history uuid; snapshot jsonb;
begin
  select * into ctx from internal.assert_request_context_v1();
  if internal.post_revise_response_valid_v2(r) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  insert into internal.post_write_history(workspace_id,page_id,post_id,
    operation_id,actor_user_id,oauth_client_id,operation_name,prior_revision,
    prior_content_hash,prior_schedule,before_evidence,reason,response)
  values(p.workspace_id,p.page_id,p.id,op,ctx.actor_user_id,ctx.oauth_client_id,
    'revise_post_v2',old.revision,old.content_hash,old.scheduled_at,
    pg_catalog.jsonb_build_object('status',old.status,
      'system_checks',old.system_checks,'editorial_checks',old.editorial_checks,
      'approval_snapshot',old.approval_snapshot),reason,r)
    returning public_id into history;
  snapshot:=pg_catalog.jsonb_build_object('schema_version',6,
    'operation_name','revise_post_v2','target_public_id',p.public_id,
    'history_public_id',history,'response_hash',
    pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex'));
  update internal.operation_ledger set response_snapshot=snapshot,target_type='post',
    target_public_id=p.public_id,completed_at=pg_catalog.clock_timestamp()
    where id=op and workspace_id=p.workspace_id and actor_user_id=ctx.actor_user_id
      and operation_name='revise_post_v2' and completed_at is null;
  if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end;
$$;

create function internal.post_revise_replay_v2(op bigint) returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare l internal.operation_ledger; h internal.post_write_history; s jsonb;
begin
  select * into l from internal.operation_ledger where id=op
    and operation_name='revise_post_v2'
    and actor_user_id=internal.request_actor_user_id_v1();
  s:=l.response_snapshot;
  if l.completed_at is null or internal.has_exact_json_keys(s,array[
    'schema_version','operation_name','target_public_id','history_public_id',
    'response_hash']) is distinct from true
    or s->'schema_version' is distinct from '6'::jsonb
    or s->>'operation_name'<>'revise_post_v2' then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  select * into h from internal.post_write_history where operation_id=l.id
    and workspace_id=l.workspace_id and actor_user_id=l.actor_user_id
    and public_id=(s->>'history_public_id')::uuid
    and operation_name='revise_post_v2';
  if h.id is null or l.target_public_id::text is distinct from
      s->>'target_public_id'
    or not exists(select 1 from public.posts p where p.id=h.post_id
      and p.workspace_id=l.workspace_id and p.public_id=l.target_public_id)
    or s->>'response_hash' is distinct from pg_catalog.encode(
      extensions.digest(pg_catalog.convert_to(h.response::text,'UTF8'),'sha256'),'hex')
    or internal.post_revise_response_valid_v2(h.response) is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  return pg_catalog.jsonb_set(h.response,'{data,replayed}','true'::jsonb);
end;
$$;

create function internal.post_assert_edit_v2(
  c public.page_niche_configs,content jsonb,count_facts integer,
  format_key text,topic_key text,interaction_goal text
) returns void language plpgsql stable security invoker set search_path = '' as $$
declare budget jsonb; metrics jsonb;
begin
  if internal.is_valid_trivia_config_v1(c.config) is distinct from true then
    raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if format_key is null or not(c.config->'allowed_formats' ? format_key) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if topic_key is null or not(c.config->'allowed_topics' ? topic_key) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if interaction_goal is null or
    not(c.config->'allowed_interaction_goals' ? interaction_goal) then
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
end;
$$;

create function api.revise_post_v2(
  p_request_schema_version integer,p_workspace_public_id uuid,
  p_operation_key uuid,p_post_public_id uuid,p_expected_revision integer,
  p_expected_content_hash text,p_config_public_id uuid,
  p_expected_config_updated_at text,p_expected_catalog_version text,
  p_content_schema_version integer,p_format_key text,p_topic_key text,
  p_interaction_goal text,p_facts jsonb,p_content_payload jsonb,
  p_editorial_checks jsonb,p_revision_reason text
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare o record; p public.posts; old public.posts; c public.page_niche_configs;
  page public.pages; fact public.trivia_facts; entry jsonb; content jsonb;
  snapshot jsonb; result jsonb; editorial jsonb; systems jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_workspace_public_id is null or p_post_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_revision is null or p_expected_revision<1
    or p_expected_content_hash !~ '^[0-9a-f]{64}$'
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 9
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_revision_reason))
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  content:=internal.post_render_v2(p_content_payload);
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'revise_post_v2',2,
    pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,
      'expected_revision',p_expected_revision,
      'expected_content_hash',p_expected_content_hash,
      'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks,
      'revision_reason',pg_catalog.btrim(p_revision_reason)));
  if o.claim_state='replay' then
    return internal.post_revise_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id);
  old:=p;
  if p.content_schema_version<>2 then
    raise exception using errcode='P0001',message='CONTENT_SCHEMA_UNSUPPORTED'; end if;
  if p.revision<>p_expected_revision then
    raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
  if p.content_hash<>p_expected_content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.status not in ('draft','ready') then
    raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
  select * into c from public.page_niche_configs where page_id=p.page_id
    and workspace_id=o.workspace_id and niche_key='trivia';
  select * into page from public.pages where id=p.page_id
    and workspace_id=o.workspace_id;
  if not page.is_active or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  perform internal.post_assert_edit_v2(c,content,count_facts,p_format_key,
    p_topic_key,p_interaction_goal);

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

  -- Every previous usage row remains immutable. Retained identities receive
  -- successor bindings too, so a draft-local URL update never edits history.
  update public.trivia_post_facts set allocation_state='released',
    released_at=pg_catalog.clock_timestamp(),is_current=false
    where workspace_id=o.workspace_id and post_id=p.id and is_current
      and allocation_state='allocated';
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1; selected:=resolved[i];
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
        and u.post_id<>p.id
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,p.page_id,p.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;

  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  p.content_payload:=content; p.generation_snapshot:=snapshot;
  p.format_key:=p_format_key; p.topic_key:=p_topic_key;
  p.interaction_goal:=p_interaction_goal;
  p.content_hash:=internal.post_hash_v2(p);
  p.revision:=p.revision+1;
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',p_editorial_checks);
  update public.posts set status='draft',revision=p.revision,
    format_key=p_format_key,topic_key=p_topic_key,interaction_goal=p_interaction_goal,
    content_payload=content,generation_snapshot=snapshot,content_hash=p.content_hash,
    system_checks=systems,editorial_checks=editorial,quality_status='passed',
    ready_at=null,approval_snapshot=null
    where id=p.id returning * into p;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',p.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',p.revision,
      'content_hash',p.content_hash),'plan','null'::jsonb,'replayed',false));
  perform internal.post_revise_complete_v2(o.operation_id,p,result,old,
    pg_catalog.btrim(p_revision_reason));
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

-- Keep the v1 projection untouched for old rows. The v2 branch returns the
-- complete current content and the immutable source snapshot for each usage.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef(
    'api.get_post(integer,uuid,uuid,boolean,boolean,boolean)'::regprocedure);
  anchor:='v_content_payload := jsonb_build_object(';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post content anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'v_content_payload := jsonb_build_object(');
  anchor:='v_approval := case when v_post.approval_snapshot is null';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post approval anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'if v_post.content_schema_version=2 then v_content_payload:=v_post.content_payload; end if; '
    ||anchor);
  anchor:='internal.project_fact_source_snapshot_v1(usage.source_snapshot)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post source anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'case when v_post.content_schema_version=2 then usage.source_snapshot '
    ||'else internal.project_fact_source_snapshot_v1(usage.source_snapshot) end');
  anchor:='and ('||E'\n      fact.verification_status <> ''verified'''
    ||E'\n      or fact.expires_at is null'
    ||E'\n      or fact.expires_at <= clock_timestamp()'
    ||E'\n    );';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post warning anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'and (case when v_post.content_schema_version=2 then '
    ||'fact.verification_status in (''invalidated'',''superseded'',''rejected'') '
    ||'else (fact.verification_status <> ''verified'' '
    ||'or fact.expires_at is null or fact.expires_at <= clock_timestamp()) end);');
  anchor:='internal.project_check_snapshot_v1(v_post.system_checks, p_include_checks)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post system anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'case when v_post.content_schema_version=2 then '
    ||'case when p_include_checks then v_post.system_checks else null end '
    ||'else internal.project_check_snapshot_v1(v_post.system_checks, p_include_checks) end');
  anchor:='internal.project_check_snapshot_v1(v_post.editorial_checks, p_include_checks)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post editorial anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'case when v_post.content_schema_version=2 then '
    ||'case when p_include_checks then v_post.editorial_checks else null end '
    ||'else internal.project_check_snapshot_v1(v_post.editorial_checks, p_include_checks) end');
  anchor:='''updated_at'', internal.iso_timestamp_v1(v_post.updated_at)'||E'\n      )';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'get_post version anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    '''updated_at'', internal.iso_timestamp_v1(v_post.updated_at)'||E'\n      )'
    ||' || case when v_post.content_schema_version=2 then '
    ||'jsonb_build_object(''content_schema_version'',2) else ''{}''::jsonb end');
  execute src;

  src:=pg_catalog.pg_get_functiondef(
    'api.list_posts(integer,uuid,uuid,text,text[],text,text,timestamptz,timestamptz,timestamptz,timestamptz,text,integer,text)'::regprocedure);
  anchor:='''updated_at'', internal.iso_timestamp_v1(ordered.updated_at)'||E'\n      )';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'list_posts version anchor missing'; end if;
  execute pg_catalog.replace(src,anchor,
    '''updated_at'', internal.iso_timestamp_v1(ordered.updated_at)'||E'\n      )'
    ||' || case when ordered.content_schema_version=2 then '
    ||'jsonb_build_object(''content_schema_version'',2) else ''{}''::jsonb end');
end $$;

-- The v1 lifecycle endpoint remains the owner-scoped discard entry point.
-- v2 evidence has its own shape, while the existing release/history path remains.
do $$ declare src text; anchor text :=
  'if internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true'
  ||E'\n    or internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true then'
  ||E'\n    raise exception using errcode=''P0001'',message=''QUALITY_EVIDENCE_STALE''; end if;';
begin
  src:=pg_catalog.pg_get_functiondef(
    'api.reschedule_post(integer,uuid,uuid,uuid,integer,timestamptz,text)'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then
    raise exception 'reschedule evidence anchor missing'; end if;
  execute pg_catalog.replace(src,anchor,
    'if p.content_schema_version=2 then '
    ||'if internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) '
    ||'is distinct from true or internal.post_evidence_valid_v2('
    ||'p.editorial_checks,p.content_hash,p.revision,true) is distinct from true '
    ||'then raise exception using errcode=''P0001'',message=''QUALITY_EVIDENCE_STALE''; '
    ||'end if; else '||anchor||' end if;');
end $$;

create or replace function internal.lifecycle_evidence_history_valid_v1(
  h internal.post_write_history) returns boolean
language plpgsql stable security invoker set search_path = '' as $$
declare s jsonb:=h.before_evidence->'system_checks';
  e jsonb:=h.before_evidence->'editorial_checks';
  a jsonb:=h.before_evidence->'approval_snapshot';
begin
  if internal.has_exact_json_keys(h.before_evidence,array[
    'system_checks','editorial_checks','approval_snapshot']) is distinct from true
    or pg_catalog.octet_length(h.before_evidence::text)>98304 then
    return false; end if;
  if s->'schema_version'='2'::jsonb then
    if internal.post_evidence_valid_v2(s,h.prior_content_hash,h.prior_revision,false)
        is distinct from true
      or internal.post_evidence_valid_v2(e,h.prior_content_hash,h.prior_revision,true)
        is distinct from true then return false; end if;
  elsif (not(h.operation_name='discard_post' and s='{}'::jsonb)
      and internal.is_valid_system_checks_v1(s,h.prior_content_hash,h.prior_revision)
        is distinct from true)
    or (not(h.operation_name='discard_post' and e='{}'::jsonb)
      and internal.is_valid_editorial_checks_v1(e,h.prior_content_hash,h.prior_revision)
        is distinct from true) then return false; end if;
  if h.prior_status in ('ready','posted') and
    (pg_catalog.jsonb_typeof(a) is distinct from 'object'
      or pg_catalog.octet_length(a::text)>32768
      or a->'approved_revision' is distinct from pg_catalog.to_jsonb(h.prior_revision)
      or a->>'content_hash' is distinct from h.prior_content_hash) then
    return false; end if;
  return true;
exception when others then return false;
end;
$$;

do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef(
    'api.discard_post(integer,uuid,uuid,uuid,integer,text,boolean)'::regprocedure);
  anchor:='perform internal.lifecycle_evidence_v1(p,true);';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'discard evidence anchor missing'; end if;
  src:=pg_catalog.replace(src,anchor,
    'if p.content_schema_version=2 then '
    ||'if internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) '
    ||'is distinct from true or internal.post_evidence_valid_v2('
    ||'p.editorial_checks,p.content_hash,p.revision,true) is distinct from true '
    ||'then raise exception using errcode=''P0001'',message=''EVIDENCE_INVALID''; end if; '
    ||'else '||anchor||' end if;');
  execute src;
end $$;

grant create on schema api to content_producer_api_owner;
alter function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,uuid,text,
  text,integer,text,text,text,jsonb,jsonb,jsonb,text)
  owner to content_producer_api_owner;
revoke create on schema api from content_producer_api_owner;
revoke all on function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,
  uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text)
  from public,anon,authenticated,service_role;
grant execute on function api.revise_post_v2(integer,uuid,uuid,uuid,integer,text,
  uuid,text,text,integer,text,text,text,jsonb,jsonb,jsonb,text)
  to authenticated;

revoke all on function internal.post_revise_response_valid_v2(jsonb),
  internal.post_revise_history_validate_v2(internal.post_write_history),
  internal.post_revise_complete_v2(bigint,public.posts,jsonb,public.posts,text),
  internal.post_revise_replay_v2(bigint),
  internal.post_assert_edit_v2(public.page_niche_configs,jsonb,integer,text,text,text)
  from public,anon,authenticated,service_role;
grant execute on function internal.post_revise_response_valid_v2(jsonb),
  internal.post_revise_history_validate_v2(internal.post_write_history),
  internal.post_revise_complete_v2(bigint,public.posts,jsonb,public.posts,text),
  internal.post_revise_replay_v2(bigint),
  internal.post_assert_edit_v2(public.page_niche_configs,jsonb,integer,text,text,text)
  to content_producer_api_owner;
