-- CR-013: exactly three caller-facing draft editing operations.
create function internal.post_assert_choices_v1(c public.page_niche_configs,v integer,f text,t text,g text) returns void
language plpgsql stable security invoker set search_path='' as $$
begin
 if v is distinct from 1 then raise exception using errcode='P0001',message='CONTENT_SCHEMA_UNSUPPORTED'; end if;
 if not exists(select 1 from public.niches n where n.key='trivia' and n.status='active' and n.module_version=1) then
   raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
 if f is null or not(c.config->'allowed_formats' ? f) then raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
 if t is null or not(c.config->'allowed_topics' ? t) then raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
 if g is null or not(c.config->'allowed_interaction_goals' ? g) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
end; $$;
create function internal.post_lock_slots_v1(page bigint,old_time timestamptz,new_time timestamptz) returns void
language plpgsql volatile security invoker set search_path='' as $$
declare k bigint;
begin
 for k in select distinct pg_catalog.hashtextextended(page::text||':'||((extract(epoch from t)*1000000)::bigint)::text,0)
   from pg_catalog.unnest(array[old_time,new_time]) t where t is not null order by 1 loop perform pg_catalog.pg_advisory_xact_lock(k); end loop;
end; $$;
create function internal.post_lock_target_v1(w bigint,id uuid,new_time timestamptz default null,slots boolean default false) returns public.posts
language plpgsql volatile security invoker set search_path='' as $$
declare p public.posts; page uuid;
begin
 select * into p from public.posts where workspace_id=w and public_id=id;
 if p.id is null then raise exception using errcode='P0001',message='POST_NOT_FOUND'; end if;
 select public_id into page from public.pages where id=p.page_id and workspace_id=w;
 perform internal.trivia_lock_page_v1(w,page,false);
 -- Discovery is stable after Page lock, but re-read before schedule-key materialization.
 select * into p from public.posts where workspace_id=w and public_id=id;
 if slots then perform internal.post_lock_slots_v1(p.page_id,p.scheduled_at,new_time); end if;
 if p.content_plan_item_id is not null then
   perform 1 from public.content_plans where id=(select plan_id from public.content_plan_items where id=p.content_plan_item_id) and workspace_id=w for update;
   perform 1 from public.content_plan_items where id=p.content_plan_item_id and workspace_id=w for update;
 end if;
 select * into p from public.posts where workspace_id=w and public_id=id for update;
 return p;
end; $$;

create function api.save_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_page_public_id uuid,
 p_niche_key text,p_reservation_token uuid,p_expected_config_updated_at timestamptz,p_plan_item jsonb,p_scheduled_at timestamptz,
 p_content_schema_version integer,p_format_key text,p_topic_key text,p_interaction_goal text,p_content_payload jsonb,p_generation_snapshot jsonb,p_fact_bindings jsonb,p_editorial_checks jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; c public.page_niche_configs; page public.pages; plan public.content_plans; item public.content_plan_items; p public.posts;
 content jsonb; s jsonb; bindings jsonb; editorial jsonb; ids uuid[]; result jsonb; progress jsonb:='null'; unused jsonb;
 v_state text; v_message text;
