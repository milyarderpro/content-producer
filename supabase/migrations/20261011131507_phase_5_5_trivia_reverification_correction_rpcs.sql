-- CR-012: exact fact CAS, deterministic cross-Page effects, immutable publication.
create function internal.trivia_lock_fact_context_v1(p_workspace bigint,p_fact uuid) returns public.trivia_facts
language plpgsql security invoker set search_path='' as $$
declare f public.trivia_facts; v_page record;
begin
  -- Must be called after the workspace gate and before post/identity/fact locks.
  select * into f from public.trivia_facts where workspace_id=p_workspace and public_id=p_fact;
  if not found then raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
  for v_page in select p.* from public.pages p where p.workspace_id=p_workspace and
    (p.id=f.reserved_for_page_id or exists(select 1 from public.trivia_post_facts j
      where j.workspace_id=p_workspace and j.fact_id=f.id and j.page_id=p.id and j.allocation_state in ('allocated','published')))
    order by p.id for update loop null; end loop;
  perform 1 from public.page_niche_configs n where n.workspace_id=p_workspace and n.niche_key='trivia'
    and (n.page_id=f.reserved_for_page_id or exists(select 1 from public.trivia_post_facts j
      where j.workspace_id=p_workspace and j.fact_id=f.id and j.page_id=n.page_id and j.allocation_state in ('allocated','published')))
    order by n.page_id,n.id for update;
  perform 1 from public.posts p where p.workspace_id=p_workspace and p.status in ('draft','ready')
    and exists(select 1 from public.trivia_post_facts j where j.workspace_id=p_workspace and j.post_id=p.id
      and j.fact_id=f.id and j.allocation_state='allocated') order by p.id for update;
  return f;
end; $$;

create function internal.trivia_affected_posts_v1(p_workspace bigint,p_fact bigint) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_result jsonb:='{}'; v_group text; v_count integer; v_items jsonb;
begin
  foreach v_group in array array['draft','ready','posted'] loop
    select count(*) into v_count from public.posts p where p.workspace_id=p_workspace
      and (p.status=v_group or (v_group='posted' and p.status='archived')) and exists(
        select 1 from public.trivia_post_facts j where j.workspace_id=p_workspace and j.post_id=p.id and j.fact_id=p_fact
          and j.allocation_state in ('allocated','published'));
    select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('post_public_id',public_id,'status',status,'revision',revision)
      order by public_id),'[]') into v_items from (select p.* from public.posts p where p.workspace_id=p_workspace
      and (p.status=v_group or (v_group='posted' and p.status='archived')) and exists(
        select 1 from public.trivia_post_facts j where j.workspace_id=p_workspace and j.post_id=p.id and j.fact_id=p_fact
          and j.allocation_state in ('allocated','published')) order by p.public_id limit 50) limited;
    v_result:=v_result||pg_catalog.jsonb_build_object(v_group,pg_catalog.jsonb_build_object('count',v_count,'items',v_items,'truncated',v_count>50));
  end loop;
  return v_result;
end; $$;

