-- Phase 5, checkpoint 5.1: private security kernel only. Public business RPCs
-- are deliberately deferred to their owning checkpoints.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'content_producer_api_owner') then
    create role content_producer_api_owner
      nologin
      nosuperuser
      nocreatedb
      nocreaterole
      noreplication
      nobypassrls
      noinherit;
  end if;
end;
$$;

-- PostgreSQL requires the migration executor to be a member before it can
-- transfer function ownership. This does not make the API owner a member of a
-- privileged role.
grant content_producer_api_owner to postgres;

revoke all on schema api from public, anon, service_role;
grant usage on schema api to authenticated;
revoke all on schema internal from public, anon, authenticated, service_role;
grant usage on schema internal to content_producer_api_owner;
grant usage on schema extensions to content_producer_api_owner;
grant execute on function extensions.digest(bytea, text) to content_producer_api_owner;
-- PostgreSQL requires CREATE during ownership transfer; it is revoked once all
-- kernel functions have the narrow owner.
grant create on schema internal to content_producer_api_owner;

-- Migrations create objects as postgres and then transfer function ownership.
-- Postgres's schema-specific default revokes are already established in Phase 2;
-- this NOLOGIN role never creates objects directly.

-- The kernel has only the privileges it currently needs. Later checkpoints add
-- table privileges alongside their narrow API entry points.
grant select on table public.workspaces to content_producer_api_owner;
grant select, insert, update on table internal.operation_ledger to content_producer_api_owner;
grant usage, select on sequence internal.operation_ledger_id_seq to content_producer_api_owner;
grant select, insert, update on table internal.rate_limit_buckets to content_producer_api_owner;

create function internal.request_actor_user_id_v1()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb;
  v_subject text;
begin
  begin
    v_claims := coalesce(pg_catalog.current_setting('request.jwt.claims', true), '{}')::jsonb;
    v_subject := nullif(v_claims ->> 'sub', '');
    return v_subject::uuid;
  exception when others then
    return null;
  end;
end;
$$;

create policy workspaces_api_owner_select
on public.workspaces
for select
to content_producer_api_owner
using (
  is_active
  and (select internal.request_actor_user_id_v1()) = owner_user_id
);

create policy operation_ledger_api_owner_select
on internal.operation_ledger
for select
to content_producer_api_owner
using (
  actor_user_id = (select internal.request_actor_user_id_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.request_actor_user_id_v1())
  )
);

create policy operation_ledger_api_owner_insert
on internal.operation_ledger
for insert
to content_producer_api_owner
with check (
  actor_user_id = (select internal.request_actor_user_id_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.request_actor_user_id_v1())
  )
);

create policy operation_ledger_api_owner_update
on internal.operation_ledger
for update
to content_producer_api_owner
using (
  actor_user_id = (select internal.request_actor_user_id_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.request_actor_user_id_v1())
  )
)
with check (
  actor_user_id = (select internal.request_actor_user_id_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.request_actor_user_id_v1())
  )
);

create policy rate_limit_buckets_api_owner_select
on internal.rate_limit_buckets
for select
to content_producer_api_owner
using (actor_user_id = (select internal.request_actor_user_id_v1()));

create policy rate_limit_buckets_api_owner_insert
on internal.rate_limit_buckets
for insert
to content_producer_api_owner
with check (actor_user_id = (select internal.request_actor_user_id_v1()));

create policy rate_limit_buckets_api_owner_update
on internal.rate_limit_buckets
for update
to content_producer_api_owner
using (actor_user_id = (select internal.request_actor_user_id_v1()))
with check (actor_user_id = (select internal.request_actor_user_id_v1()));

