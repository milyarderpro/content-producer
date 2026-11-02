-- P3-T2: the authoritative v1 tables already are the v2 identity/usage map.
-- Backfill is an idempotent projection, not a copy of historical evidence.
-- Install synchronous mutation hooks before exposing the v2 catalog reader.

create table internal.trivia_fact_catalog_v2 (
  workspace_id bigint primary key references public.workspaces(id) on delete cascade,
  version bigint not null default 0 check (version >= 0),
  last_mutation_xid bigint,
  updated_at timestamptz not null default now()
);
alter table internal.trivia_fact_catalog_v2 enable row level security;
revoke all on internal.trivia_fact_catalog_v2 from public, anon, authenticated, service_role;
create policy trivia_fact_catalog_v2_owner_select on internal.trivia_fact_catalog_v2
  for select to content_producer_api_owner
  using (exists (select 1 from public.workspaces w where w.id=workspace_id
    and w.is_active and w.owner_user_id=(select internal.request_actor_user_id_v1())));

-- Existing identities/usage need no rewrite: their canonical IDs and immutable
-- usage snapshots are selected by the two views created in P3-T1.
insert into internal.trivia_fact_catalog_v2 (workspace_id, version)
  select id, 0 from public.workspaces on conflict (workspace_id) do nothing;