create function api.trivia_reverify_fact(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,
  p_fact_public_id uuid,p_expected_fact_updated_at timestamptz,p_confirmed_claim_text text,p_sources jsonb,
  p_freshness_class text,p_as_of_date date,p_requested_expires_at timestamptz,p_risk_class text,p_review_note text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; f public.trivia_facts; v_now timestamptz; v_expiry timestamptz; v_response jsonb; v_affected jsonb;
  v_sources jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_fact_public_id);
  if p_expected_fact_updated_at is null or not pg_catalog.isfinite(p_expected_fact_updated_at)
    or p_requested_expires_at is null or not pg_catalog.isfinite(p_requested_expires_at)
    or p_confirmed_claim_text is null or pg_catalog.char_length(pg_catalog.btrim(p_confirmed_claim_text)) not between 1 and 500
    or p_freshness_class is null or p_freshness_class not in ('stable','periodic','volatile')
    or p_risk_class is null or p_risk_class not in ('standard','sensitive')
    or p_review_note is null or pg_catalog.char_length(pg_catalog.btrim(p_review_note)) not between 1 and 1000 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_valid_source_evidence_v2(p_sources) is distinct from true then
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
  select pg_catalog.jsonb_agg(value||pg_catalog.jsonb_build_object('accessed_at',internal.iso_timestamp_v1((value->>'accessed_at')::timestamptz)) order by ordinal)
    into v_sources from pg_catalog.jsonb_array_elements(p_sources) with ordinality s(value,ordinal);
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'trivia_reverify_fact',1,
    pg_catalog.jsonb_build_object('fact_public_id',p_fact_public_id,'expected_fact_updated_at',internal.iso_timestamp_v1(p_expected_fact_updated_at),
      'confirmed_claim_text',pg_catalog.btrim(p_confirmed_claim_text),'sources',v_sources,'freshness_class',p_freshness_class,
      'as_of_date',p_as_of_date,'requested_expires_at',internal.iso_timestamp_v1(p_requested_expires_at),'risk_class',p_risk_class,'review_note',pg_catalog.btrim(p_review_note)));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_reverify_fact'); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id); f:=internal.trivia_lock_fact_context_v1(o.workspace_id,p_fact_public_id);
  perform internal.trivia_lock_identities_v1(o.workspace_id,pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'claim_text',f.claim_text,'subject_key',f.subject_key,'relation_key',f.relation_key,'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers)));
  select * into f from public.trivia_facts where workspace_id=o.workspace_id and public_id=p_fact_public_id for update;
  if f.updated_at is distinct from p_expected_fact_updated_at then raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
  if f.verification_status<>'verified' then raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
  if internal.trivia_normalize_claim_v1(p_confirmed_claim_text) is distinct from f.normalized_claim then
    raise exception using errcode='P0001',message='FACT_CORRECTION_REQUIRED'; end if;
  v_now:=pg_catalog.clock_timestamp(); v_expiry:=internal.trivia_effective_expiry_v1(v_sources,p_freshness_class,p_risk_class,
    p_as_of_date,p_requested_expires_at,v_now,f.relation_key,p_review_note);
  v_affected:=internal.trivia_affected_posts_v1(o.workspace_id,f.id);
  update public.trivia_facts set source_data=v_sources,freshness_class=p_freshness_class,risk_class=p_risk_class,
    verified_at=v_now,as_of_date=p_as_of_date,expires_at=v_expiry,review_note=pg_catalog.btrim(p_review_note)
    where id=f.id returning * into f;
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'fact_public_id',f.public_id,'verification_status',f.verification_status,'verified_at',internal.iso_timestamp_v1(f.verified_at),
    'expires_at',internal.iso_timestamp_v1(f.expires_at),'fact_updated_at',internal.iso_timestamp_v1(f.updated_at),'affected_posts',v_affected,'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_reverify_fact',f.public_id,v_response); return v_response;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.trivia_rpc_raise_v1(v_state,v_message);
end; $$;

