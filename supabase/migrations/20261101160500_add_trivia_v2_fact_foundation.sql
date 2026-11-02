-- CR-053/054, P3: one canonical identity and version-aware evidence/bindings.
-- All legacy identifiers and snapshots remain in their authoritative tables.

alter table public.trivia_facts
  add column has_v1_envelope boolean not null default true;

alter table public.trivia_facts
  alter column subject_key drop not null,
  alter column relation_key drop not null,
  alter column object_key drop not null,
  alter column numbers drop not null,
  alter column qualifiers drop not null,
  alter column ontology_version drop not null,
  alter column structured_key drop not null,
  alter column structured_hash drop not null,
  alter column topic_key drop not null,
  alter column dedup_review_snapshot drop not null,
  alter column source_data drop not null,
  alter column freshness_class drop not null,
  alter column risk_class drop not null;

-- The old NOT NULL-equivalent checks are still enforced for genuine v1 rows
-- through the conditional envelope constraint below.
alter table public.trivia_facts
  drop constraint trivia_facts_subject_key_check,
  drop constraint trivia_facts_relation_key_check,
  drop constraint trivia_facts_object_key_check,
  drop constraint trivia_facts_structured_key_check;

alter table public.trivia_facts add constraint trivia_facts_envelope_v1_shape_check check (
  (has_v1_envelope
    and subject_key is not null and relation_key is not null and object_key is not null
    and numbers is not null and qualifiers is not null and ontology_version is not null
    and structured_key is not null and structured_hash is not null and topic_key is not null
    and dedup_review_snapshot is not null and source_data is not null
    and freshness_class is not null and risk_class is not null)
  or (not has_v1_envelope
    and subject_key is null and relation_key is null and object_key is null
    and numbers is null and qualifiers is null and ontology_version is null
    and structured_key is null and structured_hash is null and topic_key is null
    and dedup_review_snapshot is null and source_data is null
    and freshness_class is null and risk_class is null
    and verified_at is null and as_of_date is null and expires_at is null
    and review_note is null and not structured_match_eligible
    and verification_status <> 'verified')
);

-- pg_trgm and search_vector indexes already cover the shared claim column.
-- The partial structured index continues to index only genuine v1 envelopes.
create index trivia_facts_workspace_status_claim_v2_idx
  on public.trivia_facts (workspace_id, verification_status, normalized_claim, public_id);

create function internal.trivia_web_source_url_v2(p_url text)
returns boolean language plpgsql immutable strict set search_path = pg_catalog as $$
declare v_authority text; v_host text; v_address inet;
begin
  if char_length(p_url) not between 1 and 2048 or p_url <> btrim(p_url)
    or p_url !~ '^https?://[^/?#[:space:]@]+([/?#][^[:space:]]*)?$'
    or p_url ~ '[[:cntrl:]]' then return false; end if;
  v_authority := substring(p_url from '^https?://([^/?#]+)');
  if v_authority is null or position('@' in v_authority) > 0 then return false; end if;
  v_host := lower(split_part(v_authority, ':', 1));
  if v_host = '' or v_host = 'localhost' or v_host like '%.localhost'
    or v_host like '%.local' or v_host like '%.internal' or v_host like '%.test'
    or v_host !~ '^[a-z0-9][a-z0-9.-]*[a-z0-9]$' then return false; end if;
  if v_authority <> v_host and v_authority !~ '^[A-Za-z0-9.-]+:[0-9]{1,5}$' then return false; end if;
  if v_host ~ '^[0-9.]+$' then
    begin v_address := v_host::inet;
    exception when others then return false; end;
    if v_address <<= '0.0.0.0/8'::cidr or v_address <<= '10.0.0.0/8'::cidr
      or v_address <<= '100.64.0.0/10'::cidr or v_address <<= '127.0.0.0/8'::cidr
      or v_address <<= '169.254.0.0/16'::cidr or v_address <<= '172.16.0.0/12'::cidr
      or v_address <<= '192.168.0.0/16'::cidr or v_address <<= '192.0.0.0/24'::cidr
      or v_address <<= '192.0.2.0/24'::cidr or v_address <<= '198.18.0.0/15'::cidr
      or v_address <<= '198.51.100.0/24'::cidr or v_address <<= '203.0.113.0/24'::cidr
      or v_address <<= '224.0.0.0/4'::cidr or v_address <<= '240.0.0.0/4'::cidr then
      return false;
    end if;
  elsif position('.' in v_host) = 0 then return false;
  end if;
  return true;
end;
$$;

