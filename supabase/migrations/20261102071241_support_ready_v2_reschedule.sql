-- P4 adapted the unconditional evidence guard; ready has an additional guard.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('api.reschedule_post(integer,uuid,uuid,uuid,integer,timestamptz,text)'::regprocedure);
  anchor:='internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing ready schedule evidence anchor'; end if;
  src:=pg_catalog.replace(src,anchor,
    '(case when p.content_schema_version=2 then '
    ||'internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) else '||anchor||' end)');
  anchor:='internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing ready schedule editorial anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    '(case when p.content_schema_version=2 then '
    ||'internal.post_evidence_valid_v2(p.editorial_checks,p.content_hash,p.revision,true) else '||anchor||' end)');
end $$;
