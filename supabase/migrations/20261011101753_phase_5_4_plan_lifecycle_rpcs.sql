-- Exactly six checkpoint 5.4 API operations. See CR-011 for lock/state/replay rules.

create function api.claim_content_plan_items(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_public_id uuid, p_limit integer default 1, p_lease_minutes integer default 30
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_plan public.content_plans; v_item public.content_plan_items;
  v_before text; v_time timestamptz; v_items jsonb:='[]'::jsonb; v_response jsonb; v_remaining integer;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_public_id is null or p_limit is null or p_limit not between 1 and 3 or p_lease_minutes is distinct from 30 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'claim_content_plan_items',p_request_schema_version,
    pg_catalog.jsonb_build_object('plan_public_id',p_plan_public_id,'limit',p_limit,'lease_minutes',p_lease_minutes));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'claim_content_plan_items',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,p_plan_public_id,null,'claim_content_plan_items');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  v_time:=pg_catalog.clock_timestamp();
  for v_item in select i.* from public.content_plan_items i where i.workspace_id=v_op.workspace_id and i.plan_id=v_plan.id
    and (i.status='pending' or (i.status='in_progress' and i.claim_expires_at<=v_time))
    order by i.position,i.id limit p_limit for update skip locked
  loop
    v_before:=v_item.status;
    update public.content_plan_items set status='in_progress',attempt_count=attempt_count+1,
      claim_token=extensions.gen_random_uuid(),claimed_at=v_time,claim_expires_at=v_time+interval '30 minutes',
      claim_renewal_count=0,started_at=coalesce(started_at,v_time),completed_at=null,
      last_error_code=null,last_error_detail=null
      where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
    perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,
      case when v_before='pending' then 'claimed' else 'reclaimed' end,v_before);
    v_items:=v_items||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'item',internal.plan_project_item_v1(v_item,v_plan.public_id),'claim_token',v_item.claim_token,
      'claimed_at',internal.iso_timestamp_v1(v_item.claimed_at),'claim_expires_at',internal.iso_timestamp_v1(v_item.claim_expires_at),
      'claim_renewal_count',v_item.claim_renewal_count));
  end loop;
  if pg_catalog.jsonb_array_length(v_items)>0 then perform internal.plan_refresh_status_v1(v_plan.id); end if;
  select count(*) into v_remaining from public.content_plan_items where plan_id=v_plan.id and workspace_id=v_op.workspace_id
    and (status='pending' or (status='in_progress' and claim_expires_at<=pg_catalog.clock_timestamp()));
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'plan_public_id',v_plan.public_id,'claimed_items',v_items,'remaining_claimable_count',v_remaining,'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'claim_content_plan_items',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

create function api.renew_content_plan_claim(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_item_public_id uuid, p_claim_token uuid
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_item public.content_plan_items; v_plan public.content_plans;
  v_response jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_item_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_item_public_id is null or p_claim_token is null then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'renew_content_plan_claim',p_request_schema_version,
    pg_catalog.jsonb_build_object('plan_item_public_id',p_plan_item_public_id,'claim_token',p_claim_token));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'renew_content_plan_claim',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,null,p_plan_item_public_id,'renew_content_plan_claim');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  select * into v_item from public.content_plan_items where id=v_target.item_id and workspace_id=v_op.workspace_id for update;
  perform internal.plan_assert_current_claim_v1(v_item,p_claim_token);
  if v_item.claim_renewal_count<>0 or v_item.claim_expires_at>=v_item.claimed_at+interval '60 minutes' then
    raise exception using errcode='P0001',message='PLAN_CLAIM_RENEWAL_LIMIT';
  end if;
  update public.content_plan_items set claim_expires_at=least(claim_expires_at+interval '30 minutes',claimed_at+interval '60 minutes'),
    claim_renewal_count=1 where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
  perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,'renewed','in_progress');
  perform internal.plan_refresh_status_v1(v_plan.id);
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'plan_item_public_id',v_item.public_id,'claim_expires_at',internal.iso_timestamp_v1(v_item.claim_expires_at),
    'claim_renewal_count',v_item.claim_renewal_count,'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'renew_content_plan_claim',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

