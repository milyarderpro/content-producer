-- Phase 3, migration group 2: private idempotency ledger and rate counters.

create table internal.operation_ledger (
  id bigint generated always as identity primary key,
  workspace_id bigint not null,
  actor_user_id uuid not null,
  operation_key uuid not null,
  operation_name text not null,
  request_schema_version integer not null,
  request_hash text not null,
  response_snapshot jsonb,
  target_type text,
  target_public_id uuid,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint operation_ledger_workspace_id_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete restrict,
  constraint operation_ledger_actor_user_id_fk
    foreign key (actor_user_id)
    references auth.users (id)
    on delete restrict,
  constraint operation_ledger_workspace_operation_key_key
    unique (workspace_id, operation_key),
  constraint operation_ledger_workspace_id_key unique (workspace_id, id),
  constraint operation_ledger_operation_key_v4_check
    check (substring(operation_key::text from 15 for 1) = '4'),
  constraint operation_ledger_operation_name_not_blank_check
    check (btrim(operation_name) <> ''),
  constraint operation_ledger_request_schema_version_check
    check (request_schema_version >= 1),
  constraint operation_ledger_request_hash_format_check
    check (request_hash ~ '^[0-9a-f]{64}$'),
  constraint operation_ledger_response_snapshot_object_check
    check (response_snapshot is null or jsonb_typeof(response_snapshot) = 'object'),
  constraint operation_ledger_completion_shape_check
    check (
      (completed_at is null and response_snapshot is null)
      or (completed_at is not null and response_snapshot is not null)
    ),
  constraint operation_ledger_target_shape_check
    check (
      (target_type is null and target_public_id is null)
      or (btrim(target_type) <> '' and target_public_id is not null)
    )
);

create index operation_ledger_actor_user_id_created_at_idx
  on internal.operation_ledger (actor_user_id, created_at desc, id desc);

create index operation_ledger_workspace_created_at_idx
  on internal.operation_ledger (workspace_id, created_at desc, id desc);

create index operation_ledger_workspace_target_idx
  on internal.operation_ledger (workspace_id, target_type, target_public_id)
  where target_public_id is not null;

create table internal.rate_limit_buckets (
  actor_user_id uuid not null,
  oauth_client_id text not null,
  limit_group text not null,
  window_start timestamptz not null,
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint rate_limit_buckets_actor_user_id_fk
    foreign key (actor_user_id)
    references auth.users (id)
    on delete cascade,
  constraint rate_limit_buckets_pkey
    primary key (actor_user_id, oauth_client_id, limit_group, window_start),
  constraint rate_limit_buckets_oauth_client_id_not_blank_check
    check (btrim(oauth_client_id) <> ''),
  constraint rate_limit_buckets_limit_group_check
    check (limit_group in ('read', 'expensive_read', 'write', 'contention_write')),
  constraint rate_limit_buckets_window_start_minute_utc_check
    check (
      (date_trunc('minute', window_start at time zone 'UTC') at time zone 'UTC') = window_start
    ),
  constraint rate_limit_buckets_request_count_nonnegative_check
    check (request_count >= 0)
);

alter table internal.operation_ledger enable row level security;
alter table internal.rate_limit_buckets enable row level security;

revoke all on table internal.operation_ledger from public, anon, authenticated, service_role;
revoke all on table internal.rate_limit_buckets from public, anon, authenticated, service_role;
revoke all on sequence internal.operation_ledger_id_seq from public, anon, authenticated, service_role;
