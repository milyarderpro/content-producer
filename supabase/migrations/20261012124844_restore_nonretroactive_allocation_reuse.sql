-- CR-016 / P1-01: eligibility is checked on NEW allocations, not legal retained usage.
-- Keep same-Page uniqueness and every identity/source/freshness/lock guard.
do $$ declare src text; anchor text; begin
  src:=pg_catalog.pg_get_functiondef('internal.post_allocate_v1(public.posts,jsonb,uuid,public.page_niche_configs)'::regprocedure);
  anchor:='and u.post_id<>p.id and (c.config->>''fact_reuse_scope''=''workspace_unique'' or u.page_id=p.page_id)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing allocation reuse anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'and u.post_id<>p.id and ((f.public_id=any(new_ids) and c.config->>''fact_reuse_scope''=''workspace_unique'') or u.page_id=p.page_id)');
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_current_system_v1(public.posts)'::regprocedure);
  anchor:='and (c.config->>''fact_reuse_scope''=''workspace_unique'' or u.page_id=p.page_id)';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle reuse anchor'; end if;
  execute pg_catalog.replace(src,anchor,'and u.page_id=p.page_id');
end $$;