create function internal.trivia_catalog_bump_v2(p_workspace_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into internal.trivia_fact_catalog_v2
    (workspace_id, version, last_mutation_xid, updated_at)
  values (p_workspace_id, 1, pg_catalog.txid_current(), pg_catalog.clock_timestamp())
  on conflict (workspace_id) do update set
    version = internal.trivia_fact_catalog_v2.version
      + case when internal.trivia_fact_catalog_v2.last_mutation_xid
        = pg_catalog.txid_current() then 0 else 1 end,
    last_mutation_xid = pg_catalog.txid_current(),
    updated_at = pg_catalog.clock_timestamp();
end;
$$;

create function internal.trivia_catalog_fact_hook_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  elsif tg_op = 'DELETE' then
    perform internal.trivia_catalog_bump_v2(old.workspace_id);
  elsif row(new.public_id, new.claim_text, new.normalized_claim, new.claim_hash,
      new.has_v1_envelope, new.structured_key, new.verification_status,
      new.supersedes_fact_id, new.source_data, new.verified_at, new.expires_at,
      new.reservation_status, new.reservation_token, new.reserved_until)
    is distinct from row(old.public_id, old.claim_text, old.normalized_claim, old.claim_hash,
      old.has_v1_envelope, old.structured_key, old.verification_status,
      old.supersedes_fact_id, old.source_data, old.verified_at, old.expires_at,
      old.reservation_status, old.reservation_token, old.reserved_until) then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  end if;
  return null;
end;
$$;
create trigger trivia_facts_catalog_v2 after insert or update or delete on public.trivia_facts
  for each row execute function internal.trivia_catalog_fact_hook_v2();

create function internal.trivia_catalog_usage_hook_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  elsif tg_op = 'DELETE' then
    perform internal.trivia_catalog_bump_v2(old.workspace_id);
  elsif row(new.fact_id, new.page_id, new.allocation_state, new.is_current, new.published_at)
    is distinct from row(old.fact_id, old.page_id, old.allocation_state, old.is_current, old.published_at) then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  end if;
  return null;
end;
$$;
create trigger trivia_post_facts_catalog_v2 after insert or update or delete on public.trivia_post_facts
  for each row execute function internal.trivia_catalog_usage_hook_v2();

create function internal.trivia_catalog_evidence_hook_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  elsif tg_op = 'DELETE' then
    perform internal.trivia_catalog_bump_v2(old.workspace_id);
  elsif new.source_url is distinct from old.source_url then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  end if;
  return null;
end;
$$;
create trigger trivia_fact_evidence_catalog_v2 after insert or update or delete on public.trivia_fact_evidence_v2
  for each row execute function internal.trivia_catalog_evidence_hook_v2();

create function internal.trivia_catalog_config_hook_v2()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.niche_key='trivia' and new.config->>'fact_reuse_scope'
    is distinct from old.config->>'fact_reuse_scope' then
    perform internal.trivia_catalog_bump_v2(new.workspace_id);
  end if;
  return null;
end;
$$;
create trigger page_niche_configs_trivia_catalog_v2 after update of config on public.page_niche_configs
  for each row execute function internal.trivia_catalog_config_hook_v2();

-- Fail closed if an existing row cannot be mapped losslessly. Re-running these
-- assertions has no writes and cannot change a legacy snapshot.
do $$ begin
  if exists (
    select 1 from public.trivia_post_facts j
    left join public.trivia_facts f on f.workspace_id=j.workspace_id and f.id=j.fact_id
    where f.id is null or j.snapshot_schema_version<>1
  ) or exists (select 1 from public.trivia_facts f where not f.has_v1_envelope)
    or (select count(*) from internal.trivia_fact_identity_v2)
      <> (select count(*) from public.trivia_facts)
    or (select count(*) from internal.trivia_fact_usage_v2)
      <> (select count(*) from public.trivia_post_facts) then
    raise exception using errcode='P0001', message='TRIVIA_V2_BACKFILL_DIVERGENCE';
  end if;
end $$;

revoke all on function internal.trivia_catalog_bump_v2(bigint),
  internal.trivia_catalog_fact_hook_v2(),
  internal.trivia_catalog_usage_hook_v2(),
  internal.trivia_catalog_evidence_hook_v2(),
  internal.trivia_catalog_config_hook_v2() from public, anon, authenticated, service_role;

-- The legacy resolver must never create another ID for a native proposition.
-- Only a single exact normalized native match may receive its first genuine
-- v1 envelope; other overlaps and negative history fail closed.
create function internal.trivia_try_attach_native_v1(
  p_workspace bigint, p_input jsonb, p_create boolean, p_exclude bigint,
  p_review_snapshot jsonb, p_now timestamptz
) returns bigint language plpgsql security invoker set search_path = '' as $$
declare v_candidate jsonb := p_input->'candidate'; v_normal text;
  v_fact public.trivia_facts; v_id bigint; v_expiry timestamptz;
begin
  v_normal:=internal.trivia_normalize_claim_v1(v_candidate->>'claim_text');
  for v_fact in select f.* from public.trivia_facts f where f.workspace_id=p_workspace
    and not f.has_v1_envelope and (
      f.normalized_claim=v_normal
      or pg_catalog.ts_rank_cd(f.search_vector,
        pg_catalog.plainto_tsquery('simple',v_normal))>0
      or extensions.similarity(f.normalized_claim,v_normal)>=0.20)
    order by f.id loop
    if v_id is not null or not p_create or v_fact.id=p_exclude
      or v_fact.normalized_claim<>v_normal
      or v_fact.verification_status not in ('needs_review','verified')
      or v_fact.reservation_status<>'available' then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED';
    end if;
    v_id:=v_fact.id;
  end loop;
  if v_id is null then return null; end if;
  if exists(select 1 from public.trivia_facts f where f.workspace_id=p_workspace
    and f.has_v1_envelope and (
      f.normalized_claim=v_normal
      or pg_catalog.ts_rank_cd(f.search_vector,
        pg_catalog.plainto_tsquery('simple',v_normal))>0
      or extensions.similarity(f.normalized_claim,v_normal)>=0.20)) then
    raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED';
  end if;
  v_expiry:=internal.trivia_effective_expiry_v1(
    p_input->'sources',p_input->>'freshness_class',p_input->>'risk_class',
    (p_input->>'as_of_date')::date,
    (p_input->>'requested_expires_at')::timestamptz,p_now,
    v_candidate->>'relation_key',p_input->>'verification_note');
  update public.trivia_facts set
    has_v1_envelope=true,
    subject_key=v_candidate->>'subject_key',
    relation_key=v_candidate->>'relation_key',
    object_key=v_candidate->>'object_key',
    numbers=v_candidate->'numbers',
    qualifiers=v_candidate->'qualifiers',
    ontology_version=1,
    structured_key='',
    structured_hash=pg_catalog.repeat('0',64),
    topic_key=v_candidate->>'topic_key',
    dedup_review_snapshot=p_review_snapshot,
    source_data=p_input->'sources',
    verification_status='verified',
    freshness_class=p_input->>'freshness_class',
    risk_class=p_input->>'risk_class',
    verified_at=p_now,
    as_of_date=(p_input->>'as_of_date')::date,
    expires_at=v_expiry,
    review_note=p_input->>'verification_note'
  where workspace_id=p_workspace and id=v_id and not has_v1_envelope;
  if not found then raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED'; end if;
  return v_id;
end;
$$;

-- Both effective v1 resolvers are patched: registration uses the ordered-set
-- version and correction uses the original signature. This insertion happens
-- after request validation and inside the existing workspace/identity locks.
do $$ declare d text; signature text; anchor text; extension text; begin
  anchor:='for f in select * from public.trivia_facts';
  extension:='select * into v_match from public.trivia_facts where id='
    ||'internal.trivia_try_attach_native_v1(p_workspace,p_input,p_create,p_exclude,review_snapshot,v_now); '
    ||'if v_match.id is not null then fact_id:=v_match.id; '
    ||'canonical_action:=''refreshed_existing''; return next; return; end if; '
    ||anchor;
  foreach signature in array array[
    'internal.trivia_resolve_fact_v1(bigint,jsonb,boolean,bigint)',
    'internal.trivia_resolve_fact_v2(bigint,jsonb,boolean,bigint,bigint[])'
  ] loop
    d:=pg_catalog.pg_get_functiondef(signature::regprocedure);
    if pg_catalog.strpos(d,anchor)=0 then
      raise exception 'UNEXPECTED_V1_RESOLVER_DEFINITION';
    end if;
    execute pg_catalog.replace(d,anchor,extension);
  end loop;
end $$;

revoke all on function internal.trivia_try_attach_native_v1(bigint,jsonb,boolean,bigint,jsonb,timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function internal.trivia_try_attach_native_v1(bigint,jsonb,boolean,bigint,jsonb,timestamptz)
  to content_producer_api_owner;
