-- Phase 4, checkpoint 4.6: private reservation, expiry, release, and reuse
-- primitives. Phase 5 owns caller authorization and operation-ledger wrapping.

create function internal.trivia_reservation_fact_public_ids_v1(p_facts jsonb)
returns uuid[]
language plpgsql
immutable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_fact jsonb;
  v_count integer;
  v_result uuid[];
begin
  if jsonb_typeof(p_facts) <> 'array' then
    return null;
  end if;

  v_count := jsonb_array_length(p_facts);
  if v_count not between 1 and 9 then
    return null;
  end if;

  for v_fact in select value from jsonb_array_elements(p_facts) loop
    if not internal.has_exact_json_keys(v_fact, array['position', 'fact_public_id'])
      or not internal.is_json_integer_between(v_fact -> 'position', 1, 9)
      or not internal.trivia_is_valid_uuid_v4_v1(v_fact ->> 'fact_public_id') then
      return null;
    end if;
  end loop;

  if (select min((value ->> 'position')::integer) from jsonb_array_elements(p_facts) as item(value)) <> 1
    or (select max((value ->> 'position')::integer) from jsonb_array_elements(p_facts) as item(value)) <> v_count
    or (select count(distinct (value ->> 'position')::integer) from jsonb_array_elements(p_facts) as item(value)) <> v_count
    or (select count(distinct value ->> 'fact_public_id') from jsonb_array_elements(p_facts) as item(value)) <> v_count then
    return null;
  end if;

  select array_agg((value ->> 'fact_public_id')::uuid order by (value ->> 'position')::integer)
  into v_result
  from jsonb_array_elements(p_facts) as item(value);
  return v_result;
exception when others then
  return null;
end;
$$;

create function internal.trivia_clear_expired_reservation_v1(p_fact_id bigint)
returns boolean
language plpgsql
volatile
strict
set search_path = pg_catalog, internal, public
as $$
declare
  v_fact public.trivia_facts%rowtype;
begin
  select * into v_fact
  from public.trivia_facts
  where id = p_fact_id
  for update;

  if not found
    or v_fact.reservation_status <> 'reserved'
    or v_fact.reserved_until > now() then
    return false;
  end if;

  update public.trivia_facts
  set reservation_status = 'available',
      reservation_token = null,
      reserved_for_page_id = null,
      reserved_at = null,
      reserved_until = null,
      reservation_context = null
  where id = v_fact.id
    and reservation_status = 'reserved'
    and reserved_until <= now();

  return found;
end;
$$;

create function internal.trivia_reserve_facts_v1(
  p_workspace_id bigint,
  p_page_id bigint,
  p_actor_user_id uuid,
  p_reservation_token uuid,
  p_config_schema_version integer,
  p_config_updated_at timestamptz,
  p_reuse_scope text,
  p_fact_requests jsonb,
  p_request_hash text,
  p_ttl_minutes integer default 30
)
returns table(
  reservation_token uuid,
  reserved_at timestamptz,
  reserved_until timestamptz,
  reserved_fact_public_ids uuid[]
)
language plpgsql
volatile
set search_path = pg_catalog, internal, public
as $$
declare
  v_requested_public_ids uuid[];
  v_requested_fact_ids bigint[] := array[]::bigint[];
  v_requested_fact_id bigint;
  v_requested_count integer;
  v_requested_locked_count integer := 0;
  v_fact public.trivia_facts%rowtype;
  v_config jsonb;
  v_config_schema_version integer;
  v_config_updated_at timestamptz;
  v_page_active boolean;
  v_config_enabled boolean;
  v_existing_context jsonb;
  v_existing_count integer;
  v_matching_count integer;
  v_reserved_at timestamptz;
  v_reserved_until timestamptz;
  v_context jsonb;
