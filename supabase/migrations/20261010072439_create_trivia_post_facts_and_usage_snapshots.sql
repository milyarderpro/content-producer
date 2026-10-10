-- Phase 4, checkpoint 4.5: authoritative trivia post-fact usage evidence.
-- Usage snapshots are copied at allocation and are never rebuilt from mutable
-- canonical evidence.

create table public.trivia_post_facts (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  page_id bigint not null,
  post_id bigint not null,
  niche_key text not null default 'trivia',
  fact_id bigint not null,
  position integer not null,
  fact_role text not null default 'general',
  rendered_text text not null,
  allocation_state text not null default 'allocated',
  claim_hash_snapshot text not null,
  source_snapshot jsonb not null,
  verified_at_snapshot timestamptz not null,
  released_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trivia_post_facts_public_id_key unique (public_id),
  constraint trivia_post_facts_post_fk
    foreign key (post_id, workspace_id, page_id, niche_key)
    references public.posts (id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint trivia_post_facts_fact_fk
    foreign key (workspace_id, fact_id)
    references public.trivia_facts (workspace_id, id)
    on delete restrict,
  constraint trivia_post_facts_post_position_key unique (post_id, position),
  constraint trivia_post_facts_post_fact_key unique (post_id, fact_id),
  constraint trivia_post_facts_niche_key_check check (niche_key = 'trivia'),
  constraint trivia_post_facts_position_check check (position >= 1),
  constraint trivia_post_facts_fact_role_check check (fact_role in (
    'general', 'myth_reversal', 'numeric_comparison', 'emotional',
    'practical', 'scientific', 'visual'
  )),
  constraint trivia_post_facts_rendered_text_check check (
    rendered_text = btrim(rendered_text)
    and char_length(rendered_text) between 1 and 90
    and cardinality(regexp_split_to_array(rendered_text, '[[:space:]]+')) <= 18
  ),
  constraint trivia_post_facts_claim_hash_snapshot_format_check
    check (claim_hash_snapshot ~ '^[0-9a-f]{64}$'),
  constraint trivia_post_facts_source_snapshot_object_check
    check (jsonb_typeof(source_snapshot) = 'object'),
  constraint trivia_post_facts_allocation_state_check
    check (allocation_state in ('allocated', 'published', 'released')),
  constraint trivia_post_facts_state_shape_check check (
    (allocation_state = 'allocated' and released_at is null and published_at is null)
    or (allocation_state = 'published' and released_at is null and published_at is not null)
    or (allocation_state = 'released' and released_at is not null and published_at is null)
  )
);

create unique index trivia_post_facts_page_active_fact_unique_idx
  on public.trivia_post_facts (page_id, fact_id)
  where allocation_state in ('allocated', 'published');

create index trivia_post_facts_fact_state_idx
  on public.trivia_post_facts (fact_id, allocation_state, id);

create index trivia_post_facts_page_state_recency_idx
  on public.trivia_post_facts (page_id, allocation_state, created_at desc, id desc);

create function internal.is_valid_fact_usage_snapshot_v1(p_snapshot jsonb)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_verified_at timestamptz;
  v_expires_at timestamptz;
begin
  if jsonb_typeof(p_snapshot) <> 'object'
    or not internal.has_exact_json_keys(p_snapshot, array[
      'schema_version', 'canonical_claim', 'normalized_claim', 'normalization_version',
      'claim_hash', 'subject_key', 'relation_key', 'object_key', 'numbers', 'qualifiers',
      'ontology_version', 'structured_key', 'structured_hash', 'structured_match_eligible',
      'topic_key', 'risk_class', 'source_schema_version', 'sources', 'verification_status',
      'verified_at', 'as_of_date', 'expires_at', 'dedup_review_schema_version'
    ])
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 1)
    or jsonb_typeof(p_snapshot -> 'canonical_claim') <> 'string'
    or char_length(p_snapshot ->> 'canonical_claim') not between 1 and 500
    or p_snapshot ->> 'canonical_claim' <> btrim(p_snapshot ->> 'canonical_claim')
    or jsonb_typeof(p_snapshot -> 'normalized_claim') <> 'string'
    or nullif(btrim(p_snapshot ->> 'normalized_claim'), '') is null
    or not internal.is_json_integer_between(p_snapshot -> 'normalization_version', 1, 1)
    or p_snapshot ->> 'claim_hash' !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_snapshot -> 'subject_key') <> 'string'
    or nullif(btrim(p_snapshot ->> 'subject_key'), '') is null
    or jsonb_typeof(p_snapshot -> 'relation_key') <> 'string'
    or not internal.trivia_relation_is_known_v1(p_snapshot ->> 'relation_key')
    or jsonb_typeof(p_snapshot -> 'object_key') <> 'string'
    or nullif(btrim(p_snapshot ->> 'object_key'), '') is null
    or internal.trivia_canonical_numbers_v2(p_snapshot -> 'numbers') is null
    or internal.trivia_canonical_numbers_v2(p_snapshot -> 'numbers') <> p_snapshot -> 'numbers'
    or internal.trivia_canonical_qualifiers_v3(p_snapshot ->> 'relation_key', p_snapshot -> 'qualifiers') is null
    or internal.trivia_canonical_qualifiers_v3(p_snapshot ->> 'relation_key', p_snapshot -> 'qualifiers') <> p_snapshot -> 'qualifiers'
    or not internal.is_json_integer_between(p_snapshot -> 'ontology_version', 1, 1)
    or jsonb_typeof(p_snapshot -> 'structured_key') <> 'string'
    or nullif(btrim(p_snapshot ->> 'structured_key'), '') is null
    or p_snapshot ->> 'structured_hash' !~ '^[0-9a-f]{64}$'
    or jsonb_typeof(p_snapshot -> 'structured_match_eligible') <> 'boolean'
    or p_snapshot ->> 'topic_key' not in (
      'animals', 'pet_safety', 'food_science', 'food_storage_home', 'practical_utility',
      'human_body', 'nature_science', 'geography', 'history_origins',
      'inventions_everyday', 'general_trivia'
    )
    or p_snapshot ->> 'risk_class' not in ('standard', 'sensitive')
    or not internal.is_json_integer_between(p_snapshot -> 'source_schema_version', 1, 1)
    or not internal.is_valid_source_evidence_v2(p_snapshot -> 'sources')
    or p_snapshot ->> 'verification_status' <> 'verified'
    or not internal.trivia_is_valid_rfc3339_v1(p_snapshot ->> 'verified_at')
    or jsonb_typeof(p_snapshot -> 'as_of_date') not in ('string', 'null')
    or (jsonb_typeof(p_snapshot -> 'as_of_date') = 'string'
      and not internal.trivia_is_valid_date_text_v1(p_snapshot ->> 'as_of_date'))
    or not internal.trivia_is_valid_rfc3339_v1(p_snapshot ->> 'expires_at')
    or not internal.is_json_integer_between(p_snapshot -> 'dedup_review_schema_version', 1, 1) then
    return false;
  end if;

  v_verified_at := (p_snapshot ->> 'verified_at')::timestamptz;
  v_expires_at := (p_snapshot ->> 'expires_at')::timestamptz;
  return v_expires_at > v_verified_at;
