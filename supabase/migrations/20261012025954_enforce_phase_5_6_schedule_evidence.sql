-- CR-013 §1/7: all schedule-only revisions require intact prior evidence bindings.
-- Preserve evaluator/time/checks and allow failed/pending draft quality.
do $$ declare src text; anchor text:='if p.system_checks<>''{}''::jsonb and'; begin
  src:=pg_catalog.pg_get_functiondef('api.reschedule_post(integer,uuid,uuid,uuid,integer,timestamptz,text)'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing schedule evidence anchor'; end if;
  execute pg_catalog.replace(src,anchor,$edit$if internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true
    or internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true then
    raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
  if p.system_checks<>'{}'::jsonb and$edit$);
end $$;
