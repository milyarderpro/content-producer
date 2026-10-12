-- CR-014: private effective gate. Accepted warnings NEVER rewrite check results.
create function internal.lifecycle_ids_v1(ids text[]) returns text[]
language plpgsql immutable security invoker set search_path='' as $$
declare result text[];
begin
 if ids is null or pg_catalog.cardinality(ids)>20 or exists(select 1 from pg_catalog.unnest(ids) x where x is null or x not in
   ('FACT_COUNT_BELOW_CONFIG_MIN','trivia.profile.preferred_band','trivia.variety_sufficient','trivia.caption_supportive','trivia.visual_rhythm_clear'))
   or (select count(distinct x) from pg_catalog.unnest(ids) x)<>pg_catalog.cardinality(ids) then
   raise exception using errcode='P0001',message='WAIVER_NOT_ALLOWED'; end if;
 select coalesce(pg_catalog.array_agg(x order by x),'{}') into result from pg_catalog.unnest(ids) x;
 return result;
end; $$;
create function internal.lifecycle_reason_v1(ids text[],reason text) returns text
language plpgsql immutable security invoker set search_path='' as $$
begin
 if (pg_catalog.cardinality(ids)>0 and internal.plan_safe_reason_v1(pg_catalog.btrim(reason)) is distinct from true)
   or (pg_catalog.cardinality(ids)=0 and reason is not null) then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 return pg_catalog.btrim(reason);