create table public.trivia_fact_evidence_v2 (
  workspace_id bigint not null,
  fact_id bigint not null,
  source_url text not null,
  evidence_schema_version integer not null default 2,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (workspace_id, fact_id),
  foreign key (workspace_id, fact_id) references public.trivia_facts(workspace_id, id) on delete restrict,
  constraint trivia_fact_evidence_v2_version_check check (evidence_schema_version = 2),
  constraint trivia_fact_evidence_v2_url_check check (internal.trivia_web_source_url_v2(source_url))
);
alter table public.trivia_fact_evidence_v2 enable row level security;
revoke all on table public.trivia_fact_evidence_v2 from public, anon, authenticated, service_role;
grant select, insert, update(source_url, updated_at) on public.trivia_fact_evidence_v2 to content_producer_api_owner;
create policy trivia_fact_evidence_v2_owner on public.trivia_fact_evidence_v2
  for all to content_producer_api_owner
  using (exists (select 1 from public.workspaces w where w.id=workspace_id and w.is_active
    and w.owner_user_id=(select internal.request_actor_user_id_v1())))
  with check (exists (select 1 from public.workspaces w where w.id=workspace_id and w.is_active
    and w.owner_user_id=(select internal.request_actor_user_id_v1())));

-- A native fact is never committed without its own URL evidence. A reused v1
-- fact may acquire v2 evidence later without changing its v1 source package.
create function internal.trivia_require_native_evidence_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not new.has_v1_envelope and not exists (
    select 1 from public.trivia_fact_evidence_v2 e
    where e.workspace_id=new.workspace_id and e.fact_id=new.id
  ) then
    raise exception using errcode='23514', message='TRIVIA_V2_EVIDENCE_REQUIRED';
  end if;
  return null;
end;
$$;
create constraint trigger trivia_facts_native_evidence_v2
  after insert or update of has_v1_envelope on public.trivia_facts
  deferrable initially deferred for each row
  when (not new.has_v1_envelope)
  execute function internal.trivia_require_native_evidence_v2();

alter table public.trivia_post_facts
  add column snapshot_schema_version integer not null default 1;
alter table public.trivia_post_facts
  alter column verified_at_snapshot drop not null;
alter table public.trivia_post_facts add constraint trivia_post_facts_snapshot_version_check
  check (snapshot_schema_version in (1,2));
alter table public.trivia_post_facts add constraint trivia_post_facts_verification_time_v2_check
  check ((snapshot_schema_version=1 and verified_at_snapshot is not null)
    or (snapshot_schema_version=2 and verified_at_snapshot is null));

-- No second fact/usage registry is introduced. The identity mapping is the
-- original (workspace_id, id, public_id); this projection is rebuildable.
create view internal.trivia_fact_identity_v2 as
  select f.workspace_id, f.id fact_id, f.public_id fact_public_id,
    f.has_v1_envelope, (e.fact_id is not null) has_v2_evidence,
    f.verification_status, f.supersedes_fact_id
  from public.trivia_facts f
  left join public.trivia_fact_evidence_v2 e
    on e.workspace_id=f.workspace_id and e.fact_id=f.id;
create view internal.trivia_fact_usage_v2 as
  select j.workspace_id, j.id usage_id, j.fact_id, f.public_id fact_public_id,
    j.post_id, j.page_id, j.snapshot_schema_version,
    j.allocation_state, j.is_current, j.published_at
  from public.trivia_post_facts j
  join public.trivia_facts f on f.workspace_id=j.workspace_id and f.id=j.fact_id;
revoke all on internal.trivia_fact_identity_v2, internal.trivia_fact_usage_v2
  from public, anon, authenticated, service_role;

revoke all on function internal.trivia_web_source_url_v2(text),
  internal.trivia_require_native_evidence_v2() from public, anon, authenticated, service_role;

-- Preserve the complete existing v1 validation on rows that actually have a
-- v1 envelope. Native rows receive only shared identity validation.
drop trigger trivia_facts_validate_identity_source_freshness on public.trivia_facts;
create trigger trivia_facts_validate_identity_source_freshness
  before insert or update on public.trivia_facts
  for each row when (new.has_v1_envelope)
  execute function internal.trivia_validate_fact_row_v2();
create function internal.trivia_validate_native_fact_v2()
returns trigger language plpgsql set search_path = pg_catalog, internal, public as $$
begin
  if tg_op='UPDATE' and old.has_v1_envelope then
    raise exception using errcode='23514',message='TRIVIA_V1_ENVELOPE_IMMUTABLE';
  end if;
  new.normalization_version := 1;
  new.normalized_claim := internal.trivia_normalize_claim_v1(new.claim_text);
  if char_length(new.normalized_claim) not between 1 and 500 then
    raise exception using errcode='23514',message='TRIVIA_CANDIDATE_INVALID';
  end if;
  new.claim_hash := internal.trivia_claim_hash_v1(new.normalized_claim);
  new.structured_match_eligible := false;
  if new.reservation_status='reserved' then
    raise exception using errcode='23514',message='TRIVIA_V2_RESERVATION_INVALID';
  end if;
  return new;
end;
$$;
create trigger trivia_facts_validate_native_v2 before insert or update
  on public.trivia_facts for each row when (not new.has_v1_envelope)
  execute function internal.trivia_validate_native_fact_v2();

-- First attachment of genuine v1 evidence may fill the absent envelope, but
-- cannot alter an already referenced canonical proposition or old snapshots.
drop trigger trivia_facts_protect_referenced_meaning on public.trivia_facts;
create trigger trivia_facts_protect_referenced_meaning
  before update on public.trivia_facts for each row when (old.has_v1_envelope)
  execute function internal.trivia_protect_referenced_fact_meaning_v1();