begin
 perform internal.assert_request_context_v1();
 perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_page_public_id);
 if p_niche_key is distinct from 'trivia' or p_reservation_token is null or internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text) is distinct from true
   or p_expected_config_updated_at is null or not pg_catalog.isfinite(p_expected_config_updated_at)
   or (p_scheduled_at is not null and not pg_catalog.isfinite(p_scheduled_at)) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 if p_plan_item is not null and p_plan_item<>'null'::jsonb and (internal.has_exact_json_keys(p_plan_item,array['plan_item_public_id','claim_token']) is distinct from true
   or internal.trivia_is_valid_uuid_v4_v1(p_plan_item->>'plan_item_public_id') is distinct from true
   or internal.trivia_is_valid_uuid_v4_v1(p_plan_item->>'claim_token') is distinct from true) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 content:=internal.post_render_v1(p_content_payload); bindings:=internal.post_bindings_v1(p_fact_bindings,content); editorial:=internal.post_editorial_input_v1(p_editorial_checks);
 if internal.post_generation_shape_v1(p_generation_snapshot) is distinct from true then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
 s:=pg_catalog.jsonb_set(p_generation_snapshot,'{config_updated_at}',pg_catalog.to_jsonb(internal.iso_timestamp_v1((p_generation_snapshot->>'config_updated_at')::timestamptz)));
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'save_post',1,pg_catalog.jsonb_build_object(
   'page_public_id',p_page_public_id,'niche_key','trivia','reservation_token',p_reservation_token,'expected_config_updated_at',internal.iso_timestamp_v1(p_expected_config_updated_at),
   'plan_item',coalesce(p_plan_item,'null'::jsonb),'scheduled_at',internal.iso_timestamp_v1(p_scheduled_at),'content_schema_version',p_content_schema_version,
   'format_key',p_format_key,'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,'content_payload',content,'generation_snapshot',s,'fact_bindings',bindings,'editorial_checks',editorial));
 if o.claim_state='replay' then return internal.post_replay_v6(o.operation_id,'save_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); c:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id);
 select * into page from public.pages where id=c.page_id and workspace_id=o.workspace_id;
 perform internal.post_assert_choices_v1(c,p_content_schema_version,p_format_key,p_topic_key,p_interaction_goal);
 if c.updated_at is distinct from p_expected_config_updated_at then raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
 perform internal.post_lock_slots_v1(page.id,null,p_scheduled_at);
 if p_plan_item is not null and p_plan_item<>'null'::jsonb then
   select * into item from public.content_plan_items where workspace_id=o.workspace_id and public_id=(p_plan_item->>'plan_item_public_id')::uuid and page_id=page.id and niche_key='trivia';
   if item.id is null then raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
   select * into plan from public.content_plans where id=item.plan_id and workspace_id=o.workspace_id for update;
   select * into item from public.content_plan_items where id=item.id and workspace_id=o.workspace_id for update;
   if plan.status='cancelled' then raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
   perform internal.plan_assert_current_claim_v1(item,(p_plan_item->>'claim_token')::uuid);
   if item.scheduled_at is distinct from p_scheduled_at or (item.format_key is not null and item.format_key<>p_format_key)
     or (item.topic_key is not null and item.topic_key<>p_topic_key) or (item.interaction_goal is not null and item.interaction_goal<>p_interaction_goal) then
     raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
   if plan.plan_config ? 'context_snapshot' and (plan.plan_config#>>'{context_snapshot,niche_config,updated_at}')::timestamptz<>c.updated_at then
     raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
 end if;
 s:=internal.post_generation_context_v1(s,c,page,content,coalesce(item.item_config,'{}'));
 perform internal.assert_page_schedule_available(page.id,p_scheduled_at,item.id,null);
 insert into public.posts(workspace_id,page_id,niche_key,content_plan_item_id,created_by_operation_id,format_key,topic_key,interaction_goal,content_schema_version,
   content_payload,generation_snapshot,content_hash,scheduled_at)
 values(o.workspace_id,page.id,'trivia',item.id,o.operation_id,p_format_key,p_topic_key,p_interaction_goal,1,content,s,pg_catalog.repeat('0',64),p_scheduled_at) returning * into p;
 select pg_catalog.array_agg((value->>'fact_public_id')::uuid order by (value->>'position')::integer) into ids from pg_catalog.jsonb_array_elements(bindings);
 perform internal.post_lock_facts_v1(o.workspace_id,ids);
 unused:=internal.post_allocate_v1(p,bindings,p_reservation_token,c);
 p.content_hash:=internal.post_hash_v1(p); p.system_checks:=internal.post_system_v1(content,s,p.content_hash,1); p.editorial_checks:=internal.post_editorial_v1(editorial,p.content_hash,1);
 update public.posts set content_hash=p.content_hash,system_checks=p.system_checks,editorial_checks=p.editorial_checks,
   quality_status=internal.post_quality_v1(p.system_checks,p.editorial_checks) where id=p.id returning * into p;
 if item.id is not null then
   update public.content_plan_items set status='completed',completed_at=pg_catalog.clock_timestamp(),claim_token=null,claimed_at=null,claim_expires_at=null,claim_renewal_count=0,
     last_error_code=null,last_error_detail=null where id=item.id returning * into item;
   perform internal.plan_append_event_v1(o.operation_id,item,plan.public_id,'completed','in_progress');
   perform internal.plan_refresh_status_v1(plan.id); progress:=internal.plan_project_summary_v1(plan.id);
 end if;
 result:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('post',internal.post_package_v1(p),'plan',progress,'replayed',false));
 perform internal.post_complete_v6(o.operation_id,'save_post',p,result,null); return result;
exception when query_canceled then perform internal.post_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.post_raise_v1(v_state,v_message);
end; $$;

create function api.revise_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,p_expected_revision integer,
 p_expected_content_hash text,p_reservation_token uuid,p_content_schema_version integer,p_format_key text,p_topic_key text,p_interaction_goal text,
 p_content_payload jsonb,p_generation_snapshot jsonb,p_fact_bindings jsonb,p_editorial_checks jsonb,p_revision_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; page public.pages; c public.page_niche_configs; content jsonb; s jsonb; bindings jsonb; editorial jsonb;
 ids uuid[]; changes jsonb; result jsonb; v_state text; v_message text; override jsonb:='{}';
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or p_expected_content_hash is null or p_expected_content_hash !~ '^[0-9a-f]{64}$'
   or (p_reservation_token is not null and internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text) is distinct from true)
   or internal.plan_safe_reason_v1(pg_catalog.btrim(p_revision_reason)) is distinct from true then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 content:=internal.post_render_v1(p_content_payload); bindings:=internal.post_bindings_v1(p_fact_bindings,content); editorial:=internal.post_editorial_input_v1(p_editorial_checks);
 if internal.post_generation_shape_v1(p_generation_snapshot) is distinct from true then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
 s:=pg_catalog.jsonb_set(p_generation_snapshot,'{config_updated_at}',pg_catalog.to_jsonb(internal.iso_timestamp_v1((p_generation_snapshot->>'config_updated_at')::timestamptz)));
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'revise_post',1,pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,
   'expected_revision',p_expected_revision,'expected_content_hash',p_expected_content_hash,'reservation_token',p_reservation_token,'content_schema_version',p_content_schema_version,
   'format_key',p_format_key,'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,'content_payload',content,'generation_snapshot',s,'fact_bindings',bindings,'editorial_checks',editorial,'revision_reason',pg_catalog.btrim(p_revision_reason)));
 if o.claim_state='replay' then return internal.post_replay_v6(o.operation_id,'revise_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.content_hash<>p_expected_content_hash then raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
 if p.status not in ('draft','ready') then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 select * into c from public.page_niche_configs where page_id=p.page_id and workspace_id=o.workspace_id and niche_key='trivia';
 select * into page from public.pages where id=p.page_id and workspace_id=o.workspace_id;
 if not page.is_active or not c.is_enabled then raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
 perform internal.post_assert_choices_v1(c,p_content_schema_version,p_format_key,p_topic_key,p_interaction_goal);
 if p.content_plan_item_id is not null then select item_config into override from public.content_plan_items where id=p.content_plan_item_id; end if;
 s:=internal.post_generation_context_v1(s,c,page,content,override);
 select pg_catalog.array_agg((value->>'fact_public_id')::uuid order by (value->>'position')::integer) into ids from pg_catalog.jsonb_array_elements(bindings);
 perform internal.post_lock_facts_v1(o.workspace_id,ids,p.id); changes:=internal.post_allocate_v1(p,bindings,p_reservation_token,c);
 p.content_payload:=content; p.generation_snapshot:=s; p.format_key:=p_format_key; p.topic_key:=p_topic_key; p.interaction_goal:=p_interaction_goal;
 p.content_hash:=internal.post_hash_v1(p); p.revision:=p.revision+1;
 p.system_checks:=internal.post_system_v1(content,s,p.content_hash,p.revision); p.editorial_checks:=internal.post_editorial_v1(editorial,p.content_hash,p.revision);
 update public.posts set status='draft',revision=p.revision,format_key=p.format_key,topic_key=p.topic_key,interaction_goal=p.interaction_goal,
   content_payload=content,generation_snapshot=s,content_hash=p.content_hash,system_checks=p.system_checks,editorial_checks=p.editorial_checks,
   quality_status=internal.post_quality_v1(p.system_checks,p.editorial_checks),ready_at=null,approval_snapshot=null where id=p.id returning * into p;
 result:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',changes||pg_catalog.jsonb_build_object('post',internal.post_package_v1(p),'approval_invalidated',old.status='ready','replayed',false));
 perform internal.post_complete_v6(o.operation_id,'revise_post',p,result,old,pg_catalog.btrim(p_revision_reason)); return result;
exception when query_canceled then perform internal.post_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.post_raise_v1(v_state,v_message);
end; $$;

create function api.reschedule_post(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,p_post_public_id uuid,
 p_expected_revision integer,p_scheduled_at timestamptz,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; old public.posts; item public.content_plan_items; result jsonb; v_state text; v_message text;
begin
 perform internal.assert_request_context_v1(); perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
 if p_expected_revision is null or p_expected_revision<1 or (p_scheduled_at is not null and not pg_catalog.isfinite(p_scheduled_at))
   or internal.plan_safe_reason_v1(pg_catalog.btrim(p_reason)) is distinct from true then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'reschedule_post',1,pg_catalog.jsonb_build_object(
  'post_public_id',p_post_public_id,'expected_revision',p_expected_revision,'scheduled_at',internal.iso_timestamp_v1(p_scheduled_at),'reason',pg_catalog.btrim(p_reason)));
 if o.claim_state='replay' then return internal.post_replay_v6(o.operation_id,'reschedule_post'); end if;
 perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id,p_scheduled_at,true); old:=p;
 if p.revision<>p_expected_revision then raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
 if p.status not in ('draft','ready') then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
 if p.content_plan_item_id is not null then
  select * into item from public.content_plan_items where id=p.content_plan_item_id and workspace_id=o.workspace_id and page_id=p.page_id;
  if item.status is distinct from 'completed' or item.scheduled_at is distinct from p.scheduled_at then raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
 end if;
 perform internal.post_lock_facts_v1(o.workspace_id,'{}',p.id);
 perform internal.assert_page_schedule_available(p.page_id,p_scheduled_at,item.id,p.id);
 if p.system_checks<>'{}'::jsonb and (p.system_checks->>'post_revision')::integer<>p.revision
   or p.editorial_checks<>'{}'::jsonb and (p.editorial_checks->>'post_revision')::integer<>p.revision then raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
 if p.status='ready' then
   if internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true
     or internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true then raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
   if p.approval_snapshot->>'content_hash' is distinct from p.content_hash or p.approval_snapshot->'approved_revision' is distinct from pg_catalog.to_jsonb(p.revision)
     or internal.has_exact_json_keys(p.approval_snapshot,array['schema_version','approved_by_user_id','approved_at','approved_revision','content_hash','operation_id','accepted_warning_ids','warning_acceptance_reason']) is distinct from true then
     raise exception using errcode='P0001',message='APPROVAL_STALE'; end if;
   p.approval_snapshot:=pg_catalog.jsonb_set(p.approval_snapshot,'{approved_revision}',pg_catalog.to_jsonb(p.revision+1));
 end if;
 if p.system_checks<>'{}'::jsonb then p.system_checks:=pg_catalog.jsonb_set(p.system_checks,'{post_revision}',pg_catalog.to_jsonb(p.revision+1)); end if;
 if p.editorial_checks<>'{}'::jsonb then p.editorial_checks:=pg_catalog.jsonb_set(p.editorial_checks,'{post_revision}',pg_catalog.to_jsonb(p.revision+1)); end if;
 if item.id is not null then update public.content_plan_items set scheduled_at=p_scheduled_at where id=item.id; end if;
 update public.posts set scheduled_at=p_scheduled_at,revision=p.revision+1,system_checks=p.system_checks,editorial_checks=p.editorial_checks,
  approval_snapshot=p.approval_snapshot where id=p.id returning * into p;
 result:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('post_public_id',p.public_id,'status',p.status,'revision',p.revision,
   'content_hash_unchanged',true,'scheduled_at',internal.iso_timestamp_v1(p.scheduled_at),'plan_item_schedule',internal.iso_timestamp_v1(case when item.id is not null then p.scheduled_at end),'replayed',false));
 perform internal.post_complete_v6(o.operation_id,'reschedule_post',p,result,old,pg_catalog.btrim(p_reason)); return result;
