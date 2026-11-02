-- P3-T3: source-free sentence retrieval over the one canonical registry.
-- complete is relative to the exact/full-text/trigram predicate, never a
-- semantic-duplicate guarantee.
grant select on internal.trivia_fact_catalog_v2 to content_producer_api_owner;

create function api.trivia_find_similar_facts_v2(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_page_public_id uuid,
  p_candidates jsonb
) returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_workspace bigint; v_page bigint; v_result jsonb; v_candidate jsonb;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_workspace_public_id is null or p_page_public_id is null
    or pg_catalog.jsonb_typeof(p_candidates) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_candidates) not between 1 and 9
    or (select count(distinct value->>'candidate_key')
        from pg_catalog.jsonb_array_elements(p_candidates))
      <> pg_catalog.jsonb_array_length(p_candidates) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  for v_candidate in select value from pg_catalog.jsonb_array_elements(p_candidates) loop
    if internal.has_exact_json_keys(v_candidate, array['candidate_key','claim_text'])
        is distinct from true
      or pg_catalog.jsonb_typeof(v_candidate->'candidate_key') is distinct from 'string'
      or v_candidate->>'candidate_key' !~ '^[A-Za-z0-9_-]{1,64}$'
      or pg_catalog.jsonb_typeof(v_candidate->'claim_text') is distinct from 'string'
      or pg_catalog.char_length(v_candidate->>'claim_text') not between 1 and 500
      or v_candidate->>'claim_text' <> pg_catalog.btrim(v_candidate->>'claim_text')
      or internal.trivia_normalize_claim_v1(v_candidate->>'claim_text') = '' then
      raise exception using errcode='P0001',message='VALIDATION_FAILED';
    end if;
  end loop;
  perform internal.assert_rate_limit_v1('expensive_read');
  select workspace_id into v_workspace
    from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  if v_workspace is null then
    raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED';
  end if;

  -- This single SELECT gives all candidates, usage, Page config, and catalog
  -- version one database statement snapshot. A later Write rechecks under the
  -- workspace gate; this Read itself makes no business mutation.
  with page as (
    select p.id, n.config->>'fact_reuse_scope' reuse_scope
    from public.pages p
    join public.page_niche_configs n on n.workspace_id=p.workspace_id
      and n.page_id=p.id and n.niche_key='trivia'
    where p.workspace_id=v_workspace and p.public_id=p_page_public_id
      and p.is_active and n.is_enabled
  ), catalog as (
    select coalesce((select version from internal.trivia_fact_catalog_v2
      where workspace_id=v_workspace),0)::text version
  ), inputs as (
    select item.ordinality ord, item.value->>'candidate_key' candidate_key,
      internal.trivia_normalize_claim_v1(item.value->>'claim_text') normalized
    from pg_catalog.jsonb_array_elements(p_candidates) with ordinality item(value, ordinality)
  ), result as (
    select i.ord, i.candidate_key,
      coalesce(r.match_count,0) match_count,
      coalesce(r.matches,'[]'::jsonb) matches
    from inputs i cross join page p
    cross join lateral (
      select max(chosen.total_count) match_count,
        pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object(
            'fact_public_id',chosen.public_id,
            'claim_text',chosen.claim_text,
            'status',chosen.verification_status,
            'reuse_eligibility',case
              when chosen.verification_status in ('invalidated','superseded','rejected') then 'not_eligible'
              when chosen.reservation_status='reserved'
                and chosen.reserved_until>pg_catalog.statement_timestamp() then 'actively_reserved'
              when chosen.used_workspace and p.reuse_scope='workspace_unique' then 'workspace_blocked'
              when chosen.used_page then 'page_blocked'
              else 'eligible' end,
            'used_on_page',chosen.used_page,
            'used_in_workspace',chosen.used_workspace
          ) order by chosen.rn
        ) matches
      from (
        select ranked.*,
          exists(select 1 from public.trivia_post_facts j
            where j.workspace_id=v_workspace and j.fact_id=ranked.id
              and j.is_current and j.allocation_state in ('allocated','published')) used_workspace,
          exists(select 1 from public.trivia_post_facts j
            where j.workspace_id=v_workspace and j.fact_id=ranked.id and j.page_id=p.id
              and j.is_current and j.allocation_state in ('allocated','published')) used_page
        from (
          select f.id, f.public_id, f.claim_text, f.verification_status,
            f.reservation_status, f.reserved_until,
            row_number() over (order by (f.normalized_claim=i.normalized) desc,
              coalesce(pg_catalog.ts_rank_cd(f.search_vector,
                pg_catalog.plainto_tsquery('simple',i.normalized)),0) desc,
              coalesce(extensions.similarity(f.normalized_claim,i.normalized),0) desc,
              f.public_id) rn,
            count(*) over () total_count
          from public.trivia_facts f
          where f.workspace_id=v_workspace and (
            f.normalized_claim=i.normalized
            or pg_catalog.ts_rank_cd(f.search_vector,
              pg_catalog.plainto_tsquery('simple',i.normalized))>0
            or extensions.similarity(f.normalized_claim,i.normalized)>=0.20)
        ) ranked where ranked.rn<=20
      ) chosen
    ) r
  )
  select p.id,
    pg_catalog.jsonb_build_object('response_schema_version',2,'data',
      pg_catalog.jsonb_build_object('catalog_version',c.version,
        'candidates',coalesce(pg_catalog.jsonb_agg(
          pg_catalog.jsonb_build_object('candidate_key',r.candidate_key,
            'complete',r.match_count<=20,'matches',r.matches) order by r.ord),'[]'::jsonb)))
  into v_page, v_result
  from page p cross join catalog c cross join result r
  group by p.id,c.version;
  if v_page is null then
    if not exists(select 1 from public.pages where workspace_id=v_workspace
      and public_id=p_page_public_id) then
      raise exception using errcode='P0001',message='PAGE_NOT_FOUND';
    end if;
    raise exception using errcode='P0001',message='MODULE_DISABLED';
  end if;
  if pg_catalog.octet_length(v_result::text)>65536 then
    raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED';
  end if;
  return v_result;
