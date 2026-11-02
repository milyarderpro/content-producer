-- CR-053 P5-T1. Recompute mechanical checks; source content is not fetched.
create function internal.lifecycle_current_system_v2(p public.posts) returns jsonb
language plpgsql volatile security invoker set search_path='' as $$
declare c public.page_niche_configs; page public.pages; j public.trivia_post_facts;
  f public.trivia_facts; content jsonb; n integer:=0; seen bigint[]:='{}';
begin
  select * into c from public.page_niche_configs where workspace_id=p.workspace_id
    and page_id=p.page_id and niche_key=p.niche_key;
  select * into page from public.pages where workspace_id=p.workspace_id and id=p.page_id;
  if p.niche_key<>'trivia' or page.id is null or not page.is_active
    or c.id is null or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  content:=internal.post_render_v2(p.content_payload);
  if content is distinct from p.content_payload then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  perform internal.post_assert_edit_v2(c,content,
    pg_catalog.jsonb_array_length(content#>'{body,facts}'),p.format_key,p.topic_key,p.interaction_goal);
  if p.generation_snapshot->>'locale' is distinct from c.config#>>'{style,english_variant}'
    or p.generation_snapshot->>'profile_key' is distinct from
      (case when p.format_key='themed_utility' then 'practical_utility' else 'fast_trivia' end) then
    raise exception using errcode='P0001',message='QUALITY_SYSTEM_CHECK_FAILED'; end if;
  for j in select * from public.trivia_post_facts where workspace_id=p.workspace_id
    and post_id=p.id and is_current order by position loop
    n:=n+1;
    select * into f from public.trivia_facts where workspace_id=p.workspace_id and id=j.fact_id;
    if j.position<>n or j.page_id<>p.page_id or j.snapshot_schema_version<>2
      or j.allocation_state<>'allocated' or f.id is null or f.id=any(seen)
      or j.rendered_text is distinct from content#>>array['body','facts',(n-1)::text,'text']
      or j.claim_hash_snapshot is distinct from f.claim_hash
      or j.source_snapshot->>'canonical_claim' is distinct from f.claim_text then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    seen:=pg_catalog.array_append(seen,f.id);
    if internal.has_exact_json_keys(j.source_snapshot,array[
      'schema_version','canonical_claim','source_url']) is distinct from true
      or j.source_snapshot->'schema_version' is distinct from '2'::jsonb
      or internal.trivia_web_source_url_v2(j.source_snapshot->>'source_url') is distinct from true then
      raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
    if f.verification_status in ('invalidated','superseded','rejected')
      or exists(select 1 from public.trivia_facts sf where sf.workspace_id=p.workspace_id
        and sf.supersedes_fact_id=f.id and sf.verification_status in ('needs_review','verified'))
      or (f.reservation_status='reserved' and f.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
    if exists(select 1 from public.trivia_post_facts u where u.workspace_id=p.workspace_id
      and u.fact_id=f.id and u.post_id<>p.id and u.is_current
      and u.allocation_state in ('allocated','published')
      and (c.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
  end loop;
  if n not between 1 and 9 or n<>pg_catalog.jsonb_array_length(content#>'{body,facts}') then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  if internal.post_hash_v2(p) is distinct from p.content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.scheduled_at is not null and (exists(select 1 from public.posts pp
    where pp.page_id=p.page_id and pp.id<>p.id and pp.status<>'discarded' and pp.scheduled_at=p.scheduled_at)
    or exists(select 1 from public.content_plan_items i where i.page_id=p.page_id
      and i.id is distinct from p.content_plan_item_id and i.status<>'cancelled'
      and i.scheduled_at=p.scheduled_at)) then
    raise exception using errcode='P0001',message='SCHEDULE_CONFLICT'; end if;
  -- Only the revision binding changes; these are newly computed server results.
  return pg_catalog.jsonb_build_object('schema_version',2,'post_revision',p.revision+1,
    'content_hash',p.content_hash,'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
end; $$;

-- Version dispatch preserves the original v1 implementations and contracts.
do $$ declare src text; anchor text;
begin
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_current_system_v1(public.posts)'::regprocedure);
  anchor:='select * into c from public.page_niche_configs';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle system anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'if p.content_schema_version=2 then return internal.lifecycle_current_system_v2(p); end if; '||anchor);
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_evidence_v1(public.posts,boolean)'::regprocedure);
  anchor:='if (not(empty_allowed';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle evidence anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'if p.content_schema_version=2 then '
    ||'if internal.post_evidence_valid_v2(p.system_checks,p.content_hash,p.revision,false) is distinct from true '
    ||'or internal.post_evidence_valid_v2(p.editorial_checks,p.content_hash,p.revision,true) is distinct from true '
    ||'then raise exception using errcode=''P0001'',message=''QUALITY_EVIDENCE_STALE''; end if; return; end if; '||anchor);
  src:=pg_catalog.pg_get_functiondef('internal.lifecycle_effective_gate_v1(jsonb,jsonb,jsonb,text[],text,boolean)'::regprocedure);
  anchor:='ids:=internal.lifecycle_ids_v1(ids);';
  if pg_catalog.strpos(src,anchor)=0 then raise exception 'Missing lifecycle effective gate anchor'; end if;
  execute pg_catalog.replace(src,anchor,
    'if g->''content_schema_version''=''2''::jsonb then '
    ||'if ids is distinct from ''{}''::text[] or reason is not null then '
    ||'raise exception using errcode=''P0001'',message=''WAIVER_NOT_ALLOWED''; end if; '
    ||'if internal.post_evidence_valid_v2(s,s->>''content_hash'',(s->>''post_revision'')::integer,false) is distinct from true '
    ||'or internal.post_evidence_valid_v2(e,s->>''content_hash'',(s->>''post_revision'')::integer-1,true) is distinct from true '
    ||'then raise exception using errcode=''P0001'',message=''QUALITY_EVIDENCE_STALE''; end if; return; end if; '||anchor);
end $$;

revoke all on function internal.lifecycle_current_system_v2(public.posts)
  from public,anon,authenticated,service_role;
grant execute on function internal.lifecycle_current_system_v2(public.posts)
  to content_producer_api_owner;