create function internal.assert_request_context_v1()
returns table(actor_user_id uuid, oauth_client_id text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb;
begin
  actor_user_id := internal.request_actor_user_id_v1();
  begin
    v_claims := coalesce(pg_catalog.current_setting('request.jwt.claims', true), '{}')::jsonb;
  exception when others then
    v_claims := '{}'::jsonb;
  end;
  oauth_client_id := v_claims ->> 'client_id';

  if actor_user_id is null
    or coalesce(v_claims ->> 'role', '') <> 'authenticated' then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if oauth_client_id is null
    or btrim(oauth_client_id) = ''
    or octet_length(oauth_client_id) > 512
    or oauth_client_id ~ '[[:cntrl:]]' then
    raise exception using errcode = 'P0001', message = 'OAUTH_CLIENT_REQUIRED';
  end if;

  return next;
end;
$$;

create function internal.resolve_workspace_owner_v1(p_workspace_public_id uuid)
returns table(workspace_id bigint, workspace_public_id uuid, actor_user_id uuid, oauth_client_id text)
language plpgsql
stable
strict
security invoker
set search_path = ''
as $$
begin
  select context.actor_user_id, context.oauth_client_id
  into actor_user_id, oauth_client_id
  from internal.assert_request_context_v1() as context;

  select workspace.id, workspace.public_id
  into workspace_id, workspace_public_id
  from public.workspaces as workspace
  where workspace.public_id = p_workspace_public_id;

  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_ACCESS_REQUIRED';
  end if;

  return next;
end;
$$;

create function internal.canonical_request_hash_v1(
  p_operation_name text,
  p_workspace_public_id uuid,
  p_request_schema_version integer,
  p_semantic_input jsonb
)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_canonical jsonb;
begin
  if nullif(btrim(p_operation_name), '') is null
    or char_length(p_operation_name) > 120
    or p_request_schema_version <> 1
    or jsonb_typeof(p_semantic_input) <> 'object' then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  v_canonical := jsonb_build_object(
    'operation_name', p_operation_name,
    'request_schema_version', p_request_schema_version,
    'semantic_input', p_semantic_input,
    'workspace_public_id', p_workspace_public_id
  );

  return encode(extensions.digest(convert_to(v_canonical::text, 'UTF8'), 'sha256'), 'hex');
end;
$$;

create function internal.configure_write_transaction_v1()
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  perform set_config('lock_timeout', '2s', true);
  perform set_config('statement_timeout', '15s', true);
end;
$$;

create function internal.safe_error_code_v1(p_sqlstate text, p_message text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case
    when p_sqlstate in ('40P01', '40001', '55P03', '57014') then 'DATABASE_BUSY'
    when p_message in (
      'AUTH_REQUIRED',
      'OAUTH_CLIENT_REQUIRED',
      'OWNER_ACCESS_REQUIRED',
      'OPERATION_KEY_REUSED',
      'RATE_LIMITED',
      'VALIDATION_FAILED'
    ) then p_message
    else 'INTERNAL_ERROR'
  end;
$$;

create function internal.safe_error_response_v1(p_code text, p_retry_after_seconds integer default null)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_retryable boolean;
  v_message text;
  v_recovery text;
  v_retry_after_seconds integer;
begin
  case p_code
    when 'AUTH_REQUIRED' then v_retryable := false; v_message := 'Authentication is required.'; v_recovery := 'Relink the account through OAuth.';
    when 'OAUTH_CLIENT_REQUIRED' then v_retryable := false; v_message := 'An OAuth client context is required.'; v_recovery := 'Relink through the Content Producer connection.';
    when 'OWNER_ACCESS_REQUIRED' then v_retryable := false; v_message := 'The requested workspace is not available to this owner.'; v_recovery := 'Use the active owner account.';
    when 'OPERATION_KEY_REUSED' then v_retryable := false; v_message := 'The operation key was already used for a different request.'; v_recovery := 'Create a new operation key for a new intent.';
    when 'RATE_LIMITED' then v_retryable := true; v_message := 'The request rate limit was reached.'; v_recovery := 'Wait before retrying the same request.';
    when 'DATABASE_BUSY' then v_retryable := true; v_message := 'The database is temporarily busy.'; v_recovery := 'Retry the same request with the same operation key.';
    when 'VALIDATION_FAILED' then v_retryable := false; v_message := 'The request is invalid.'; v_recovery := 'Correct the request fields and retry.';
    else
      p_code := 'INTERNAL_ERROR';
      v_retryable := false;
      v_message := 'The request could not be completed.';
      v_recovery := 'Try again later without assuming the write succeeded.';
  end case;

  if p_code = 'RATE_LIMITED' then
    v_retry_after_seconds := greatest(1, least(60, coalesce(p_retry_after_seconds, 1)));
  end if;

  return jsonb_strip_nulls(jsonb_build_object(
    'code', p_code,
    'message', v_message,
    'recovery', v_recovery,
    'retryable', v_retryable,
    'retry_after_seconds', v_retry_after_seconds
  ));
end;
$$;

create function internal.raise_mapped_error_v1(p_sqlstate text, p_message text)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_code text;
begin
  v_code := internal.safe_error_code_v1(p_sqlstate, p_message);
  raise exception using errcode = 'P0001', message = v_code;
end;
$$;

create function internal.claim_operation_for_owner_v1(
  p_workspace_public_id uuid,
  p_operation_key uuid,
  p_operation_name text,
  p_request_schema_version integer,
  p_semantic_input jsonb
)
returns table(
  claim_state text,
  operation_id bigint,
  response_snapshot jsonb,
  request_hash text,
  workspace_id bigint,
  workspace_public_id uuid
)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_workspace record;
  v_sqlstate text;
  v_message text;
begin
  perform internal.configure_write_transaction_v1();

  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  request_hash := internal.canonical_request_hash_v1(
    p_operation_name,
    v_workspace.workspace_public_id,
    p_request_schema_version,
    p_semantic_input
  );

  select operation.claim_state, operation.operation_id, operation.response_snapshot
  into claim_state, operation_id, response_snapshot
  from internal.claim_operation(
    v_workspace.workspace_id,
    v_workspace.actor_user_id,
    p_operation_key,
    p_operation_name,
    p_request_schema_version,
    request_hash
  ) as operation;

  workspace_id := v_workspace.workspace_id;
  workspace_public_id := v_workspace.workspace_public_id;
  return next;
exception when others then
  get stacked diagnostics
    v_sqlstate = returned_sqlstate,
    v_message = message_text;

  if internal.safe_error_code_v1(v_sqlstate, v_message) = 'DATABASE_BUSY' then
    perform internal.raise_mapped_error_v1(v_sqlstate, v_message);
  end if;

  raise;
end;
$$;

create function internal.is_safe_operation_response_snapshot_v1(p_snapshot jsonb)
returns boolean
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select jsonb_typeof(p_snapshot) = 'object'
    and octet_length(p_snapshot::text) <= 16384
    and p_snapshot::text !~ '"(content_payload|source_data|reservation_token|claim_token|access_token|refresh_token|password|secret)"[[:space:]]*:';
$$;

create function internal.complete_operation_for_owner_v1(
  p_operation_id bigint,
  p_response_snapshot jsonb,
  p_target_type text default null,
  p_target_public_id uuid default null
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_context record;
begin
  select * into v_context from internal.assert_request_context_v1();

  if not internal.is_safe_operation_response_snapshot_v1(p_response_snapshot)
    or ((p_target_type is null) <> (p_target_public_id is null))
    or (p_target_type is not null and (nullif(btrim(p_target_type), '') is null or char_length(p_target_type) > 80)) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  update internal.operation_ledger as operation
  set response_snapshot = p_response_snapshot,
      completed_at = clock_timestamp(),
      target_type = p_target_type,
      target_public_id = p_target_public_id
  where operation.id = p_operation_id
    and operation.actor_user_id = v_context.actor_user_id
    and operation.completed_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_ACCESS_REQUIRED';
  end if;
end;
$$;

create function internal.consume_rate_limit_v1(p_limit_group text)
returns table(allowed boolean, request_count integer, retry_after_seconds integer)
language plpgsql
volatile
strict
security invoker
set search_path = ''
as $$
declare
  v_context record;
  v_limit integer;
  v_window_start timestamptz;
begin
  select * into v_context from internal.assert_request_context_v1();

  v_limit := case p_limit_group
    when 'read' then 120
    when 'expensive_read' then 20
    when 'write' then 30
    when 'contention_write' then 20
    else null
  end;

  if v_limit is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  v_window_start := date_trunc('minute', clock_timestamp() at time zone 'UTC') at time zone 'UTC';

  insert into internal.rate_limit_buckets as bucket (
    actor_user_id,
    oauth_client_id,
    limit_group,
    window_start,
    request_count
  ) values (
    v_context.actor_user_id,
    v_context.oauth_client_id,
    p_limit_group,
    v_window_start,
    1
  ) on conflict (actor_user_id, oauth_client_id, limit_group, window_start)
  do update set
    request_count = bucket.request_count + 1,
    updated_at = clock_timestamp()
  returning bucket.request_count into request_count;

  allowed := request_count <= v_limit;
  retry_after_seconds := greatest(
    1,
    least(
      60,
      ceil(extract(epoch from (v_window_start + interval '1 minute' - clock_timestamp())))::integer
    )
  );
  return next;
end;
$$;

alter function internal.request_actor_user_id_v1() owner to content_producer_api_owner;
alter function internal.assert_request_context_v1() owner to content_producer_api_owner;
alter function internal.resolve_workspace_owner_v1(uuid) owner to content_producer_api_owner;
alter function internal.canonical_request_hash_v1(text, uuid, integer, jsonb) owner to content_producer_api_owner;
alter function internal.configure_write_transaction_v1() owner to content_producer_api_owner;
alter function internal.safe_error_code_v1(text, text) owner to content_producer_api_owner;
alter function internal.safe_error_response_v1(text, integer) owner to content_producer_api_owner;
alter function internal.raise_mapped_error_v1(text, text) owner to content_producer_api_owner;
alter function internal.claim_operation_for_owner_v1(uuid, uuid, text, integer, jsonb) owner to content_producer_api_owner;
alter function internal.is_safe_operation_response_snapshot_v1(jsonb) owner to content_producer_api_owner;
alter function internal.complete_operation_for_owner_v1(bigint, jsonb, text, uuid) owner to content_producer_api_owner;
alter function internal.consume_rate_limit_v1(text) owner to content_producer_api_owner;

revoke create on schema internal from content_producer_api_owner;
grant execute on function internal.claim_operation(bigint, uuid, uuid, text, integer, text)
  to content_producer_api_owner;
revoke all on all functions in schema internal from public, anon, authenticated, service_role;
revoke all on all functions in schema api from public, anon, authenticated, service_role;
