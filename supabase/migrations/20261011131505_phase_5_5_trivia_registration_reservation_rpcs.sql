-- CR-012: strict composition, token-free replay, source-free public search.
create function internal.trivia_fact_input_v1(p_input jsonb,p_position boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_keys text[]:=array['candidate','dedup_reviews','sources','freshness_class','as_of_date',
  'requested_expires_at','risk_class','verification_note']; v_result jsonb; v_review jsonb;
begin
  if p_position then v_keys:=v_keys||array['position']; end if;
  if internal.has_exact_json_keys(p_input,v_keys) is distinct from true
    or (p_position and internal.is_json_integer_between(p_input->'position',1,9) is distinct from true)
    or pg_catalog.jsonb_typeof(p_input->'dedup_reviews') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_input->'as_of_date') not in ('string','null')
    or pg_catalog.jsonb_typeof(p_input->'requested_expires_at') is distinct from 'string' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_result:=p_input||pg_catalog.jsonb_build_object('candidate',internal.trivia_candidate_v1(p_input->'candidate'));
  v_review:=pg_catalog.jsonb_build_object('schema_version',1,'identity_schema_version',1,
    'reviewed_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','chatgpt','decisions',p_input->'dedup_reviews');
  if internal.is_valid_dedup_review_snapshot_v2(v_review) is distinct from true
    or exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'dedup_reviews') group by value->>'candidate_fact_public_id' having count(*)>1) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_valid_source_evidence_v2(p_input->'sources') is distinct from true then
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
  if internal.trivia_is_valid_rfc3339_v1(p_input->>'requested_expires_at') is distinct from true
    or (p_input->>'as_of_date' is not null and internal.trivia_is_valid_date_text_v1(p_input->>'as_of_date') is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_result:=v_result||pg_catalog.jsonb_build_object('requested_expires_at',internal.iso_timestamp_v1((p_input->>'requested_expires_at')::timestamptz),
    'verification_note',pg_catalog.btrim(p_input->>'verification_note'),'sources',(select pg_catalog.jsonb_agg(value||
      pg_catalog.jsonb_build_object('accessed_at',internal.iso_timestamp_v1((value->>'accessed_at')::timestamptz)) order by ordinal)
      from pg_catalog.jsonb_array_elements(p_input->'sources') with ordinality s(value,ordinal)));
  -- Time-relative eligibility is checked only after ledger replay and business locks.
  if v_result->>'freshness_class' is null or v_result->>'freshness_class' not in ('stable','periodic','volatile')
    or v_result->>'risk_class' is null or v_result->>'risk_class' not in ('standard','sensitive')
    or pg_catalog.jsonb_typeof(v_result->'verification_note') is distinct from 'string'
    or pg_catalog.char_length(v_result->>'verification_note') not between 1 and 1000 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  return v_result;
end; $$;

create function internal.trivia_resolve_fact_v1(p_workspace bigint,p_input jsonb,p_create boolean default true,
  p_exclude bigint default null)
returns table(fact_id bigint,canonical_action text,review_snapshot jsonb)
language plpgsql security invoker set search_path='' as $$
declare c jsonb:=p_input->'candidate'; v_normal text; v_struct text; v_claimhash text; v_structhash text;
  f public.trivia_facts; v_match public.trivia_facts; r jsonb; v_candidate record; v_difference text; v_valid boolean;
  v_expiry timestamptz; v_now timestamptz:=pg_catalog.clock_timestamp(); v_same bigint;
begin
  v_normal:=internal.trivia_normalize_claim_v1(c->>'claim_text');
  v_struct:=internal.trivia_build_structured_key_v3(c->>'subject_key',c->>'relation_key',c->>'object_key',c->'numbers',c->'qualifiers');
  v_claimhash:=internal.trivia_claim_hash_v1(v_normal); v_structhash:=internal.trivia_structured_hash_v1(v_struct);
  review_snapshot:=pg_catalog.jsonb_build_object('schema_version',1,'identity_schema_version',1,
    'reviewed_at',internal.iso_timestamp_v1(v_now),'evaluator','chatgpt','decisions',p_input->'dedup_reviews');
  for f in select * from public.trivia_facts where workspace_id=p_workspace and verification_status in ('needs_review','verified')
    and (claim_hash=v_claimhash or structured_hash=v_structhash) and (p_exclude is null or id<>p_exclude) order by id loop
    if (f.claim_hash=v_claimhash and f.normalized_claim<>v_normal) or (f.structured_hash=v_structhash and f.structured_key<>v_struct) then
      raise exception using errcode='P0001',message='FACT_HASH_COLLISION'; end if;
    if f.normalized_claim=v_normal or (f.structured_key=v_struct and f.structured_match_eligible
      and internal.trivia_structured_match_eligible_v1(c->>'relation_key',c->'numbers',c->'qualifiers',1)) then
      if v_match.id is not null and v_match.id<>f.id then raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
      v_match:=f;
    elsif f.structured_key=v_struct and not exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'dedup_reviews')
      where value->>'candidate_fact_public_id'=f.public_id::text and value->>'decision'='same') then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED';
    end if;
  end loop;
  for r in select value from pg_catalog.jsonb_array_elements(p_input->'dedup_reviews') loop
    select * into f from public.trivia_facts where workspace_id=p_workspace
      and public_id=(r->>'candidate_fact_public_id')::uuid and verification_status in ('needs_review','verified');
    if not found then raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
    if r->>'decision'='same' then
      if f.id=p_exclude or f.structured_key<>v_struct or pg_catalog.jsonb_array_length(r->'material_differences')<>0
        or (v_same is not null and v_same<>f.id) or (v_match.id is not null and v_match.id<>f.id) then
        raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
      v_same:=f.id; v_match:=f;
    else
      if f.normalized_claim=v_normal or f.structured_key=v_struct or pg_catalog.jsonb_array_length(r->'material_differences')=0 then
        raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
      for v_difference in select pg_catalog.jsonb_array_elements_text(r->'material_differences') loop
        v_valid:=case v_difference
          when 'relation' then f.relation_key<>c->>'relation_key'
          when 'number' then f.numbers<>c->'numbers'
          when 'unit' then (select pg_catalog.jsonb_agg(value->'unit' order by value::text) from pg_catalog.jsonb_array_elements(f.numbers))
            is distinct from (select pg_catalog.jsonb_agg(value->'unit' order by value::text) from pg_catalog.jsonb_array_elements(c->'numbers'))
          when 'other' then f.subject_key<>c->>'subject_key' or f.object_key<>c->>'object_key'
          else f.qualifiers->v_difference is distinct from c->'qualifiers'->v_difference end;
        if not coalesce(v_valid,false) then raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
      end loop;
    end if;
  end loop;
  if v_match.id is null then
    for v_candidate in select * from internal.trivia_candidates_v3(p_workspace,c,p_input->'sources',20) where strong and (p_exclude is null or fact_id<>p_exclude) loop
      if not exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'dedup_reviews') r(value)
        join public.trivia_facts f on f.public_id=(r.value->>'candidate_fact_public_id')::uuid and f.workspace_id=p_workspace
        where f.id=v_candidate.fact_id and r.value->>'decision'='distinct') then
        raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
    end loop;
  end if;
  if not p_create then fact_id:=v_match.id; canonical_action:='created_new'; return next; return; end if;
  v_expiry:=internal.trivia_effective_expiry_v1(p_input->'sources',p_input->>'freshness_class',p_input->>'risk_class',
    (p_input->>'as_of_date')::date,(p_input->>'requested_expires_at')::timestamptz,v_now,c->>'relation_key',p_input->>'verification_note');
  if v_match.id is null then
    insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,claim_hash,subject_key,relation_key,object_key,
      numbers,qualifiers,structured_key,structured_hash,topic_key,dedup_review_snapshot,source_data,verification_status,
      freshness_class,risk_class,verified_at,as_of_date,expires_at,review_note)
    values(p_workspace,c->>'claim_text','',pg_catalog.repeat('0',64),c->>'subject_key',c->>'relation_key',c->>'object_key',
      c->'numbers',c->'qualifiers','',pg_catalog.repeat('0',64),c->>'topic_key',review_snapshot,p_input->'sources','verified',
      p_input->>'freshness_class',p_input->>'risk_class',v_now,(p_input->>'as_of_date')::date,v_expiry,p_input->>'verification_note')
      returning id into fact_id;
    canonical_action:='created_new';
  else
    fact_id:=v_match.id;
    if v_match.verification_status='needs_review' or v_match.expires_at<=v_now then
      update public.trivia_facts set source_data=p_input->'sources',verification_status='verified',
        freshness_class=p_input->>'freshness_class',risk_class=p_input->>'risk_class',verified_at=v_now,
        as_of_date=(p_input->>'as_of_date')::date,expires_at=v_expiry,review_note=p_input->>'verification_note' where id=fact_id;
      canonical_action:='refreshed_existing';
    else canonical_action:='matched_existing'; end if;
  end if;
  return next;
