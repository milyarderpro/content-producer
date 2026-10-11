-- Checkpoint 5.5 / CR-012. Private foundation only.
grant update(id) on public.workspaces to content_producer_api_owner;
grant insert, update on public.trivia_facts to content_producer_api_owner;
grant usage, select on sequence public.trivia_facts_id_seq to content_producer_api_owner;
grant update(status, quality_status, revision, ready_at, approval_snapshot, system_checks, editorial_checks)
on public.posts to content_producer_api_owner;

create policy workspaces_api_owner_lock_5_5 on public.workspaces for update to content_producer_api_owner
using (is_active and owner_user_id=(select internal.request_actor_user_id_v1()))
with check (is_active and owner_user_id=(select internal.request_actor_user_id_v1()));
create policy trivia_facts_api_owner_insert_5_5 on public.trivia_facts for insert to content_producer_api_owner
with check (exists(select 1 from public.workspaces w where w.id=workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy trivia_facts_api_owner_update_5_5 on public.trivia_facts for update to content_producer_api_owner
using (exists(select 1 from public.workspaces w where w.id=workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())))
with check (exists(select 1 from public.workspaces w where w.id=workspace_id and w.is_active
  and w.owner_user_id=(select internal.request_actor_user_id_v1())));

create table internal.trivia_reservation_sets (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid() unique,
  workspace_id bigint not null references public.workspaces(id) on delete restrict,
  page_id bigint not null,
  operation_id bigint not null,
  actor_user_id uuid not null,
  token_fingerprint text not null check(token_fingerprint ~ '^[0-9a-f]{64}$'),
  request_hash text not null check(request_hash ~ '^[0-9a-f]{64}$'),
  ordered_fact_public_ids uuid[] not null check(cardinality(ordered_fact_public_ids) between 1 and 9),
  config_updated_at timestamptz not null,
  reuse_scope text not null check(reuse_scope in ('workspace_unique','page_unique')),
  reserved_at timestamptz not null,
  reserved_until timestamptz not null,
  ttl_minutes integer not null check(ttl_minutes between 5 and 120),
  foreign key(workspace_id,page_id) references public.pages(workspace_id,id) on delete restrict,
  foreign key(workspace_id,operation_id) references internal.operation_ledger(workspace_id,id) on delete restrict,
  unique(workspace_id,token_fingerprint),
  check(reserved_until=reserved_at+pg_catalog.make_interval(mins=>ttl_minutes))
);
alter table internal.trivia_reservation_sets enable row level security;
revoke all on internal.trivia_reservation_sets, internal.trivia_reservation_sets_id_seq
from public,anon,authenticated,service_role;
grant select,insert on internal.trivia_reservation_sets to content_producer_api_owner;
grant usage,select on internal.trivia_reservation_sets_id_seq to content_producer_api_owner;
create policy trivia_reservation_sets_api_owner_select on internal.trivia_reservation_sets
for select to content_producer_api_owner using (actor_user_id=(select internal.request_actor_user_id_v1())
  and exists(select 1 from public.workspaces w where w.id=workspace_id and w.is_active
    and w.owner_user_id=(select internal.request_actor_user_id_v1())));
create policy trivia_reservation_sets_api_owner_insert on internal.trivia_reservation_sets
for insert to content_producer_api_owner with check (actor_user_id=(select internal.request_actor_user_id_v1())
  and exists(select 1 from public.workspaces w where w.id=workspace_id and w.is_active
    and w.owner_user_id=(select internal.request_actor_user_id_v1()))
  and exists(select 1 from internal.operation_ledger l where l.id=operation_id and l.workspace_id=workspace_id
    and l.actor_user_id=(select internal.request_actor_user_id_v1()) and l.operation_name='trivia_register_and_reserve_facts'));

create function internal.trivia_history_immutable_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin raise exception using errcode='P0001',message='IMMUTABLE_HISTORY'; end; $$;
create trigger trivia_reservation_sets_immutable before update on internal.trivia_reservation_sets
for each row execute function internal.trivia_history_immutable_v1();

create function internal.trivia_token_fingerprint_v1(p_workspace bigint,p_token uuid) returns text
language sql immutable strict security invoker set search_path='' as $$
  select pg_catalog.encode(extensions.digest(pg_catalog.convert_to(
    'trivia-reservation:v1|'||p_workspace::text||'|'||p_token::text,'UTF8'),'sha256'),'hex');
$$;

create function internal.trivia_rpc_raise_v1(p_state text,p_message text) returns void
language plpgsql security invoker set search_path='' as $$
declare v_code text;
begin
  v_code:=case
    when p_state in ('40P01','40001','55P03','57014') then 'DATABASE_BUSY'
    when p_message in ('AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED','OPERATION_KEY_REUSED',
      'RATE_LIMITED','VALIDATION_FAILED','PAGE_NOT_FOUND','MODULE_DISABLED','ONTOLOGY_VERSION_UNSUPPORTED',
      'FACT_HASH_COLLISION','FACT_REVIEW_REQUIRED','FACT_NOT_ELIGIBLE','FACT_FRESHNESS_EXPIRED',
      'FACT_SOURCE_INSUFFICIENT','FACT_RESERVATION_CONFLICT','FACT_RESERVATION_EXPIRED',
      'FACT_RESERVATION_MISMATCH','FACT_RESERVATION_CONTEXT_CHANGED','FACT_REUSE_BLOCKED',
      'FACT_CORRECTION_REQUIRED','FACT_CORRECTION_CONFLICT') then p_message
    when p_message in ('TRIVIA_SOURCE_INVALID','TRIVIA_SOURCE_POLICY_FAILED') then 'FACT_SOURCE_INSUFFICIENT'
    when p_message='TRIVIA_FRESHNESS_INVALID' then 'FACT_FRESHNESS_EXPIRED'
    when p_message in ('TRIVIA_CANDIDATE_INVALID','TRIVIA_DEDUP_REVIEW_INVALID') then 'VALIDATION_FAILED'
    when p_message='TRIVIA_ONTOLOGY_UNSUPPORTED' then 'ONTOLOGY_VERSION_UNSUPPORTED'
    else 'INTERNAL_ERROR' end;
  raise exception using errcode='P0001',message=v_code;
end; $$;

create function internal.trivia_candidate_v1(p_candidate jsonb) returns jsonb
language plpgsql immutable security invoker set search_path='' as $$
declare v_result jsonb; v_key text; v_limit integer;
begin
  if internal.has_exact_json_keys(p_candidate,array['candidate_key','claim_text','subject_key','relation_key',
    'object_key','numbers','qualifiers','topic_key','normalization_version','ontology_version']) is distinct from true
    or internal.is_json_integer_between(p_candidate->'normalization_version',1,1) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_json_integer_between(p_candidate->'ontology_version',1,1) is distinct from true
    or internal.trivia_relation_is_known_v1(p_candidate->>'relation_key') is distinct from true then
    raise exception using errcode='P0001',message='ONTOLOGY_VERSION_UNSUPPORTED'; end if;
  foreach v_key in array array['candidate_key','claim_text','subject_key','relation_key','object_key','topic_key'] loop
    v_limit:=case v_key when 'candidate_key' then 64 when 'claim_text' then 500 when 'object_key' then 300 else 120 end;
    if pg_catalog.jsonb_typeof(p_candidate->v_key) is distinct from 'string'
      or pg_catalog.char_length(pg_catalog.btrim(p_candidate->>v_key)) not between 1 and v_limit then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  end loop;
  if p_candidate->>'candidate_key' !~ '^[A-Za-z0-9_-]{1,64}$'
    or p_candidate->>'topic_key' not in ('animals','pet_safety','food_science','food_storage_home','practical_utility',
      'human_body','nature_science','geography','history_origins','inventions_everyday','general_trivia')
    or pg_catalog.jsonb_typeof(p_candidate->'qualifiers'->'negated') is distinct from 'boolean' then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  v_result:=p_candidate||pg_catalog.jsonb_build_object(
    'claim_text',pg_catalog.btrim(p_candidate->>'claim_text'),
    'subject_key',pg_catalog.btrim(p_candidate->>'subject_key'),'object_key',pg_catalog.btrim(p_candidate->>'object_key'),
    'numbers',internal.trivia_canonical_numbers_v2(p_candidate->'numbers'),
    'qualifiers',internal.trivia_canonical_qualifiers_v3(p_candidate->>'relation_key',p_candidate->'qualifiers'));
  if v_result->'numbers'='null'::jsonb or v_result->'qualifiers'='null'::jsonb then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  return v_result;
end; $$;

create function internal.trivia_candidates_v3(p_workspace bigint,p_candidate jsonb,p_sources jsonb,p_limit integer)
returns table(fact_id bigint,signals jsonb,score_components jsonb,strong boolean)
language sql stable security invoker set search_path='' as $$
  with input as (select internal.trivia_normalize_claim_v1(p_candidate->>'claim_text') n,
    internal.trivia_build_structured_key_v3(p_candidate->>'subject_key',p_candidate->>'relation_key',
      p_candidate->>'object_key',p_candidate->'numbers',p_candidate->'qualifiers') sk),
  scored as (select f.id,f.public_id,f.normalized_claim=i.n exact_claim,
    f.structured_key=i.sk structured_equal,
    f.structured_match_eligible and internal.trivia_structured_match_eligible_v1(p_candidate->>'relation_key',
      p_candidate->'numbers',p_candidate->'qualifiers',1) and f.structured_key=i.sk exact_structured,
    pg_catalog.ts_rank_cd(f.search_vector,pg_catalog.plainto_tsquery('simple',i.n)) fts,
    extensions.similarity(f.normalized_claim,i.n) trgm,
    f.subject_key=p_candidate->>'subject_key' entity, f.topic_key=p_candidate->>'topic_key' topic,
    f.numbers=p_candidate->'numbers' numeric_match,f.qualifiers=p_candidate->'qualifiers' qualifier,
    exists(select 1 from pg_catalog.jsonb_array_elements(f.source_data) a(value)
      join pg_catalog.jsonb_array_elements(p_sources) b(value) on a.value->>'canonical_url'=b.value->>'canonical_url') overlap
    from public.trivia_facts f cross join input i where f.workspace_id=p_workspace
      and f.verification_status in ('needs_review','verified'))
  select id,pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'exact_claim',case when exact_claim then true end,'exact_structured',case when exact_structured then true end,
    'fts',case when fts>0 then true end,'trigram',case when trgm>=0.20 then true end,'entity',case when entity then true end,
    'numeric',case when numeric_match then true end,'qualifier',case when qualifier then true end,
    'source_overlap',case when overlap and pg_catalog.jsonb_array_length(p_sources)>0 then true end)),
    pg_catalog.jsonb_build_object('exact_claim',case when exact_claim then 1 else 0 end,
      'exact_structured',case when exact_structured then 1 else 0 end,'fts',pg_catalog.round(fts::numeric,6),
      'trigram',pg_catalog.round(trgm::numeric,6),'entity',case when entity then 1 else 0 end,
      'numeric',case when numeric_match then 1 else 0 end,'qualifier',case when qualifier then 1 else 0 end)
      ||case when pg_catalog.jsonb_array_length(p_sources)>0 then pg_catalog.jsonb_build_object('source_overlap',case when overlap then 1 else 0 end) else '{}'::jsonb end,
    exact_claim or structured_equal or fts>0 or trgm>=0.20 or entity
  from scored where exact_claim or structured_equal or fts>0 or trgm>=0.20 or entity or topic or numeric_match or qualifier or overlap
  order by exact_claim desc,exact_structured desc,fts desc,trgm desc,public_id limit p_limit;
