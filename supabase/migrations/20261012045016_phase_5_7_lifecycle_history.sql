-- CR-014: v7 is lifecycle-only. Preserve v6 shapes, bounds and immutable replay.
alter table internal.post_write_history add column prior_status text;
alter table internal.post_write_history drop constraint post_write_history_operation_name_check;
alter table internal.post_write_history add constraint post_write_history_operation_name_check check(operation_name in
 ('save_post','revise_post','reschedule_post','approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post'));
alter table internal.post_write_history drop constraint post_write_history_check;
alter table internal.post_write_history add constraint post_write_history_check check(
 (operation_name='save_post' and prior_revision is null and prior_content_hash is null and reason is null and prior_status is null)
 or (operation_name in ('revise_post','reschedule_post') and prior_revision>=1 and prior_content_hash ~ '^[0-9a-f]{64}$'
   and internal.plan_safe_reason_v1(reason) and prior_status is null)
 or (operation_name in ('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post')
   and prior_revision>=1 and prior_content_hash ~ '^[0-9a-f]{64}$' and prior_status in ('draft','ready','posted')
   and octet_length(response::text)<=65536
   and ((operation_name in ('revoke_post_approval','discard_post','archive_post') and internal.plan_safe_reason_v1(reason))
     or (operation_name='approve_post' and (reason is null or internal.plan_safe_reason_v1(reason)))
     or (operation_name='mark_post_posted' and reason is null))));

create function internal.lifecycle_plan_item_v1(p public.posts) returns jsonb
language sql stable security invoker set search_path='' as $$
 select case when p.content_plan_item_id is null then 'null'::jsonb else
   (select pg_catalog.jsonb_build_object('plan_item_public_id',i.public_id,'replacement_eligible',
     i.status='completed' and plan.status<>'cancelled' and not exists(select 1 from public.posts pp where pp.content_plan_item_id=i.id
       and (pp.status<>'discarded' or pp.published_at is not null)))
   from public.content_plan_items i join public.content_plans plan on plan.id=i.plan_id and plan.workspace_id=i.workspace_id
   where i.id=p.content_plan_item_id and i.workspace_id=p.workspace_id and i.page_id=p.page_id) end;
$$;
create function internal.lifecycle_response_v1(name text,p public.posts) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb; ids jsonb;
begin
 d:=pg_catalog.jsonb_build_object('post_public_id',p.public_id,'status',p.status,'revision',p.revision,'replayed',false);
 if name='approve_post' then d:=d||pg_catalog.jsonb_build_object('approval',internal.lifecycle_approval_summary_v1(p.approval_snapshot),'recomputed_checks',p.system_checks);
 elsif name='revoke_post_approval' then d:=d||pg_catalog.jsonb_build_object('approval_revoked',true);
 elsif name in ('discard_post','mark_post_posted') then
   select coalesce(pg_catalog.jsonb_agg(f.public_id order by j.position),'[]') into ids
   from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id and f.workspace_id=j.workspace_id
   where j.post_id=p.id and j.workspace_id=p.workspace_id and j.is_current
     and j.allocation_state=case when name='discard_post' then 'released' else 'published' end;
   if name='discard_post' then d:=d||pg_catalog.jsonb_build_object('released_fact_public_ids',ids,'plan_item',internal.lifecycle_plan_item_v1(p));
   else d:=d||pg_catalog.jsonb_build_object('published_at',internal.iso_timestamp_v1(p.published_at),'platform_post_id',p.platform_post_id,
     'published_url',p.published_url,'published_fact_public_ids',ids); end if;
 elsif name='archive_post' then d:=d||pg_catalog.jsonb_build_object('archived_at',internal.iso_timestamp_v1(p.archived_at));
 else raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 return pg_catalog.jsonb_build_object('response_schema_version',1,'data',d);
end; $$;
create function internal.lifecycle_url_v1(url text) returns boolean
language sql immutable security invoker set search_path='' as $$
 select url is null or (pg_catalog.char_length(url) between 9 and 2048
   and url ~ '^https://[A-Za-z0-9][A-Za-z0-9.-]*(:[0-9]{1,5})?([/?#][^[:space:][:cntrl:]]*)?$');
