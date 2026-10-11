-- Phase 5, checkpoint 5.1 remediation. This migration is additive: the
-- first security-kernel migration remains immutable after local application.

create or replace function internal.request_actor_user_id_v1()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select auth.uid();
$$;

drop policy if exists workspaces_api_owner_select on public.workspaces;
create policy workspaces_api_owner_select
on public.workspaces
for select
to content_producer_api_owner
using (
  is_active
  and (select auth.uid()) = owner_user_id
);

drop policy if exists operation_ledger_api_owner_select on internal.operation_ledger;
create policy operation_ledger_api_owner_select
on internal.operation_ledger
for select
to content_producer_api_owner
using (
  actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select auth.uid())
  )
);

drop policy if exists operation_ledger_api_owner_insert on internal.operation_ledger;
create policy operation_ledger_api_owner_insert
on internal.operation_ledger
for insert
to content_producer_api_owner
with check (
  actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select auth.uid())
  )
);

drop policy if exists operation_ledger_api_owner_update on internal.operation_ledger;
create policy operation_ledger_api_owner_update
on internal.operation_ledger
for update
to content_producer_api_owner
using (
  actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select auth.uid())
  )
)
with check (
  actor_user_id = (select auth.uid())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select auth.uid())
  )
);

drop policy if exists rate_limit_buckets_api_owner_select on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_select
on internal.rate_limit_buckets
for select
to content_producer_api_owner
using (actor_user_id = (select auth.uid()));

drop policy if exists rate_limit_buckets_api_owner_insert on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_insert
on internal.rate_limit_buckets
for insert
to content_producer_api_owner
with check (actor_user_id = (select auth.uid()));

drop policy if exists rate_limit_buckets_api_owner_update on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_update
on internal.rate_limit_buckets
for update
to content_producer_api_owner
using (actor_user_id = (select auth.uid()))
with check (actor_user_id = (select auth.uid()));

create or replace function internal.assert_request_context_v1()
returns table(actor_user_id uuid, oauth_client_id text)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb;
begin
  actor_user_id := auth.uid();
  begin
    v_claims := coalesce(pg_catalog.current_setting('request.jwt.claims', true), '{}')::jsonb;
  exception when others then
    v_claims := '{}'::jsonb;
  end;
  oauth_client_id := v_claims ->> 'client_id';

  if actor_user_id is null then
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

create function internal.assert_write_operation_name_v1(p_operation_name text)
returns void
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
begin
  if p_operation_name <> all (array[
    'create_page',
    'update_page',
    'create_content_plan',
    'claim_content_plan_items',
    'renew_content_plan_claim',
    'report_content_plan_item_failure',
    'retry_content_plan_item',
    'replace_discarded_plan_item',
    'cancel_content_plan',
    'trivia_register_and_reserve_facts',
    'trivia_release_facts',
    'trivia_reverify_fact',
    'trivia_correct_fact',
    'save_post',
    'revise_post',
    'reschedule_post',
    'approve_post',
    'revoke_post_approval',
    'discard_post',
    'mark_post_posted',
    'archive_post',
    'record_post_performance'
  ]) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;
end;
$$;

create function internal.rate_limit_group_for_write_operation_v1(p_operation_name text)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select case
    when p_operation_name in (
      'claim_content_plan_items', 'renew_content_plan_claim',
      'report_content_plan_item_failure',
      'trivia_register_and_reserve_facts', 'trivia_release_facts',
      'trivia_correct_fact', 'save_post', 'revise_post', 'discard_post',
      'mark_post_posted'
    )
      then 'contention_write'
    when p_operation_name in (
      'create_page', 'update_page', 'create_content_plan',
      'retry_content_plan_item', 'replace_discarded_plan_item',
      'cancel_content_plan', 'trivia_reverify_fact', 'reschedule_post',
      'approve_post', 'revoke_post_approval', 'archive_post',
      'record_post_performance'
    )
      then 'write'
    else null
  end;
$$;

create function internal.assert_rate_limit_v1(p_limit_group text)
returns integer
language plpgsql
volatile
strict
security invoker
set search_path = ''
as $$
declare
  v_rate record;
begin
  select * into v_rate
  from internal.consume_rate_limit_v1(p_limit_group);

  if not v_rate.allowed then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  return v_rate.retry_after_seconds;
end;
$$;

