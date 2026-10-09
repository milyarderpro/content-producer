-- Phase 3, migration group 5: durable content output and immutable metrics.

create table public.posts (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  content_plan_item_id bigint,
  created_by_operation_id bigint,
  format_key text not null,
  topic_key text not null,
  interaction_goal text not null,
  content_schema_version integer not null default 1,
  status text not null default 'draft',
  content_payload jsonb not null,
  generation_snapshot jsonb not null,
  system_checks jsonb not null default '{}'::jsonb,
  editorial_checks jsonb not null default '{}'::jsonb,
  approval_snapshot jsonb,
  content_hash text not null,
  quality_status text not null default 'pending',
  scheduled_at timestamptz,
  published_at timestamptz,
  platform_post_id text,
  published_url text,
  ready_at timestamptz,
  discarded_at timestamptz,
  archived_at timestamptz,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint posts_public_id_key unique (public_id),
  constraint posts_page_niche_fk
    foreign key (workspace_id, page_id, niche_key)
    references public.page_niche_configs (workspace_id, page_id, niche_key)
    on delete restrict,
  constraint posts_plan_item_fk
    foreign key (content_plan_item_id, workspace_id, page_id, niche_key)
    references public.content_plan_items (id, workspace_id, page_id, niche_key)
    on delete restrict,
  constraint posts_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger (workspace_id, id)
    on delete restrict,
  constraint posts_scope_key unique (id, workspace_id, page_id),
  constraint posts_niche_scope_key unique (id, workspace_id, page_id, niche_key),
  constraint posts_interaction_goal_check
    check (interaction_goal in ('share', 'save', 'comment', 'follow')),
  constraint posts_content_schema_version_check check (content_schema_version >= 1),
  constraint posts_status_check
    check (status in ('draft', 'ready', 'posted', 'discarded', 'archived')),
  constraint posts_content_payload_object_check check (jsonb_typeof(content_payload) = 'object'),
  constraint posts_generation_snapshot_object_check
    check (jsonb_typeof(generation_snapshot) = 'object'),
  constraint posts_system_checks_object_check check (jsonb_typeof(system_checks) = 'object'),
  constraint posts_editorial_checks_object_check
    check (jsonb_typeof(editorial_checks) = 'object'),
  constraint posts_approval_snapshot_object_check
    check (approval_snapshot is null or jsonb_typeof(approval_snapshot) = 'object'),
  constraint posts_content_hash_format_check check (content_hash ~ '^[0-9a-f]{64}$'),
  constraint posts_quality_status_check
    check (quality_status in ('pending', 'passed', 'failed')),
  constraint posts_revision_check check (revision >= 1),
  constraint posts_ready_quality_check
    check (status not in ('ready', 'posted', 'archived') or quality_status = 'passed'),
  constraint posts_ready_approval_check
    check (status not in ('ready', 'posted', 'archived') or approval_snapshot is not null),
  constraint posts_ready_at_check
    check (status not in ('ready', 'posted', 'archived') or ready_at is not null),
  constraint posts_published_at_check
    check (status not in ('posted', 'archived') or published_at is not null),
  constraint posts_discarded_at_check
    check (status <> 'discarded' or discarded_at is not null),
  constraint posts_archived_at_check
    check (status <> 'archived' or archived_at is not null),
  constraint posts_discarded_not_published_check
    check (status <> 'discarded' or published_at is null),
  constraint posts_published_url_check
    check (published_url is null or published_url ~ '^https://')
);

create index posts_page_status_created_at_idx
  on public.posts (page_id, status, created_at desc, id desc);

create index posts_page_niche_format_idx
  on public.posts (page_id, niche_key, format_key, created_at desc);

create index posts_page_niche_topic_idx
  on public.posts (page_id, niche_key, topic_key, created_at desc);

create unique index posts_page_schedule_unique_key
  on public.posts (page_id, scheduled_at)
  where scheduled_at is not null and status <> 'discarded';

create unique index posts_active_plan_item_unique_key
  on public.posts (content_plan_item_id)
  where content_plan_item_id is not null and status <> 'discarded';

create unique index posts_platform_identity_unique_key
  on public.posts (page_id, platform_post_id)
  where platform_post_id is not null;

create index posts_published_at_idx
  on public.posts (published_at desc, id desc)
  where published_at is not null;

create index posts_content_hash_idx
  on public.posts (content_hash, id);

create table public.post_metrics (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  page_id bigint not null,
  post_id bigint not null,
  created_by_operation_id bigint,
  captured_at timestamptz not null,
  views bigint,
  reach bigint,
  reactions bigint,
  comments bigint,
  shares bigint,
  saves bigint,
  follows bigint,
  watch_time_seconds numeric,
  average_watch_time_seconds numeric,
  metrics_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint post_metrics_public_id_key unique (public_id),
  constraint post_metrics_post_fk
    foreign key (post_id, workspace_id, page_id)
    references public.posts (id, workspace_id, page_id)
    on delete restrict,
  constraint post_metrics_operation_fk
    foreign key (workspace_id, created_by_operation_id)
    references internal.operation_ledger (workspace_id, id)
    on delete restrict,
  constraint post_metrics_snapshot_key unique (post_id, captured_at),
  constraint post_metrics_metrics_payload_object_check
    check (jsonb_typeof(metrics_payload) = 'object'),
  constraint post_metrics_nonnegative_check check (
    coalesce(views, 0) >= 0
    and coalesce(reach, 0) >= 0
    and coalesce(reactions, 0) >= 0
    and coalesce(comments, 0) >= 0
    and coalesce(shares, 0) >= 0
    and coalesce(saves, 0) >= 0
    and coalesce(follows, 0) >= 0
    and coalesce(watch_time_seconds, 0) >= 0
    and coalesce(average_watch_time_seconds, 0) >= 0
  ),
  constraint post_metrics_nonempty_snapshot_check check (
    views is not null
    or reach is not null
    or reactions is not null
    or comments is not null
    or shares is not null
    or saves is not null
    or follows is not null
    or watch_time_seconds is not null
    or average_watch_time_seconds is not null
    or metrics_payload <> '{}'::jsonb
  )
);

create index post_metrics_post_id_captured_at_idx
  on public.post_metrics (post_id, captured_at desc, id desc);

create index post_metrics_page_id_captured_at_idx
  on public.post_metrics (page_id, captured_at desc, id desc);

alter table public.posts enable row level security;
alter table public.post_metrics enable row level security;

revoke all on table public.posts from public, anon, authenticated, service_role;
revoke all on table public.post_metrics from public, anon, authenticated, service_role;
revoke all on sequence public.posts_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.post_metrics_id_seq from public, anon, authenticated, service_role;
