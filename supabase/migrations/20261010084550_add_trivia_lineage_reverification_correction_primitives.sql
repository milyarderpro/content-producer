-- Phase 4, checkpoint 4.7: private same-meaning refresh and correction
-- primitives. Phase 5 owns caller authorization and post lifecycle effects.

create function internal.trivia_validate_lineage_v1()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare
  v_cycle_exists boolean;
begin
  if new.supersedes_fact_id is null then
    return new;
  end if;

  -- Serialize lineage edits per workspace so concurrent direct writes cannot form a cycle.
  perform pg_advisory_xact_lock(hashtextextended(
    'content-producer:trivia-lineage:v1:' || new.workspace_id::text,
    0
  ));

  with recursive ancestors(id, supersedes_fact_id, path) as (
    select fact.id, fact.supersedes_fact_id, array[fact.id]
    from public.trivia_facts as fact
    where fact.id = new.supersedes_fact_id

    union all

    select parent.id, parent.supersedes_fact_id, ancestor.path || parent.id
    from public.trivia_facts as parent
    join ancestors as ancestor on parent.id = ancestor.supersedes_fact_id
    where not parent.id = any(ancestor.path)
  )
  select exists (
    select 1
    from ancestors
    where id = new.id
  )
  into v_cycle_exists;

  if v_cycle_exists then
    raise exception using errcode = '23514', message = 'TRIVIA_LINEAGE_CYCLE';
  end if;

  return new;
end;
$$;

create trigger trivia_facts_validate_lineage
before insert or update of workspace_id, supersedes_fact_id on public.trivia_facts
for each row execute function internal.trivia_validate_lineage_v1();

create function internal.trivia_reverify_fact_v1(
  p_workspace_id bigint,
  p_fact_public_id uuid,
  p_claim_text text,
  p_subject_key text,
  p_relation_key text,
  p_object_key text,
  p_numbers jsonb,
  p_qualifiers jsonb,
  p_topic_key text,
  p_source_data jsonb,
  p_freshness_class text,
  p_verified_at timestamptz,
  p_as_of_date date,
  p_expires_at timestamptz,
  p_review_note text
)
returns table(fact_public_id uuid, verified_at timestamptz, expires_at timestamptz)
language plpgsql
volatile
set search_path = pg_catalog, internal, public
as $$
declare
  v_fact public.trivia_facts%rowtype;
begin
  select * into v_fact
  from public.trivia_facts
  where workspace_id = p_workspace_id
    and public_id = p_fact_public_id
  for update;

  if not found or v_fact.verification_status <> 'verified' then
    raise exception using errcode = '23514', message = 'TRIVIA_REVERIFY_FACT_INELIGIBLE';
  end if;

  if internal.trivia_normalize_claim_v1(p_claim_text) is distinct from v_fact.normalized_claim
    or p_subject_key is distinct from v_fact.subject_key
    or p_relation_key is distinct from v_fact.relation_key
    or p_object_key is distinct from v_fact.object_key
    or internal.trivia_canonical_numbers_v2(p_numbers) is distinct from v_fact.numbers
    or internal.trivia_canonical_qualifiers_v3(p_relation_key, p_qualifiers) is distinct from v_fact.qualifiers
    or p_topic_key is distinct from v_fact.topic_key then
    raise exception using errcode = '23514', message = 'TRIVIA_REVERIFY_CORRECTION_REQUIRED';
  end if;

  update public.trivia_facts
  set source_data = p_source_data,
      freshness_class = p_freshness_class,
      verified_at = p_verified_at,
      as_of_date = p_as_of_date,
      expires_at = p_expires_at,
      review_note = p_review_note
  where id = v_fact.id
  returning public_id, public.trivia_facts.verified_at, public.trivia_facts.expires_at
  into fact_public_id, verified_at, expires_at;

  return next;
end;
$$;

create function internal.trivia_invalidate_fact_v1(
  p_workspace_id bigint,
  p_fact_public_id uuid,
  p_correction_reason text
)
returns uuid
language plpgsql
volatile
strict
set search_path = pg_catalog, internal, public
as $$
declare
  v_fact public.trivia_facts%rowtype;
begin
  if nullif(btrim(p_correction_reason), '') is null then
    raise exception using errcode = '22023', message = 'TRIVIA_INVALIDATION_REASON_INVALID';
  end if;

  select * into v_fact
  from public.trivia_facts
  where workspace_id = p_workspace_id
    and public_id = p_fact_public_id
  for update;

  if not found or v_fact.verification_status <> 'verified' then
    raise exception using errcode = '23514', message = 'TRIVIA_INVALIDATION_FACT_INELIGIBLE';
  end if;

  if exists (
    select 1
    from public.trivia_facts as successor
    where successor.supersedes_fact_id = v_fact.id
  ) then
    raise exception using errcode = '23514', message = 'TRIVIA_INVALIDATION_SUCCESSOR_EXISTS';
  end if;

  update public.trivia_facts
  set verification_status = 'invalidated',
      correction_reason = btrim(p_correction_reason),
      corrected_at = now(),
      reservation_status = 'available',
      reservation_token = null,
      reserved_for_page_id = null,
      reserved_at = null,
      reserved_until = null,
      reservation_context = null
  where id = v_fact.id;

  return v_fact.public_id;
