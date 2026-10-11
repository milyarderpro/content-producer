-- Additive runtime resolution fix: qualify the candidate column, never the OUT variable.
create or replace function internal.trivia_resolve_fact_v1(p_workspace bigint,p_input jsonb,p_create boolean default true,
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
    for v_candidate in select candidates.* from internal.trivia_candidates_v3(p_workspace,c,p_input->'sources',20) candidates
      where candidates.strong and (p_exclude is null or candidates.fact_id<>p_exclude) loop
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

create function internal.trivia_touch_updated_at_v1() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new is distinct from old then new.updated_at:=greatest(pg_catalog.clock_timestamp(),old.updated_at+interval '1 microsecond'); end if;
  return new;
end; $$;
drop trigger trivia_facts_touch_updated_at on public.trivia_facts;
create trigger trivia_facts_touch_updated_at before update on public.trivia_facts
for each row execute function internal.trivia_touch_updated_at_v1();
grant create on schema internal to content_producer_api_owner;
alter function internal.trivia_touch_updated_at_v1() owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on function internal.trivia_touch_updated_at_v1() from public,anon,authenticated,service_role;