create function internal.trivia_protect_native_meaning_v2()
returns trigger language plpgsql set search_path = pg_catalog, internal, public as $$
begin
  if exists(select 1 from public.trivia_post_facts j where j.fact_id=old.id)
    and (new.workspace_id is distinct from old.workspace_id
      or new.public_id is distinct from old.public_id
      or new.claim_text is distinct from old.claim_text
      or new.normalized_claim is distinct from old.normalized_claim
      or new.normalization_version is distinct from old.normalization_version
      or new.claim_hash is distinct from old.claim_hash) then
    raise exception using errcode='23514',message='TRIVIA_FACT_REFERENCED_MEANING_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger trivia_facts_protect_native_meaning_v2
  before update on public.trivia_facts for each row when (not old.has_v1_envelope)
  execute function internal.trivia_protect_native_meaning_v2();

-- Keep v1's snapshot validator unmodified, and dispatch by the persisted
-- binding version. The post version is checked for both paths.
create function internal.trivia_usage_version_guard_v2()
returns trigger language plpgsql set search_path = pg_catalog, internal, public as $$
declare v_version integer;
begin
  select p.content_schema_version into v_version from public.posts p
    where p.id=new.post_id and p.workspace_id=new.workspace_id and p.page_id=new.page_id;
  if v_version is distinct from new.snapshot_schema_version
    or (tg_op='UPDATE' and old.snapshot_schema_version is distinct from new.snapshot_schema_version) then
    raise exception using errcode='23514',message='TRIVIA_USAGE_VERSION_MISMATCH';
  end if;
  return new;
end;
$$;
create trigger trivia_post_facts_a_version_guard_v2 before insert or update
  on public.trivia_post_facts for each row
  execute function internal.trivia_usage_version_guard_v2();

drop trigger trivia_post_facts_validate_usage_snapshot on public.trivia_post_facts;
create trigger trivia_post_facts_validate_usage_snapshot
  before insert or update on public.trivia_post_facts
  for each row when (new.snapshot_schema_version=1)
  execute function internal.trivia_validate_post_fact_v1();

create function internal.trivia_validate_post_fact_v2()
returns trigger language plpgsql set search_path = pg_catalog, internal, public as $$
declare v_fact public.trivia_facts;
begin
  if not internal.has_exact_json_keys(new.source_snapshot,
      array['schema_version','canonical_claim','source_url'])
    or new.source_snapshot->'schema_version' is distinct from '2'::jsonb
    or jsonb_typeof(new.source_snapshot->'canonical_claim') is distinct from 'string'
    or internal.trivia_web_source_url_v2(new.source_snapshot->>'source_url') is distinct from true
    or new.verified_at_snapshot is not null then
    raise exception using errcode='23514',message='TRIVIA_FACT_USAGE_SNAPSHOT_INVALID';
  end if;
  select * into v_fact from public.trivia_facts f
    where f.workspace_id=new.workspace_id and f.id=new.fact_id;
  if not found or new.source_snapshot->>'canonical_claim' is distinct from v_fact.claim_text
    or new.claim_hash_snapshot is distinct from v_fact.claim_hash then
    raise exception using errcode='23514',message='TRIVIA_FACT_USAGE_SNAPSHOT_MISMATCH';
  end if;
  if tg_op='UPDATE' and (
    old.public_id is distinct from new.public_id
    or old.created_at is distinct from new.created_at
    or (old.allocation_state in ('released','published') and new is distinct from old)
  ) then
    raise exception using errcode='23514',message='TRIVIA_POST_FACT_IMMUTABLE';
  end if;
  return new;
end;
$$;
create trigger trivia_post_facts_validate_usage_snapshot_v2
  before insert or update on public.trivia_post_facts
  for each row when (new.snapshot_schema_version=2)
  execute function internal.trivia_validate_post_fact_v2();

-- The existing immutable snapshot trigger covers both versions; the new
-- discriminator must be immutable too.
create or replace function internal.post_usage_immutable_v1() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if new.source_snapshot is distinct from old.source_snapshot
    or new.claim_hash_snapshot is distinct from old.claim_hash_snapshot
    or new.verified_at_snapshot is distinct from old.verified_at_snapshot
    or new.snapshot_schema_version is distinct from old.snapshot_schema_version
    or new.fact_id<>old.fact_id
    or new.workspace_id<>old.workspace_id or new.page_id<>old.page_id
    or new.post_id<>old.post_id or new.niche_key<>old.niche_key
    or (not old.is_current and new is distinct from old)
    or (old.allocation_state='published' and new.is_current<>old.is_current) then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID';
  end if;
  return new;
end;
$$;

revoke all on function internal.trivia_validate_native_fact_v2(),
  internal.trivia_protect_native_meaning_v2(),
  internal.trivia_usage_version_guard_v2(),
  internal.trivia_validate_post_fact_v2() from public, anon, authenticated, service_role;
