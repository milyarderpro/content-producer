-- Phase 3, migration group 4: durable content-plan intent and item leases.

create table public.content_plans (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  created_by_operation_id bigint,
  name text,
  status text not null default 'pending',
  requested_count integer not null,
  config_schema_version integer not null default 1,
  plan_config jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_plans_public_id_key unique (public_id),
  constraint content_plans_page_niche_fk
    foreign key (workspace_id, page_id, niche_key)
    references public.page_niche_configs (workspace_id, page_id, niche_key)
    on delete restrict,
  constraint content_plans_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger (workspace_id, id)
    on delete restrict,
  constraint content_plans_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint content_plans_name_not_blank_check check (name is null or btrim(name) <> ''),
  constraint content_plans_status_check
    check (status in ('pending', 'in_progress', 'partially_completed', 'completed', 'failed', 'cancelled')),
  constraint content_plans_requested_count_check check (requested_count > 0),
  constraint content_plans_config_schema_version_check check (config_schema_version >= 1),
  constraint content_plans_plan_config_object_check check (jsonb_typeof(plan_config) = 'object')
);

create index content_plans_page_id_status_created_at_idx
  on public.content_plans (page_id, status, created_at desc, id desc);

create table public.content_plan_items (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  plan_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  position integer not null,
  created_by_operation_id bigint,
  status text not null default 'pending',
  scheduled_at timestamptz,
  topic_key text,
  format_key text,
  interaction_goal text,
  item_config jsonb not null default '{}'::jsonb,
  attempt_count integer not null default 0,
  claim_token uuid,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  claim_renewal_count integer not null default 0,
  last_error_code text,
  last_error_detail text,
  replacement_reason text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_plan_items_public_id_key unique (public_id),
  constraint content_plan_items_plan_fk
    foreign key (plan_id, workspace_id, page_id, niche_key)
    references public.content_plans (id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint content_plan_items_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger (workspace_id, id)
    on delete restrict,
  constraint content_plan_items_plan_position_key unique (plan_id, position),
  constraint content_plan_items_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint content_plan_items_position_check check (position >= 1),
  constraint content_plan_items_status_check
    check (status in ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  constraint content_plan_items_interaction_goal_check
    check (interaction_goal is null or interaction_goal in ('share', 'save', 'comment', 'follow')),
  constraint content_plan_items_item_config_object_check check (jsonb_typeof(item_config) = 'object'),
  constraint content_plan_items_attempt_count_check check (attempt_count >= 0),
  constraint content_plan_items_claim_renewal_count_check
    check (claim_renewal_count between 0 and 1),
  constraint content_plan_items_claim_shape_check check (
    (
      status = 'in_progress'
      and claim_token is not null
      and claimed_at is not null
      and claim_expires_at is not null
      and claim_expires_at > claimed_at
    )
    or (
      status <> 'in_progress'
      and claim_token is null
      and claimed_at is null
      and claim_expires_at is null
      and claim_renewal_count = 0
    )
  )
);

create index content_plan_items_plan_id_status_position_idx
  on public.content_plan_items (plan_id, status, position);

create index content_plan_items_claim_expires_at_idx
  on public.content_plan_items (claim_expires_at, id)
  where status = 'in_progress';

create unique index content_plan_items_page_schedule_unique_key
  on public.content_plan_items (page_id, scheduled_at)
  where scheduled_at is not null and status <> 'cancelled';

alter table public.content_plans enable row level security;
alter table public.content_plan_items enable row level security;

revoke all on table public.content_plans from public, anon, authenticated, service_role;
revoke all on table public.content_plan_items from public, anon, authenticated, service_role;
revoke all on sequence public.content_plans_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.content_plan_items_id_seq from public, anon, authenticated, service_role;