create or replace function internal.claim_operation_for_owner_v1(
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
  perform internal.assert_write_operation_name_v1(p_operation_name);

  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  perform internal.assert_rate_limit_v1(
    internal.rate_limit_group_for_write_operation_v1(p_operation_name)
  );

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

create function internal.is_safe_operation_response_snapshot_v2(
  p_operation_name text,
  p_snapshot jsonb
)
returns boolean
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select jsonb_typeof(p_snapshot) = 'object'
    and octet_length(p_snapshot::text) <= 16384
    and p_snapshot ? 'schema_version'
    and p_snapshot ? 'operation_name'
    and p_snapshot ? 'resources'
    and not exists (
      select 1
      from jsonb_object_keys(p_snapshot) as key(key_name)
      where key_name not in ('schema_version', 'operation_name', 'resources')
    )
    and jsonb_typeof(p_snapshot -> 'schema_version') = 'number'
    and p_snapshot ->> 'schema_version' = '1'
    and p_snapshot ->> 'operation_name' = p_operation_name
    and jsonb_typeof(p_snapshot -> 'resources') = 'array'
    and jsonb_array_length(p_snapshot -> 'resources') between 1 and 100
    and not exists (
      select 1
      from jsonb_array_elements(p_snapshot -> 'resources') as resource(value)
      where jsonb_typeof(resource.value) <> 'object'
        or not (resource.value ? 'resource_type' and resource.value ? 'public_id')
        or exists (
          select 1
          from jsonb_object_keys(resource.value) as key(key_name)
          where key_name not in ('resource_type', 'public_id', 'status', 'revision', 'occurred_at')
        )
        or jsonb_typeof(resource.value -> 'resource_type') <> 'string'
        or resource.value ->> 'resource_type' !~ '^[a-z][a-z0-9_]{1,79}$'
        or jsonb_typeof(resource.value -> 'public_id') <> 'string'
        or resource.value ->> 'public_id' !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
        or (resource.value ? 'status' and (
          jsonb_typeof(resource.value -> 'status') <> 'string'
          or nullif(btrim(resource.value ->> 'status'), '') is null
          or char_length(resource.value ->> 'status') > 80
        ))
        or (resource.value ? 'revision' and (
          jsonb_typeof(resource.value -> 'revision') <> 'number'
          or resource.value ->> 'revision' !~ '^[1-9][0-9]*$'
        ))
        or (resource.value ? 'occurred_at' and (
          jsonb_typeof(resource.value -> 'occurred_at') <> 'string'
          or resource.value ->> 'occurred_at' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$'
        ))
    );
$$;

create function internal.complete_operation_for_owner_v2(
  p_workspace_public_id uuid,
  p_operation_id bigint,
  p_operation_name text,
  p_response_snapshot jsonb,
  p_target_type text,
  p_target_public_id uuid
)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_workspace record;
begin
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  if not internal.is_safe_operation_response_snapshot_v2(p_operation_name, p_response_snapshot)
    or nullif(btrim(p_target_type), '') is null
    or char_length(p_target_type) > 80
    or not exists (
      select 1
      from jsonb_array_elements(p_response_snapshot -> 'resources') as resource(value)
      where resource.value ->> 'resource_type' = p_target_type
        and resource.value ->> 'public_id' = p_target_public_id::text
    ) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  update internal.operation_ledger as operation
  set response_snapshot = p_response_snapshot,
      completed_at = clock_timestamp(),
      target_type = p_target_type,
      target_public_id = p_target_public_id
  where operation.id = p_operation_id
    and operation.workspace_id = v_workspace.workspace_id
    and operation.actor_user_id = v_workspace.actor_user_id
    and operation.operation_name = p_operation_name
    and operation.completed_at is null;

  if not found then
    raise exception using errcode = 'P0001', message = 'OWNER_ACCESS_REQUIRED';
  end if;
end;
$$;

-- PostgreSQL requires CREATE on the schema for the target function owner.
-- This narrowly scoped migration revokes it immediately after transfer.
grant create on schema internal to content_producer_api_owner;

alter function internal.assert_write_operation_name_v1(text) owner to content_producer_api_owner;
alter function internal.rate_limit_group_for_write_operation_v1(text) owner to content_producer_api_owner;
alter function internal.assert_rate_limit_v1(text) owner to content_producer_api_owner;
alter function internal.is_safe_operation_response_snapshot_v2(text, jsonb) owner to content_producer_api_owner;
alter function internal.complete_operation_for_owner_v2(uuid, bigint, text, jsonb, text, uuid) owner to content_producer_api_owner;

revoke create on schema internal from content_producer_api_owner;

drop function internal.complete_operation_for_owner_v1(bigint, jsonb, text, uuid);
drop function internal.is_safe_operation_response_snapshot_v1(jsonb);

revoke all on function internal.assert_write_operation_name_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.rate_limit_group_for_write_operation_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.assert_rate_limit_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.is_safe_operation_response_snapshot_v2(text, jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.complete_operation_for_owner_v2(uuid, bigint, text, jsonb, text, uuid) from public, anon, authenticated, service_role;
