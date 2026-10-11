-- Additive transformations of the exact prior definitions. Fail closed if any
-- expected source fragment is absent. No old migration file is edited.
do $$ declare d text; needle text; begin
  d:=pg_catalog.pg_get_functiondef('internal.trivia_resolve_fact_v1(bigint,jsonb,boolean,bigint)'::regprocedure);
  needle:='p_exclude bigint DEFAULT NULL::bigint)';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_RESOLVER_DEFINITION'; end if;
  d:=pg_catalog.replace(d,'internal.trivia_resolve_fact_v1','internal.trivia_resolve_fact_v2');
  d:=pg_catalog.replace(d,needle,'p_exclude bigint DEFAULT NULL::bigint, p_batch_ids bigint[] DEFAULT ARRAY[]::bigint[])');
  needle:='where candidates.strong and (p_exclude is null or candidates.fact_id<>p_exclude)';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_CANDIDATE_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,needle||' and not candidates.fact_id=any(p_batch_ids)');
  execute d;

  d:=pg_catalog.pg_get_functiondef('api.trivia_register_and_reserve_facts(integer,uuid,uuid,uuid,uuid,timestamptz,text,integer,jsonb)'::regprocedure);
  needle:='with ordinality t(value,n) where (value->>''position'')::integer<>n';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_POSITION_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,'with ordinality t(value,ordinal) where (value->>''position'')::integer<>ordinal');
  needle:='v_ids uuid[]:=''{}'';';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_SET_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,needle||' v_new_ids bigint[]:=''{}'';');
  needle:='internal.trivia_resolve_fact_v1(o.workspace_id,x)';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_COMPOSITION_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,'internal.trivia_resolve_fact_v2(o.workspace_id,x,true,null,v_new_ids)');
  needle:='v_ids:=pg_catalog.array_append(v_ids,f.public_id);';
  if pg_catalog.strpos(d,needle)=0 then raise exception 'UNEXPECTED_RESOLVED_SET_DEFINITION'; end if;
  d:=pg_catalog.replace(d,needle,needle||E'\n    if q.canonical_action=''created_new'' then v_new_ids:=pg_catalog.array_append(v_new_ids,f.id); end if;');
  execute d;
end $$;
grant create on schema internal to content_producer_api_owner;
alter function internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[]) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on function internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[]) from public,anon,authenticated,service_role;
