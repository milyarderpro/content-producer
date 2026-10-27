-- CR-051: total estimated visual lines remain observable, not a ready gate.
-- Replace only the pinned predicate; keep every other hard limit, function
-- owner, SECURITY INVOKER mode, search_path, signature and ACL unchanged.
do $$ declare src text; needle text:='(m->>''line_count'')::integer<=28 and ';
begin
  src:=pg_catalog.pg_get_functiondef('internal.post_system_base_v1(jsonb,jsonb,text,integer)'::regprocedure);
  if (pg_catalog.length(src)-pg_catalog.length(pg_catalog.replace(src,needle,'')))/pg_catalog.length(needle)<>1 then
    raise exception 'CR051_POST_SYSTEM_ANCHOR_MISSING'; end if;
  execute pg_catalog.replace(src,needle,'');
end $$;

-- The v2 resolver serves reservation. Preserve every decision branch;
-- annotate its eight review failures when input carries a valid position.
-- The v1 correction resolver remains unchanged.
do $$ declare src text; needle text:='message=''FACT_REVIEW_REQUIRED'''; replacement text:=
  'message=case when p_input->>''position'' ~ ''^[1-9]$'' then ''REVIEW_DIAG:''||(p_input->>''position'')||'':REVIEW_MISSING_OR_INVALID'' else ''FACT_REVIEW_REQUIRED'' end';
begin
  src:=pg_catalog.pg_get_functiondef('internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[])'::regprocedure);
  if (pg_catalog.length(src)-pg_catalog.length(pg_catalog.replace(src,needle,'')))/pg_catalog.length(needle)<>8 then
    raise exception 'CR051_DEDUP_RESOLVER_ANCHOR_MISSING'; end if;
  execute pg_catalog.replace(src,needle,replacement);
end $$;

-- Preserve CR-050 source diagnostics and add one tightly allowlisted dedup
-- diagnostic. The raw SQL message is never forwarded to the MCP client.
create or replace function internal.trivia_rpc_raise_v1(p_state text,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
declare v_code text; v_source_diagnostic boolean; v_review_diagnostic boolean;
begin
  v_source_diagnostic:=p_message ~ '^SOURCE_DIAG:[1-9]:(SOURCE_METADATA_INVALID|SOURCE_DUPLICATE_CANONICAL_URL|SOURCE_TIER_TYPE_MISMATCH|SOURCE_NO_ELIGIBLE_AB|SOURCE_SENSITIVE_TIER_A_REQUIRED|SOURCE_INDEPENDENCE_REQUIRED|SOURCE_AS_OF_DATE_REQUIRED)$';
  v_review_diagnostic:=p_message ~ '^REVIEW_DIAG:[1-9]:REVIEW_MISSING_OR_INVALID$';
  v_code:=case
    when p_state in ('40P01','40001','55P03','57014') then 'DATABASE_BUSY'
    when v_source_diagnostic then 'FACT_SOURCE_INSUFFICIENT'
    when v_review_diagnostic then 'FACT_REVIEW_REQUIRED'
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
  if (v_source_diagnostic and v_code='FACT_SOURCE_INSUFFICIENT')
    or (v_review_diagnostic and v_code='FACT_REVIEW_REQUIRED') then
    raise exception using errcode='P0001',message=v_code,detail=p_message;
  end if;
  raise exception using errcode='P0001',message=v_code;
end; $$;
