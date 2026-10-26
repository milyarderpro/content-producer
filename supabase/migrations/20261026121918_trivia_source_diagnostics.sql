-- Keep the existing public error code while exposing only an allowlisted fact
-- position and reason. Never include source URLs, claims, SQL, or credentials.
create or replace function internal.trivia_rpc_raise_v1(p_state text,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
declare v_code text; v_source_diagnostic boolean;
begin
  v_source_diagnostic:=p_message ~ '^SOURCE_DIAG:[1-9]:(SOURCE_METADATA_INVALID|SOURCE_DUPLICATE_CANONICAL_URL|SOURCE_TIER_TYPE_MISMATCH|SOURCE_NO_ELIGIBLE_AB|SOURCE_SENSITIVE_TIER_A_REQUIRED|SOURCE_INDEPENDENCE_REQUIRED|SOURCE_AS_OF_DATE_REQUIRED)$';
  v_code:=case
    when p_state in ('40P01','40001','55P03','57014') then 'DATABASE_BUSY'
    when v_source_diagnostic then 'FACT_SOURCE_INSUFFICIENT'
    when p_message in ('AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED','OPERATION_KEY_REUSED',
      'RATE_LIMITED','VALIDATION_FAILED','PAGE_NOT_FOUND','MODULE_DISABLED','ONTOLOGY_VERSION_UNSUPPORTED',
      'FACT_HASH_COLLISION','FACT_REVIEW_REQUIRED','FACT_NOT_ELIGIBLE','FACT_FRESHNESS_EXPIRED',
      'FACT_SOURCE_INSUFFICIENT','FACT_RESERVATION_CONFLICT','FACT_RESERVATION_EXPIRED',
      'FACT_RESERVATION_MISMATCH','FACT_RESERVATION_CONTEXT_CHANGED','FACT_REUSE_BLOCKED',
      'FACT_CORRECTION_REQUIRED','FACT_CORRECTION_CONFLICT') then p_message
    when p_message in ('TRIVIA_SOURCE_INVALID','TRIVIA_SOURCE_POLICY_FAILED') then 'FACT_SOURCE_INSUFFICIENT'
    when p_message='TRIVIA_FRESHNESS_INVALID' then 'FACT_FRESHNESS_EXPIRED'
    when p_message in ('TRIVIA_CANDIDATE_INVALID','TRIVIA_DEDUP_REVIEW_INVALID') then 'VALIDATION_FAILED'
    when p_message='TRIVIA_ONTOLOGY_UNSUPPORTED' then 'ONTOLOGY_VERSION_UNSUPPORTED'
    else 'INTERNAL_ERROR' end;
  if v_source_diagnostic and v_code='FACT_SOURCE_INSUFFICIENT' then
    raise exception using errcode='P0001',message=v_code,detail=p_message;
  end if;
  raise exception using errcode='P0001',message=v_code;
end; $$;

create or replace function internal.trivia_fact_input_v1(p_input jsonb,p_position boolean) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare v_keys text[]:=array['candidate','dedup_reviews','sources','freshness_class','as_of_date',
  'requested_expires_at','risk_class','verification_note']; v_result jsonb; v_review jsonb;
  v_reason text; v_position text; v_count integer; v_independent integer; v_has_a boolean;
begin
  if p_position then v_keys:=v_keys||array['position']; end if;
  if internal.has_exact_json_keys(p_input,v_keys) is distinct from true
    or (p_position and internal.is_json_integer_between(p_input->'position',1,9) is distinct from true)
    or pg_catalog.jsonb_typeof(p_input->'dedup_reviews') is distinct from 'array'
    or pg_catalog.jsonb_typeof(p_input->'as_of_date') not in ('string','null')
    or pg_catalog.jsonb_typeof(p_input->'requested_expires_at') is distinct from 'string' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_position:=p_input->>'position';
  v_result:=p_input||pg_catalog.jsonb_build_object('candidate',internal.trivia_candidate_v1(p_input->'candidate'));
  v_review:=pg_catalog.jsonb_build_object('schema_version',1,'identity_schema_version',1,
    'reviewed_at',internal.iso_timestamp_v1(pg_catalog.clock_timestamp()),'evaluator','chatgpt','decisions',p_input->'dedup_reviews');
  if internal.is_valid_dedup_review_snapshot_v2(v_review) is distinct from true
    or exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'dedup_reviews') group by value->>'candidate_fact_public_id' having count(*)>1) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_valid_source_evidence_v2(p_input->'sources') is distinct from true then
    v_reason:='SOURCE_METADATA_INVALID';
    if pg_catalog.jsonb_typeof(p_input->'sources')='array' then
      if exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'sources') s(value)
        where value->>'tier' in ('A','B','C','D') and
          ((value->>'tier'='A' and value->>'source_type' not in ('official','primary_paper','dataset'))
          or (value->>'tier'='B' and value->>'source_type' not in ('museum','professional_association','reputable_reference','review_paper'))
          or (value->>'tier'='C' and value->>'source_type'<>'reputable_secondary')
          or (value->>'tier'='D' and value->>'source_type' not in ('social','aggregator','other')))) then
        v_reason:='SOURCE_TIER_TYPE_MISMATCH';
      elsif exists(select 1 from pg_catalog.jsonb_array_elements(p_input->'sources') s(value)
        group by value->>'canonical_url' having count(*)>1) then
        v_reason:='SOURCE_DUPLICATE_CANONICAL_URL';
      end if;
    end if;
    if p_position then raise exception using errcode='P0001',message='SOURCE_DIAG:'||v_position||':'||v_reason; end if;
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT';
  end if;
  if internal.trivia_is_valid_rfc3339_v1(p_input->>'requested_expires_at') is distinct from true
    or (p_input->>'as_of_date' is not null and internal.trivia_is_valid_date_text_v1(p_input->>'as_of_date') is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_result:=v_result||pg_catalog.jsonb_build_object('requested_expires_at',internal.iso_timestamp_v1((p_input->>'requested_expires_at')::timestamptz),
    'verification_note',pg_catalog.btrim(p_input->>'verification_note'),'sources',(select pg_catalog.jsonb_agg(value||
      pg_catalog.jsonb_build_object('accessed_at',internal.iso_timestamp_v1((value->>'accessed_at')::timestamptz)) order by ordinal)
      from pg_catalog.jsonb_array_elements(p_input->'sources') with ordinality s(value,ordinal)));
  if v_result->>'freshness_class' is null or v_result->>'freshness_class' not in ('stable','periodic','volatile')
    or v_result->>'risk_class' is null or v_result->>'risk_class' not in ('standard','sensitive')
    or pg_catalog.jsonb_typeof(v_result->'verification_note') is distinct from 'string'
    or pg_catalog.char_length(v_result->>'verification_note') not between 1 and 1000 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  -- Static source-policy checks run before operation claiming. Time-relative
  -- eligibility and the authoritative checks still run under business locks.
  select count(*),count(distinct value->>'independence_group'),pg_catalog.bool_or(value->>'tier'='A')
    into v_count,v_independent,v_has_a from pg_catalog.jsonb_array_elements(p_input->'sources')
    where value->>'tier' in ('A','B');
  v_reason:=case
    when v_count=0 then 'SOURCE_NO_ELIGIBLE_AB'
    when v_result->>'risk_class'='sensitive' and not coalesce(v_has_a,false) then 'SOURCE_SENSITIVE_TIER_A_REQUIRED'
    when v_result->>'risk_class'='sensitive' and v_independent<2 then 'SOURCE_INDEPENDENCE_REQUIRED'
    when v_result->>'freshness_class' in ('periodic','volatile') and v_result->>'as_of_date' is null then 'SOURCE_AS_OF_DATE_REQUIRED'
    when v_result->>'freshness_class' in ('periodic','volatile')
      and (v_result->'candidate'->>'relation_key'='holds_record_by_metric_as_of' or v_result->>'risk_class'='sensitive')
      and v_independent<2 then 'SOURCE_INDEPENDENCE_REQUIRED'
    else null end;
  if v_reason is not null then
    if p_position then raise exception using errcode='P0001',message='SOURCE_DIAG:'||v_position||':'||v_reason; end if;
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT';
  end if;
  return v_result;
end; $$;

-- The replacement retains the existing owner and grants. No new executable
-- function or privilege is introduced by this migration.
