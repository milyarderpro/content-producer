-- The legacy read starter consumes a bucket but does not assert its allowed
-- flag. The new trivia read uses the existing enforcing kernel exactly once.
do $$ declare d text; needle text; signature text; begin
  d:=pg_catalog.pg_get_functiondef('internal.begin_read_v1(integer,text)'::regprocedure);
  needle:='perform internal.consume_rate_limit_v1(p_limit_group);';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_READ_KERNEL_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,'perform internal.assert_rate_limit_v1(p_limit_group);');
  d:=pg_catalog.replace(d,'p_request_schema_version <> 1','p_request_schema_version is distinct from 1');
  d:=pg_catalog.replace(d,'p_limit_group not in','p_limit_group is null or p_limit_group not in');
  execute d;
  d:=pg_catalog.pg_get_functiondef('api.trivia_find_similar_facts(integer,uuid,uuid,jsonb,integer)'::regprocedure);
  needle:='perform internal.begin_read_v1(p_request_schema_version,''expensive_read'');';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_TRIVIA_READ_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,E'perform internal.assert_request_context_v1();\n  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_page_public_id is null then raise exception using errcode=''P0001'',message=''VALIDATION_FAILED''; end if;\n  perform internal.assert_rate_limit_v1(''expensive_read'');');
  execute d;
  foreach signature in array array['internal.trivia_resolve_fact_v1(bigint,jsonb,boolean,bigint)',
    'internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[])'] loop
    d:=pg_catalog.pg_get_functiondef(signature::regprocedure);
    needle:='when ''number'' then f.numbers<>c->''numbers''';
    if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_DISCRIMINATOR_DEFINITION'; end if;
    execute pg_catalog.replace(d,needle,E'when ''negation'' then f.qualifiers->''negated'' is distinct from c->''qualifiers''->''negated''\n          '||needle);
  end loop;
  d:=pg_catalog.pg_get_functiondef('internal.trivia_response_valid_v5(text,jsonb)'::regprocedure);
  d:=pg_catalog.replace(d,'d->>''fact_reuse_scope'' not in','coalesce(d->>''fact_reuse_scope'','''') not in');
  d:=pg_catalog.replace(d,'v_item->>''canonical_action'' not in','coalesce(v_item->>''canonical_action'','''') not in');
  d:=pg_catalog.replace(d,'d->>''old_status'' not in','coalesce(d->>''old_status'','''') not in');
  d:=pg_catalog.replace(d,'v_item->>''status'' not in','coalesce(v_item->>''status'','''') not in');
  execute d;
end $$;