exception when query_canceled then perform internal.post_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.post_raise_v1(v_state,v_message);
end; $$;

-- Schedule-only/history-preserving writes must not reinterpret old config choices.
do $$ declare src text; anchor text:='select config into v_config from public.page_niche_configs'; begin
 src:=pg_catalog.pg_get_functiondef('internal.validate_post_row()'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing post config validation anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if tg_op='UPDATE' and new.content_payload is not distinct from old.content_payload
  and new.generation_snapshot is not distinct from old.generation_snapshot and new.format_key=old.format_key
  and new.topic_key=old.topic_key and new.interaction_goal=old.interaction_goal then return new; end if;
  select config into v_config from public.page_niche_configs$edit$);
end $$;
-- Approval projection uses the frozen approved_revision key.
do $$ declare src text; anchor text:='v_post.approval_snapshot -> ''revision'''; begin
 src:=pg_catalog.pg_get_functiondef('api.get_post(integer,uuid,uuid,boolean,boolean,boolean)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing approval projection anchor'; end if;
 execute pg_catalog.replace(src,anchor,'coalesce(v_post.approval_snapshot -> ''approved_revision'',v_post.approval_snapshot -> ''revision'')');
end $$;
grant create on schema api,internal to content_producer_api_owner;
do $$ declare r record; begin
 for r in select p.oid::regprocedure f,n.nspname s from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='api' and p.proname in ('save_post','revise_post','reschedule_post')) or (n.nspname='internal' and p.proname like 'post_%') loop
  execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
  execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  if r.s='api' then execute pg_catalog.format('grant execute on function %s to authenticated',r.f); end if;
 end loop;
end $$;
revoke create on schema api,internal from content_producer_api_owner;
