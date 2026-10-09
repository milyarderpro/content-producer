-- Phase 3, migration group 1: tenant root and generic niche registry.

create table public.workspaces (
  id bigint generated always as identity primary key,
  public_id uuid not null default extensions.gen_random_uuid(),
  owner_user_id uuid not null,
  name text not null,
  slug text not null,
  language_code text not null default 'en',
  locale text not null default 'en-US',
  target_markets text[] not null default array['US', 'GB', 'CA', 'AU']::text[],
  settings jsonb not null default '{"schema_version": 1}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_public_id_key unique (public_id),
  constraint workspaces_owner_user_id_fk
    foreign key (owner_user_id)
    references auth.users (id)
    on delete restrict,
  constraint workspaces_slug_key unique (slug),
  constraint workspaces_id_owner_user_id_key unique (id, owner_user_id),
  constraint workspaces_name_not_blank_check check (btrim(name) <> ''),
  constraint workspaces_slug_format_check
    check (slug ~ '^[a-z][a-z0-9-]{1,62}$'),
  constraint workspaces_language_code_check check (language_code = 'en'),
  constraint workspaces_locale_check check (locale = 'en-US'),
  constraint workspaces_target_markets_check check (
    cardinality(target_markets) between 1 and 4
    and target_markets <@ array['US', 'GB', 'CA', 'AU']::text[]
  ),
  constraint workspaces_settings_object_check
    check (jsonb_typeof(settings) = 'object')
);

create unique index workspaces_one_active_owner_key
  on public.workspaces (owner_user_id)
  where is_active;

create table public.niches (
  key text primary key,
  name text not null,
  status text not null default 'development',
  module_version integer not null default 1,
  config_schema_version integer not null default 1,
  content_schema_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint niches_name_not_blank_check check (btrim(name) <> ''),
  constraint niches_key_format_check check (key ~ '^[a-z][a-z0-9_]{1,31}$'),
  constraint niches_status_check
    check (status in ('development', 'active', 'disabled')),
  constraint niches_module_version_check check (module_version >= 1),
  constraint niches_config_schema_version_check check (config_schema_version >= 1),
  constraint niches_content_schema_version_check check (content_schema_version >= 1)
);

insert into public.niches (
  key,
  name,
  status,
  module_version,
  config_schema_version,
  content_schema_version
)
values ('trivia', 'Trivia Facts', 'active', 1, 1, 1);

alter table public.workspaces enable row level security;
alter table public.niches enable row level security;

revoke all on table public.workspaces from public, anon, authenticated, service_role;
revoke all on table public.niches from public, anon, authenticated, service_role;
revoke all on sequence public.workspaces_id_seq from public, anon, authenticated, service_role;
