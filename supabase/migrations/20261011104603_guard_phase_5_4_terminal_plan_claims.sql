-- Fail closed for terminal plan metadata, including imported/legacy fixtures
-- whose items are inconsistent with a completed/cancelled aggregate.
do $$
declare v_source text; v_old text;
begin
  v_source:=pg_catalog.pg_get_functiondef('api.claim_content_plan_items(integer,uuid,uuid,uuid,integer,integer)'::regprocedure);
  v_old:='and (i.status=''pending'' or (i.status=''in_progress'' and i.claim_expires_at<=v_time))';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing terminal claim selection anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,'and v_plan.status<>''completed'' '||v_old);
  v_old:='and (status=''pending'' or (status=''in_progress'' and claim_expires_at<=pg_catalog.clock_timestamp()))';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing terminal remaining count anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,'and v_plan.status<>''completed'' '||v_old);
  execute v_source;

  v_source:=pg_catalog.pg_get_functiondef('internal.plan_lock_target_v1(bigint,uuid,uuid,text)'::regprocedure);
  v_old:='if v_plan.status=''cancelled'' then';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing cancelled plan anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,'if v_plan.status=''cancelled'' or v_plan.cancelled_at is not null then');
  execute v_source;

  v_source:=pg_catalog.pg_get_functiondef('api.replace_discarded_plan_item(integer,uuid,uuid,uuid,uuid,text,boolean)'::regprocedure);
  v_old:='  perform internal.assert_request_context_v1();';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing replacement input anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,v_old||E'\n  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_discarded_post_public_id);');
  execute v_source;
end;
$$;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
revoke all on all functions in schema api from public,anon,service_role;