create function api.report_content_plan_item_failure(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_item_public_id uuid, p_claim_token uuid, p_failure_code text, p_failure_detail text, p_retry_recommended boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_item public.content_plan_items; v_plan public.content_plans;
  v_detail text:=pg_catalog.btrim(p_failure_detail); v_response jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_item_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_item_public_id is null or p_claim_token is null or p_retry_recommended is null
    or not internal.plan_failure_code_v1(p_failure_code) or not internal.plan_safe_reason_v1(v_detail) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'report_content_plan_item_failure',p_request_schema_version,pg_catalog.jsonb_build_object(
      'plan_item_public_id',p_plan_item_public_id,'claim_token',p_claim_token,'failure_code',p_failure_code,
      'failure_detail',v_detail,'retry_recommended',p_retry_recommended));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'report_content_plan_item_failure',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,null,p_plan_item_public_id,'report_content_plan_item_failure');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  select * into v_item from public.content_plan_items where id=v_target.item_id and workspace_id=v_op.workspace_id for update;
  perform internal.plan_assert_current_claim_v1(v_item,p_claim_token);
  update public.content_plan_items set status='failed',claim_token=null,claimed_at=null,claim_expires_at=null,claim_renewal_count=0,
    last_error_code=p_failure_code,last_error_detail=v_detail
    where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
  perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,'failed','in_progress',null,
    p_failure_code,v_detail,p_retry_recommended);
  perform internal.plan_refresh_status_v1(v_plan.id);
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'item',internal.plan_project_item_v1(v_item,v_plan.public_id),'plan',internal.plan_project_summary_v1(v_plan.id),'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'report_content_plan_item_failure',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

create function api.retry_content_plan_item(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_item_public_id uuid, p_reason text
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_item public.content_plan_items; v_plan public.content_plans;
  v_reason text:=pg_catalog.btrim(p_reason); v_response jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_item_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_item_public_id is null or not internal.plan_safe_reason_v1(v_reason) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'retry_content_plan_item',p_request_schema_version,
    pg_catalog.jsonb_build_object('plan_item_public_id',p_plan_item_public_id,'reason',v_reason));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'retry_content_plan_item',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,null,p_plan_item_public_id,'retry_content_plan_item');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  select * into v_item from public.content_plan_items where id=v_target.item_id and workspace_id=v_op.workspace_id for update;
  if v_item.status<>'failed' then raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
  update public.content_plan_items set status='pending',last_error_code=null,last_error_detail=null
    where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
  perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,'retried','failed',v_reason);
  perform internal.plan_refresh_status_v1(v_plan.id);
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'item',internal.plan_project_item_v1(v_item,v_plan.public_id),'plan',internal.plan_project_summary_v1(v_plan.id),'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'retry_content_plan_item',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

