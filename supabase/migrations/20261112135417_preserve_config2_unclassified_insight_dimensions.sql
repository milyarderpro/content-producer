-- CR-062 task5: null config2 annotations are valid unclassified dimensions.
-- Keep legacy missing-dimension exclusions and all source/age/sample rules.
do $$ declare src text; anchor text; replacement text; begin
  src:=pg_catalog.pg_get_functiondef('internal.metric_insight_rows_v1(bigint,bigint,text,timestamptz,timestamptz,text[],text)'::regprocedure);
  anchor:=$old$where e.value='null'::jsonb$old$;
  replacement:=$new$where e.value='null'::jsonb and not (
        e.key in ('interaction_goal','profile')
        and ((p).generation_snapshot->'schema_version'='3'::jsonb
          and (p).generation_snapshot->'config_schema_version'='2'::jsonb) is true)$new$;
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing null dimension predicate'; end if;
  execute pg_catalog.replace(src,anchor,replacement);
end $$;