$$;
create function internal.lifecycle_response_valid_v1(name text,r jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb:=r->'data'; a jsonb:=d->'approval'; x jsonb; keys text[]; ids text[];
begin
 if internal.has_exact_json_keys(r,array['response_schema_version','data']) is distinct from true
   or r->'response_schema_version' is distinct from '1'::jsonb or pg_catalog.octet_length(r::text)>65536
   or internal.plan_is_uuid_v1(d->'post_public_id') is distinct from true
   or internal.is_json_integer_between(d->'revision',2,2147483647) is distinct from true or d->'replayed' is distinct from 'false'::jsonb
   or r::text ~ '"(claim_token|reservation_token|access_token|refresh_token|workspace_id|page_id|post_id|fact_id|operation_id|actor_user_id)"[[:space:]]*:' then return false; end if;
 keys:=array['post_public_id','status','revision','replayed'];
 if name='approve_post' then
   keys:=keys||array['approval','recomputed_checks'];
   if d->>'status' is distinct from 'ready' or internal.has_exact_json_keys(a,array['approved_revision','content_hash','approved_at','accepted_warning_ids','warning_acceptance_reason']) is distinct from true
     or a->'approved_revision' is distinct from d->'revision' or a->>'content_hash' !~ '^[0-9a-f]{64}$'
     or pg_catalog.jsonb_typeof(a->'content_hash') is distinct from 'string' or internal.plan_is_time_v1(a->'approved_at') is distinct from true
     or pg_catalog.jsonb_typeof(a->'accepted_warning_ids') is distinct from 'array'
     or pg_catalog.jsonb_array_length(a->'accepted_warning_ids')>20
     or internal.is_valid_system_checks_v1(d->'recomputed_checks',a->>'content_hash',(d->>'revision')::integer) is distinct from true then return false; end if;
   for x in select value from pg_catalog.jsonb_array_elements(a->'accepted_warning_ids') loop
     if pg_catalog.jsonb_typeof(x) is distinct from 'string' then return false; end if;
   end loop;
   select coalesce(pg_catalog.array_agg(value#>>'{}' order by value#>>'{}'),'{}') into ids from pg_catalog.jsonb_array_elements(a->'accepted_warning_ids');
   ids:=internal.lifecycle_ids_v1(ids); perform internal.lifecycle_reason_v1(ids,a->>'warning_acceptance_reason');
   if a->'accepted_warning_ids' is distinct from pg_catalog.to_jsonb(ids)
     or (a->'warning_acceptance_reason'<>'null'::jsonb and pg_catalog.jsonb_typeof(a->'warning_acceptance_reason') is distinct from 'string') then return false; end if;
 elsif name='revoke_post_approval' then
   keys:=keys||array['approval_revoked'];
   if d->>'status' is distinct from 'draft' or d->'approval_revoked' is distinct from 'true'::jsonb then return false; end if;
 elsif name='discard_post' then
   keys:=keys||array['released_fact_public_ids','plan_item'];
   if d->>'status' is distinct from 'discarded' then return false; end if;
   a:=d->'plan_item';
   if a<>'null'::jsonb and (internal.has_exact_json_keys(a,array['plan_item_public_id','replacement_eligible']) is distinct from true
     or internal.plan_is_uuid_v1(a->'plan_item_public_id') is distinct from true
     or pg_catalog.jsonb_typeof(a->'replacement_eligible') is distinct from 'boolean') then return false; end if;
 elsif name='mark_post_posted' then
   keys:=keys||array['published_at','platform_post_id','published_url','published_fact_public_ids'];
   if d->>'status' is distinct from 'posted' or internal.plan_is_time_v1(d->'published_at') is distinct from true
     or (d->'platform_post_id'<>'null'::jsonb and (pg_catalog.jsonb_typeof(d->'platform_post_id') is distinct from 'string'
       or pg_catalog.char_length(d->>'platform_post_id') not between 1 and 200 or d->>'platform_post_id' ~ '[[:cntrl:]]'))
     or (d->'published_url'<>'null'::jsonb and (pg_catalog.jsonb_typeof(d->'published_url') is distinct from 'string'
       or internal.lifecycle_url_v1(d->>'published_url') is distinct from true)) then return false; end if;
 elsif name='archive_post' then
   keys:=keys||array['archived_at'];
   if d->>'status' is distinct from 'archived' or internal.plan_is_time_v1(d->'archived_at') is distinct from true then return false; end if;
 else return false; end if;
 if name in ('discard_post','mark_post_posted') then
   a:=d->case when name='discard_post' then 'released_fact_public_ids' else 'published_fact_public_ids' end;
   if pg_catalog.jsonb_typeof(a) is distinct from 'array' or pg_catalog.jsonb_array_length(a) not between 1 and 9 then return false; end if;
   for x in select value from pg_catalog.jsonb_array_elements(a) loop if internal.plan_is_uuid_v1(x) is distinct from true then return false; end if; end loop;
   if (select count(distinct value) from pg_catalog.jsonb_array_elements(a))<>pg_catalog.jsonb_array_length(a) then return false; end if;
 end if;
 return internal.has_exact_json_keys(d,keys) is true;
exception when others then return false;
end; $$;
create function internal.lifecycle_history_validate_v1(h internal.post_write_history) returns void
language plpgsql stable security invoker set search_path='' as $$
declare p public.posts; l internal.operation_ledger; ctx record;
begin
 select * into ctx from internal.assert_request_context_v1();
 select * into p from public.posts where id=h.post_id and workspace_id=h.workspace_id and page_id=h.page_id;
 select * into l from internal.operation_ledger where id=h.operation_id and workspace_id=h.workspace_id;
 if p.id is null or l.id is null or l.completed_at is not null or l.operation_name<>h.operation_name
   or l.actor_user_id<>h.actor_user_id or h.actor_user_id<>ctx.actor_user_id or h.oauth_client_id<>ctx.oauth_client_id
   or h.prior_revision+1<>p.revision or h.prior_content_hash is distinct from p.content_hash
   or h.prior_schedule is distinct from p.scheduled_at
   or not ((h.operation_name='approve_post' and h.prior_status='draft' and p.status='ready')
     or(h.operation_name='revoke_post_approval' and h.prior_status='ready' and p.status='draft')
     or(h.operation_name='discard_post' and h.prior_status in ('draft','ready') and p.status='discarded')
     or(h.operation_name='mark_post_posted' and h.prior_status='ready' and p.status='posted')
     or(h.operation_name='archive_post' and h.prior_status='posted' and p.status='archived'))
   or internal.lifecycle_response_valid_v1(h.operation_name,h.response) is distinct from true
   or h.response is distinct from internal.lifecycle_response_v1(h.operation_name,p)
   or internal.has_exact_json_keys(h.before_evidence,array['system_checks','editorial_checks','approval_snapshot']) is distinct from true
   or (h.before_evidence::text||h.response::text) ~ '"(claim_token|reservation_token|access_token|refresh_token)"[[:space:]]*:' then
   raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end; $$;
-- Keep the original v6 branch exactly; route only five lifecycle names to v7.
do $$ declare src text; anchor text:='select * into p from public.posts where id=new.post_id'; begin
 src:=pg_catalog.pg_get_functiondef('internal.post_history_validate_v1()'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing history dispatch anchor'; end if;
 execute pg_catalog.replace(src,anchor,$edit$if new.operation_name in ('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post') then
   perform internal.lifecycle_history_validate_v1(new); return new; end if;
 select * into p from public.posts where id=new.post_id$edit$);
end $$;
create function internal.lifecycle_complete_v7(op bigint,name text,p public.posts,before_post public.posts,reason text default null) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare ctx record; history uuid; r jsonb; envelope jsonb;
begin
 select * into ctx from internal.assert_request_context_v1(); r:=internal.lifecycle_response_v1(name,p);
 insert into internal.post_write_history(workspace_id,page_id,post_id,operation_id,actor_user_id,oauth_client_id,operation_name,
   prior_revision,prior_content_hash,prior_schedule,prior_status,before_evidence,reason,response)
 values(p.workspace_id,p.page_id,p.id,op,ctx.actor_user_id,ctx.oauth_client_id,name,before_post.revision,before_post.content_hash,before_post.scheduled_at,
   before_post.status,pg_catalog.jsonb_build_object('system_checks',before_post.system_checks,'editorial_checks',before_post.editorial_checks,
     'approval_snapshot',before_post.approval_snapshot),reason,r) returning public_id into history;
 envelope:=pg_catalog.jsonb_build_object('schema_version',7,'operation_name',name,'target_public_id',p.public_id,'history_public_id',history,
   'response_hash',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex'));
 update internal.operation_ledger set response_snapshot=envelope,target_type='post',target_public_id=p.public_id,completed_at=pg_catalog.clock_timestamp()
 where id=op and workspace_id=p.workspace_id and actor_user_id=ctx.actor_user_id and operation_name=name and completed_at is null;
 if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 return r;
end; $$;
create function internal.lifecycle_replay_v7(op bigint,name text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare l internal.operation_ledger; h internal.post_write_history; s jsonb;
begin
 select * into l from internal.operation_ledger where id=op and operation_name=name and actor_user_id=internal.request_actor_user_id_v1(); s:=l.response_snapshot;
 if name not in ('approve_post','revoke_post_approval','discard_post','mark_post_posted','archive_post') or l.completed_at is null or l.target_type<>'post'
   or internal.has_exact_json_keys(s,array['schema_version','operation_name','target_public_id','history_public_id','response_hash']) is distinct from true
   or s->'schema_version' is distinct from '7'::jsonb or s->>'operation_name' is distinct from name or pg_catalog.octet_length(s::text)>2048
   or internal.plan_is_uuid_v1(s->'target_public_id') is distinct from true or internal.plan_is_uuid_v1(s->'history_public_id') is distinct from true
   or pg_catalog.jsonb_typeof(s->'response_hash') is distinct from 'string' or s->>'response_hash' !~ '^[0-9a-f]{64}$' then
   raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 select * into h from internal.post_write_history where workspace_id=l.workspace_id and operation_id=l.id and actor_user_id=l.actor_user_id
   and operation_name=name and public_id=(s->>'history_public_id')::uuid;
 if h.id is null or l.target_public_id::text is distinct from s->>'target_public_id'
   or h.response#>>'{data,post_public_id}' is distinct from l.target_public_id::text
   or not exists(select 1 from public.posts p where p.id=h.post_id and p.workspace_id=l.workspace_id and p.page_id=h.page_id and p.public_id=l.target_public_id)
   or s->>'response_hash' is distinct from pg_catalog.encode(extensions.digest(pg_catalog.convert_to(h.response::text,'UTF8'),'sha256'),'hex')
   or internal.lifecycle_response_valid_v1(name,h.response) is distinct from true then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 return pg_catalog.jsonb_set(h.response,'{data,replayed}','true'::jsonb);
end; $$;
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
 for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='internal' and p.proname like 'lifecycle_%' loop
   execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
   execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
 end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
