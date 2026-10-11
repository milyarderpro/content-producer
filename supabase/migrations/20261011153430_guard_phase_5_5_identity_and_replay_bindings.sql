do $$ declare r record; d text; needle text; signature text; begin
  for r in select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='api' and p.proname=any(array['trivia_register_and_reserve_facts','trivia_release_facts','trivia_reverify_fact','trivia_correct_fact']) loop
    d:=pg_catalog.pg_get_functiondef(r.oid);
    needle:='perform internal.trivia_lock_workspace_v1(o.workspace_id);';
    if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_LEDGER_GATE'; end if;
    d:=pg_catalog.replace(d,needle,E'if o.claim_state is distinct from ''first_use'' then raise exception using errcode=''P0001'',message=''DATABASE_BUSY''; end if;\n  '||needle);
    execute d;
  end loop;
  foreach signature in array array['internal.trivia_resolve_fact_v1(bigint,jsonb,boolean,bigint)',
    'internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[])'] loop
    d:=pg_catalog.pg_get_functiondef(signature::regprocedure);
    needle:='if f.normalized_claim=v_normal or (f.structured_key=v_struct';
    if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_EXACT_IDENTITY'; end if;
    execute pg_catalog.replace(d,needle,E'if f.normalized_claim=v_normal and f.structured_key<>v_struct then raise exception using errcode=''P0001'',message=''FACT_REVIEW_REQUIRED''; end if;\n    '||needle);
  end loop;
  d:=pg_catalog.pg_get_functiondef('internal.trivia_replay_v5(bigint,text,uuid)'::regprocedure);
  needle:='or s->''schema_version'' is distinct from ''5''::jsonb';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_REPLAY_BINDING'; end if;
  execute pg_catalog.replace(d,needle,needle||E'\n    or not exists(select 1 from internal.operation_ledger l where l.id=p_operation and l.target_public_id::text=s->>''target_public_id'')');
  d:=pg_catalog.pg_get_functiondef('internal.trivia_response_valid_v5(text,jsonb)'::regprocedure);
  needle:='or (v_item->>''count'')::integer<pg_catalog.jsonb_array_length(v_item->''items'')';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_AFFECTED_BOUND'; end if;
  d:=pg_catalog.replace(d,needle,needle||E'\n        or v_item->''truncated'' is distinct from pg_catalog.to_jsonb((v_item->>''count'')::integer>50)\n        or pg_catalog.jsonb_array_length(v_item->''items'')<>least((v_item->>''count'')::integer,50)');
  execute d;
end $$;