create function api.replace_discarded_plan_item(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_item_public_id uuid, p_discarded_post_public_id uuid, p_reason text, p_explicit_replacement boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_item public.content_plan_items; v_plan public.content_plans;
  v_reason text:=pg_catalog.btrim(p_reason); v_response jsonb; v_event uuid; v_post public.posts;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_item_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_item_public_id is null or p_discarded_post_public_id is null
    or p_explicit_replacement is distinct from true or not internal.plan_safe_reason_v1(v_reason) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'replace_discarded_plan_item',p_request_schema_version,pg_catalog.jsonb_build_object(
      'plan_item_public_id',p_plan_item_public_id,'discarded_post_public_id',p_discarded_post_public_id,
      'reason',v_reason,'explicit_replacement',p_explicit_replacement));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'replace_discarded_plan_item',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,null,p_plan_item_public_id,'replace_discarded_plan_item');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  select * into v_item from public.content_plan_items where id=v_target.item_id and workspace_id=v_op.workspace_id for update;
  if v_item.status<>'completed' then raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
  -- Acquire every historical post lock in ID order, then decide eligibility.
  perform 1 from public.posts p where p.workspace_id=v_op.workspace_id and p.content_plan_item_id=v_item.id order by p.id for update;
  select * into v_post from public.posts p where p.workspace_id=v_op.workspace_id and p.public_id=p_discarded_post_public_id;
  if not found then raise exception using errcode='P0001',message='POST_NOT_FOUND'; end if;
  if v_post.content_plan_item_id is distinct from v_item.id or v_post.status<>'discarded'
    or exists (select 1 from public.posts p where p.workspace_id=v_op.workspace_id and p.content_plan_item_id=v_item.id
      and (p.status<>'discarded' or p.published_at is not null or p.archived_at is not null)) then
    raise exception using errcode='P0001',message='PLAN_ITEM_REPLACEMENT_BLOCKED';
  end if;
  -- Slot lock was already acquired BEFORE the plan/item/post locks. Recheck both
  -- tables without acquiring a new advisory lock at this later lock tier.
  if v_item.scheduled_at is not null and (exists (select 1 from public.content_plan_items i
      where i.page_id=v_item.page_id and i.scheduled_at=v_item.scheduled_at and i.status<>'cancelled' and i.id<>v_item.id)
    or exists (select 1 from public.posts p where p.page_id=v_item.page_id and p.scheduled_at=v_item.scheduled_at and p.status<>'discarded')) then
    raise exception using errcode='P0001',message='SCHEDULE_CONFLICT';
  end if;
  update public.content_plan_items set status='pending',completed_at=null,replacement_reason=v_reason,
    last_error_code=null,last_error_detail=null where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
  v_event:=internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,'replaced','completed',v_reason,
    null,null,null,p_discarded_post_public_id);
  perform internal.plan_refresh_status_v1(v_plan.id);
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'item',internal.plan_project_item_v1(v_item,v_plan.public_id),'plan',internal.plan_project_summary_v1(v_plan.id),
    'replacement_history_public_id',v_event,'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'replace_discarded_plan_item',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

create function api.cancel_content_plan(
  p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid,
  p_plan_public_id uuid, p_reason text, p_explicit_cancellation boolean
)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_op record; v_target record; v_item public.content_plan_items; v_plan public.content_plans;
  v_reason text:=pg_catalog.btrim(p_reason); v_response jsonb; v_before text; v_changed integer:=0;
  v_preserved integer; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_public_id is null or p_explicit_cancellation is distinct from true
    or not internal.plan_safe_reason_v1(v_reason) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'cancel_content_plan',p_request_schema_version,
    pg_catalog.jsonb_build_object('plan_public_id',p_plan_public_id,'reason',v_reason,'explicit_cancellation',p_explicit_cancellation));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'cancel_content_plan',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,p_plan_public_id,null,'cancel_content_plan');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  for v_item in select i.* from public.content_plan_items i where i.plan_id=v_plan.id and i.workspace_id=v_op.workspace_id
    and i.status in ('pending','failed','in_progress') order by i.id for update
  loop
    v_before:=v_item.status;
    update public.content_plan_items set status='cancelled',claim_token=null,claimed_at=null,claim_expires_at=null,claim_renewal_count=0
      where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
    perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,'cancelled',v_before,v_reason);
    v_changed:=v_changed+1;
  end loop;
  select count(*) into v_preserved from public.content_plan_items where plan_id=v_plan.id and workspace_id=v_op.workspace_id and status='completed';
  perform internal.plan_refresh_status_v1(v_plan.id,true);
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'plan',internal.plan_project_summary_v1(v_plan.id),'changed_count',v_changed,'preserved_completed_count',v_preserved,'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'cancel_content_plan',v_plan.public_id,v_response);
  return v_response;
exception when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$$;

grant create on schema api to content_producer_api_owner;
do $$
declare v_function regprocedure;
begin
  for v_function in select p.oid::regprocedure from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='api' and p.proname=any(array[
      'claim_content_plan_items','renew_content_plan_claim','report_content_plan_item_failure',
      'retry_content_plan_item','replace_discarded_plan_item','cancel_content_plan'])
  loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',v_function);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',v_function);
    execute pg_catalog.format('grant execute on function %s to authenticated',v_function);
  end loop;
end;
$$;
revoke create on schema api from content_producer_api_owner;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
revoke all on all functions in schema api from public,anon,service_role;
