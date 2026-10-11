-- CR-009: Auth owns its schema ACL. This bridge is intentionally the only
-- exception to the narrow API-owner function model: it has no arguments,
-- performs no table access or writes, and returns only the platform identity.
create function internal.current_auth_uid_v1()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid();
$$;

revoke all on function internal.current_auth_uid_v1() from public, anon, authenticated, service_role;
grant execute on function internal.current_auth_uid_v1() to content_producer_api_owner;

create or replace function internal.request_actor_user_id_v1()
returns uuid
language sql
stable
security invoker
set search_path = ''
as $$
  select internal.current_auth_uid_v1();
$$;

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
  actor_user_id := internal.current_auth_uid_v1();
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

drop policy if exists workspaces_api_owner_select on public.workspaces;
create policy workspaces_api_owner_select
on public.workspaces
for select
to content_producer_api_owner
using (
  is_active
  and (select internal.current_auth_uid_v1()) = owner_user_id
);

drop policy if exists operation_ledger_api_owner_select on internal.operation_ledger;
create policy operation_ledger_api_owner_select
on internal.operation_ledger
for select
to content_producer_api_owner
using (
  actor_user_id = (select internal.current_auth_uid_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

drop policy if exists operation_ledger_api_owner_insert on internal.operation_ledger;
create policy operation_ledger_api_owner_insert
on internal.operation_ledger
for insert
to content_producer_api_owner
with check (
  actor_user_id = (select internal.current_auth_uid_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

drop policy if exists operation_ledger_api_owner_update on internal.operation_ledger;
create policy operation_ledger_api_owner_update
on internal.operation_ledger
for update
to content_producer_api_owner
using (
  actor_user_id = (select internal.current_auth_uid_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
)
with check (
  actor_user_id = (select internal.current_auth_uid_v1())
  and exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = operation_ledger.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

drop policy if exists rate_limit_buckets_api_owner_select on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_select
on internal.rate_limit_buckets
for select
to content_producer_api_owner
using (actor_user_id = (select internal.current_auth_uid_v1()));

drop policy if exists rate_limit_buckets_api_owner_insert on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_insert
on internal.rate_limit_buckets
for insert
to content_producer_api_owner
with check (actor_user_id = (select internal.current_auth_uid_v1()));

drop policy if exists rate_limit_buckets_api_owner_update on internal.rate_limit_buckets;
create policy rate_limit_buckets_api_owner_update
on internal.rate_limit_buckets
for update
to content_producer_api_owner
using (actor_user_id = (select internal.current_auth_uid_v1()))
with check (actor_user_id = (select internal.current_auth_uid_v1()));

revoke all on function internal.request_actor_user_id_v1() from public, anon, authenticated, service_role;
revoke all on function internal.assert_request_context_v1() from public, anon, authenticated, service_role;
