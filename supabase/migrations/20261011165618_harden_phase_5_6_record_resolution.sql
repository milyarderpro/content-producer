-- Resolve table aliases versus composite PL/pgSQL variables without relaxing checks.
do $$ declare src text; anchor text:=E'AS $function$\ndeclare'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_allocate_v1(public.posts,jsonb,uuid,public.page_niche_configs)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing allocation definition anchor'; end if;
 execute pg_catalog.replace(src,anchor,E'AS $function$\n#variable_conflict use_column\ndeclare');
end $$;