$$;

create function internal.trivia_lock_workspace_v1(p_workspace bigint) returns void
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.workspaces where id=p_workspace and is_active
    and owner_user_id=internal.request_actor_user_id_v1() for no key update;
  if not found then raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED'; end if;
end; $$;

create function internal.trivia_lock_page_v1(p_workspace bigint,p_page uuid,p_require_enabled boolean default true)
returns public.page_niche_configs language plpgsql security invoker set search_path='' as $$
declare v_page public.pages; v_config public.page_niche_configs;
begin
  select * into v_page from public.pages where workspace_id=p_workspace and public_id=p_page for update;
  if not found then raise exception using errcode='P0001',message='PAGE_NOT_FOUND'; end if;
  select * into v_config from public.page_niche_configs where workspace_id=p_workspace and page_id=v_page.id
    and niche_key='trivia' for update;
  if p_require_enabled and (v_config.id is null or not v_page.is_active or not v_config.is_enabled) then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  return v_config;
end; $$;

create function internal.trivia_lock_identities_v1(p_workspace bigint,p_candidates jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare v_key bigint;
begin
  for v_key in select distinct k from (
    select pg_catalog.hashtextextended('content-producer:trivia-lineage:v1:'||p_workspace::text,0) k
    union all select pg_catalog.hashtextextended('trivia-claim:v1:'||p_workspace||':'||
      internal.trivia_normalize_claim_v1(value->>'claim_text'),0) from pg_catalog.jsonb_array_elements(p_candidates)
    union all select pg_catalog.hashtextextended('trivia-structure:v1:'||p_workspace||':'||
      internal.trivia_build_structured_key_v3(value->>'subject_key',value->>'relation_key',value->>'object_key',
        value->'numbers',value->'qualifiers'),0) from pg_catalog.jsonb_array_elements(p_candidates)
  ) keys order by k loop perform pg_catalog.pg_advisory_xact_lock(v_key); end loop;
end; $$;

create function internal.trivia_effective_expiry_v1(p_sources jsonb,p_class text,p_risk text,p_as_of date,
  p_requested timestamptz,p_now timestamptz,p_relation text,p_note text) returns timestamptz
language plpgsql security invoker set search_path='' as $$
declare v_count integer; v_independent integer; v_a boolean; v_ceiling timestamptz;
begin
  if internal.is_valid_source_evidence_v2(p_sources) is distinct from true then
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
  if p_class is null or p_class not in ('stable','periodic','volatile') or p_risk is null
    or p_risk not in ('standard','sensitive') or p_note is null or pg_catalog.char_length(pg_catalog.btrim(p_note)) not between 1 and 1000 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  select count(*),count(distinct value->>'independence_group'),pg_catalog.bool_or(value->>'tier'='A')
    into v_count,v_independent,v_a from pg_catalog.jsonb_array_elements(p_sources) where value->>'tier' in ('A','B');
  if v_count=0 or (p_risk='sensitive' and (not coalesce(v_a,false) or v_independent<2))
    or (p_class in ('periodic','volatile') and (p_as_of is null
      or ((p_relation='holds_record_by_metric_as_of' or p_risk='sensitive') and v_independent<2))) then
    raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
  if p_requested is null or not pg_catalog.isfinite(p_requested) or p_requested<=p_now then
    raise exception using errcode='P0001',message='FACT_FRESHNESS_EXPIRED'; end if;
  v_ceiling:=p_now+case p_class when 'stable' then interval '24 months' when 'periodic' then interval '12 months' else interval '90 days' end;
  if p_risk='sensitive' then v_ceiling:=least(v_ceiling,p_now+interval '180 days'); end if;
  return least(p_requested,v_ceiling);
end; $$;

-- Narrow dependency grants: these are validated Phase 4 primitives, never caller APIs.
do $$ declare v_function regprocedure; begin
  for v_function in select p.oid::regprocedure from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname=any(array['has_exact_json_keys','is_json_integer_between',
      'trivia_normalize_claim_v1','trivia_relation_is_known_v1','trivia_canonical_numbers_v2','trivia_canonical_qualifiers_v3',
      'trivia_relation_direction_is_valid_v1','trivia_build_structured_key_v3','trivia_hex_scalar_v1',
      'trivia_claim_hash_v1','trivia_structured_hash_v1','trivia_structured_match_eligible_v1',
      'trivia_relation_is_deterministic_safe_v1','is_valid_source_evidence_v2','is_valid_dedup_review_snapshot_v2',
      'trivia_is_valid_uuid_v4_v1','trivia_is_valid_rfc3339_v1','trivia_is_valid_date_text_v1','is_valid_reservation_context_v1',
      'trivia_invalidate_fact_v1','trivia_correct_fact_v1']) loop
    execute pg_catalog.format('grant execute on function %s to content_producer_api_owner',v_function);
  end loop;
end $$;

grant create on schema internal to content_producer_api_owner;
do $$ declare v_function regprocedure; begin
  for v_function in select p.oid::regprocedure from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
    where n.nspname='internal' and p.proname=any(array['trivia_history_immutable_v1','trivia_token_fingerprint_v1',
      'trivia_rpc_raise_v1','trivia_candidate_v1','trivia_candidates_v3','trivia_lock_workspace_v1','trivia_lock_page_v1',
      'trivia_lock_identities_v1','trivia_effective_expiry_v1']) loop
    execute pg_catalog.format('alter function %s owner to content_producer_api_owner',v_function);
    execute pg_catalog.format('revoke all on function %s from public,anon,authenticated,service_role',v_function);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
