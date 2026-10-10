-- Phase 4, checkpoint 4.4: private, deterministic candidate retrieval.

create index trivia_facts_search_vector_idx
  on public.trivia_facts using gin (search_vector);

create index trivia_facts_normalized_claim_trgm_idx
  on public.trivia_facts using gin (normalized_claim extensions.gin_trgm_ops);

create index trivia_facts_workspace_verification_topic_idx
  on public.trivia_facts (workspace_id, verification_status, topic_key, id);

create index trivia_facts_reservation_token_idx
  on public.trivia_facts (reservation_token, id)
  where reservation_status = 'reserved';

create index trivia_facts_reserved_until_idx
  on public.trivia_facts (reserved_until, id)
  where reservation_status = 'reserved';

create function internal.trivia_find_candidates_v1(
  p_workspace_id bigint,
  p_claim_text text,
  p_subject_key text,
  p_relation_key text,
  p_object_key text,
  p_numbers jsonb,
  p_qualifiers jsonb,
  p_sources jsonb,
  p_limit integer default 20
)
returns table (
  fact_id bigint,
  fact_public_id uuid,
  verification_status text,
  normalized_claim text,
  signals jsonb,
  score_components jsonb
)
language sql
stable
strict
set search_path = pg_catalog, internal, public, extensions
as $$
  with input as (
    select
      internal.trivia_normalize_claim_v1(p_claim_text) as normalized_claim,
      internal.trivia_claim_hash_v1(internal.trivia_normalize_claim_v1(p_claim_text)) as claim_hash,
      internal.trivia_canonical_numbers_v1(p_numbers) as numbers,
      internal.trivia_canonical_qualifiers_v1(p_qualifiers) as qualifiers
  ), normalized_input as (
    select
      *,
      internal.trivia_build_structured_key_v1(p_subject_key, p_relation_key, p_object_key, numbers, qualifiers) as structured_key
    from input
  ), scored as (
    select
      f.*,
      ni.claim_hash = f.claim_hash as exact_claim,
      f.structured_match_eligible
        and internal.trivia_structured_match_eligible_v1(p_relation_key, ni.numbers, ni.qualifiers, 1)
        and f.structured_key = ni.structured_key as exact_structured,
      ts_rank_cd(f.search_vector, plainto_tsquery('simple'::regconfig, ni.normalized_claim)) as fts_score,
      extensions.similarity(f.normalized_claim, ni.normalized_claim) as trigram_score,
      f.subject_key = p_subject_key as entity_match,
      f.relation_key = p_relation_key as relation_match,
      f.numbers = ni.numbers as numeric_match,
      f.qualifiers = ni.qualifiers as qualifier_match,
      exists (
        select 1
        from jsonb_array_elements(f.source_data) existing_source(value)
        join jsonb_array_elements(p_sources) candidate_source(value)
          on existing_source.value ->> 'canonical_url' = candidate_source.value ->> 'canonical_url'
      ) as source_overlap
    from public.trivia_facts f
    cross join normalized_input ni
    where f.workspace_id = p_workspace_id
      and f.verification_status in ('needs_review', 'verified')
  )
  select
    id,
    public_id,
    verification_status,
    normalized_claim,
    jsonb_strip_nulls(jsonb_build_object(
      'exact_claim', case when exact_claim then true end,
      'exact_structured', case when exact_structured then true end,
      'fts', case when fts_score > 0 then true end,
      'trigram', case when trigram_score >= 0.20 then true end,
      'entity', case when entity_match then true end,
      'relation', case when relation_match then true end,
      'numeric', case when numeric_match then true end,
      'qualifier', case when qualifier_match then true end,
      'source_overlap', case when source_overlap then true end
    )),
    jsonb_build_object(
      'exact_claim', case when exact_claim then 1 else 0 end,
      'exact_structured', case when exact_structured then 1 else 0 end,
      'fts', round(fts_score::numeric, 6),
      'trigram', round(trigram_score::numeric, 6),
      'entity', case when entity_match then 1 else 0 end,
      'relation', case when relation_match then 1 else 0 end,
      'numeric', case when numeric_match then 1 else 0 end,
      'qualifier', case when qualifier_match then 1 else 0 end,
      'source_overlap', case when source_overlap then 1 else 0 end
    )
  from scored
  where exact_claim or exact_structured or fts_score > 0 or trigram_score >= 0.20
    or entity_match or numeric_match or qualifier_match or source_overlap
  order by exact_claim desc, exact_structured desc, fts_score desc, trigram_score desc, public_id
  limit least(greatest(p_limit, 1), 20);
$$;

revoke all on function internal.trivia_find_candidates_v1(bigint, text, text, text, text, jsonb, jsonb, jsonb, integer)
  from public, anon, authenticated, service_role;
