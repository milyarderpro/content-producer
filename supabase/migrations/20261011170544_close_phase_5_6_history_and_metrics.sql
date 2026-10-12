-- CR-013: stable JSON numeric serialization and fail-closed history bindings.
do $$ declare src text; anchor text:='ratio:=read_seconds/13'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_render_v1(jsonb)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing ratio anchor'; end if;
 execute pg_catalog.replace(src,anchor,'ratio:=pg_catalog.round(read_seconds/13,6)');
end $$;
do $$ declare src text; anchor text:='if s->''fact_count_override''=''true''::jsonb'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_generation_context_v1(jsonb,public.page_niche_configs,public.pages,jsonb,jsonb)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing count override anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if effective#>>'{fact_count,mode}'='adaptive' and count<(effective#>>'{fact_count,min}')::integer
   and s->'fact_count_override' is distinct from 'true'::jsonb then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 if s->'fact_count_override'='true'::jsonb$edit$);
end $$;
alter function internal.post_response_valid_v1(text,jsonb) rename to post_response_shape_v1;
create function internal.post_response_valid_v1(name text,r jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare p jsonb:=r#>'{data,post}'; b jsonb; k text; ids uuid[]:='{}'; pos integer:=0;
begin
 if internal.post_response_shape_v1(name,r) is distinct from true then return false; end if;
 if name='reschedule_post' then return coalesce(r#>>'{data,status}' in ('draft','ready'),false); end if;
 foreach k in array array['niche_key','status','content_hash','format_key','topic_key','interaction_goal','quality_status'] loop
   if pg_catalog.jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
 end loop;
 if p->>'status'<>'draft' or p->>'niche_key'<>'trivia' or p->>'content_hash' !~ '^[0-9a-f]{64}$'
   or p->>'quality_status' not in ('pending','failed','passed') or p->>'interaction_goal' not in ('share','save','comment','follow')
   or internal.plan_is_time_v1(p->'scheduled_at',true) is distinct from true or p->'published_at' is distinct from 'null'::jsonb
   or internal.plan_is_time_v1(p->'created_at') is distinct from true or internal.plan_is_time_v1(p->'updated_at') is distinct from true
   or internal.post_render_v1(p->'content_payload') is distinct from p->'content_payload' then return false; end if;
 for b in select value from pg_catalog.jsonb_array_elements(p->'fact_bindings') loop
   pos:=pos+1;
   if b->'position' is distinct from pg_catalog.to_jsonb(pos) or b->>'fact_role' is null or b->>'fact_role' not in ('general','myth_reversal','numeric_comparison','emotional','practical','scientific','visual')
     or pg_catalog.jsonb_typeof(b->'rendered_text') is distinct from 'string' or b->>'allocation_state' is distinct from 'allocated'
     or b->>'rendered_text' is distinct from p#>>array['content_payload','body','facts',(pos-1)::text,'text']
     or (b->>'fact_public_id')::uuid=any(ids) or internal.is_valid_fact_usage_snapshot_v1(b->'source_snapshot') is distinct from true
     or pg_catalog.octet_length((b->'source_snapshot')::text)>32768 then return false; end if;
   ids:=pg_catalog.array_append(ids,(b->>'fact_public_id')::uuid);
 end loop;
 return pos=pg_catalog.jsonb_array_length(p#>'{content_payload,body,facts}');
exception when others then return false;
end; $$;
create function internal.post_history_validate_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
declare p public.posts; l internal.operation_ledger; target uuid; revision integer;
begin
 select * into p from public.posts where id=new.post_id and workspace_id=new.workspace_id and page_id=new.page_id;
 select * into l from internal.operation_ledger where id=new.operation_id and workspace_id=new.workspace_id;
 if new.operation_name='reschedule_post' then target:=(new.response#>>'{data,post_public_id}')::uuid; revision:=(new.response#>>'{data,revision}')::integer;
 else target:=(new.response#>>'{data,post,post_public_id}')::uuid; revision:=(new.response#>>'{data,post,revision}')::integer; end if;
 if p.id is null or l.id is null or l.actor_user_id<>new.actor_user_id or l.operation_name<>new.operation_name or l.completed_at is not null
   or target is distinct from p.public_id or revision is distinct from p.revision or revision<>coalesce(new.prior_revision+1,1)
   or internal.post_response_valid_v1(new.operation_name,new.response) is distinct from true
   or (new.operation_name='reschedule_post' and new.prior_content_hash is distinct from p.content_hash)
   or (new.before_evidence::text||new.response::text) ~ '"(claim_token|reservation_token|access_token|refresh_token)"' then
   raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 return new;
end; $$;
create trigger post_history_validate before insert on internal.post_write_history for each row execute function internal.post_history_validate_v1();
grant create on schema internal to content_producer_api_owner;
alter function internal.post_response_valid_v1(text,jsonb) owner to content_producer_api_owner;
alter function internal.post_history_validate_v1() owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on function internal.post_response_valid_v1(text,jsonb),internal.post_history_validate_v1() from public,anon,authenticated,service_role;
