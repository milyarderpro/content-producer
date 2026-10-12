-- CR-013: current allocation membership, immutable result history and v6 replay.
alter table public.trivia_post_facts add column is_current boolean not null default true;
alter table public.trivia_post_facts drop constraint trivia_post_facts_post_position_key;
alter table public.trivia_post_facts drop constraint trivia_post_facts_post_fact_key;
create unique index trivia_post_facts_current_position_key on public.trivia_post_facts(post_id,position) where is_current;
create unique index trivia_post_facts_current_fact_key on public.trivia_post_facts(post_id,fact_id) where is_current;
alter table public.trivia_post_facts add constraint trivia_post_facts_noncurrent_released check(is_current or allocation_state='released');
create function internal.post_usage_immutable_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.source_snapshot is distinct from old.source_snapshot or new.claim_hash_snapshot is distinct from old.claim_hash_snapshot
    or new.verified_at_snapshot is distinct from old.verified_at_snapshot or new.fact_id<>old.fact_id
    or new.workspace_id<>old.workspace_id or new.page_id<>old.page_id or new.post_id<>old.post_id or new.niche_key<>old.niche_key
    or (not old.is_current and new is distinct from old) or (old.allocation_state='published' and new.is_current<>old.is_current) then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  return new;
end; $$;
create trigger trivia_post_facts_immutable_usage before update on public.trivia_post_facts
for each row execute function internal.post_usage_immutable_v1();

grant insert on public.posts to content_producer_api_owner;
grant update(format_key,topic_key,interaction_goal,content_schema_version,content_payload,generation_snapshot,content_hash,scheduled_at)
  on public.posts to content_producer_api_owner;