exception when others then
  return false;
end;
$$;

create function internal.fact_usage_snapshot_matches_fact_v1(
  p_snapshot jsonb,
  p_fact_id bigint
)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal, public
as $$
declare
  v_fact public.trivia_facts%rowtype;
begin
  select * into v_fact
  from public.trivia_facts
  where id = p_fact_id;

  if not found
    or not internal.is_valid_fact_usage_snapshot_v1(p_snapshot)
    or v_fact.verification_status <> 'verified'
    or v_fact.verified_at is null
    or v_fact.expires_at is null
    or v_fact.expires_at <= now() then
    return false;
  end if;

  return p_snapshot ->> 'canonical_claim' = v_fact.claim_text
    and p_snapshot ->> 'normalized_claim' = v_fact.normalized_claim
    and (p_snapshot ->> 'normalization_version')::integer = v_fact.normalization_version
    and p_snapshot ->> 'claim_hash' = v_fact.claim_hash
    and p_snapshot ->> 'subject_key' = v_fact.subject_key
    and p_snapshot ->> 'relation_key' = v_fact.relation_key
    and p_snapshot ->> 'object_key' = v_fact.object_key
    and p_snapshot -> 'numbers' = v_fact.numbers
    and p_snapshot -> 'qualifiers' = v_fact.qualifiers
    and (p_snapshot ->> 'ontology_version')::integer = v_fact.ontology_version
    and p_snapshot ->> 'structured_key' = v_fact.structured_key
    and p_snapshot ->> 'structured_hash' = v_fact.structured_hash
    and (p_snapshot ->> 'structured_match_eligible')::boolean = v_fact.structured_match_eligible
    and p_snapshot ->> 'topic_key' = v_fact.topic_key
    and p_snapshot ->> 'risk_class' = v_fact.risk_class
    and p_snapshot -> 'sources' = v_fact.source_data
    and (p_snapshot ->> 'verified_at')::timestamptz = v_fact.verified_at
    and p_snapshot -> 'as_of_date' = coalesce(to_jsonb(v_fact.as_of_date), 'null'::jsonb)
    and (p_snapshot ->> 'expires_at')::timestamptz = v_fact.expires_at
    and (p_snapshot ->> 'dedup_review_schema_version')::integer = (v_fact.dedup_review_snapshot ->> 'schema_version')::integer;
