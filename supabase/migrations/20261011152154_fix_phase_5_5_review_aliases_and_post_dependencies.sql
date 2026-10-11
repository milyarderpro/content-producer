do $$ declare signature text; d text; needle text; begin
  foreach signature in array array['internal.trivia_resolve_fact_v1(bigint,jsonb,boolean,bigint)',
    'internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[])'] loop
    d:=pg_catalog.pg_get_functiondef(signature::regprocedure);
    needle:='join public.trivia_facts f on f.public_id=(r.value->>''candidate_fact_public_id'')::uuid and f.workspace_id=p_workspace';
    if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_REVIEW_DEFINITION'; end if;
    d:=pg_catalog.replace(d,needle,'join public.trivia_facts reviewed_fact on reviewed_fact.public_id=(r.value->>''candidate_fact_public_id'')::uuid and reviewed_fact.workspace_id=p_workspace');
    d:=pg_catalog.replace(d,'where f.id=v_candidate.fact_id','where reviewed_fact.id=v_candidate.fact_id');
    execute d;
  end loop;
end $$;
grant execute on function internal.is_valid_post_payload_v1(jsonb,integer),
  internal.is_valid_generation_snapshot_v1(jsonb),internal.is_valid_system_checks_v1(jsonb,text,integer),
  internal.is_valid_editorial_checks_v1(jsonb,text,integer)
to content_producer_api_owner;