grant usage,select on public.posts_id_seq to content_producer_api_owner;
grant insert on public.trivia_post_facts to content_producer_api_owner;
grant update(id,position,fact_role,rendered_text,allocation_state,released_at,is_current) on public.trivia_post_facts to content_producer_api_owner;
grant usage,select on public.trivia_post_facts_id_seq to content_producer_api_owner;
create policy posts_api_owner_insert_5_6 on public.posts for insert to content_producer_api_owner
with check(exists(select 1 from public.workspaces w where w.id=posts.workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy junction_api_owner_insert_5_6 on public.trivia_post_facts for insert to content_producer_api_owner
with check(exists(select 1 from public.workspaces w where w.id=trivia_post_facts.workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy junction_api_owner_update_5_6 on public.trivia_post_facts for update to content_producer_api_owner
using(exists(select 1 from public.workspaces w where w.id=trivia_post_facts.workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())))
with check(exists(select 1 from public.workspaces w where w.id=trivia_post_facts.workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())));

alter table internal.content_plan_item_events drop constraint plan_events_transition_check;
alter table internal.content_plan_item_events add constraint plan_events_transition_check check (
 (event_type='claimed' and before_status='pending' and after_status='in_progress')
 or(event_type='reclaimed' and before_status='in_progress' and after_status='in_progress')
 or(event_type='renewed' and before_status='in_progress' and after_status='in_progress')
 or(event_type='failed' and before_status='in_progress' and after_status='failed')
 or(event_type='retried' and before_status='failed' and after_status='pending')
 or(event_type='replaced' and before_status='completed' and after_status='pending')
 or(event_type='cancelled' and before_status in ('pending','failed','in_progress') and after_status='cancelled')
 or(event_type='completed' and before_status='in_progress' and after_status='completed'));
do $$ declare src text; anchor text:='when ''cancelled'' then ''cancel_content_plan'' end'; begin
 src:=pg_catalog.pg_get_functiondef('internal.plan_validate_event_v1()'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing event operation anchor'; end if;
 execute pg_catalog.replace(src,anchor,'when ''cancelled'' then ''cancel_content_plan'' when ''completed'' then ''save_post'' end');
end $$;

create table internal.post_write_history (
 id bigint generated always as identity primary key,
 public_id uuid not null default extensions.gen_random_uuid() unique,
 workspace_id bigint not null,
 page_id bigint not null,
 post_id bigint not null,
 operation_id bigint not null,
 actor_user_id uuid not null,
 oauth_client_id text not null check(char_length(oauth_client_id) between 1 and 512 and oauth_client_id !~ '[[:cntrl:]]'),
 operation_name text not null check(operation_name in ('save_post','revise_post','reschedule_post')),
 prior_revision integer,
 prior_content_hash text,
 prior_schedule timestamptz,
 before_evidence jsonb not null check(jsonb_typeof(before_evidence)='object' and octet_length(before_evidence::text)<=98304),
 reason text,
 response jsonb not null check(jsonb_typeof(response)='object' and octet_length(response::text)<=524288),
 created_at timestamptz not null default clock_timestamp(),
 foreign key(workspace_id,operation_id) references internal.operation_ledger(workspace_id,id) on delete restrict,
 foreign key(post_id,workspace_id,page_id) references public.posts(id,workspace_id,page_id) on delete restrict,
 unique(workspace_id,operation_id),
 check((operation_name='save_post' and prior_revision is null and prior_content_hash is null and reason is null)
   or(operation_name<>'save_post' and prior_revision>=1 and prior_content_hash ~ '^[0-9a-f]{64}$' and internal.plan_safe_reason_v1(reason)))
);
create index post_write_history_post_idx on internal.post_write_history(workspace_id,post_id,id);
alter table internal.post_write_history enable row level security;
revoke all on internal.post_write_history,internal.post_write_history_id_seq from public,anon,authenticated,service_role;
grant select,insert on internal.post_write_history to content_producer_api_owner;
grant usage,select on internal.post_write_history_id_seq to content_producer_api_owner;
create policy post_history_owner_select on internal.post_write_history for select to content_producer_api_owner
using(actor_user_id=(select internal.request_actor_user_id_v1()) and exists(select 1 from public.workspaces w
 where w.id=post_write_history.workspace_id and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy post_history_owner_insert on internal.post_write_history for insert to content_producer_api_owner
with check(actor_user_id=(select internal.request_actor_user_id_v1()) and exists(select 1 from public.workspaces w
 where w.id=post_write_history.workspace_id and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1()))
 and exists(select 1 from internal.operation_ledger l where l.id=post_write_history.operation_id and l.workspace_id=post_write_history.workspace_id
   and l.actor_user_id=post_write_history.actor_user_id and l.operation_name=post_write_history.operation_name and l.completed_at is null));
create trigger post_history_immutable before update on internal.post_write_history
for each row execute function internal.trivia_history_immutable_v1();

create function internal.post_response_valid_v1(name text,r jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare d jsonb:=r->'data'; p jsonb:=d->'post'; b jsonb; k text;
begin
 if internal.has_exact_json_keys(r,array['response_schema_version','data']) is distinct from true or r->'response_schema_version' is distinct from '1'::jsonb
   or pg_catalog.octet_length(r::text)>524288 or d->'replayed' is distinct from 'false'::jsonb
   or r::text ~ '"(reservation_token|claim_token|workspace_id|page_id|fact_id|operation_id|actor_user_id)"' then return false; end if;
 if name='reschedule_post' then
   return internal.has_exact_json_keys(d,array['post_public_id','status','revision','content_hash_unchanged','scheduled_at','plan_item_schedule','replayed']) is true
     and internal.plan_is_uuid_v1(d->'post_public_id') is true and d->>'status' in ('draft','ready')
     and internal.is_json_integer_between(d->'revision',2,2147483647) is true and d->'content_hash_unchanged'='true'::jsonb
     and internal.plan_is_time_v1(d->'scheduled_at',true) is true and internal.plan_is_time_v1(d->'plan_item_schedule',true) is true;
 elsif name='save_post' then
   if internal.has_exact_json_keys(d,array['post','plan','replayed']) is distinct from true
     or (d->'plan'<>'null'::jsonb and internal.plan_is_summary_v1(d->'plan') is distinct from true) then return false; end if;
 elsif name='revise_post' then
   if internal.has_exact_json_keys(d,array['post','released_fact_public_ids','replaced_fact_public_ids','approval_invalidated','replayed']) is distinct from true
     or pg_catalog.jsonb_typeof(d->'approval_invalidated') is distinct from 'boolean' then return false; end if;
   foreach k in array array['released_fact_public_ids','replaced_fact_public_ids'] loop
     if pg_catalog.jsonb_typeof(d->k) is distinct from 'array' or pg_catalog.jsonb_array_length(d->k)>9 then return false; end if;
     for b in select value from pg_catalog.jsonb_array_elements(d->k) loop if internal.plan_is_uuid_v1(b) is distinct from true then return false; end if; end loop;
   end loop;
 else return false; end if;
 if internal.has_exact_json_keys(p,array['post_public_id','page_public_id','niche_key','status','revision','content_hash','format_key','topic_key','interaction_goal',
   'scheduled_at','published_at','content_payload','system_checks','editorial_checks','quality_status','fact_bindings','created_at','updated_at']) is distinct from true
   or internal.plan_is_uuid_v1(p->'post_public_id') is distinct from true or internal.plan_is_uuid_v1(p->'page_public_id') is distinct from true
   or p->>'niche_key'<>'trivia' or p->>'status'<>'draft' or p->>'content_hash' !~ '^[0-9a-f]{64}$'
   or internal.is_json_integer_between(p->'revision',1,2147483647) is distinct from true
   or p->>'quality_status' not in ('pending','failed','passed')
   or internal.is_valid_post_payload_v1(p->'content_payload',1) is distinct from true
   or internal.is_valid_system_checks_v1(p->'system_checks',p->>'content_hash',(p->>'revision')::integer) is distinct from true
   or internal.is_valid_editorial_checks_v1(p->'editorial_checks',p->>'content_hash',(p->>'revision')::integer) is distinct from true
   or pg_catalog.jsonb_typeof(p->'fact_bindings') is distinct from 'array' or pg_catalog.jsonb_array_length(p->'fact_bindings') not between 1 and 9 then return false; end if;
 for b in select value from pg_catalog.jsonb_array_elements(p->'fact_bindings') loop
   if internal.has_exact_json_keys(b,array['fact_public_id','position','fact_role','rendered_text','allocation_state','source_snapshot']) is distinct from true
     or internal.plan_is_uuid_v1(b->'fact_public_id') is distinct from true or b->>'allocation_state'<>'allocated' then return false; end if;
 end loop;
 return true;
exception when others then return false;
end; $$;

create function internal.post_complete_v6(op bigint,name text,p public.posts,r jsonb,before_post public.posts,reason text default null) returns void
language plpgsql volatile security invoker set search_path='' as $$
declare ctx record; history uuid; snapshot jsonb;
begin
 select * into ctx from internal.assert_request_context_v1();
 if internal.post_response_valid_v1(name,r) is distinct from true then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 insert into internal.post_write_history(workspace_id,page_id,post_id,operation_id,actor_user_id,oauth_client_id,operation_name,prior_revision,prior_content_hash,prior_schedule,before_evidence,reason,response)
 values(p.workspace_id,p.page_id,p.id,op,ctx.actor_user_id,ctx.oauth_client_id,name,before_post.revision,before_post.content_hash,before_post.scheduled_at,
   case when before_post.id is null then '{}'::jsonb else pg_catalog.jsonb_build_object('system_checks',before_post.system_checks,'editorial_checks',before_post.editorial_checks,'approval_snapshot',before_post.approval_snapshot) end,reason,r)
 returning public_id into history;
 snapshot:=pg_catalog.jsonb_build_object('schema_version',6,'operation_name',name,'target_public_id',p.public_id,'history_public_id',history,
   'response_hash',pg_catalog.encode(extensions.digest(pg_catalog.convert_to(r::text,'UTF8'),'sha256'),'hex'));
 update internal.operation_ledger set response_snapshot=snapshot,target_type='post',target_public_id=p.public_id,completed_at=pg_catalog.clock_timestamp()
 where id=op and workspace_id=p.workspace_id and actor_user_id=ctx.actor_user_id and operation_name=name and completed_at is null;
 if not found then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
end; $$;
create function internal.post_replay_v6(op bigint,name text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare l internal.operation_ledger; h internal.post_write_history; s jsonb;
begin
 select * into l from internal.operation_ledger where id=op and operation_name=name and actor_user_id=internal.request_actor_user_id_v1(); s:=l.response_snapshot;
 if l.completed_at is null or internal.has_exact_json_keys(s,array['schema_version','operation_name','target_public_id','history_public_id','response_hash']) is distinct from true
   or s->'schema_version' is distinct from '6'::jsonb or s->>'operation_name' is distinct from name or pg_catalog.octet_length(s::text)>2048 then
   raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 select * into h from internal.post_write_history where operation_id=l.id and workspace_id=l.workspace_id and actor_user_id=l.actor_user_id
   and public_id=(s->>'history_public_id')::uuid and operation_name=name;
 if h.id is null or l.target_public_id::text is distinct from s->>'target_public_id'
   or not exists(select 1 from public.posts p where p.id=h.post_id and p.workspace_id=l.workspace_id and p.public_id=l.target_public_id)
   or s->>'response_hash' is distinct from pg_catalog.encode(extensions.digest(pg_catalog.convert_to(h.response::text,'UTF8'),'sha256'),'hex')
   or internal.post_response_valid_v1(name,h.response) is distinct from true then raise exception using errcode='P0001',message='INTERNAL_ERROR'; end if;
 return pg_catalog.jsonb_set(h.response,'{data,replayed}','true'::jsonb);
end; $$;

create function internal.post_package_v1(p public.posts) returns jsonb
language sql stable security invoker set search_path='' as $$
 select pg_catalog.jsonb_build_object('post_public_id',p.public_id,'page_public_id',(select public_id from public.pages where id=p.page_id),
  'niche_key',p.niche_key,'status',p.status,'revision',p.revision,'content_hash',p.content_hash,'format_key',p.format_key,'topic_key',p.topic_key,'interaction_goal',p.interaction_goal,
  'scheduled_at',internal.iso_timestamp_v1(p.scheduled_at),'published_at',internal.iso_timestamp_v1(p.published_at),'content_payload',p.content_payload,
  'system_checks',p.system_checks,'editorial_checks',p.editorial_checks,'quality_status',p.quality_status,
  'fact_bindings',(select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('fact_public_id',f.public_id,'position',j.position,'fact_role',j.fact_role,
    'rendered_text',j.rendered_text,'allocation_state',j.allocation_state,'source_snapshot',internal.project_fact_source_snapshot_v1(j.source_snapshot)) order by j.position),'[]')
    from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id and f.workspace_id=j.workspace_id where j.post_id=p.id and j.workspace_id=p.workspace_id and j.is_current),
  'created_at',internal.iso_timestamp_v1(p.created_at),'updated_at',internal.iso_timestamp_v1(p.updated_at));
$$;
create function internal.post_usage_snapshot_v1(f public.trivia_facts) returns jsonb
language sql stable security invoker set search_path='' as $$
 select pg_catalog.jsonb_build_object('schema_version',1,'canonical_claim',f.claim_text,'normalized_claim',f.normalized_claim,'normalization_version',f.normalization_version,
  'claim_hash',f.claim_hash,'subject_key',f.subject_key,'relation_key',f.relation_key,'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers,
  'ontology_version',f.ontology_version,'structured_key',f.structured_key,'structured_hash',f.structured_hash,'structured_match_eligible',f.structured_match_eligible,
  'topic_key',f.topic_key,'risk_class',f.risk_class,'source_schema_version',1,'sources',f.source_data,'verification_status',f.verification_status,
  'verified_at',internal.iso_timestamp_v1(f.verified_at),'as_of_date',f.as_of_date,'expires_at',internal.iso_timestamp_v1(f.expires_at),'dedup_review_schema_version',1);
$$;

create function internal.post_lock_facts_v1(w bigint,ids uuid[],old_post bigint default null) returns void
language plpgsql volatile security invoker set search_path='' as $$
declare candidates jsonb;
begin
 -- Page/plan/item/post locks already held. Materialize union BEFORE fact locks.
 select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('claim_text',f.claim_text,'subject_key',f.subject_key,'relation_key',f.relation_key,
  'object_key',f.object_key,'numbers',f.numbers,'qualifiers',f.qualifiers) order by f.id),'[]') into candidates from public.trivia_facts f
 where f.workspace_id=w and (f.public_id=any(ids) or exists(select 1 from public.trivia_post_facts j where j.post_id=old_post and j.fact_id=f.id and j.is_current));
 perform internal.trivia_lock_identities_v1(w,candidates);
 perform 1 from public.trivia_facts f where f.workspace_id=w and (f.public_id=any(ids)
  or exists(select 1 from public.trivia_post_facts j where j.post_id=old_post and j.fact_id=f.id and j.is_current)) order by f.id for update;
 perform 1 from public.trivia_post_facts j where j.workspace_id=w and j.post_id=old_post order by j.id for update;
end; $$;

create function internal.post_generation_context_v1(s jsonb,c public.page_niche_configs,page public.pages,content jsonb,override jsonb default '{}') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare effective jsonb:=c.config; key text; count integer:=pg_catalog.jsonb_array_length(content#>'{body,facts}');
begin
 if internal.is_valid_trivia_config_v1(c.config) is distinct from true or internal.is_valid_trivia_plan_override_v1(override,c.config) is distinct from true then
   raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
 foreach key in array array['fact_count','render_style','text_budget','caption','hashtags'] loop
   if override ? key then effective:=pg_catalog.jsonb_set(effective,array[key],override->key); end if;
 end loop;
 if internal.post_generation_shape_v1(s) is distinct from true then raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
 s:=pg_catalog.jsonb_set(s,'{config_updated_at}',pg_catalog.to_jsonb(internal.iso_timestamp_v1((s->>'config_updated_at')::timestamptz)));
 if s->>'config_public_id'<>c.public_id::text or (s->>'config_updated_at')::timestamptz<>c.updated_at
   or s->'fact_count' is distinct from effective->'fact_count' or s->'text_budget' is distinct from effective->'text_budget'
   or s->'fact_reuse_scope' is distinct from effective->'fact_reuse_scope' or s->'render_style' is distinct from effective->'render_style'
   or content->'render_style' is distinct from s->'render_style' or s->'target_markets' is distinct from pg_catalog.to_jsonb(page.target_markets)
   or (s->>'fact_count_applied')::integer<>count or (override ? 'profile_key' and s->'profile_key' is distinct from override->'profile_key') then
   raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
 if s->'fact_count_override'='true'::jsonb and (s->'override_reason'='null'::jsonb or internal.plan_safe_reason_v1(s->>'override_reason') is distinct from true) then
   raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 if pg_catalog.char_length(content->>'caption')>(effective#>>'{caption,max_chars}')::integer
   or pg_catalog.jsonb_array_length(content->'hashtags') not between (effective#>>'{hashtags,min_count}')::integer and (effective#>>'{hashtags,max_count}')::integer then
   raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID'; end if;
 return s;
end; $$;

create function internal.post_allocate_v1(p public.posts,bindings jsonb,token uuid,c public.page_niche_configs) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare ids uuid[]; new_ids uuid[]; removed uuid[]; f public.trivia_facts; j public.trivia_post_facts; b jsonb; snapshot jsonb; hist internal.trivia_reservation_sets;
begin
 select pg_catalog.array_agg((value->>'fact_public_id')::uuid order by (value->>'position')::integer) into ids from pg_catalog.jsonb_array_elements(bindings);
 select coalesce(pg_catalog.array_agg(id order by pos),'{}') into new_ids from (select (value->>'fact_public_id')::uuid id,(value->>'position')::integer pos
   from pg_catalog.jsonb_array_elements(bindings) where not exists(select 1 from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id
     where j.post_id=p.id and j.is_current and j.allocation_state='allocated' and f.public_id=(value->>'fact_public_id')::uuid)) q;
 if pg_catalog.cardinality(new_ids)=0 then
   if token is not null then raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
 else
   if token is null then raise exception using errcode='P0001',message='RESERVATION_REQUIRED'; end if;
   select * into hist from internal.trivia_reservation_sets where workspace_id=p.workspace_id and token_fingerprint=internal.trivia_token_fingerprint_v1(p.workspace_id,token);
   if hist.id is null or hist.page_id<>p.page_id or hist.actor_user_id<>internal.request_actor_user_id_v1() or hist.ordered_fact_public_ids is distinct from new_ids then
     raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
   if hist.config_updated_at<>c.updated_at or hist.reuse_scope<>c.config->>'fact_reuse_scope' then
     raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
 end if;
 -- Validate whole set before releasing any old allocation.
 foreach token in array array[token] loop
   for b in select value from pg_catalog.jsonb_array_elements(bindings) loop
     select * into f from public.trivia_facts where workspace_id=p.workspace_id and public_id=(b->>'fact_public_id')::uuid;
     if f.id is null or f.verification_status<>'verified' or exists(select 1 from public.trivia_facts sf where sf.workspace_id=p.workspace_id and sf.supersedes_fact_id=f.id
       and sf.verification_status in ('needs_review','verified')) then raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
     if f.expires_at is null or f.expires_at<=pg_catalog.clock_timestamp() then raise exception using errcode='P0001',message='FACT_FRESHNESS_EXPIRED'; end if;
     if internal.is_valid_source_evidence_v2(f.source_data) is distinct from true then raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
     if f.public_id=any(new_ids) then
       if f.reservation_status<>'reserved' or f.reservation_token is distinct from token or f.reserved_for_page_id<>p.page_id
         or f.reservation_context->>'actor_user_id'<>internal.request_actor_user_id_v1()::text
         or f.reservation_context->'ordered_fact_public_ids' is distinct from pg_catalog.to_jsonb(new_ids)
         or f.reservation_context->>'request_hash' is distinct from hist.request_hash then raise exception using errcode='P0001',message='FACT_RESERVATION_MISMATCH'; end if;
       if f.reserved_until<=pg_catalog.clock_timestamp() then raise exception using errcode='P0001',message='FACT_RESERVATION_EXPIRED'; end if;
       if (f.reservation_context->>'config_updated_at')::timestamptz<>c.updated_at or f.reservation_context->>'fact_reuse_scope'<>c.config->>'fact_reuse_scope' then
         raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
     else
       select * into j from public.trivia_post_facts where post_id=p.id and fact_id=f.id and is_current and allocation_state='allocated';
       if j.id is null or (j.source_snapshot->>'expires_at')::timestamptz<=pg_catalog.clock_timestamp() then
         raise exception using errcode='P0001',message='FACT_FRESHNESS_EXPIRED'; end if;
     end if;
     if exists(select 1 from public.trivia_post_facts u where u.workspace_id=p.workspace_id and u.fact_id=f.id and u.allocation_state in ('allocated','published')
       and u.post_id<>p.id and (c.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=p.page_id)) then
       raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
   end loop;
 end loop;
 select coalesce(pg_catalog.array_agg(f.public_id order by j.position),'{}') into removed from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id
   where j.post_id=p.id and j.is_current and not(f.public_id=any(ids));
 update public.trivia_post_facts set allocation_state='released',released_at=pg_catalog.clock_timestamp(),is_current=false
   where post_id=p.id and is_current and fact_id in(select id from public.trivia_facts where public_id=any(removed));
 -- Temporary disjoint positions allow permutations under immediate unique index.
 update public.trivia_post_facts set position=position+100 where post_id=p.id and is_current;
 for b in select value from pg_catalog.jsonb_array_elements(bindings) loop
   select * into f from public.trivia_facts where workspace_id=p.workspace_id and public_id=(b->>'fact_public_id')::uuid;
   if f.public_id=any(new_ids) then
     snapshot:=internal.post_usage_snapshot_v1(f);
     if pg_catalog.octet_length(snapshot::text)>32768 then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
     insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,verified_at_snapshot)
       values(p.workspace_id,p.page_id,p.id,f.id,(b->>'position')::integer,b->>'fact_role',b->>'rendered_text',f.claim_hash,snapshot,f.verified_at);
   else update public.trivia_post_facts set position=(b->>'position')::integer,fact_role=b->>'fact_role',rendered_text=b->>'rendered_text' where post_id=p.id and fact_id=f.id and is_current;
   end if;
 end loop;
 update public.trivia_facts set reservation_status='available',reservation_token=null,reserved_for_page_id=null,reserved_at=null,reserved_until=null,reservation_context=null
   where workspace_id=p.workspace_id and public_id=any(new_ids);
 return pg_catalog.jsonb_build_object('released_fact_public_ids',removed,'replaced_fact_public_ids',new_ids);
end; $$;

create function internal.post_hash_v1(p public.posts) returns text
language sql stable security invoker set search_path='' as $$
 select pg_catalog.encode(extensions.digest(pg_catalog.convert_to('content-producer:post:v1|'||pg_catalog.jsonb_build_object('schema_version',1,
  'page_public_id',(select public_id from public.pages where id=p.page_id),'niche_key',p.niche_key,'content_schema_version',p.content_schema_version,
  'format_key',p.format_key,'topic_key',p.topic_key,'interaction_goal',p.interaction_goal,'content_payload',p.content_payload,'generation_snapshot',p.generation_snapshot,
  'fact_bindings',(select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object('fact_public_id',f.public_id,'position',j.position,'fact_role',j.fact_role,'rendered_text',j.rendered_text,
    'usage_snapshot',j.source_snapshot) order by j.position) from public.trivia_post_facts j join public.trivia_facts f on f.id=j.fact_id where j.post_id=p.id and j.is_current))::text,'UTF8'),'sha256'),'hex');
$$;
create function internal.post_raise_v1(state text,message text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if state in ('40P01','40001','55P03','57014') then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
 if message=any(array['AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED','OPERATION_KEY_REUSED','RATE_LIMITED','VALIDATION_FAILED','PAGE_NOT_FOUND','MODULE_DISABLED',
  'POST_NOT_FOUND','REVISION_CONFLICT','CONTENT_HASH_CONFLICT','INVALID_STATUS_TRANSITION','SCHEDULE_CONFLICT','CONFIG_INVALID','CONTENT_SCHEMA_UNSUPPORTED','CONTENT_PAYLOAD_INVALID',
  'FORMAT_UNSUPPORTED','TOPIC_UNSUPPORTED','PROFILE_UNSUPPORTED','CONTENT_RENDER_MISMATCH','MODULE_RELATION_INVALID','RESERVATION_REQUIRED','FACT_RESERVATION_MISMATCH',
  'FACT_RESERVATION_CONTEXT_CHANGED','FACT_RESERVATION_EXPIRED','FACT_NOT_ELIGIBLE','FACT_FRESHNESS_EXPIRED','FACT_SOURCE_INSUFFICIENT','FACT_REUSE_BLOCKED',
  'PLAN_ITEM_NOT_FOUND','PLAN_STATUS_CONFLICT','PLAN_ITEM_CLAIM_MISMATCH','PLAN_ITEM_CLAIM_EXPIRED','APPROVAL_STALE','QUALITY_EVIDENCE_STALE']) then
  raise exception using errcode='P0001',message=message; end if;
 raise exception using errcode='P0001',message='INTERNAL_ERROR';
end; $$;

-- Preserve get_post's API, selecting current membership for both bindings/warnings.
do $$ declare src text; anchor text:='and usage.post_id = v_post.id'; begin
 src:=pg_catalog.pg_get_functiondef('api.get_post(integer,uuid,uuid,boolean,boolean,boolean)'::regprocedure);
 if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing get_post membership anchor'; end if;
 execute pg_catalog.replace(src,anchor,anchor||' and usage.is_current');
end $$;
grant execute on function internal.is_valid_generation_snapshot_legacy_v1(jsonb),internal.fact_usage_snapshot_matches_fact_v1(jsonb,bigint),
  internal.is_valid_fact_usage_snapshot_v1(jsonb),internal.trivia_validate_post_fact_v1(),internal.trivia_protect_referenced_fact_meaning_v1()
  to content_producer_api_owner;
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
 for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='internal' and p.proname like 'post_%' loop
  execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
  execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
 end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
