-- CR-056: versioned overloads, not new tool names. Legacy signatures remain.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('internal.canonical_request_hash_v1(text,uuid,integer,jsonb)'::regprocedure);
  anchor:='(''save_post_v2'',''revise_post_v2'')';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing request version allowlist'; end if;
  execute pg_catalog.replace(src,anchor,
    '(''save_post_v2'',''revise_post_v2'',''trivia_reverify_fact'',''trivia_correct_fact'')');
end $$;

create function internal.trivia_maintenance_response_valid_v2(name text,r jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb:=r->'data'; g jsonb; x jsonb; k text;
begin
  if internal.has_exact_json_keys(r,array['response_schema_version','data']) is distinct from true
    or r->'response_schema_version' is distinct from '2'::jsonb
    or internal.plan_is_uuid_v1(d->'fact_public_id') is distinct from true
    or d->'replayed' is distinct from 'false'::jsonb
    or pg_catalog.octet_length(r::text)>65536
    or r::text ~ '"(operation_key|claim_token|reservation_token|access_token|refresh_token|workspace_id|actor_user_id)"[[:space:]]*:' then return false; end if;
  if name='trivia_reverify_fact' then
    if internal.has_exact_json_keys(d,array['fact_public_id','verification_status',
      'source_url','fact_updated_at','affected_posts','replayed']) is distinct from true
      or d->>'verification_status' not in ('needs_review','verified')
      or internal.trivia_web_source_url_v2(d->>'source_url') is distinct from true
      or internal.plan_is_time_v1(d->'fact_updated_at') is distinct from true then return false; end if;
  elsif name='trivia_correct_fact' then
    if internal.has_exact_json_keys(d,array['fact_public_id','old_status',
      'successor_public_id','affected_posts','replayed']) is distinct from true
      or d->>'old_status' not in ('invalidated','superseded')
      or (d->>'old_status'='invalidated' and d->'successor_public_id' is distinct from 'null'::jsonb)
      or (d->>'old_status'='superseded' and internal.plan_is_uuid_v1(d->'successor_public_id') is distinct from true)
      then return false; end if;
  else return false; end if;
  if internal.has_exact_json_keys(d->'affected_posts',array['draft','ready','posted']) is distinct from true then return false; end if;
  foreach k in array array['draft','ready','posted'] loop
    g:=d->'affected_posts'->k;
    if internal.has_exact_json_keys(g,array['count','items','truncated']) is distinct from true
      or internal.is_json_integer_between(g->'count',0,2147483647) is distinct from true
      or pg_catalog.jsonb_typeof(g->'items') is distinct from 'array'
      or pg_catalog.jsonb_array_length(g->'items')>50
      or (g->>'count')::integer<pg_catalog.jsonb_array_length(g->'items')
      or g->'truncated' is distinct from pg_catalog.to_jsonb((g->>'count')::integer>50) then return false; end if;
    for x in select value from pg_catalog.jsonb_array_elements(g->'items') loop
      if internal.has_exact_json_keys(x,array['post_public_id','status','revision']) is distinct from true
        or internal.plan_is_uuid_v1(x->'post_public_id') is distinct from true
        or x->>'status' not in ('draft','ready','posted','archived')
        or internal.is_json_integer_between(x->'revision',1,2147483647) is distinct from true then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end $$;

do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('internal.trivia_response_valid_v5(text,jsonb)'::regprocedure);
  anchor:='if internal.has_exact_json_keys(p_response,array[''response_schema_version'',''data''])';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing maintenance response dispatch'; end if;
  execute pg_catalog.replace(src,anchor,
    'if p_response->''response_schema_version''=''2''::jsonb then '
    ||'return internal.trivia_maintenance_response_valid_v2(p_name,p_response); end if; '||anchor);
end $$;

-- Existing affected-post semantics, including full (uncapped) mutable effects.
create function internal.trivia_fail_mutable_posts_v2(w bigint,fact bigint,action text)
returns void language plpgsql volatile security invoker set search_path='' as $$
declare p public.posts;
begin
  for p in select pp.* from public.posts pp where pp.workspace_id=w
    and pp.status in ('draft','ready') and exists(select 1 from public.trivia_post_facts j
      where j.workspace_id=w and j.post_id=pp.id and j.fact_id=fact
        and j.is_current and j.allocation_state='allocated') order by pp.id loop
    update public.posts set status='draft',quality_status='failed',revision=p.revision+1,
      ready_at=null,approval_snapshot=null,editorial_checks='{}',
      system_checks=pg_catalog.jsonb_build_object('schema_version',1,'gate_version',1,
        'evaluated_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','server',
        'post_revision',p.revision+1,'content_hash',p.content_hash,'config_version',1,
        'renderer_version',1,'overall_status','failed','checks',pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object('id','trivia.facts.current_verified','severity','blocking',
            'status','failed','expected','eligible current identity','actual',action,
            'evidence',pg_catalog.jsonb_build_array('fact:'||(select public_id::text
              from public.trivia_facts where id=fact and workspace_id=w)))))
      where id=p.id and workspace_id=w;
  end loop;