exception when query_canceled then
  raise exception using errcode='P0001',message='DATABASE_BUSY';
end;
$$;

grant create on schema api to content_producer_api_owner;
alter function api.trivia_find_similar_facts_v2(integer,uuid,uuid,jsonb)
  owner to content_producer_api_owner;
revoke create on schema api from content_producer_api_owner;
revoke all on function api.trivia_find_similar_facts_v2(integer,uuid,uuid,jsonb)
  from public, anon, authenticated, service_role;
grant execute on function api.trivia_find_similar_facts_v2(integer,uuid,uuid,jsonb)
  to authenticated;

-- The v1 projection requires material ontology. If a mandatory native
-- candidate cannot be represented honestly, preserve its identity and reject
-- that v1 request instead of silently presenting a clean result.
create function internal.trivia_native_candidate_blocker_v2(
  p_workspace bigint, p_claim text
) returns boolean language sql stable security invoker set search_path = '' as $$
  with input as (select internal.trivia_normalize_claim_v1(p_claim) n)
  select exists(select 1 from public.trivia_facts f cross join input i
    where f.workspace_id=p_workspace and not f.has_v1_envelope
      and (f.normalized_claim=i.n
        or pg_catalog.ts_rank_cd(f.search_vector,
          pg_catalog.plainto_tsquery('simple',i.n))>0
        or extensions.similarity(f.normalized_claim,i.n)>=0.20));
$$;

-- Existing success envelopes stay untouched. The adapter lives in the
-- database resolver so both old tool and direct RPC paths see the same guard.
do $$ declare d text; anchor text; replacement text; begin
  d:=pg_catalog.pg_get_functiondef(
    'api.trivia_find_similar_facts(integer,uuid,uuid,jsonb,integer)'::regprocedure);
  anchor:='c:=internal.trivia_candidate_v1(c); v_matches:=';
  replacement:='c:=internal.trivia_candidate_v1(c); '
    ||'if internal.trivia_native_candidate_blocker_v2(w.workspace_id,c->>''claim_text'') '
    ||'then raise exception using errcode=''P0001'',message=''FACT_REVIEW_REQUIRED''; end if; v_matches:=';
  if pg_catalog.strpos(d,anchor)=0 then
    raise exception 'UNEXPECTED_V1_READ_DEFINITION';
  end if;
  execute pg_catalog.replace(d,anchor,replacement);
end $$;

revoke all on function internal.trivia_native_candidate_blocker_v2(bigint,text)
  from public, anon, authenticated, service_role;
grant execute on function internal.trivia_native_candidate_blocker_v2(bigint,text)
  to content_producer_api_owner;
