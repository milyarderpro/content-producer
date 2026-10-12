-- CR-013 §4/7: known claim capabilities must not become public usage evidence.
do $$ declare src text; anchor text:='unused:=internal.post_allocate_v1(p,bindings,p_reservation_token,c);'; begin
  src:=pg_catalog.pg_get_functiondef('api.save_post(integer,uuid,uuid,uuid,text,uuid,timestamptz,jsonb,timestamptz,integer,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing save allocation anchor'; end if;
  execute pg_catalog.replace(src,anchor,$edit$if p_plan_item->>'claim_token' is not null and exists (
    select 1 from public.trivia_facts f where f.workspace_id=o.workspace_id and f.public_id=any(ids)
      and pg_catalog.strpos(pg_catalog.lower(f.source_data::text),pg_catalog.lower(p_plan_item->>'claim_token'))>0
  ) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  unused:=internal.post_allocate_v1(p,bindings,p_reservation_token,c);$edit$);
end $$;