exception when others then
  return false;
end;
$$;

create function internal.trivia_validate_post_fact_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
begin
  if not internal.is_valid_fact_usage_snapshot_v1(new.source_snapshot)
    or new.claim_hash_snapshot <> new.source_snapshot ->> 'claim_hash'
    or new.verified_at_snapshot <> (new.source_snapshot ->> 'verified_at')::timestamptz then
    raise exception using errcode = '23514', message = 'TRIVIA_FACT_USAGE_SNAPSHOT_INVALID';
  end if;

  if tg_op = 'INSERT'
    or new.fact_id is distinct from old.fact_id
    or new.source_snapshot is distinct from old.source_snapshot then
    if not internal.fact_usage_snapshot_matches_fact_v1(new.source_snapshot, new.fact_id) then
      raise exception using errcode = '23514', message = 'TRIVIA_FACT_USAGE_SNAPSHOT_MISMATCH';
    end if;
  end if;

  if tg_op = 'UPDATE' then
    if old.public_id is distinct from new.public_id
      or old.created_at is distinct from new.created_at then
      raise exception using errcode = '23514', message = 'TRIVIA_POST_FACT_IDENTITY_IMMUTABLE';
    end if;

    if old.allocation_state = 'released'
      and (new.allocation_state <> 'released'
        or new.released_at is distinct from old.released_at
        or new.published_at is not null) then
      raise exception using errcode = '23514', message = 'TRIVIA_POST_FACT_RELEASED_IMMUTABLE';
    end if;

    if old.allocation_state = 'published'
      and (
        new.workspace_id is distinct from old.workspace_id
        or new.page_id is distinct from old.page_id
        or new.post_id is distinct from old.post_id
        or new.niche_key is distinct from old.niche_key
        or new.fact_id is distinct from old.fact_id
        or new.position is distinct from old.position
        or new.fact_role is distinct from old.fact_role
        or new.rendered_text is distinct from old.rendered_text
        or new.claim_hash_snapshot is distinct from old.claim_hash_snapshot
        or new.source_snapshot is distinct from old.source_snapshot
        or new.verified_at_snapshot is distinct from old.verified_at_snapshot
        or new.allocation_state <> 'published'
        or new.released_at is not null
        or new.published_at is distinct from old.published_at
      ) then
      raise exception using errcode = '23514', message = 'TRIVIA_POST_FACT_PUBLISHED_IMMUTABLE';
    end if;
  end if;

  return new;
end;
$$;

create function internal.trivia_protect_referenced_fact_meaning_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
begin
  if exists (
    select 1
    from public.trivia_post_facts as usage
    where usage.fact_id = old.id
  ) and (
    new.workspace_id is distinct from old.workspace_id
    or new.claim_text is distinct from old.claim_text
    or new.normalized_claim is distinct from old.normalized_claim
    or new.normalization_version is distinct from old.normalization_version
    or new.claim_hash is distinct from old.claim_hash
    or new.subject_key is distinct from old.subject_key
    or new.relation_key is distinct from old.relation_key
    or new.object_key is distinct from old.object_key
    or new.numbers is distinct from old.numbers
    or new.qualifiers is distinct from old.qualifiers
    or new.ontology_version is distinct from old.ontology_version
    or new.structured_key is distinct from old.structured_key
    or new.structured_hash is distinct from old.structured_hash
    or new.structured_match_eligible is distinct from old.structured_match_eligible
    or new.topic_key is distinct from old.topic_key
  ) then
    raise exception using errcode = '23514', message = 'TRIVIA_FACT_REFERENCED_MEANING_IMMUTABLE';
  end if;

  return new;
end;
$$;

create trigger trivia_post_facts_validate_usage_snapshot
before insert or update on public.trivia_post_facts
for each row execute function internal.trivia_validate_post_fact_v1();

create trigger trivia_post_facts_touch_updated_at
before update on public.trivia_post_facts
for each row execute function internal.touch_updated_at();

create trigger trivia_facts_protect_referenced_meaning
before update on public.trivia_facts
for each row execute function internal.trivia_protect_referenced_fact_meaning_v1();

alter table public.trivia_post_facts enable row level security;

revoke all on table public.trivia_post_facts from public, anon, authenticated, service_role;
revoke all on sequence public.trivia_post_facts_id_seq from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_fact_usage_snapshot_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.fact_usage_snapshot_matches_fact_v1(jsonb, bigint) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_validate_post_fact_v1() from public, anon, authenticated, service_role;
revoke all on function internal.trivia_protect_referenced_fact_meaning_v1() from public, anon, authenticated, service_role;