begin
  v_requested_public_ids := internal.trivia_reservation_fact_public_ids_v1(p_fact_requests);
  if p_workspace_id is null
    or p_page_id is null
    or p_actor_user_id is null
    or p_reservation_token is null
    or p_config_schema_version is null
    or p_config_updated_at is null
    or p_reuse_scope is null
    or p_request_hash is null
    or p_ttl_minutes is null
    or not internal.trivia_is_valid_uuid_v4_v1(p_actor_user_id::text)
    or not internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text)
    or p_reuse_scope not in ('workspace_unique', 'page_unique')
    or p_request_hash !~ '^[0-9a-f]{64}$'
    or p_ttl_minutes not between 5 and 120
    or v_requested_public_ids is null then
    raise exception using errcode = '22023', message = 'TRIVIA_RESERVATION_INPUT_INVALID';
  end if;

  select page.is_active, config.is_enabled, config.config_schema_version, config.updated_at, config.config
  into v_page_active, v_config_enabled, v_config_schema_version, v_config_updated_at, v_config
  from public.pages as page
  join public.page_niche_configs as config
    on config.workspace_id = page.workspace_id
    and config.page_id = page.id
    and config.niche_key = 'trivia'
  where page.workspace_id = p_workspace_id
    and page.id = p_page_id;

  if not found
    or not v_page_active
    or not v_config_enabled
    or not internal.is_valid_trivia_config_v1(v_config)
    or p_config_schema_version <> v_config_schema_version
    or p_config_updated_at is distinct from v_config_updated_at
    or p_reuse_scope <> v_config ->> 'fact_reuse_scope' then
    raise exception using errcode = '23514', message = 'TRIVIA_RESERVATION_CONTEXT_INVALID';
  end if;

  v_requested_count := cardinality(v_requested_public_ids);

  -- Lock both the requested set and any existing token set in one ascending-ID pass.
  for v_fact in
    select locked_fact.*
    from public.trivia_facts as locked_fact
    where locked_fact.public_id = any(v_requested_public_ids)
      or locked_fact.reservation_token = p_reservation_token
    order by locked_fact.id
    for update
  loop
    if v_fact.reservation_status = 'reserved' and v_fact.reserved_until <= now() then
      perform internal.trivia_clear_expired_reservation_v1(v_fact.id);
      select * into v_fact from public.trivia_facts where id = v_fact.id;
    end if;

    if v_fact.workspace_id = p_workspace_id and v_fact.public_id = any(v_requested_public_ids) then
      v_requested_fact_ids := array_append(v_requested_fact_ids, v_fact.id);
      v_requested_locked_count := v_requested_locked_count + 1;
    end if;
  end loop;

  if v_requested_locked_count <> v_requested_count then
    raise exception using errcode = '23503', message = 'TRIVIA_RESERVATION_FACT_SCOPE_INVALID';
  end if;

  select count(*), (array_agg(reservation_context order by id))[1]
  into v_existing_count, v_existing_context
  from public.trivia_facts as existing_fact
  where existing_fact.reservation_token = p_reservation_token;

  if v_existing_count > 0 then
    select count(*) into v_matching_count
    from public.trivia_facts as existing_fact
    where existing_fact.reservation_token = p_reservation_token
      and existing_fact.public_id = any(v_requested_public_ids);

    if v_existing_count <> v_requested_count
      or v_matching_count <> v_requested_count
      or exists (
        select 1
        from public.trivia_facts as existing_fact
        where existing_fact.reservation_token = p_reservation_token
          and existing_fact.reservation_context is distinct from v_existing_context
      )
      or not internal.is_valid_reservation_context_v1(
        v_existing_context,
        p_workspace_id,
        p_page_id,
        (v_existing_context ->> 'reserved_at')::timestamptz,
        (v_existing_context ->> 'reserved_until')::timestamptz
      )
      or v_existing_context ->> 'actor_user_id' <> p_actor_user_id::text
      or v_existing_context ->> 'fact_reuse_scope' <> p_reuse_scope
      or (v_existing_context ->> 'config_schema_version')::integer <> p_config_schema_version
      or (v_existing_context ->> 'config_updated_at')::timestamptz <> p_config_updated_at
      or v_existing_context ->> 'request_hash' <> p_request_hash
      or (v_existing_context ->> 'ttl_minutes')::integer <> p_ttl_minutes
      or v_existing_context -> 'ordered_fact_public_ids' <> to_jsonb(v_requested_public_ids) then
      raise exception using errcode = '23514', message = 'TRIVIA_RESERVATION_CONTEXT_MISMATCH';
    end if;
  end if;

  foreach v_requested_fact_id in array v_requested_fact_ids loop
    select * into v_fact from public.trivia_facts where id = v_requested_fact_id;
    if v_fact.verification_status <> 'verified'
      or v_fact.expires_at is null
      or v_fact.expires_at <= now()
      or not internal.is_valid_source_evidence_v2(v_fact.source_data)
      or exists (
        select 1
        from public.trivia_facts as successor
        where successor.workspace_id = v_fact.workspace_id
          and successor.supersedes_fact_id = v_fact.id
          and successor.verification_status in ('needs_review', 'verified')
      ) then
      raise exception using errcode = '23514', message = 'TRIVIA_RESERVATION_FACT_INELIGIBLE';
    end if;

    if v_fact.reservation_status = 'reserved'
      and v_fact.reservation_token <> p_reservation_token then
      raise exception using errcode = '23505', message = 'TRIVIA_RESERVATION_CONFLICT';
    end if;

    if p_reuse_scope = 'workspace_unique' and exists (
      select 1
      from public.trivia_post_facts as usage
      where usage.workspace_id = p_workspace_id
        and usage.fact_id = v_fact.id
        and usage.allocation_state in ('allocated', 'published')
    ) then
      raise exception using errcode = '23505', message = 'TRIVIA_FACT_REUSE_BLOCKED';
    end if;

    if p_reuse_scope = 'page_unique' and exists (
      select 1
      from public.trivia_post_facts as usage
      where usage.page_id = p_page_id
        and usage.fact_id = v_fact.id
        and usage.allocation_state in ('allocated', 'published')
    ) then
      raise exception using errcode = '23505', message = 'TRIVIA_FACT_REUSE_BLOCKED';
    end if;
  end loop;

  if v_existing_count > 0 then
    reservation_token := p_reservation_token;
    reserved_at := (v_existing_context ->> 'reserved_at')::timestamptz;
    reserved_until := (v_existing_context ->> 'reserved_until')::timestamptz;
    reserved_fact_public_ids := v_requested_public_ids;
    return next;
    return;
  end if;

  v_reserved_at := date_trunc('second', now());
  v_reserved_until := v_reserved_at + make_interval(mins => p_ttl_minutes);
  v_context := jsonb_build_object(
    'schema_version', 1,
    'actor_user_id', p_actor_user_id::text,
    'workspace_id', p_workspace_id,
    'page_id', p_page_id,
    'niche_key', 'trivia',
    'fact_reuse_scope', p_reuse_scope,
    'config_schema_version', p_config_schema_version,
    'config_updated_at', to_char(v_config_updated_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
    'ordered_fact_public_ids', to_jsonb(v_requested_public_ids),
    'request_hash', p_request_hash,
    'ttl_minutes', p_ttl_minutes,
    'reserved_at', to_char(v_reserved_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'reserved_until', to_char(v_reserved_until at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  );

  update public.trivia_facts
  set reservation_status = 'reserved',
      reservation_token = p_reservation_token,
      reserved_for_page_id = p_page_id,
      reserved_at = v_reserved_at,
      reserved_until = v_reserved_until,
      reservation_context = v_context
  where id = any(v_requested_fact_ids);

  reservation_token := p_reservation_token;
  reserved_at := v_reserved_at;
  reserved_until := v_reserved_until;
  reserved_fact_public_ids := v_requested_public_ids;
  return next;
end;
$$;

create function internal.trivia_release_facts_v1(
  p_reservation_token uuid,
  p_actor_user_id uuid
)
returns integer
language plpgsql
volatile
strict
set search_path = pg_catalog, internal, public
as $$
declare
  v_fact public.trivia_facts%rowtype;
  v_released_count integer;
begin
  if not internal.trivia_is_valid_uuid_v4_v1(p_reservation_token::text)
    or not internal.trivia_is_valid_uuid_v4_v1(p_actor_user_id::text) then
    raise exception using errcode = '22023', message = 'TRIVIA_RESERVATION_INPUT_INVALID';
  end if;

  for v_fact in
    select *
    from public.trivia_facts
    where reservation_token = p_reservation_token
    order by id
    for update
  loop
    if v_fact.reservation_context ->> 'actor_user_id' <> p_actor_user_id::text then
      raise exception using errcode = '23514', message = 'TRIVIA_RESERVATION_OWNER_MISMATCH';
    end if;
  end loop;

  update public.trivia_facts
  set reservation_status = 'available',
      reservation_token = null,
      reserved_for_page_id = null,
      reserved_at = null,
      reserved_until = null,
      reservation_context = null
  where reservation_token = p_reservation_token;
  get diagnostics v_released_count = row_count;
  return v_released_count;
end;
$$;

revoke all on function internal.trivia_reservation_fact_public_ids_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_clear_expired_reservation_v1(bigint) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_reserve_facts_v1(bigint, bigint, uuid, uuid, integer, timestamptz, text, jsonb, text, integer) from public, anon, authenticated, service_role;
revoke all on function internal.trivia_release_facts_v1(uuid, uuid) from public, anon, authenticated, service_role;
