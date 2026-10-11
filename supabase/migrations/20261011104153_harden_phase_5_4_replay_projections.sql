-- Additive hardening after the public replay corruption regression exposed an
-- object-only item_config check. Applied predecessor migrations stay immutable.
-- Validate the already-frozen override shape against absolute TriviaConfigV1
-- ceilings, NOT mutable current Page config (historical replay stays historical).
grant execute on function internal.default_trivia_config_v1() to content_producer_api_owner;

do $$
declare v_source text; v_old text;
begin
  v_source:=pg_catalog.pg_get_functiondef('internal.plan_is_item_v1(jsonb)'::regprocedure);
  v_old:='or pg_catalog.octet_length((p_value->''item_config'')::text)>8192';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing item projection anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,$edit$or internal.is_valid_trivia_plan_override_v1(p_value->'item_config',
      internal.default_trivia_config_v1() || '{"text_budget":{"hook_max_chars":90,"fact_max_chars":90,"facts_total_max_chars":500,"cta_max_chars":100,"canva_total_max_chars":600}}'::jsonb) is distinct from true
    or not (p_value->'interaction_goal'='null'::jsonb or p_value->>'interaction_goal' in ('share','save','comment','follow'))$edit$);
  execute v_source;

  v_source:=pg_catalog.pg_get_functiondef('internal.plan_replay_operation_v4(bigint,text,jsonb)'::regprocedure);
  v_old:=E'  select * into v_ledger from internal.operation_ledger where id=p_operation_id and operation_name=p_operation;';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing replay relation anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,$edit$
  if pg_catalog.jsonb_array_length(p_snapshot->'resources')<>1
    or internal.has_exact_json_keys(p_snapshot#>'{resources,0}',array['resource_type','public_id','status','occurred_at']) is distinct from true
    or p_snapshot#>>'{resources,0,resource_type}'<>'content_plan'
    or p_snapshot#>>'{resources,0,status}'<>'updated'
    or (select count(distinct value) from pg_catalog.jsonb_array_elements(p_snapshot->'claim_event_public_ids'))<>
       pg_catalog.jsonb_array_length(p_snapshot->'claim_event_public_ids') then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  if p_operation<>'renew_content_plan_claim' and p_snapshot#>>'{resources,0,public_id}' is distinct from
    coalesce(p_snapshot#>>'{response,data,plan_public_id}',p_snapshot#>>'{response,data,plan,plan_public_id}') then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  if p_operation='replace_discarded_plan_item' and not exists (
    select 1 from internal.content_plan_item_events e where e.operation_id=p_operation_id
      and e.public_id=(p_snapshot#>>'{response,data,replacement_history_public_id}')::uuid
      and e.event_type='replaced' and e.item_public_id::text=p_snapshot#>>'{response,data,item,plan_item_public_id}'
      and e.plan_public_id::text=p_snapshot#>>'{resources,0,public_id}') then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  select * into v_ledger from internal.operation_ledger where id=p_operation_id and operation_name=p_operation;$edit$);
  v_old:=E'  v_response:=p_snapshot->''response'';';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing replay target anchor'; end if;
  v_source:=pg_catalog.replace(v_source,v_old,$edit$
  if v_ledger.target_public_id is not null and (v_ledger.target_type<>'content_plan'
    or v_ledger.target_public_id::text is distinct from p_snapshot#>>'{resources,0,public_id}') then
    raise exception using errcode='P0001',message='INTERNAL_ERROR';
  end if;
  v_response:=p_snapshot->'response';$edit$);
  execute v_source;
end;
$$;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
