-- CR-013: enforce default typography and prevent known capability tokens in copy.
do $$ declare src text; anchor text:='return t;'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_text_v1(text,boolean)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing text return anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if t ~ '[🌀-🫿☀-➿]' or t ~ '(\*\*|__|\[[0-9]+\]|turn[0-9]+search[0-9]+)'
   or t ~ ('['||pg_catalog.chr(8203)||'-'||pg_catalog.chr(8207)||pg_catalog.chr(8234)||'-'||pg_catalog.chr(8238)
     ||pg_catalog.chr(8294)||'-'||pg_catalog.chr(8297)||pg_catalog.chr(65279)||']') then
   raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
 return t;$edit$);
end $$;
do $$ declare src text; anchor text:='select * into o from internal.claim_operation_for_owner_v1'; begin
 src:=pg_catalog.pg_get_functiondef('api.save_post(integer,uuid,uuid,uuid,text,uuid,timestamptz,jsonb,timestamptz,integer,text,text,text,jsonb,jsonb,jsonb,jsonb)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing save identity anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if pg_catalog.strpos(pg_catalog.lower(content::text||s::text||editorial::text),p_reservation_token::text)>0
   or (p_plan_item->>'claim_token' is not null and pg_catalog.strpos(pg_catalog.lower(content::text||s::text||editorial::text),pg_catalog.lower(p_plan_item->>'claim_token'))>0) then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1$edit$);
 src:=pg_catalog.pg_get_functiondef('api.revise_post(integer,uuid,uuid,uuid,integer,text,uuid,integer,text,text,text,jsonb,jsonb,jsonb,jsonb,text)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing revise identity anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if p_reservation_token is not null and pg_catalog.strpos(pg_catalog.lower(content::text||s::text||editorial::text),p_reservation_token::text)>0 then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 select * into o from internal.claim_operation_for_owner_v1$edit$);
end $$;
do $$ declare src text; anchor text:='snapshot:=internal.post_usage_snapshot_v1(f);'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_allocate_v1(public.posts,jsonb,uuid,public.page_niche_configs)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing allocation snapshot anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if pg_catalog.strpos(pg_catalog.lower(f.source_data::text),token::text)>0 then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 snapshot:=internal.post_usage_snapshot_v1(f);$edit$);
end $$;
