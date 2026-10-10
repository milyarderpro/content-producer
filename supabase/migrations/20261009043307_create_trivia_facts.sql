-- Phase 4, checkpoint 4.2: canonical trivia fact storage root.
-- CR-004 supplies risk_class and reservation_context persistence; semantic
-- identity, source, freshness, and reservation primitives arrive additively in
-- their assigned checkpoints.

create table public.trivia_facts (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  claim_text text not null,
  normalized_claim text not null,
  normalization_version integer not null default 1,
  claim_hash text not null,
  subject_key text not null,
  relation_key text not null,
  object_key text not null,
  numbers jsonb not null,
  qualifiers jsonb not null,
  ontology_version integer not null default 1,
  structured_key text not null,
  structured_hash text not null,
  structured_match_eligible boolean not null default false,
  topic_key text not null,
  dedup_review_snapshot jsonb not null,
  source_data jsonb not null,
  verification_status text not null default 'needs_review',
  freshness_class text not null default 'stable',
  risk_class text not null default 'standard',
  verified_at timestamptz,
  as_of_date date,
  expires_at timestamptz,
  review_note text,
  reservation_status text not null default 'available',
  reservation_token uuid,
  reserved_for_page_id bigint,
  reserved_at timestamptz,
  reserved_until timestamptz,
  reservation_context jsonb,
  supersedes_fact_id bigint,
  correction_reason text,
  corrected_at timestamptz,
  search_vector tsvector generated always as (
    to_tsvector('simple'::regconfig, normalized_claim)
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trivia_facts_public_id_key unique (public_id),
  constraint trivia_facts_workspace_id_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete restrict,
  constraint trivia_facts_workspace_id_key unique (workspace_id, id),
  constraint trivia_facts_reserved_page_fk
    foreign key (workspace_id, reserved_for_page_id)
    references public.pages (workspace_id, id)
    on delete restrict,
  constraint trivia_facts_supersedes_fk
    foreign key (workspace_id, supersedes_fact_id)
    references public.trivia_facts (workspace_id, id)
    on delete restrict,
  constraint trivia_facts_claim_text_check
    check (char_length(btrim(claim_text)) between 1 and 500 and claim_text = btrim(claim_text)),
  constraint trivia_facts_normalized_claim_check
    check (char_length(btrim(normalized_claim)) between 1 and 500),
  constraint trivia_facts_normalization_version_check check (normalization_version = 1),
  constraint trivia_facts_claim_hash_format_check check (claim_hash ~ '^[0-9a-f]{64}$'),
  constraint trivia_facts_subject_key_check check (nullif(btrim(subject_key), '') is not null),
  constraint trivia_facts_relation_key_check check (nullif(btrim(relation_key), '') is not null),
  constraint trivia_facts_object_key_check check (nullif(btrim(object_key), '') is not null),
  constraint trivia_facts_numbers_array_check check (jsonb_typeof(numbers) = 'array'),
  constraint trivia_facts_qualifiers_object_check check (jsonb_typeof(qualifiers) = 'object'),
  constraint trivia_facts_ontology_version_check check (ontology_version = 1),
  constraint trivia_facts_structured_key_check check (nullif(btrim(structured_key), '') is not null),
  constraint trivia_facts_structured_hash_format_check check (structured_hash ~ '^[0-9a-f]{64}$'),
  constraint trivia_facts_topic_key_check check (topic_key in (
    'animals', 'pet_safety', 'food_science', 'food_storage_home', 'practical_utility',
    'human_body', 'nature_science', 'geography', 'history_origins', 'inventions_everyday', 'general_trivia'
  )),
  constraint trivia_facts_dedup_review_snapshot_object_check
    check (jsonb_typeof(dedup_review_snapshot) = 'object'),
  constraint trivia_facts_source_data_array_check
    check (jsonb_typeof(source_data) = 'array' and jsonb_array_length(source_data) between 1 and 8),
  constraint trivia_facts_verification_status_check
    check (verification_status in ('needs_review', 'verified', 'rejected', 'invalidated', 'superseded')),
  constraint trivia_facts_freshness_class_check check (freshness_class in ('stable', 'periodic', 'volatile')),
  constraint trivia_facts_risk_class_check check (risk_class in ('standard', 'sensitive')),
  constraint trivia_facts_verified_shape_check check (
    verification_status <> 'verified'
    or (verified_at is not null and expires_at is not null and expires_at > verified_at)
  ),
  constraint trivia_facts_periodic_volatile_expiry_check check (
    freshness_class not in ('periodic', 'volatile') or expires_at is not null
  ),
  constraint trivia_facts_review_note_check check (
    review_note is null or char_length(btrim(review_note)) between 1 and 1000
  ),
  constraint trivia_facts_reservation_status_check check (reservation_status in ('available', 'reserved')),
  constraint trivia_facts_reservation_shape_check check (
    (
      reservation_status = 'available'
      and reservation_token is null
      and reserved_for_page_id is null
      and reserved_at is null
      and reserved_until is null
      and reservation_context is null
    )
    or (
      reservation_status = 'reserved'
      and reservation_token is not null
      and reservation_token::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      and reserved_for_page_id is not null
      and reserved_at is not null
      and reserved_until is not null
      and reserved_until > reserved_at
      and jsonb_typeof(reservation_context) = 'object'
    )
  ),
  constraint trivia_facts_no_self_supersession_check
    check (supersedes_fact_id is null or supersedes_fact_id <> id),
  constraint trivia_facts_correction_shape_check check (
    supersedes_fact_id is null
    or (nullif(btrim(correction_reason), '') is not null and corrected_at is not null)
  )
);

create unique index trivia_facts_current_claim_hash_key
  on public.trivia_facts (workspace_id, claim_hash)
  where verification_status in ('needs_review', 'verified');

create unique index trivia_facts_current_eligible_structured_hash_key
  on public.trivia_facts (workspace_id, structured_hash)
  where verification_status in ('needs_review', 'verified')
    and structured_match_eligible;

create unique index trivia_facts_current_successor_key
  on public.trivia_facts (supersedes_fact_id)
  where supersedes_fact_id is not null
    and verification_status in ('needs_review', 'verified');

create index trivia_facts_workspace_id_idx on public.trivia_facts (workspace_id, id);

create index trivia_facts_reserved_for_page_id_idx
  on public.trivia_facts (reserved_for_page_id, id)
  where reserved_for_page_id is not null;

create index trivia_facts_supersedes_fact_id_idx
  on public.trivia_facts (supersedes_fact_id, id)
  where supersedes_fact_id is not null;

alter table public.trivia_facts enable row level security;

create trigger trivia_facts_touch_updated_at
before update on public.trivia_facts
for each row execute function internal.touch_updated_at();

revoke all on table public.trivia_facts from public, anon, authenticated, service_role;
revoke all on sequence public.trivia_facts_id_seq from public, anon, authenticated, service_role;
