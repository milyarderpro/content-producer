-- Focused public test exposed a nonexistent niches.id lookup. Preserve applied SQL.
do $$ declare src text; anchor text:='if n.id is null'; begin
  src:=pg_catalog.pg_get_functiondef('api.get_performance_insights(integer,uuid,uuid,text,timestamptz,timestamptz,text[],text,integer,integer)'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing insight lookup anchor'; end if;
  execute pg_catalog.replace(src,anchor,'if n.key is null');
end $$;
