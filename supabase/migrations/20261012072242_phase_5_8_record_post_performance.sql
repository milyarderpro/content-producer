-- CR-015: the only additional public operation; observation never updates a post.
create function api.record_post_performance(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,
  p_post_public_id uuid,p_captured_at timestamptz,p_metrics jsonb,p_source jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; p public.posts; m public.post_metrics; prior public.post_metrics; values_json jsonb; source_json jsonb; state text; message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_post_public_id);
  if p_captured_at is null or not pg_catalog.isfinite(p_captured_at) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  values_json:=internal.metric_values_v1(p_metrics); source_json:=internal.metric_source_v1(p_source);
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'record_post_performance',1,
    pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,'captured_at',internal.iso_timestamp_v1(p_captured_at),
      'metrics',values_json,'source',source_json));
  if o.claim_state='replay' then return internal.metric_replay_v8(o.operation_id); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id); p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id);
  if p.status not in ('posted','archived') then raise exception using errcode='P0001',message='POST_NOT_PUBLISHED'; end if;
  select * into prior from public.post_metrics where workspace_id=o.workspace_id and post_id=p.id and captured_at<p_captured_at
    order by captured_at desc,id desc limit 1;
  m.workspace_id:=o.workspace_id; m.page_id:=p.page_id; m.post_id:=p.id; m.captured_at:=p_captured_at; m.metrics_payload:=source_json;
  m.views:=(values_json->>'views')::bigint; m.reach:=(values_json->>'reach')::bigint; m.reactions:=(values_json->>'reactions')::bigint;
  m.likes:=(values_json->>'likes')::bigint; m.comments:=(values_json->>'comments')::bigint; m.shares:=(values_json->>'shares')::bigint;
  m.saves:=(values_json->>'saves')::bigint; m.follows:=(values_json->>'follows')::bigint;
  m.watch_time_seconds:=(values_json->>'watch_time_seconds')::numeric; m.average_watch_time_seconds:=(values_json->>'average_watch_time_seconds')::numeric;
  insert into public.post_metrics(workspace_id,page_id,post_id,created_by_operation_id,captured_at,views,reach,reactions,likes,
    comments,shares,saves,follows,watch_time_seconds,average_watch_time_seconds,metrics_payload,recorded_anomaly_flags)
  values(m.workspace_id,m.page_id,m.post_id,o.operation_id,m.captured_at,m.views,m.reach,m.reactions,m.likes,m.comments,m.shares,m.saves,
    m.follows,m.watch_time_seconds,m.average_watch_time_seconds,m.metrics_payload,internal.metric_flags_v1(m,prior,p.published_at)) returning * into m;
  return internal.metric_complete_v8(o.operation_id,m,p.public_id);
exception when query_canceled then perform internal.metric_raise_v1('57014','');
  when others then get stacked diagnostics state=returned_sqlstate,message=message_text; perform internal.metric_raise_v1(state,message);
end; $$;
grant create on schema api to content_producer_api_owner;
alter function api.record_post_performance(integer,uuid,uuid,uuid,timestamptz,jsonb,jsonb) owner to content_producer_api_owner;
revoke create on schema api from content_producer_api_owner;
revoke all on function api.record_post_performance(integer,uuid,uuid,uuid,timestamptz,jsonb,jsonb) from public,anon,authenticated,service_role;
grant execute on function api.record_post_performance(integer,uuid,uuid,uuid,timestamptz,jsonb,jsonb) to authenticated;