end $$;

create function api.trivia_reverify_fact(p_request_schema_version integer,
  p_workspace_public_id uuid,p_operation_key uuid,p_fact_public_id uuid,
  p_expected_fact_updated_at text,p_confirmed_claim_text text,p_source_url text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; f public.trivia_facts; r jsonb; state text; message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(1,p_workspace_public_id,p_operation_key,p_fact_public_id);
  if p_request_schema_version is distinct from 2
    or p_expected_fact_updated_at is null
    or p_expected_fact_updated_at !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_fact_updated_at) is distinct from true
    or p_confirmed_claim_text is null or pg_catalog.char_length(pg_catalog.btrim(p_confirmed_claim_text)) not between 1 and 500
    or internal.trivia_web_source_url_v2(p_source_url) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,
    p_operation_key,'trivia_reverify_fact',2,pg_catalog.jsonb_build_object(
      'fact_public_id',p_fact_public_id,'expected_fact_updated_at',p_expected_fact_updated_at,
      'confirmed_claim_text',pg_catalog.btrim(p_confirmed_claim_text),'source_url',p_source_url));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_reverify_fact'); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  f:=internal.trivia_lock_fact_context_v1(o.workspace_id,p_fact_public_id);
  select * into f from public.trivia_facts where workspace_id=o.workspace_id
    and public_id=p_fact_public_id for update;
  if f.updated_at is distinct from p_expected_fact_updated_at::timestamptz then
    raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
  if f.verification_status not in ('needs_review','verified') or exists(
    select 1 from public.trivia_facts sf where sf.workspace_id=o.workspace_id and sf.supersedes_fact_id=f.id) then
    raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
  if internal.trivia_normalize_claim_v1(p_confirmed_claim_text) is distinct from f.normalized_claim then
    raise exception using errcode='P0001',message='FACT_CORRECTION_REQUIRED'; end if;
  insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
    values(o.workspace_id,f.id,p_source_url) on conflict(workspace_id,fact_id)
    do update set source_url=excluded.source_url,updated_at=pg_catalog.clock_timestamp();
  -- CAS belongs to the canonical identity, including URL-only maintenance.
  update public.trivia_facts set updated_at=pg_catalog.clock_timestamp() where id=f.id returning * into f;
  r:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',pg_catalog.jsonb_build_object(
    'fact_public_id',f.public_id,'verification_status',f.verification_status,'source_url',p_source_url,
    'fact_updated_at',internal.iso_timestamp_v1(f.updated_at),
    'affected_posts',internal.trivia_affected_posts_v1(o.workspace_id,f.id),'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_reverify_fact',f.public_id,r);
  return r;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics state=returned_sqlstate,message=message_text;
  perform internal.trivia_rpc_raise_v1(state,message);
end $$;