end;
$$;

create function internal.trivia_correct_fact_v1(
  p_workspace_id bigint,
  p_predecessor_public_id uuid,
  p_claim_text text,
  p_subject_key text,
  p_relation_key text,
  p_object_key text,
  p_numbers jsonb,
  p_qualifiers jsonb,
  p_topic_key text,
  p_dedup_review_snapshot jsonb,
  p_source_data jsonb,
  p_freshness_class text,
  p_risk_class text,
  p_verified_at timestamptz,
  p_as_of_date date,
  p_expires_at timestamptz,
  p_review_note text,
  p_correction_reason text
)
returns table(predecessor_public_id uuid, successor_public_id uuid)
language plpgsql
volatile
set search_path = pg_catalog, internal, public
as $$
declare
  v_predecessor public.trivia_facts%rowtype;
  v_successor_id bigint;
begin
  if nullif(btrim(p_correction_reason), '') is null then
    raise exception using errcode = '22023', message = 'TRIVIA_CORRECTION_REASON_INVALID';
  end if;

  select * into v_predecessor
  from public.trivia_facts
  where workspace_id = p_workspace_id
    and public_id = p_predecessor_public_id
  for update;

  if not found or v_predecessor.verification_status <> 'verified' then
    raise exception using errcode = '23514', message = 'TRIVIA_CORRECTION_FACT_INELIGIBLE';
  end if;

  if exists (
    select 1
    from public.trivia_facts as successor
    where successor.supersedes_fact_id = v_predecessor.id
  ) then
    raise exception using errcode = '23514', message = 'TRIVIA_CORRECTION_SUCCESSOR_EXISTS';
  end if;

  if internal.trivia_normalize_claim_v1(p_claim_text) = v_predecessor.normalized_claim
    and p_subject_key = v_predecessor.subject_key
    and p_relation_key = v_predecessor.relation_key
    and p_object_key = v_predecessor.object_key
    and internal.trivia_canonical_numbers_v2(p_numbers) = v_predecessor.numbers
    and internal.trivia_canonical_qualifiers_v3(p_relation_key, p_qualifiers) = v_predecessor.qualifiers
    and p_topic_key = v_predecessor.topic_key then
    raise exception using errcode = '23514', message = 'TRIVIA_CORRECTION_MEANING_UNCHANGED';
  end if;

  -- Supersede first to release the predecessor's current identity keys atomically.
  update public.trivia_facts
  set verification_status = 'superseded',
      correction_reason = btrim(p_correction_reason),
      corrected_at = now(),
      reservation_status = 'available',
      reservation_token = null,
      reserved_for_page_id = null,
      reserved_at = null,
      reserved_until = null,
      reservation_context = null
  where id = v_predecessor.id;

  insert into public.trivia_facts (
    workspace_id,
    claim_text,
    normalized_claim,
    claim_hash,
    subject_key,
    relation_key,
    object_key,
    numbers,
    qualifiers,
    structured_key,
    structured_hash,
    topic_key,
    dedup_review_snapshot,
    source_data,
    verification_status,
    freshness_class,
    risk_class,
    verified_at,
    as_of_date,
    expires_at,
    review_note,
    supersedes_fact_id,
    correction_reason,
    corrected_at
  ) values (
    p_workspace_id,
    p_claim_text,
    '',
    repeat('0', 64),
    p_subject_key,
    p_relation_key,
    p_object_key,
    p_numbers,
    p_qualifiers,
    '',
    repeat('0', 64),
    p_topic_key,
    p_dedup_review_snapshot,
    p_source_data,
    'verified',
    p_freshness_class,
    p_risk_class,
    p_verified_at,
    p_as_of_date,
    p_expires_at,
    p_review_note,
    v_predecessor.id,
    btrim(p_correction_reason),
    now()
  )
  returning id, public_id into v_successor_id, successor_public_id;

  predecessor_public_id := v_predecessor.public_id;
  return next;
end;
$$;

revoke all on function internal.trivia_validate_lineage_v1() from public, anon, authenticated, service_role;
revoke all on function internal.trivia_reverify_fact_v1(bigint, uuid, text, text, text, text, jsonb, jsonb, text, jsonb, text, timestamptz, date, timestamptz, text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_invalidate_fact_v1(bigint, uuid, text) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_correct_fact_v1(bigint, uuid, text, text, text, text, jsonb, jsonb, text, jsonb, jsonb, text, text, timestamptz, date, timestamptz, text, text) from public, anon, authenticated, service_role;
