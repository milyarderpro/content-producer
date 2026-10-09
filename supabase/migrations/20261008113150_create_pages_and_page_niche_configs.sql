-- Phase 3, migration group 3: Page ownership and niche-configuration scope.

create table public.pages (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  name text not null,
  slug text not null,
  platform text not null default 'facebook',
  language_code text not null default 'en',
  locale text not null default 'en-US',
  timezone text not null default 'UTC',
  target_markets text[] not null default array['US', 'GB', 'CA', 'AU']::text[],
  default_niche_key text,
  platform_config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint pages_public_id_key unique (public_id),
  constraint pages_workspace_id_fk
    foreign key (workspace_id)
    references public.workspaces (id)
    on delete restrict,
  constraint pages_default_niche_key_fk
    foreign key (default_niche_key)
    references public.niches (key)
    on delete restrict,
  constraint pages_workspace_slug_key unique (workspace_id, slug),
  constraint pages_workspace_id_key unique (workspace_id, id),
  constraint pages_name_not_blank_check check (btrim(name) <> ''),
  constraint pages_slug_format_check check (slug ~ '^[a-z][a-z0-9-]{1,62}$'),
  constraint pages_platform_check check (platform = 'facebook'),
  constraint pages_language_code_check check (language_code = 'en'),
  constraint pages_locale_check check (locale = 'en-US'),
  constraint pages_timezone_not_blank_check check (btrim(timezone) <> ''),
  constraint pages_target_markets_check check (
    cardinality(target_markets) between 1 and 4
    and target_markets <@ array['US', 'GB', 'CA', 'AU']::text[]
  ),
  constraint pages_platform_config_object_check check (jsonb_typeof(platform_config) = 'object')
);

create index pages_workspace_id_is_active_idx
  on public.pages (workspace_id, is_active, id);

create table public.page_niche_configs (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  workspace_id bigint not null,
  page_id bigint not null,
  niche_key text not null,
  config_schema_version integer not null default 1,
  config jsonb not null,
  is_enabled boolean not null default true,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint page_niche_configs_public_id_key unique (public_id),
  constraint page_niche_configs_page_fk
    foreign key (workspace_id, page_id)
    references public.pages (workspace_id, id)
    on delete restrict,
  constraint page_niche_configs_niche_key_fk
    foreign key (niche_key)
    references public.niches (key)
    on delete restrict,
  constraint page_niche_configs_page_niche_key unique (page_id, niche_key),
  constraint page_niche_configs_workspace_page_niche_key
    unique (workspace_id, page_id, niche_key),
  constraint page_niche_configs_config_schema_version_check check (config_schema_version >= 1),
  constraint page_niche_configs_config_object_check check (jsonb_typeof(config) = 'object')
);

create unique index page_niche_configs_one_enabled_default_per_page_key
  on public.page_niche_configs (page_id)
  where is_enabled and is_default;

alter table public.pages enable row level security;
alter table public.page_niche_configs enable row level security;

revoke all on table public.pages from public, anon, authenticated, service_role;
revoke all on table public.page_niche_configs from public, anon, authenticated, service_role;
revoke all on sequence public.pages_id_seq from public, anon, authenticated, service_role;
revoke all on sequence public.page_niche_configs_id_seq from public, anon, authenticated, service_role;