create function api.trivia_correct_fact(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,
  p_fact_public_id uuid,p_expected_fact_updated_at timestamptz,p_action text,p_correction_reason text,
  p_successor jsonb,p_explicit_correction boolean)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; f public.trivia_facts; p public.posts; v_successor jsonb; c jsonb; q record;
  v_affected jsonb; v_response jsonb; v_successor_id uuid; v_now timestamptz; v_expiry timestamptz; v_group text;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_fact_public_id);
  if p_expected_fact_updated_at is null or not pg_catalog.isfinite(p_expected_fact_updated_at)
    or p_action is null or p_action not in ('invalidate','supersede') or p_explicit_correction is distinct from true
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_correction_reason)) is distinct from true
    or (p_action='invalidate' and p_successor is not null) or (p_action='supersede' and p_successor is null) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if p_action='supersede' then v_successor:=internal.trivia_fact_input_v1(p_successor,false); end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'trivia_correct_fact',1,
    pg_catalog.jsonb_build_object('fact_public_id',p_fact_public_id,'expected_fact_updated_at',internal.iso_timestamp_v1(p_expected_fact_updated_at),
      'action',p_action,'correction_reason',pg_catalog.btrim(p_correction_reason),'successor',v_successor,'explicit_correction',true));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_correct_fact'); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id); f:=internal.trivia_lock_fact_context_v1(o.workspace_id,p_fact_public_id);
  perform internal.trivia_lock_identities_v1(o.workspace_id,pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
    'claim_text',f.claim_text,'subject_key',f.subject_key,'relation_key',f.relation_key,'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers))
    ||case when v_successor is null then '[]'::jsonb else pg_catalog.jsonb_build_array(v_successor->'candidate') end);
  perform 1 from public.trivia_facts where workspace_id=o.workspace_id order by id for update;
  select * into f from public.trivia_facts where workspace_id=o.workspace_id and public_id=p_fact_public_id;
  if f.updated_at is distinct from p_expected_fact_updated_at then raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
  if f.verification_status<>'verified' then raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
  v_affected:=internal.trivia_affected_posts_v1(o.workspace_id,f.id);
  if p_action='invalidate' then perform internal.trivia_invalidate_fact_v1(o.workspace_id,f.public_id,pg_catalog.btrim(p_correction_reason));
  else
    c:=v_successor->'candidate';
    if internal.trivia_build_structured_key_v3(c->>'subject_key',c->>'relation_key',c->>'object_key',c->'numbers',c->'qualifiers')=f.structured_key
      or internal.trivia_normalize_claim_v1(c->>'claim_text')=f.normalized_claim then
      raise exception using errcode='P0001',message='FACT_CORRECTION_REQUIRED'; end if;
    select * into q from internal.trivia_resolve_fact_v1(o.workspace_id,v_successor,false,f.id);
    if q.fact_id is not null then raise exception using errcode='P0001',message='FACT_CORRECTION_CONFLICT'; end if;
    v_now:=pg_catalog.clock_timestamp(); v_expiry:=internal.trivia_effective_expiry_v1(v_successor->'sources',v_successor->>'freshness_class',
      v_successor->>'risk_class',(v_successor->>'as_of_date')::date,(v_successor->>'requested_expires_at')::timestamptz,v_now,c->>'relation_key',v_successor->>'verification_note');
    select successor_public_id into v_successor_id from internal.trivia_correct_fact_v1(o.workspace_id,f.public_id,
      c->>'claim_text',c->>'subject_key',c->>'relation_key',c->>'object_key',c->'numbers',c->'qualifiers',c->>'topic_key',
      q.review_snapshot,v_successor->'sources',v_successor->>'freshness_class',v_successor->>'risk_class',v_now,
      (v_successor->>'as_of_date')::date,v_expiry,v_successor->>'verification_note',pg_catalog.btrim(p_correction_reason));
  end if;
  -- Every allocated mutable post, not only the capped response subset, changes once.
  for p in select * from public.posts pp where pp.workspace_id=o.workspace_id and pp.status in ('draft','ready')
    and exists(select 1 from public.trivia_post_facts j where j.workspace_id=o.workspace_id and j.post_id=pp.id
      and j.fact_id=f.id and j.allocation_state='allocated') order by pp.id loop
    update public.posts set status='draft',quality_status='failed',revision=p.revision+1,ready_at=null,
      approval_snapshot=null,editorial_checks='{}',system_checks=pg_catalog.jsonb_build_object('schema_version',1,'gate_version',1,
        'evaluated_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','server','post_revision',p.revision+1,
        'content_hash',p.content_hash,'config_version',1,'renderer_version',1,'overall_status','failed','checks',pg_catalog.jsonb_build_array(
          pg_catalog.jsonb_build_object('id','trivia.facts.current_verified','severity','blocking','status','failed',
            'expected','current verified fact','actual',case p_action when 'invalidate' then 'invalidated' else 'superseded' end,
            'evidence',pg_catalog.jsonb_build_array('fact:'||f.public_id::text)))) where id=p.id;
  end loop;
  foreach v_group in array array['draft','ready'] loop
    v_affected:=pg_catalog.jsonb_set(v_affected,array[v_group,'items'],(select coalesce(pg_catalog.jsonb_agg(
      value||pg_catalog.jsonb_build_object('status','draft','revision',(value->>'revision')::integer+1) order by value->>'post_public_id'),'[]')
      from pg_catalog.jsonb_array_elements(v_affected->v_group->'items')));
  end loop;
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('fact_public_id',f.public_id,
    'old_status',case p_action when 'invalidate' then 'invalidated' else 'superseded' end,'successor_public_id',v_successor_id,'affected_posts',v_affected,'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_correct_fact',f.public_id,v_response); return v_response;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.trivia_rpc_raise_v1(v_state,v_message);
end; $$;

grant create on schema api,internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f,n.nspname s from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='api' and p.proname=any(array['trivia_reverify_fact','trivia_correct_fact']))
      or (n.nspname='internal' and p.proname=any(array['trivia_lock_fact_context_v1','trivia_affected_posts_v1'])) loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
    if r.s='api' then execute pg_catalog.format('grant execute on function %s to authenticated',r.f); end if;
  end loop;
end $$;
revoke create on schema api,internal from content_producer_api_owner;
