-- CR-016 / P1-02: parameter-dependent canonical work is computed ONCE.
-- No filtering/ranking/threshold/signals/strong predicate is weakened.
create or replace function internal.trivia_candidates_v3(p_workspace bigint,p_candidate jsonb,p_sources jsonb,p_limit integer)
returns table(fact_id bigint,signals jsonb,score_components jsonb,strong boolean)
language sql stable security invoker set search_path='' as $$
  with normalized as materialized (
    select internal.trivia_normalize_claim_v1(p_candidate->>'claim_text') n,
      internal.trivia_build_structured_key_v3(p_candidate->>'subject_key',p_candidate->>'relation_key',
        p_candidate->>'object_key',p_candidate->'numbers',p_candidate->'qualifiers') sk,
      internal.trivia_structured_match_eligible_v1(p_candidate->>'relation_key',p_candidate->'numbers',p_candidate->'qualifiers',1) eligible,
      p_candidate->>'subject_key' subject,p_candidate->>'topic_key' topic,p_candidate->'numbers' numbers,p_candidate->'qualifiers' qualifiers,
      pg_catalog.jsonb_array_length(p_sources)>0 has_sources,
      array(select value->>'canonical_url' from pg_catalog.jsonb_array_elements(p_sources)) source_urls
  ), input as materialized (select *,pg_catalog.plainto_tsquery('simple',n) query from normalized),
  scored as (
    select f.id,f.public_id,f.normalized_claim=i.n exact_claim,f.structured_key=i.sk structured_equal,
      f.structured_match_eligible and i.eligible and f.structured_key=i.sk exact_structured,
      pg_catalog.ts_rank_cd(f.search_vector,i.query) fts,extensions.similarity(f.normalized_claim,i.n) trgm,
      f.subject_key=i.subject entity,f.topic_key=i.topic topic,f.numbers=i.numbers numeric_match,f.qualifiers=i.qualifiers qualifier,
      case when i.has_sources then exists(select 1 from pg_catalog.jsonb_array_elements(f.source_data) a(value)
        where a.value->>'canonical_url'=any(i.source_urls)) else false end overlap,i.has_sources
    from public.trivia_facts f cross join input i
    where f.workspace_id=p_workspace and f.verification_status in ('needs_review','verified')
  )
  select id,pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
    'exact_claim',case when exact_claim then true end,'exact_structured',case when exact_structured then true end,
    'fts',case when fts>0 then true end,'trigram',case when trgm>=0.20 then true end,'entity',case when entity then true end,
    'numeric',case when numeric_match then true end,'qualifier',case when qualifier then true end,
    'source_overlap',case when overlap and has_sources then true end)),
    pg_catalog.jsonb_build_object('exact_claim',case when exact_claim then 1 else 0 end,
      'exact_structured',case when exact_structured then 1 else 0 end,'fts',pg_catalog.round(fts::numeric,6),
      'trigram',pg_catalog.round(trgm::numeric,6),'entity',case when entity then 1 else 0 end,
      'numeric',case when numeric_match then 1 else 0 end,'qualifier',case when qualifier then 1 else 0 end)
      ||case when has_sources then pg_catalog.jsonb_build_object('source_overlap',case when overlap then 1 else 0 end) else '{}'::jsonb end,
    exact_claim or structured_equal or fts>0 or trgm>=0.20 or entity
  from scored where exact_claim or structured_equal or fts>0 or trgm>=0.20 or entity or topic or numeric_match or qualifier or overlap
  order by exact_claim desc,exact_structured desc,fts desc,trgm desc,public_id limit p_limit;
$$;