end; $$;

create function internal.trivia_response_valid_v5(p_name text,p_response jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb:=p_response->'data'; v_item jsonb; v_group text; v_keys text[];
begin
  if internal.has_exact_json_keys(p_response,array['response_schema_version','data']) is distinct from true
    or p_response->'response_schema_version' is distinct from '1'::jsonb or d->'replayed' is distinct from 'false'::jsonb then return false; end if;
  v_keys:=case p_name
    when 'trivia_register_and_reserve_facts' then array['page_public_id','fact_reuse_scope','reserved_until','facts','replayed']
    when 'trivia_release_facts' then array['released_fact_public_ids','already_inactive_count','replayed']
    when 'trivia_reverify_fact' then array['fact_public_id','verification_status','verified_at','expires_at','fact_updated_at','affected_posts','replayed']
    when 'trivia_correct_fact' then array['fact_public_id','old_status','successor_public_id','affected_posts','replayed'] else null end;
  if v_keys is null or internal.has_exact_json_keys(d,v_keys) is distinct from true then return false; end if;
  if p_name='trivia_register_and_reserve_facts' then
    if internal.trivia_is_valid_uuid_v4_v1(d->>'page_public_id') is distinct from true
      or d->>'fact_reuse_scope' not in ('workspace_unique','page_unique')
      or internal.trivia_is_valid_rfc3339_v1(d->>'reserved_until') is distinct from true
      or pg_catalog.jsonb_typeof(d->'facts') is distinct from 'array' or pg_catalog.jsonb_array_length(d->'facts') not between 1 and 9 then return false; end if;
    for v_item in select value from pg_catalog.jsonb_array_elements(d->'facts') loop
      if internal.has_exact_json_keys(v_item,array['position','fact_public_id','canonical_claim','canonical_action','verification_status','expires_at']) is distinct from true
        or internal.is_json_integer_between(v_item->'position',1,9) is distinct from true
        or internal.trivia_is_valid_uuid_v4_v1(v_item->>'fact_public_id') is distinct from true
        or pg_catalog.jsonb_typeof(v_item->'canonical_claim') is distinct from 'string'
        or pg_catalog.char_length(v_item->>'canonical_claim') not between 1 and 500
        or v_item->>'canonical_action' not in ('matched_existing','created_new','refreshed_existing')
        or v_item->>'verification_status' is distinct from 'verified'
        or internal.trivia_is_valid_rfc3339_v1(v_item->>'expires_at') is distinct from true then return false; end if;
    end loop;
    if exists(select 1 from pg_catalog.jsonb_array_elements(d->'facts') with ordinality t(value,n) where (value->>'position')::integer<>n)
      or (select count(distinct value->>'fact_public_id') from pg_catalog.jsonb_array_elements(d->'facts'))<>pg_catalog.jsonb_array_length(d->'facts') then return false; end if;
  elsif p_name='trivia_release_facts' then
    if internal.is_json_integer_between(d->'already_inactive_count',0,9) is distinct from true
      or pg_catalog.jsonb_typeof(d->'released_fact_public_ids') is distinct from 'array'
      or pg_catalog.jsonb_array_length(d->'released_fact_public_ids')>9 then return false; end if;
    for v_item in select value from pg_catalog.jsonb_array_elements(d->'released_fact_public_ids') loop
      if internal.trivia_is_valid_uuid_v4_v1(v_item#>>'{}') is distinct from true then return false; end if;
    end loop;
  else
    if internal.trivia_is_valid_uuid_v4_v1(d->>'fact_public_id') is distinct from true then return false; end if;
    if p_name='trivia_reverify_fact' then
      if d->>'verification_status' is distinct from 'verified' or internal.trivia_is_valid_rfc3339_v1(d->>'verified_at') is distinct from true
        or internal.trivia_is_valid_rfc3339_v1(d->>'expires_at') is distinct from true
        or internal.trivia_is_valid_rfc3339_v1(d->>'fact_updated_at') is distinct from true then return false; end if;
    elsif d->>'old_status' not in ('invalidated','superseded') or (d->'successor_public_id'<>'null'::jsonb
      and internal.trivia_is_valid_uuid_v4_v1(d->>'successor_public_id') is distinct from true) then return false; end if;
    if internal.has_exact_json_keys(d->'affected_posts',array['draft','ready','posted']) is distinct from true then return false; end if;
    foreach v_group in array array['draft','ready','posted'] loop
      v_item:=d->'affected_posts'->v_group;
      if internal.has_exact_json_keys(v_item,array['count','items','truncated']) is distinct from true
        or internal.is_json_integer_between(v_item->'count',0,2147483647) is distinct from true
        or pg_catalog.jsonb_typeof(v_item->'truncated') is distinct from 'boolean'
        or pg_catalog.jsonb_typeof(v_item->'items') is distinct from 'array' or pg_catalog.jsonb_array_length(v_item->'items')>50
        or (v_item->>'count')::integer<pg_catalog.jsonb_array_length(v_item->'items') then return false; end if;
      for v_item in select value from pg_catalog.jsonb_array_elements(v_item->'items') loop
        if internal.has_exact_json_keys(v_item,array['post_public_id','status','revision']) is distinct from true
          or internal.trivia_is_valid_uuid_v4_v1(v_item->>'post_public_id') is distinct from true
          or v_item->>'status' not in ('draft','ready','posted','archived')
          or internal.is_json_integer_between(v_item->'revision',1,2147483647) is distinct from true then return false; end if;
      end loop;
    end loop;
  end if;
  return true;
exception when others then return false;
end; $$;

create function internal.trivia_complete_v5(p_operation bigint,p_name text,p_target uuid,p_response jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare v_response jsonb:=p_response; v_snapshot jsonb;
begin
  if p_name='trivia_register_and_reserve_facts' then v_response:=pg_catalog.jsonb_set(v_response,'{data}',v_response->'data'-'reservation_token'); end if;
  v_snapshot:=pg_catalog.jsonb_build_object('schema_version',5,'operation_name',p_name,'target_public_id',p_target,'response',v_response);
  if internal.trivia_response_valid_v5(p_name,v_response) is distinct from true or pg_catalog.octet_length(v_snapshot::text)>65536 then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  update internal.operation_ledger set response_snapshot=v_snapshot,completed_at=pg_catalog.clock_timestamp(),
    target_type=case when p_name in ('trivia_register_and_reserve_facts','trivia_release_facts') then 'page' else 'fact' end,
    target_public_id=p_target where id=p_operation and actor_user_id=internal.request_actor_user_id_v1()
      and operation_name=p_name and completed_at is null;
  if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end; $$;

create function internal.trivia_replay_v5(p_operation bigint,p_name text,p_token uuid default null) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare s jsonb; v_response jsonb;
begin
  select response_snapshot into s from internal.operation_ledger where id=p_operation and operation_name=p_name
    and actor_user_id=internal.request_actor_user_id_v1() and completed_at is not null;
  if internal.has_exact_json_keys(s,array['schema_version','operation_name','target_public_id','response']) is distinct from true
    or s->'schema_version' is distinct from '5'::jsonb or s->>'operation_name' is distinct from p_name
    or internal.trivia_is_valid_uuid_v4_v1(s->>'target_public_id') is distinct from true
    or pg_catalog.octet_length(s::text)>65536 or internal.trivia_response_valid_v5(p_name,s->'response') is distinct from true then
    raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
  v_response:=pg_catalog.jsonb_set(s->'response','{data,replayed}','true'::jsonb);
  if p_name='trivia_register_and_reserve_facts' then
    if p_token is null then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
    v_response:=pg_catalog.jsonb_set(v_response,'{data,reservation_token}',pg_catalog.to_jsonb(p_token));
  end if;
  return v_response;
end; $$;

create function api.trivia_find_similar_facts(p_request_schema_version integer,p_workspace_public_id uuid,
  p_page_public_id uuid,p_candidates jsonb,p_max_matches_per_candidate integer default 10)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare w record; c jsonb; f public.trivia_facts; q record; v_page bigint; v_matches jsonb; v_results jsonb:='[]';
  v_review boolean; v_state text; v_message text; v_used jsonb; v_eligibility text;
begin
  perform internal.begin_read_v1(p_request_schema_version,'expensive_read');
  select * into w from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  if pg_catalog.jsonb_typeof(p_candidates) is distinct from 'array' or pg_catalog.jsonb_array_length(p_candidates) not between 1 and 9
    or p_max_matches_per_candidate is null or p_max_matches_per_candidate not between 1 and 20
    or (select count(distinct value->>'candidate_key') from pg_catalog.jsonb_array_elements(p_candidates))<>pg_catalog.jsonb_array_length(p_candidates) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select id into v_page from public.pages where workspace_id=w.workspace_id and public_id=p_page_public_id;
  if not found then raise exception using errcode='P0001',message='PAGE_NOT_FOUND'; end if;
  if not exists(select 1 from public.pages p join public.page_niche_configs n on n.page_id=p.id and n.workspace_id=p.workspace_id
    where p.id=v_page and p.is_active and n.niche_key='trivia' and n.is_enabled) then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  for c in select value from pg_catalog.jsonb_array_elements(p_candidates) loop
    c:=internal.trivia_candidate_v1(c); v_matches:='[]'; v_review:=false;
    for q in select * from internal.trivia_candidates_v3(w.workspace_id,c,'[]',p_max_matches_per_candidate) loop
      select * into f from public.trivia_facts where id=q.fact_id and workspace_id=w.workspace_id;
      select coalesce(pg_catalog.jsonb_agg(public_id order by public_id),'[]') into v_used from
        (select distinct p.public_id from public.trivia_post_facts j join public.pages p on p.id=j.page_id
          where j.workspace_id=w.workspace_id and j.fact_id=f.id and j.allocation_state in ('allocated','published') order by p.public_id limit 50) used;
      v_eligibility:=case
        when f.verification_status<>'verified' or f.expires_at<=pg_catalog.clock_timestamp() then 'not_eligible'
        when f.reservation_status='reserved' and f.reserved_until>pg_catalog.clock_timestamp() then 'actively_reserved'
        when exists(select 1 from public.trivia_post_facts j where j.fact_id=f.id and j.page_id=v_page and j.allocation_state in ('allocated','published')) then 'page_blocked'
        when exists(select 1 from public.page_niche_configs n where n.page_id=v_page and n.niche_key='trivia' and n.config->>'fact_reuse_scope'='workspace_unique')
          and pg_catalog.jsonb_array_length(v_used)>0 then 'workspace_blocked' else 'eligible' end;
      v_review:=v_review or (q.strong and not(q.signals ? 'exact_claim' or q.signals ? 'exact_structured'));
      v_matches:=v_matches||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('fact_public_id',f.public_id,'claim_text',f.claim_text,
        'status',f.verification_status,'freshness',pg_catalog.jsonb_build_object('verified_at',internal.iso_timestamp_v1(f.verified_at),
          'expires_at',internal.iso_timestamp_v1(f.expires_at),'fact_updated_at',internal.iso_timestamp_v1(f.updated_at)),
        'topic_key',f.topic_key,'signals',(select coalesce(pg_catalog.jsonb_agg(key order by key),'[]') from pg_catalog.jsonb_object_keys(q.signals) key),
        'score_components',q.score_components,'material_identity',pg_catalog.jsonb_build_object('subject_key',f.subject_key,'relation_key',f.relation_key,
          'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers),'reuse_eligibility',v_eligibility,'used_on_page_public_ids',v_used));
    end loop;
    v_results:=v_results||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('candidate_key',c->>'candidate_key',
      'normalized_preview',internal.trivia_normalize_claim_v1(c->>'claim_text'),'matches',v_matches,'review_required',v_review));
  end loop;
  return pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('candidates',v_results));
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.trivia_rpc_raise_v1(v_state,v_message);
end; $$;

create function api.trivia_register_and_reserve_facts(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,
  p_page_public_id uuid,p_reservation_token uuid,p_expected_config_updated_at timestamptz,p_fact_reuse_scope text,
  p_reservation_ttl_minutes integer,p_facts jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; n public.page_niche_configs; h internal.trivia_reservation_sets; x jsonb; v_facts jsonb:='[]'; v_candidates jsonb;
  q record; f public.trivia_facts; v_ids uuid[]:='{}'; v_result jsonb:='[]'; v_time timestamptz; v_until timestamptz;
  v_context jsonb; v_response jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_page_public_id);
  if p_reservation_token is null or internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text) is distinct from true
    or p_expected_config_updated_at is null or not pg_catalog.isfinite(p_expected_config_updated_at)
    or p_fact_reuse_scope is null or p_fact_reuse_scope not in ('workspace_unique','page_unique')
    or p_reservation_ttl_minutes is null or p_reservation_ttl_minutes not between 5 and 120
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array' or pg_catalog.jsonb_array_length(p_facts) not between 1 and 9 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  for x in select value from pg_catalog.jsonb_array_elements(p_facts) order by (value->>'position')::integer loop
    v_facts:=v_facts||pg_catalog.jsonb_build_array(internal.trivia_fact_input_v1(x,true));
  end loop;
  if exists(select 1 from pg_catalog.jsonb_array_elements(v_facts) with ordinality t(value,n) where (value->>'position')::integer<>n)
    or (select count(distinct value->'candidate'->>'candidate_key') from pg_catalog.jsonb_array_elements(v_facts))<>pg_catalog.jsonb_array_length(v_facts) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'trivia_register_and_reserve_facts',1,
    pg_catalog.jsonb_build_object('page_public_id',p_page_public_id,'reservation_token',p_reservation_token,
      'expected_config_updated_at',internal.iso_timestamp_v1(p_expected_config_updated_at),'fact_reuse_scope',p_fact_reuse_scope,
      'reservation_ttl_minutes',p_reservation_ttl_minutes,'facts',v_facts));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_register_and_reserve_facts',p_reservation_token); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  n:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id);
  if n.updated_at is distinct from p_expected_config_updated_at or n.config->>'fact_reuse_scope' is distinct from p_fact_reuse_scope then
    raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
  select * into h from internal.trivia_reservation_sets where workspace_id=o.workspace_id
    and token_fingerprint=internal.trivia_token_fingerprint_v1(o.workspace_id,p_reservation_token);
  if found and (h.page_id<>n.page_id or h.request_hash<>o.request_hash) then
    raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
  select pg_catalog.jsonb_agg(value->'candidate') into v_candidates from pg_catalog.jsonb_array_elements(v_facts);
  perform internal.trivia_lock_identities_v1(o.workspace_id,v_candidates);
  -- The workspace gate freezes canonical discovery; lock the full current set before any insert/refresh.
  perform 1 from public.trivia_facts where workspace_id=o.workspace_id order by id for update;
  if h.id is not null and (h.reserved_until<=pg_catalog.clock_timestamp() or
    (select count(*) from public.trivia_facts where workspace_id=o.workspace_id and reservation_token=p_reservation_token
      and reservation_status='reserved' and public_id=any(h.ordered_fact_public_ids))<>pg_catalog.cardinality(h.ordered_fact_public_ids)) then
    raise exception using errcode='P0001',message='FACT_RESERVATION_EXPIRED'; end if;
  for x in select value from pg_catalog.jsonb_array_elements(v_facts) loop
    select * into q from internal.trivia_resolve_fact_v1(o.workspace_id,x);
    select * into f from public.trivia_facts where id=q.fact_id;
    if f.public_id=any(v_ids) then raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
    if f.verification_status<>'verified' then raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
    if f.expires_at<=pg_catalog.clock_timestamp() then raise exception using errcode='P0001',message='FACT_FRESHNESS_EXPIRED'; end if;
    if f.reservation_status='reserved' and f.reserved_until>pg_catalog.clock_timestamp() and f.reservation_token<>p_reservation_token then
      raise exception using errcode='P0001',message='FACT_RESERVATION_CONFLICT'; end if;
    if exists(select 1 from public.trivia_post_facts j where j.workspace_id=o.workspace_id and j.fact_id=f.id
      and j.allocation_state in ('allocated','published') and (p_fact_reuse_scope='workspace_unique' or j.page_id=n.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
    v_ids:=pg_catalog.array_append(v_ids,f.public_id);
    v_result:=v_result||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('position',(x->>'position')::integer,
      'fact_public_id',f.public_id,'canonical_claim',f.claim_text,'canonical_action',q.canonical_action,
      'verification_status','verified','expires_at',internal.iso_timestamp_v1(f.expires_at)));
  end loop;
  if h.id is not null and h.ordered_fact_public_ids is distinct from v_ids then
    raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
  v_time:=coalesce(h.reserved_at,pg_catalog.clock_timestamp()); v_until:=coalesce(h.reserved_until,v_time+pg_catalog.make_interval(mins=>p_reservation_ttl_minutes));
  v_context:=pg_catalog.jsonb_build_object('schema_version',1,'actor_user_id',internal.request_actor_user_id_v1(),
    'workspace_id',o.workspace_id,'page_id',n.page_id,'niche_key','trivia','fact_reuse_scope',p_fact_reuse_scope,
    'config_schema_version',1,'config_updated_at',internal.iso_timestamp_v1(n.updated_at),'ordered_fact_public_ids',pg_catalog.to_jsonb(v_ids),
    'request_hash',o.request_hash,'ttl_minutes',p_reservation_ttl_minutes,'reserved_at',internal.iso_timestamp_v1(v_time),'reserved_until',internal.iso_timestamp_v1(v_until));
  update public.trivia_facts set reservation_status='reserved',reservation_token=p_reservation_token,reserved_for_page_id=n.page_id,
    reserved_at=v_time,reserved_until=v_until,reservation_context=v_context where workspace_id=o.workspace_id and public_id=any(v_ids);
  if h.id is null then insert into internal.trivia_reservation_sets(workspace_id,page_id,operation_id,actor_user_id,token_fingerprint,
    request_hash,ordered_fact_public_ids,config_updated_at,reuse_scope,reserved_at,reserved_until,ttl_minutes)
    values(o.workspace_id,n.page_id,o.operation_id,internal.request_actor_user_id_v1(),internal.trivia_token_fingerprint_v1(o.workspace_id,p_reservation_token),
      o.request_hash,v_ids,n.updated_at,p_fact_reuse_scope,v_time,v_until,p_reservation_ttl_minutes); end if;
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object('reservation_token',p_reservation_token,
    'page_public_id',p_page_public_id,'fact_reuse_scope',p_fact_reuse_scope,'reserved_until',internal.iso_timestamp_v1(v_until),'facts',v_result,'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_register_and_reserve_facts',p_page_public_id,v_response); return v_response;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.trivia_rpc_raise_v1(v_state,v_message);
end; $$;

create function api.trivia_release_facts(p_request_schema_version integer,p_workspace_public_id uuid,p_operation_key uuid,
  p_page_public_id uuid,p_reservation_token uuid,p_reason text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare o record; n public.page_niche_configs; h internal.trivia_reservation_sets; f public.trivia_facts;
  v_ids jsonb:='[]'; v_inactive integer:=0; v_response jsonb; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_page_public_id);
  if internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text) is distinct from true
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_reason)) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select * into o from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,'trivia_release_facts',1,
    pg_catalog.jsonb_build_object('page_public_id',p_page_public_id,'reservation_token',p_reservation_token,'reason',pg_catalog.btrim(p_reason)));
  if o.claim_state='replay' then return internal.trivia_replay_v5(o.operation_id,'trivia_release_facts'); end if;
  perform internal.trivia_lock_workspace_v1(o.workspace_id); n:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id,false);
  select * into h from internal.trivia_reservation_sets where workspace_id=o.workspace_id
    and token_fingerprint=internal.trivia_token_fingerprint_v1(o.workspace_id,p_reservation_token);
  if h.id is not null then
    if h.page_id is distinct from n.page_id or h.actor_user_id<>internal.request_actor_user_id_v1() then
      raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
    for f in select * from public.trivia_facts where workspace_id=o.workspace_id and public_id=any(h.ordered_fact_public_ids) order by id for update loop
      if f.reservation_token=p_reservation_token and f.reservation_status='reserved' and f.reserved_for_page_id=h.page_id
        and f.reservation_context->>'request_hash'=h.request_hash
        and f.reservation_context->>'actor_user_id'=h.actor_user_id::text then
        if f.reserved_until>pg_catalog.clock_timestamp() then v_ids:=v_ids||pg_catalog.jsonb_build_array(f.public_id); end if;
        update public.trivia_facts set reservation_status='available',reservation_token=null,reserved_for_page_id=null,
          reserved_at=null,reserved_until=null,reservation_context=null where id=f.id;
      end if;
    end loop;
    v_inactive:=pg_catalog.cardinality(h.ordered_fact_public_ids)-pg_catalog.jsonb_array_length(v_ids);
  end if;
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'released_fact_public_ids',v_ids,'already_inactive_count',v_inactive,'replayed',false));
  perform internal.trivia_complete_v5(o.operation_id,'trivia_release_facts',p_page_public_id,v_response); return v_response;
exception when query_canceled then perform internal.trivia_rpc_raise_v1('57014','');
when others then get stacked diagnostics v_state=returned_sqlstate,v_message=message_text; perform internal.trivia_rpc_raise_v1(v_state,v_message);
end; $$;

grant create on schema api,internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f,n.nspname s from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where (n.nspname='api' and p.proname=any(array['trivia_find_similar_facts','trivia_register_and_reserve_facts','trivia_release_facts']))
      or (n.nspname='internal' and p.proname=any(array['trivia_fact_input_v1','trivia_resolve_fact_v1','trivia_response_valid_v5','trivia_complete_v5','trivia_replay_v5'])) loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
    if r.s='api' then execute pg_catalog.format('grant execute on function %s to authenticated',r.f); end if;
  end loop;
end $$;
revoke create on schema api,internal from content_producer_api_owner;