create function api.trivia_correct_fact(p_request_schema_version integer,
  p_workspace_public_id uuid,p_operation_key uuid,p_fact_public_id uuid,
  p_expected_fact_updated_at text,p_action text,p_correction_reason text,
  p_successor jsonb,p_explicit_correction boolean,p_expected_catalog_version text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; f public.trivia_facts; successor public.trivia_facts; selected bigint;
  r jsonb; catalog bigint; state text; message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(1,p_workspace_public_id,p_operation_key,p_fact_public_id);
  if p_request_schema_version is distinct from 2 or p_explicit_correction is distinct from true
    or p_expected_fact_updated_at is null
    or p_expected_fact_updated_at !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_fact_updated_at) is distinct from true
    or p_action is null or p_action not in ('invalidate','supersede')
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_correction_reason)) is distinct from true
    or (p_action='invalidate' and (p_successor is not null or p_expected_catalog_version is not null))
    or (p_action='supersede' and (p_successor is null or p_expected_catalog_version is null
      or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
      or pg_catalog.char_length(p_expected_catalog_version)>19)) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,
    p_operation_key,'trivia_correct_fact',2,pg_catalog.jsonb_build_object(
      'fact_public_id',p_fact_public_id,'expected_fact_updated_at',p_expected_fact_updated_at,
      'action',p_action,'correction_reason',pg_catalog.btrim(p_correction_reason),
      'successor',p_successor,'explicit_correction',true,
      'expected_catalog_version',p_expected_catalog_version));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_correct_fact'); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  f:=internal.trivia_lock_fact_context_v1(o.workspace_id,p_fact_public_id);
  select * into f from public.trivia_facts where workspace_id=o.workspace_id
    and public_id=p_fact_public_id for update;
  if f.updated_at is distinct from p_expected_fact_updated_at::timestamptz then
    raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
  if f.verification_status not in ('needs_review','verified') or exists(
    select 1 from public.trivia_facts sf where sf.workspace_id=o.workspace_id and sf.supersedes_fact_id=f.id) then
    raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
  if p_action='supersede' then
    select version into catalog from internal.trivia_fact_catalog_v2 where workspace_id=o.workspace_id;
    if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
      raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
    if internal.trivia_normalize_claim_v1(p_successor->>'claim_text')=f.normalized_claim then
      raise exception using errcode='P0001',message='FACT_CORRECTION_REQUIRED'; end if;
    selected:=internal.post_fact_review_v2(o.workspace_id,p_successor,1);
    if selected is not null then
      raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
  end if;
  update public.trivia_facts set verification_status=case p_action when 'invalidate' then 'invalidated' else 'superseded' end,
    correction_reason=pg_catalog.btrim(p_correction_reason),corrected_at=pg_catalog.clock_timestamp(),
    reservation_status='available',reservation_token=null,reserved_for_page_id=null,
    reserved_at=null,reserved_until=null,reservation_context=null where id=f.id;
  if p_action='supersede' then
    insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,
      has_v1_envelope,subject_key,relation_key,object_key,numbers,qualifiers,ontology_version,
      structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,freshness_class,
      risk_class,supersedes_fact_id)
    values(o.workspace_id,p_successor->>'claim_text','',pg_catalog.repeat('0',64),false,
      null,null,null,null,null,null,null,null,null,null,null,null,null,f.id) returning * into successor;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,successor.id,p_successor->>'source_url');
  end if;
  perform internal.trivia_fail_mutable_posts_v2(o.workspace_id,f.id,
    case p_action when 'invalidate' then 'invalidated' else 'superseded' end);
  r:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',pg_catalog.jsonb_build_object(
    'fact_public_id',f.public_id,'old_status',case p_action when 'invalidate' then 'invalidated' else 'superseded' end,
    'successor_public_id',successor.public_id,
    'affected_posts',internal.trivia_affected_posts_v1(o.workspace_id,f.id),'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_correct_fact',f.public_id,r);
  return r;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics state=returned_sqlstate,message=message_text;
  if message='FACT_CATALOG_CONFLICT' then raise; end if;
  perform internal.trivia_rpc_raise_v1(state,message);
end $$;

revoke all on function internal.trivia_maintenance_response_valid_v2(text,jsonb),
  internal.trivia_fail_mutable_posts_v2(bigint,bigint,text) from public,anon,authenticated,service_role;
grant execute on function internal.trivia_maintenance_response_valid_v2(text,jsonb),
  internal.trivia_fail_mutable_posts_v2(bigint,bigint,text) to content_producer_api_owner;
grant create on schema api to content_producer_api_owner;
alter function api.trivia_reverify_fact(integer,uuid,uuid,uuid,text,text,text) owner to content_producer_api_owner;
alter function api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text) owner to content_producer_api_owner;
revoke create on schema api from content_producer_api_owner;
revoke all on function api.trivia_reverify_fact(integer,uuid,uuid,uuid,text,text,text),
  api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text) from public,anon,authenticated,service_role;
grant execute on function api.trivia_reverify_fact(integer,uuid,uuid,uuid,text,text,text),
  api.trivia_correct_fact(integer,uuid,uuid,uuid,text,text,text,jsonb,boolean,text) to authenticated;