end; $$;
create function internal.lifecycle_effective_gate_v1(s jsonb,e jsonb,g jsonb,ids text[],reason text,exact boolean default true) returns void
language plpgsql stable security invoker set search_path='' as $$
declare c jsonb; required text[]:='{}'; n integer; waiver boolean; editorial jsonb;
begin
 ids:=internal.lifecycle_ids_v1(ids); perform internal.lifecycle_reason_v1(ids,reason);
 -- Full closed editorial registry, not the permissive legacy evidence reader.
 editorial:=internal.post_editorial_input_v1(e-array['schema_version','evaluated_at','evaluator','post_revision','content_hash']);
 if pg_catalog.jsonb_array_length(editorial->'criteria')<>18 or editorial->>'overall_status'='fail' then
   raise exception using errcode='P0001',message='QUALITY_EDITORIAL_INCOMPLETE'; end if;
 for c in select value from pg_catalog.jsonb_array_elements(e->'criteria') loop
   if c->>'status'='fail' or (c->>'status'='needs_review' and (c->>'severity'<>'noncritical'
     or c->>'id' not in ('trivia.variety_sufficient','trivia.caption_supportive','trivia.visual_rhythm_clear'))) then
     raise exception using errcode='P0001',message='QUALITY_EDITORIAL_INCOMPLETE'; end if;
   if c->>'status'='needs_review' then required:=pg_catalog.array_append(required,c->>'id'); end if;
 end loop;
 if (e->>'overall_status'='pass' and pg_catalog.cardinality(required)>0)
   or (e->>'overall_status'='needs_review' and pg_catalog.cardinality(required)=0) then
   raise exception using errcode='P0001',message='QUALITY_EDITORIAL_INCOMPLETE'; end if;
 n:=(g->>'fact_count_applied')::integer;
 waiver:=g#>>'{fact_count,mode}'='adaptive' and n between 1 and 9 and n<(g#>>'{fact_count,min}')::integer
   and n<=(g#>>'{fact_count,max}')::integer and g->'fact_count_override'='true'::jsonb
   and internal.plan_safe_reason_v1(g->>'override_reason') is true;
 for c in select value from pg_catalog.jsonb_array_elements(s->'checks') loop
   if c->>'severity'='blocking' and c->>'status'<>'passed' then
     if c->>'id'='trivia.facts.count_valid' and c->>'status'='failed' and waiver then
       required:=pg_catalog.array_append(required,'FACT_COUNT_BELOW_CONFIG_MIN');
     else raise exception using errcode='P0001',message='QUALITY_SYSTEM_CHECK_FAILED'; end if;
   elsif c->>'severity'='warning' and c->>'status'<>'passed' then
     if c->>'id'<>'trivia.profile.preferred_band' or c->>'status'<>'needs_review' then
       raise exception using errcode='P0001',message='QUALITY_SYSTEM_CHECK_FAILED'; end if;
     required:=pg_catalog.array_append(required,c->>'id');
   end if;
 end loop;
 select coalesce(pg_catalog.array_agg(x order by x),'{}') into required from pg_catalog.unnest(required) x;
 if not(required<@ids) or (exact and ids is distinct from required) then
   raise exception using errcode='P0001',message='WAIVER_NOT_ALLOWED'; end if;
end; $$;
create function internal.lifecycle_source_policy_v1(sources jsonb,risk text,independent boolean) returns boolean
language sql stable security invoker set search_path='' as $$
 select internal.is_valid_source_evidence_v2(sources) is true and count(*)>=1
   and (risk<>'sensitive' or (coalesce(pg_catalog.bool_or(value->>'tier'='A'),false) and count(distinct value->>'independence_group')>=2))
   and (not independent or count(distinct value->>'independence_group')>=2)
 from pg_catalog.jsonb_array_elements(sources) s(value) where value->>'tier' in ('A','B');
$$;
create function internal.lifecycle_current_system_v1(p public.posts) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare c public.page_niche_configs; page public.pages; f public.trivia_facts; j public.trivia_post_facts;
 b jsonb; bindings jsonb:='[]'; pos integer:=0; override jsonb:='{}'; content jsonb; g jsonb;
begin
 select * into c from public.page_niche_configs where workspace_id=p.workspace_id and page_id=p.page_id and niche_key=p.niche_key;
 select * into page from public.pages where workspace_id=p.workspace_id and id=p.page_id;
 if p.niche_key<>'trivia' or not page.is_active or c.id is null or not c.is_enabled then
   raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
 perform internal.post_assert_choices_v1(c,p.content_schema_version,p.format_key,p.topic_key,p.interaction_goal);
 content:=internal.post_render_v1(p.content_payload);
 if content is distinct from p.content_payload then raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
 if p.content_plan_item_id is not null then
   select item_config into override from public.content_plan_items where id=p.content_plan_item_id and workspace_id=p.workspace_id;
 end if;
 g:=internal.post_generation_context_v1(p.generation_snapshot,c,page,content,override);
 if g is distinct from p.generation_snapshot then raise exception using errcode='P0001',message='FACT_RESERVATION_CONTEXT_CHANGED'; end if;
 for j in select * from public.trivia_post_facts where workspace_id=p.workspace_id and post_id=p.id and is_current order by position loop
   pos:=pos+1;
   if j.position<>pos or j.page_id<>p.page_id or j.allocation_state<>'allocated' then
     raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
   select * into f from public.trivia_facts where id=j.fact_id and workspace_id=p.workspace_id;
   if f.id is null or f.verification_status<>'verified' or exists(select 1 from public.trivia_facts sf
     where sf.workspace_id=p.workspace_id and sf.supersedes_fact_id=f.id and sf.verification_status in ('needs_review','verified')) then
     raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
   if f.expires_at is null or f.expires_at<=pg_catalog.clock_timestamp()
     or internal.is_valid_fact_usage_snapshot_v1(j.source_snapshot) is distinct from true
     or (j.source_snapshot->>'expires_at')::timestamptz<=pg_catalog.clock_timestamp() then
     raise exception using errcode='P0001',message='FACT_FRESHNESS_EXPIRED'; end if;
   if j.claim_hash_snapshot is distinct from f.claim_hash or j.source_snapshot->>'claim_hash' is distinct from f.claim_hash
     or j.source_snapshot->>'canonical_claim' is distinct from f.claim_text then
     raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
   if internal.lifecycle_source_policy_v1(f.source_data,f.risk_class,
       f.freshness_class in ('periodic','volatile') and (f.relation_key='holds_record_by_metric_as_of' or f.risk_class='sensitive')) is distinct from true
     or internal.lifecycle_source_policy_v1(j.source_snapshot->'sources',j.source_snapshot->>'risk_class',false) is distinct from true then
     raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
   if internal.is_valid_dedup_review_snapshot_v2(f.dedup_review_snapshot) is distinct from true then
     raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
   if exists(select 1 from public.trivia_post_facts u where u.workspace_id=p.workspace_id and u.fact_id=f.id
     and u.allocation_state in ('allocated','published') and u.post_id<>p.id
     and (c.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=p.page_id)) then
     raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
   bindings:=bindings||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object('position',j.position,'fact_public_id',f.public_id,
     'fact_role',j.fact_role,'rendered_text',j.rendered_text));
 end loop;
 if pos not between 1 and 9 or pos<>pg_catalog.jsonb_array_length(content#>'{body,facts}') then
   raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
 b:=internal.post_bindings_v1(bindings,content);
 if internal.post_hash_v1(p) is distinct from p.content_hash then raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
 -- Page gate held before post/facts; no advisory schedule lock is acquired late.
 if p.scheduled_at is not null and (exists(select 1 from public.posts pp where pp.page_id=p.page_id and pp.id<>p.id
   and pp.status<>'discarded' and pp.scheduled_at=p.scheduled_at)
   or exists(select 1 from public.content_plan_items i where i.page_id=p.page_id and i.id is distinct from p.content_plan_item_id
     and i.status<>'cancelled' and i.scheduled_at=p.scheduled_at)) then raise exception using errcode='P0001',message='SCHEDULE_CONFLICT'; end if;
 return internal.post_system_v1(content,g,p.content_hash,p.revision+1);
end; $$;
create function internal.lifecycle_evidence_v1(p public.posts,empty_allowed boolean default false) returns void
language plpgsql stable security invoker set search_path='' as $$
begin
 if (not(empty_allowed and p.system_checks='{}') and internal.is_valid_system_checks_v1(p.system_checks,p.content_hash,p.revision) is distinct from true)
   or (not(empty_allowed and p.editorial_checks='{}') and internal.is_valid_editorial_checks_v1(p.editorial_checks,p.content_hash,p.revision) is distinct from true) then
   raise exception using errcode='P0001',message='QUALITY_EVIDENCE_STALE'; end if;
end; $$;
create function internal.lifecycle_rebind_v1(e jsonb,r integer) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select case when e='{}'::jsonb then e else pg_catalog.jsonb_set(e,'{post_revision}',pg_catalog.to_jsonb(r)) end;
$$;
create function internal.lifecycle_approval_v1(p public.posts) returns void
language plpgsql stable security invoker set search_path='' as $$
declare a jsonb:=p.approval_snapshot; ids text[]; l internal.operation_ledger;
begin
 if a is null or internal.has_exact_json_keys(a,array['schema_version','approved_by_user_id','approved_at','approved_revision','content_hash','operation_id','accepted_warning_ids','warning_acceptance_reason']) is distinct from true
   or pg_catalog.octet_length(a::text)>32768 or a->'schema_version' is distinct from '1'::jsonb
   or a->>'approved_by_user_id' is distinct from internal.request_actor_user_id_v1()::text
   or a->'approved_revision' is distinct from pg_catalog.to_jsonb(p.revision) or a->>'content_hash' is distinct from p.content_hash
   or internal.plan_is_time_v1(a->'approved_at') is distinct from true or p.ready_at is null
   or (a->>'approved_at')::timestamptz is distinct from p.ready_at or p.quality_status<>'passed'
   or pg_catalog.jsonb_typeof(a->'accepted_warning_ids') is distinct from 'array'
   or (a->'warning_acceptance_reason'<>'null'::jsonb and pg_catalog.jsonb_typeof(a->'warning_acceptance_reason') is distinct from 'string') then
   raise exception using errcode='P0001',message='APPROVAL_STALE'; end if;
 select * into l from internal.operation_ledger where id=(a->>'operation_id')::bigint and workspace_id=p.workspace_id
   and actor_user_id=internal.request_actor_user_id_v1() and operation_name='approve_post' and completed_at is not null
   and target_public_id=p.public_id and target_type='post';
 if l.id is null or not exists(select 1 from internal.post_write_history h where h.operation_id=l.id and h.workspace_id=p.workspace_id
   and h.post_id=p.id and h.actor_user_id=l.actor_user_id and h.operation_name='approve_post'
   and h.public_id::text=l.response_snapshot->>'history_public_id' and l.response_snapshot->'schema_version'='7'::jsonb
   and l.response_snapshot->>'response_hash'=pg_catalog.encode(extensions.digest(pg_catalog.convert_to(h.response::text,'UTF8'),'sha256'),'hex')
   and h.response#>'{data,approval,content_hash}'=a->'content_hash' and h.response#>'{data,approval,approved_at}'=a->'approved_at'
   and h.response#>'{data,approval,accepted_warning_ids}'=a->'accepted_warning_ids'
   and h.response#>'{data,approval,warning_acceptance_reason}'=a->'warning_acceptance_reason'
   and (h.response#>>'{data,revision}')::integer<=p.revision) then raise exception using errcode='P0001',message='APPROVAL_STALE'; end if;
 select coalesce(pg_catalog.array_agg(value#>>'{}' order by value#>>'{}'),'{}') into ids from pg_catalog.jsonb_array_elements(a->'accepted_warning_ids');
 perform internal.lifecycle_ids_v1(ids); perform internal.lifecycle_reason_v1(ids,a->>'warning_acceptance_reason');
exception when others then raise exception using errcode='P0001',message='APPROVAL_STALE';
end; $$;
create function internal.lifecycle_approval_summary_v1(a jsonb) returns jsonb
language sql immutable security invoker set search_path='' as $$
 select pg_catalog.jsonb_build_object('approved_revision',a->'approved_revision','content_hash',a->'content_hash','approved_at',a->'approved_at',
   'accepted_warning_ids',a->'accepted_warning_ids','warning_acceptance_reason',a->'warning_acceptance_reason');
$$;
create function internal.lifecycle_raise_v1(state text,message text) returns void
language plpgsql security invoker set search_path='' as $$
begin
 if message=any(array['WAIVER_NOT_ALLOWED','QUALITY_SYSTEM_CHECK_FAILED','QUALITY_EDITORIAL_INCOMPLETE','APPROVAL_REQUIRED','FACT_REVIEW_REQUIRED']) then
   raise exception using errcode='P0001',message=message; end if;
 if state='23505' then raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
 perform internal.post_raise_v1(state,message);
end; $$;

-- Historical archive binding is narrowly protected, never a stale-ready waiver.
do $$ declare src text; a text:='internal.is_valid_system_checks_v1(new.system_checks, new.content_hash, new.revision)';
 b text:='internal.is_valid_editorial_checks_v1(new.editorial_checks, new.content_hash, new.revision)'; begin
 src:=pg_catalog.pg_get_functiondef('internal.validate_post_row()'::regprocedure);
 if pg_catalog.strpos(src,a)=0 or pg_catalog.strpos(src,b)=0 then raise exception 'Missing evidence validator anchors'; end if;
 src:=pg_catalog.replace(src,a,'internal.is_valid_system_checks_v1(new.system_checks, new.content_hash, case when new.status=''archived'' and new.generation_snapshot ? ''schema_version'' then new.revision-1 else new.revision end)');
 src:=pg_catalog.replace(src,b,'internal.is_valid_editorial_checks_v1(new.editorial_checks, new.content_hash, case when new.status=''archived'' and new.generation_snapshot ? ''schema_version'' then new.revision-1 else new.revision end)');
 execute src;
end $$;
create function internal.lifecycle_archive_guard_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 if new.status='archived' and new.generation_snapshot ? 'schema_version' then
   if tg_op<>'UPDATE' then raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
   if old.status not in ('posted','archived') or (old.status='posted' and new.revision<>old.revision+1)
     or (old.status='archived' and new.revision<>old.revision)
     or new.system_checks is distinct from old.system_checks or new.editorial_checks is distinct from old.editorial_checks
     or new.approval_snapshot is distinct from old.approval_snapshot or new.content_hash<>old.content_hash
     or new.content_payload is distinct from old.content_payload or new.generation_snapshot is distinct from old.generation_snapshot
     or new.scheduled_at is distinct from old.scheduled_at or new.ready_at is distinct from old.ready_at
     or new.published_at is distinct from old.published_at or new.platform_post_id is distinct from old.platform_post_id
     or new.published_url is distinct from old.published_url or new.quality_status<>old.quality_status
     or new.approval_snapshot->'approved_revision' is distinct from pg_catalog.to_jsonb(new.revision-1)
     or new.approval_snapshot->>'content_hash' is distinct from new.content_hash then
     raise exception using errcode='P0001',message='APPROVAL_STALE'; end if;
 end if;
 return new;
end; $$;
create trigger posts_lifecycle_archive_guard before insert or update on public.posts
for each row execute function internal.lifecycle_archive_guard_v1();

grant update(published_at,platform_post_id,published_url,discarded_at,archived_at) on public.posts to content_producer_api_owner;
grant update(published_at) on public.trivia_post_facts to content_producer_api_owner;
grant execute on function internal.is_valid_dedup_review_snapshot_v2(jsonb) to content_producer_api_owner;
grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
 for r in select p.oid::regprocedure f from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
   where n.nspname='internal' and p.proname like 'lifecycle_%' loop
   execute pg_catalog.format('alter function %s owner to content_producer_api_owner',r.f);
   execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
 end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
