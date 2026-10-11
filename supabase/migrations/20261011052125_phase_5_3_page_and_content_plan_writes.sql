-- Phase 5, checkpoint 5.3: Page/config and content-plan write RPCs.
--
-- This migration is additive.  The Phase 5.1 kernel and Phase 5.2 read
-- projections remain immutable; this file adds only the three write entry
-- points assigned to checkpoint 5.3.

-- The frozen tool contract allows Page slugs up to 80 characters.  The
-- original Phase 3 constraint was narrower, so align the live constraint in
-- this additive migration without rewriting the applied migration.
alter table public.pages drop constraint if exists pages_slug_format_check;
alter table public.pages
  add constraint pages_slug_format_check
  check (slug ~ '^[a-z][a-z0-9-]{1,79}$');

-- The API owner can mutate only the rows needed by these three RPCs.  Caller
-- roles retain no table or sequence privileges.
grant select, insert, update on table public.pages to content_producer_api_owner;
grant select, insert, update on table public.page_niche_configs to content_producer_api_owner;
grant select, insert on table public.content_plans to content_producer_api_owner;
grant select, insert on table public.content_plan_items to content_producer_api_owner;
grant usage, select on sequence public.pages_id_seq to content_producer_api_owner;
grant usage, select on sequence public.page_niche_configs_id_seq to content_producer_api_owner;
grant usage, select on sequence public.content_plans_id_seq to content_producer_api_owner;
grant usage, select on sequence public.content_plan_items_id_seq to content_producer_api_owner;

-- Phase 5.2 already grants owner-scoped SELECT policies.  These policies add
-- only the corresponding write paths and repeat the owner predicate because
-- SECURITY DEFINER execution does not make the caller's authenticated policy
-- apply automatically to the function-owner role.
create policy pages_api_owner_insert_5_3
on public.pages
for insert
to content_producer_api_owner
with check (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = pages.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy pages_api_owner_update_5_3
on public.pages
for update
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = pages.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
)
with check (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = pages.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy page_niche_configs_api_owner_insert_5_3
on public.page_niche_configs
for insert
to content_producer_api_owner
with check (
  exists (
    select 1
    from public.pages as page
    join public.workspaces as workspace
      on workspace.id = page.workspace_id
    where page.workspace_id = page_niche_configs.workspace_id
      and page.id = page_niche_configs.page_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy page_niche_configs_api_owner_update_5_3
on public.page_niche_configs
for update
to content_producer_api_owner
using (
  exists (
    select 1
    from public.pages as page
    join public.workspaces as workspace
      on workspace.id = page.workspace_id
    where page.workspace_id = page_niche_configs.workspace_id
      and page.id = page_niche_configs.page_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
)
with check (
  exists (
    select 1
    from public.pages as page
    join public.workspaces as workspace
      on workspace.id = page.workspace_id
    where page.workspace_id = page_niche_configs.workspace_id
      and page.id = page_niche_configs.page_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy content_plans_api_owner_insert_5_3
on public.content_plans
for insert
to content_producer_api_owner
with check (
  exists (
    select 1
    from public.pages as page
    join public.workspaces as workspace
      on workspace.id = page.workspace_id
    where page.workspace_id = content_plans.workspace_id
      and page.id = content_plans.page_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy content_plan_items_api_owner_insert_5_3
on public.content_plan_items
for insert
to content_producer_api_owner
with check (
  exists (
    select 1
    from public.content_plans as plan
    join public.workspaces as workspace
      on workspace.id = plan.workspace_id
    where plan.id = content_plan_items.plan_id
      and plan.workspace_id = content_plan_items.workspace_id
      and plan.page_id = content_plan_items.page_id
      and plan.niche_key = content_plan_items.niche_key
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

-- Existing immutable validators/primitives are private, but the SECURITY
-- DEFINER owner needs EXECUTE on the specific functions used by this write
-- path and by the existing table triggers.
grant execute on function internal.has_exact_json_keys(jsonb, text[])
  to content_producer_api_owner;
grant execute on function internal.is_json_integer_between(jsonb, integer, integer)
  to content_producer_api_owner;
grant execute on function internal.is_allowed_text_array(jsonb, text[], integer)
  to content_producer_api_owner;
grant execute on function internal.json_integer_value(jsonb)
  to content_producer_api_owner;
grant execute on function internal.is_valid_trivia_config_v1(jsonb)
  to content_producer_api_owner;
grant execute on function internal.is_valid_plan_config_v1(jsonb)
  to content_producer_api_owner;
grant execute on function internal.is_valid_timezone_name(text)
  to content_producer_api_owner;
grant execute on function internal.normalize_target_markets(text[])
  to content_producer_api_owner;
grant execute on function internal.is_valid_timestamp_text(text)
  to content_producer_api_owner;
grant execute on function internal.assert_page_schedule_available(bigint, timestamptz, bigint, bigint)
  to content_producer_api_owner;
grant execute on function internal.touch_updated_at()
  to content_producer_api_owner;
grant execute on function internal.validate_page_locale_row()
  to content_producer_api_owner;
grant execute on function internal.validate_page_niche_config()
  to content_producer_api_owner;
grant execute on function internal.validate_content_plan_config()
  to content_producer_api_owner;

create function api.create_page(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_operation_key uuid,
  p_name text,
  p_slug text,
  p_timezone text,
  p_target_markets text[],
  p_niche_key text,
  p_config_schema_version integer,
  p_config jsonb,
  p_make_default boolean default true
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_claim record;
  v_niche record;
  v_page record;
  v_config record;
  v_enabled_niches jsonb;
  v_markets text[];
  v_name text;
  v_slug text;
  v_timezone text;
  v_semantic_input jsonb;
  v_snapshot jsonb;
  v_result jsonb;
  v_page_public_id uuid;
  v_sqlstate text;
  v_message text;
  v_constraint text;
begin
  v_name := case when p_name is null then null else pg_catalog.btrim(p_name) end;
  v_slug := case when p_slug is null then null else p_slug end;
  v_timezone := case when p_timezone is null then null else pg_catalog.btrim(p_timezone) end;

  if p_request_schema_version is distinct from 1
    or p_workspace_public_id is null
    or p_operation_key is null
    or p_operation_key::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or v_name is null
    or pg_catalog.char_length(v_name) not between 1 and 120
    or v_slug is null
    or v_slug !~ '^[a-z][a-z0-9-]{1,79}$'
    or v_timezone is null
    or not internal.is_valid_timezone_name(v_timezone)
    or p_target_markets is null
    or pg_catalog.cardinality(p_target_markets) not between 1 and 8
    or p_make_default is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  if p_niche_key is distinct from 'trivia' then
    raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
  end if;
  if p_config_schema_version is distinct from 1 then
    raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
  end if;
  if p_config is null or not internal.is_valid_trivia_config_v1(p_config) then
    raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
  end if;

  v_markets := internal.normalize_target_markets(p_target_markets);
  if v_markets is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  v_semantic_input := pg_catalog.jsonb_build_object(
    'name', v_name,
    'slug', v_slug,
    'timezone', v_timezone,
    'target_markets', pg_catalog.to_jsonb(v_markets),
    'niche_key', p_niche_key,
    'config_schema_version', p_config_schema_version,
    'config', p_config,
    'make_default', p_make_default
  );

  select * into v_claim
  from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,
    p_operation_key,
    'create_page',
    p_request_schema_version,
    v_semantic_input
  );

  if v_claim.claim_state = 'in_progress' then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;

  if v_claim.claim_state = 'first_use' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('workspace:' || v_claim.workspace_id::text, 0)
    );

    select niche.* into v_niche
    from public.niches as niche
    where niche.key = 'trivia';

    if not found or v_niche.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
    end if;
    if v_niche.config_schema_version <> p_config_schema_version then
      raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
    end if;

    if exists (
      select 1
      from public.pages as page
      where page.workspace_id = v_claim.workspace_id
        and page.slug = v_slug
    ) then
      raise exception using errcode = 'P0001', message = 'PAGE_SLUG_CONFLICT';
    end if;

    insert into public.pages (
      workspace_id,
      name,
      slug,
      timezone,
      target_markets,
      default_niche_key,
      platform_config,
      is_active
    ) values (
      v_claim.workspace_id,
      v_name,
      v_slug,
      v_timezone,
      v_markets,
      case when p_make_default then 'trivia' else null end,
      '{}'::jsonb,
      true
    ) returning * into v_page;

    insert into public.page_niche_configs (
      workspace_id,
      page_id,
      niche_key,
      config_schema_version,
      config,
      is_enabled,
      is_default
    ) values (
      v_claim.workspace_id,
      v_page.id,
      'trivia',
      p_config_schema_version,
      p_config,
      true,
      p_make_default
    ) returning * into v_config;
  else
    select (resource.value ->> 'public_id')::uuid
    into v_page_public_id
    from pg_catalog.jsonb_array_elements(v_claim.response_snapshot -> 'resources') as resource(value)
    where resource.value ->> 'resource_type' = 'page'
    limit 1;

    if v_page_public_id is null then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  end if;

  if v_claim.claim_state <> 'first_use' then
    select page.* into v_page
    from public.pages as page
    where page.workspace_id = v_claim.workspace_id
      and page.public_id = v_page_public_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;

    select config.* into v_config
    from public.page_niche_configs as config
    where config.workspace_id = v_claim.workspace_id
      and config.page_id = v_page.id
      and config.niche_key = 'trivia';
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'niche_key', config.niche_key,
        'is_enabled', config.is_enabled,
        'is_default', config.is_default,
        'config_schema_version', config.config_schema_version,
        'updated_at', internal.iso_timestamp_v1(config.updated_at)
      ) order by config.niche_key
    ),
    '[]'::jsonb
  ) into v_enabled_niches
  from public.page_niche_configs as config
  where config.workspace_id = v_page.workspace_id
    and config.page_id = v_page.id;

  v_result := pg_catalog.jsonb_build_object(
    'response_schema_version', 1,
    'data', pg_catalog.jsonb_build_object(
      'page', pg_catalog.jsonb_build_object(
        'page_public_id', v_page.public_id,
        'name', v_page.name,
        'slug', v_page.slug,
        'timezone', v_page.timezone,
        'target_markets', pg_catalog.to_jsonb(v_page.target_markets),
        'is_active', v_page.is_active,
        'enabled_niches', v_enabled_niches,
        'created_at', internal.iso_timestamp_v1(v_page.created_at),
        'updated_at', internal.iso_timestamp_v1(v_page.updated_at)
      ),
      'config', pg_catalog.jsonb_build_object(
        'niche_key', v_config.niche_key,
        'config_schema_version', v_config.config_schema_version,
        'config', v_config.config,
        'is_enabled', v_config.is_enabled,
        'is_default', v_config.is_default,
        'updated_at', internal.iso_timestamp_v1(v_config.updated_at)
      ),
      'replayed', v_claim.claim_state = 'replay'
    )
  );

  if v_claim.claim_state = 'first_use' then
    v_snapshot := pg_catalog.jsonb_build_object(
      'schema_version', 1,
      'operation_name', 'create_page',
      'resources', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'resource_type', 'page',
          'public_id', v_page.public_id,
          'status', 'created',
          'occurred_at', internal.iso_timestamp_v1(v_page.created_at)
        ),
        pg_catalog.jsonb_build_object(
          'resource_type', 'page_niche_config',
          'public_id', v_config.public_id,
          'status', 'created',
          'occurred_at', internal.iso_timestamp_v1(v_config.created_at)
        )
      )
    );
    perform internal.complete_operation_for_owner_v2(
      p_workspace_public_id,
      v_claim.operation_id,
      'create_page',
      v_snapshot,
      'page',
      v_page.public_id
    );
  end if;

  return v_result;
exception when others then
  get stacked diagnostics
    v_sqlstate = returned_sqlstate,
    v_message = message_text,
    v_constraint = constraint_name;

  if v_message in (
    'AUTH_REQUIRED', 'OAUTH_CLIENT_REQUIRED', 'OWNER_ACCESS_REQUIRED',
    'OPERATION_KEY_REUSED', 'RATE_LIMITED', 'DATABASE_BUSY',
    'VALIDATION_FAILED', 'MODULE_DISABLED', 'CONFIG_INVALID',
    'CONFIG_SCHEMA_UNSUPPORTED', 'PAGE_SLUG_CONFLICT', 'INTERNAL_ERROR'
  ) then
    raise;
  end if;
  if v_sqlstate in ('40P01', '40001', '55P03', '57014') then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;
  if v_constraint = 'pages_workspace_slug_key' or v_sqlstate = '23505' then
    raise exception using errcode = 'P0001', message = 'PAGE_SLUG_CONFLICT';
  end if;
  if v_message in ('TRIVIA_CONFIG_INVALID', 'PAGE_TIMEZONE_INVALID', 'TARGET_MARKETS_INVALID')
    or v_sqlstate = '23514' then
    raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
  end if;
  raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
end;
$$;

create function api.update_page(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_operation_key uuid,
  p_page_public_id uuid,
  p_expected_page_updated_at timestamptz,
  p_page_patch jsonb default null,
  p_niche_config_patch jsonb default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_claim record;
  v_page record;
  v_config record;
  v_niche record;
  v_enabled_niches jsonb;
  v_page_patch_canonical jsonb;
  v_config_patch_canonical jsonb;
  v_page_markets text[];
  v_page_timezone text;
  v_expected_config_updated_at timestamptz;
  v_config_enabled boolean;
  v_config_default boolean;
  v_config_will_change boolean;
  v_has_config_patch boolean := false;
  v_semantic_input jsonb;
  v_snapshot jsonb;
  v_result jsonb;
  v_page_public_id uuid;
  v_sqlstate text;
  v_message text;
  v_constraint text;
begin
  if p_request_schema_version is distinct from 1
    or p_workspace_public_id is null
    or p_operation_key is null
    or p_operation_key::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_page_public_id is null
    or p_expected_page_updated_at is null then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  if p_page_patch is not null then
    if pg_catalog.jsonb_typeof(p_page_patch) <> 'object'
      or (
        select count(*)
        from pg_catalog.jsonb_object_keys(p_page_patch) as key(key_name)
        where key.key_name not in ('name', 'slug', 'timezone', 'target_markets')
      ) > 0
      or not exists (select 1 from pg_catalog.jsonb_object_keys(p_page_patch)) then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    if p_page_patch ? 'name'
      and (
        pg_catalog.jsonb_typeof(p_page_patch -> 'name') <> 'string'
        or pg_catalog.btrim(p_page_patch ->> 'name') = ''
        or pg_catalog.char_length(pg_catalog.btrim(p_page_patch ->> 'name')) > 120
      ) then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if p_page_patch ? 'slug'
      and (
        pg_catalog.jsonb_typeof(p_page_patch -> 'slug') <> 'string'
        or (p_page_patch ->> 'slug') !~ '^[a-z][a-z0-9-]{1,79}$'
      ) then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if p_page_patch ? 'timezone'
      and (
        pg_catalog.jsonb_typeof(p_page_patch -> 'timezone') <> 'string'
        or pg_catalog.btrim(p_page_patch ->> 'timezone') = ''
        or not internal.is_valid_timezone_name(pg_catalog.btrim(p_page_patch ->> 'timezone'))
      ) then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    if p_page_patch ? 'target_markets' then
      if pg_catalog.jsonb_typeof(p_page_patch -> 'target_markets') <> 'array'
        or pg_catalog.jsonb_array_length(p_page_patch -> 'target_markets') not between 1 and 8
        or exists (
          select 1
          from pg_catalog.jsonb_array_elements(p_page_patch -> 'target_markets') as market(value)
          where pg_catalog.jsonb_typeof(market.value) <> 'string'
        ) then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
      end if;
      v_page_markets := internal.normalize_target_markets(array(
        select market.value #>> '{}'
        from pg_catalog.jsonb_array_elements(p_page_patch -> 'target_markets') as market(value)
      ));
      if v_page_markets is null then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
      end if;
    end if;
  end if;

  if p_niche_config_patch is not null then
    v_has_config_patch := true;
    if not internal.has_exact_json_keys(
      p_niche_config_patch,
      array['niche_key', 'expected_config_updated_at', 'config_schema_version', 'config', 'is_enabled', 'is_default']
    )
      or pg_catalog.jsonb_typeof(p_niche_config_patch -> 'expected_config_updated_at') <> 'string'
      or not internal.is_valid_timestamp_text(p_niche_config_patch ->> 'expected_config_updated_at')
      or pg_catalog.jsonb_typeof(p_niche_config_patch -> 'config') <> 'object'
      or pg_catalog.jsonb_typeof(p_niche_config_patch -> 'is_enabled') <> 'boolean'
      or pg_catalog.jsonb_typeof(p_niche_config_patch -> 'is_default') <> 'boolean' then
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
    end if;

    if p_niche_config_patch ->> 'niche_key' is distinct from 'trivia' then
      raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
    end if;
    if not internal.is_json_integer_between(p_niche_config_patch -> 'config_schema_version', 1, 1) then
      raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
    end if;
    if not internal.is_valid_trivia_config_v1(p_niche_config_patch -> 'config') then
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
    end if;

    v_expected_config_updated_at := (p_niche_config_patch ->> 'expected_config_updated_at')::timestamptz;
    v_config_enabled := (p_niche_config_patch ->> 'is_enabled')::boolean;
    v_config_default := (p_niche_config_patch ->> 'is_default')::boolean;
    if v_config_default and not v_config_enabled then
      raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
    end if;
  end if;

  if p_page_patch is null and not v_has_config_patch then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  v_page_patch_canonical := case when p_page_patch is null then null else '{}'::jsonb end;
  if p_page_patch ? 'name' then
    v_page_patch_canonical := v_page_patch_canonical || pg_catalog.jsonb_build_object('name', pg_catalog.btrim(p_page_patch ->> 'name'));
  end if;
  if p_page_patch ? 'slug' then
    v_page_patch_canonical := v_page_patch_canonical || pg_catalog.jsonb_build_object('slug', p_page_patch ->> 'slug');
  end if;
  if p_page_patch ? 'timezone' then
    v_page_timezone := pg_catalog.btrim(p_page_patch ->> 'timezone');
    v_page_patch_canonical := v_page_patch_canonical || pg_catalog.jsonb_build_object('timezone', v_page_timezone);
  end if;
  if p_page_patch ? 'target_markets' then
    v_page_patch_canonical := v_page_patch_canonical || pg_catalog.jsonb_build_object('target_markets', pg_catalog.to_jsonb(v_page_markets));
  end if;

  if v_has_config_patch then
    v_config_patch_canonical := pg_catalog.jsonb_build_object(
      'niche_key', 'trivia',
      'expected_config_updated_at', internal.iso_timestamp_v1(v_expected_config_updated_at),
      'config_schema_version', 1,
      'config', p_niche_config_patch -> 'config',
      'is_enabled', v_config_enabled,
      'is_default', v_config_default
    );
  end if;

  v_semantic_input := pg_catalog.jsonb_build_object(
    'page_public_id', p_page_public_id,
    'expected_page_updated_at', internal.iso_timestamp_v1(p_expected_page_updated_at),
    'page_patch', v_page_patch_canonical,
    'niche_config_patch', v_config_patch_canonical
  );

  select * into v_claim
  from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,
    p_operation_key,
    'update_page',
    p_request_schema_version,
    v_semantic_input
  );

  if v_claim.claim_state = 'in_progress' then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;

  if v_claim.claim_state = 'first_use' then
    select page.* into v_page
    from public.pages as page
    where page.workspace_id = v_claim.workspace_id
      and page.public_id = p_page_public_id
    for update;

    if not found then
      raise exception using errcode = 'P0001', message = 'PAGE_NOT_FOUND';
    end if;
    if v_page.updated_at <> p_expected_page_updated_at then
      raise exception using errcode = 'P0001', message = 'PAGE_VERSION_CONFLICT';
    end if;

    if p_page_patch ? 'slug'
      and exists (
        select 1
        from public.pages as other_page
        where other_page.workspace_id = v_claim.workspace_id
          and other_page.slug = p_page_patch ->> 'slug'
          and other_page.id <> v_page.id
      ) then
      raise exception using errcode = 'P0001', message = 'PAGE_SLUG_CONFLICT';
    end if;

    if p_page_patch is not null then
      update public.pages as page
      set name = case when p_page_patch ? 'name' then pg_catalog.btrim(p_page_patch ->> 'name') else page.name end,
          slug = case when p_page_patch ? 'slug' then p_page_patch ->> 'slug' else page.slug end,
          timezone = case when p_page_patch ? 'timezone' then pg_catalog.btrim(p_page_patch ->> 'timezone') else page.timezone end,
          target_markets = case when p_page_patch ? 'target_markets' then v_page_markets else page.target_markets end
      where page.id = v_page.id;

      select page.* into v_page
      from public.pages as page
      where page.id = v_page.id;
    end if;

    if v_has_config_patch then
      select config.* into v_config
      from public.page_niche_configs as config
      where config.workspace_id = v_claim.workspace_id
        and config.page_id = v_page.id
        and config.niche_key = 'trivia'
      for update;

      if not found then
        raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
      end if;
      if v_config.updated_at <> v_expected_config_updated_at then
        raise exception using errcode = 'P0001', message = 'PAGE_VERSION_CONFLICT';
      end if;

      select niche.* into v_niche
      from public.niches as niche
      where niche.key = 'trivia';
      if not found or v_niche.status <> 'active' then
        raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
      end if;
      if v_niche.config_schema_version <> 1 then
        raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
      end if;

      v_config_will_change := v_config.config is distinct from (p_niche_config_patch -> 'config')
        or v_config.is_enabled is distinct from v_config_enabled
        or v_config.is_default is distinct from v_config_default;
      if v_config_will_change and exists (
        select 1
        from public.posts as post
        where post.workspace_id = v_claim.workspace_id
          and post.page_id = v_page.id
          and post.niche_key = 'trivia'
          and post.status not in ('discarded', 'archived')
      ) then
        raise exception using errcode = 'P0001', message = 'ACTIVE_POST_CONTEXT_CONFLICT';
      end if;

      if v_config_default then
        update public.page_niche_configs as other_config
        set is_default = false
        where other_config.workspace_id = v_claim.workspace_id
          and other_config.page_id = v_page.id
          and other_config.niche_key <> 'trivia'
          and other_config.is_default;
      end if;

      update public.page_niche_configs as config
      set config_schema_version = 1,
          config = p_niche_config_patch -> 'config',
          is_enabled = v_config_enabled,
          is_default = v_config_default
      where config.id = v_config.id;

      select config.* into v_config
      from public.page_niche_configs as config
      where config.id = v_config.id;

      update public.pages as page
      set default_niche_key = case
        when v_config_default then 'trivia'
        when page.default_niche_key = 'trivia' then null
        else page.default_niche_key
      end
      where page.id = v_page.id;

      select page.* into v_page
      from public.pages as page
      where page.id = v_page.id;
    end if;
  else
    select (resource.value ->> 'public_id')::uuid
    into v_page_public_id
    from pg_catalog.jsonb_array_elements(v_claim.response_snapshot -> 'resources') as resource(value)
    where resource.value ->> 'resource_type' = 'page'
    limit 1;
    if v_page_public_id is null then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  end if;

  if v_claim.claim_state <> 'first_use' then
    select page.* into v_page
    from public.pages as page
    where page.workspace_id = v_claim.workspace_id
      and page.public_id = v_page_public_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
    if v_has_config_patch then
      select config.* into v_config
      from public.page_niche_configs as config
      where config.workspace_id = v_claim.workspace_id
        and config.page_id = v_page.id
        and config.niche_key = 'trivia';
      if not found then
        raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
      end if;
    end if;
  end if;

  -- Keep the record descriptor assigned even for a Page-only patch.  The
  -- response deliberately omits config in that branch, but PL/pgSQL still
  -- resolves the record fields in the CASE expression below.
  if not v_has_config_patch then
    select config.* into v_config
    from public.page_niche_configs as config
    where config.workspace_id = v_page.workspace_id
      and config.page_id = v_page.id
      and config.niche_key = 'trivia';
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'niche_key', config.niche_key,
        'is_enabled', config.is_enabled,
        'is_default', config.is_default,
        'config_schema_version', config.config_schema_version,
        'updated_at', internal.iso_timestamp_v1(config.updated_at)
      ) order by config.niche_key
    ),
    '[]'::jsonb
  ) into v_enabled_niches
  from public.page_niche_configs as config
  where config.workspace_id = v_page.workspace_id
    and config.page_id = v_page.id;

  v_result := pg_catalog.jsonb_build_object(
    'response_schema_version', 1,
    'data', pg_catalog.jsonb_strip_nulls(pg_catalog.jsonb_build_object(
      'page', pg_catalog.jsonb_build_object(
        'page_public_id', v_page.public_id,
        'name', v_page.name,
        'slug', v_page.slug,
        'timezone', v_page.timezone,
        'target_markets', pg_catalog.to_jsonb(v_page.target_markets),
        'is_active', v_page.is_active,
        'enabled_niches', v_enabled_niches,
        'created_at', internal.iso_timestamp_v1(v_page.created_at),
        'updated_at', internal.iso_timestamp_v1(v_page.updated_at)
      ),
      'config', case when v_has_config_patch then pg_catalog.jsonb_build_object(
        'niche_key', v_config.niche_key,
        'config_schema_version', v_config.config_schema_version,
        'config', v_config.config,
        'is_enabled', v_config.is_enabled,
        'is_default', v_config.is_default,
        'updated_at', internal.iso_timestamp_v1(v_config.updated_at)
      ) else null end,
      'replayed', v_claim.claim_state = 'replay'
    ))
  );

  if v_claim.claim_state = 'first_use' then
    v_snapshot := pg_catalog.jsonb_build_object(
      'schema_version', 1,
      'operation_name', 'update_page',
      'resources', case when v_has_config_patch then pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'resource_type', 'page',
          'public_id', v_page.public_id,
          'status', 'updated',
          'occurred_at', internal.iso_timestamp_v1(v_page.updated_at)
        ),
        pg_catalog.jsonb_build_object(
          'resource_type', 'page_niche_config',
          'public_id', v_config.public_id,
          'status', 'updated',
          'occurred_at', internal.iso_timestamp_v1(v_config.updated_at)
        )
      ) else pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'resource_type', 'page',
          'public_id', v_page.public_id,
          'status', 'updated',
          'occurred_at', internal.iso_timestamp_v1(v_page.updated_at)
        )
      ) end
    );
    perform internal.complete_operation_for_owner_v2(
      p_workspace_public_id,
      v_claim.operation_id,
      'update_page',
      v_snapshot,
      'page',
      v_page.public_id
    );
  end if;

  return v_result;
exception when others then
  get stacked diagnostics
    v_sqlstate = returned_sqlstate,
    v_message = message_text,
    v_constraint = constraint_name;

  if v_message in (
    'AUTH_REQUIRED', 'OAUTH_CLIENT_REQUIRED', 'OWNER_ACCESS_REQUIRED',
    'OPERATION_KEY_REUSED', 'RATE_LIMITED', 'DATABASE_BUSY',
    'VALIDATION_FAILED', 'PAGE_NOT_FOUND', 'PAGE_VERSION_CONFLICT',
    'PAGE_SLUG_CONFLICT', 'CONFIG_INVALID', 'CONFIG_SCHEMA_UNSUPPORTED',
    'MODULE_DISABLED', 'ACTIVE_POST_CONTEXT_CONFLICT', 'INTERNAL_ERROR'
  ) then
    raise;
  end if;
  if v_sqlstate in ('40P01', '40001', '55P03', '57014') then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;
  if v_constraint = 'pages_workspace_slug_key' or v_sqlstate = '23505' then
    raise exception using errcode = 'P0001', message = 'PAGE_SLUG_CONFLICT';
  end if;
  if v_message in ('TRIVIA_CONFIG_INVALID', 'PAGE_TIMEZONE_INVALID', 'TARGET_MARKETS_INVALID')
    or v_sqlstate = '23514' then
    raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
  end if;
  raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
end;
$$;

create function api.create_content_plan(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_operation_key uuid,
  p_page_public_id uuid,
  p_niche_key text,
  p_config_schema_version integer,
  p_items jsonb,
  p_plan_intent text,
  p_name text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_claim record;
  v_page record;
  v_config record;
  v_niche record;
  v_plan record;
  v_item jsonb;
  v_normalized_items jsonb := '[]'::jsonb;
  v_positions integer[] := '{}'::integer[];
  v_position integer;
  v_item_count integer;
  v_position_min integer;
  v_position_max integer;
  v_position_distinct integer;
  v_scheduled_at timestamptz;
  v_schedule timestamptz;
  v_topic_key text;
  v_format_key text;
  v_interaction_goal text;
  v_name text;
  v_intent text;
  v_requested_formats jsonb;
  v_requested_topics jsonb;
  v_requested_goals jsonb;
  v_plan_config jsonb;
  v_items_projection jsonb;
  v_plan_summary jsonb;
  v_context_version jsonb;
  v_semantic_input jsonb;
  v_snapshot jsonb;
  v_result jsonb;
  v_plan_public_id uuid;
  v_plan_page_public_id uuid;
  v_plan_page_updated_at timestamptz;
  v_plan_config_updated_at timestamptz;
  v_workspace_chunk_size integer;
  v_sqlstate text;
  v_message text;
  v_constraint text;
begin
  v_name := case when p_name is null then null else pg_catalog.btrim(p_name) end;
  v_intent := case when p_plan_intent is null then null else pg_catalog.btrim(p_plan_intent) end;

  if p_request_schema_version is distinct from 1
    or p_workspace_public_id is null
    or p_operation_key is null
    or p_operation_key::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    or p_page_public_id is null
    or v_intent is null
    or pg_catalog.char_length(v_intent) not between 1 and 1000
    or (v_name is not null and pg_catalog.char_length(v_name) not between 1 and 120)
    or p_items is null
    or pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  if p_niche_key is distinct from 'trivia' then
    raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
  end if;
  if p_config_schema_version is distinct from 1 then
    raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
  end if;

  v_item_count := pg_catalog.jsonb_array_length(p_items);
  if v_item_count not between 1 and 100 then
    raise exception using errcode = 'P0001', message = 'PLAN_LIMIT_EXCEEDED';
  end if;

  for v_item in
    select item.value
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
  loop
    if not internal.has_exact_json_keys(
      v_item,
      array['position', 'scheduled_at', 'topic_key', 'format_key', 'interaction_goal', 'item_config']
    )
      or not internal.is_json_integer_between(v_item -> 'position', 1, 100)
      or pg_catalog.jsonb_typeof(v_item -> 'item_config') <> 'object'
      or pg_catalog.octet_length((v_item -> 'item_config')::text) > 8192 then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_position := (v_item ->> 'position')::integer;
    v_positions := pg_catalog.array_append(v_positions, v_position);

    if v_item -> 'scheduled_at' <> 'null'::jsonb then
      if pg_catalog.jsonb_typeof(v_item -> 'scheduled_at') <> 'string'
        or not internal.is_valid_timestamp_text(v_item ->> 'scheduled_at') then
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
      end if;
      v_scheduled_at := (v_item ->> 'scheduled_at')::timestamptz;
    else
      v_scheduled_at := null;
    end if;

    if v_item -> 'topic_key' = 'null'::jsonb then
      v_topic_key := null;
    elsif pg_catalog.jsonb_typeof(v_item -> 'topic_key') = 'string'
      and pg_catalog.btrim(v_item ->> 'topic_key') ~ '^[a-z][a-z0-9_]{1,79}$' then
      v_topic_key := pg_catalog.btrim(v_item ->> 'topic_key');
    else
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    if v_item -> 'format_key' = 'null'::jsonb then
      v_format_key := null;
    elsif pg_catalog.jsonb_typeof(v_item -> 'format_key') = 'string'
      and pg_catalog.btrim(v_item ->> 'format_key') ~ '^[a-z][a-z0-9_]{1,79}$' then
      v_format_key := pg_catalog.btrim(v_item ->> 'format_key');
    else
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    if v_item -> 'interaction_goal' = 'null'::jsonb then
      v_interaction_goal := null;
    elsif pg_catalog.jsonb_typeof(v_item -> 'interaction_goal') = 'string'
      and v_item ->> 'interaction_goal' in ('share', 'save', 'comment', 'follow') then
      v_interaction_goal := v_item ->> 'interaction_goal';
    else
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_normalized_items := v_normalized_items || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'position', v_position,
        'scheduled_at', internal.iso_timestamp_v1(v_scheduled_at),
        'topic_key', v_topic_key,
        'format_key', v_format_key,
        'interaction_goal', v_interaction_goal,
        'item_config', v_item -> 'item_config'
      )
    );
  end loop;

  select min(value), max(value), count(distinct value)::integer
  into v_position_min, v_position_max, v_position_distinct
  from pg_catalog.unnest(v_positions) as position(value);
  if v_position_min <> 1
    or v_position_max <> v_item_count
    or v_position_distinct <> v_item_count then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  v_semantic_input := pg_catalog.jsonb_build_object(
    'page_public_id', p_page_public_id,
    'niche_key', p_niche_key,
    'config_schema_version', p_config_schema_version,
    'items', (
      select pg_catalog.jsonb_agg(item.value order by (item.value ->> 'position')::integer)
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
    ),
    'plan_intent', v_intent,
    'name', v_name
  );

  select * into v_claim
  from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,
    p_operation_key,
    'create_content_plan',
    p_request_schema_version,
    v_semantic_input
  );

  if v_claim.claim_state = 'in_progress' then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;

  if v_claim.claim_state = 'first_use' then
    select page.* into v_page
    from public.pages as page
    where page.workspace_id = v_claim.workspace_id
      and page.public_id = p_page_public_id
      and page.is_active
    for update;
    if not found then
      raise exception using errcode = 'P0001', message = 'PAGE_NOT_FOUND';
    end if;

    select niche.* into v_niche
    from public.niches as niche
    where niche.key = 'trivia';
    if not found or v_niche.status <> 'active' then
      raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
    end if;
    if v_niche.config_schema_version <> p_config_schema_version then
      raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
    end if;

    select config.* into v_config
    from public.page_niche_configs as config
    where config.workspace_id = v_claim.workspace_id
      and config.page_id = v_page.id
      and config.niche_key = 'trivia'
    for update;
    if not found or not v_config.is_enabled then
      raise exception using errcode = 'P0001', message = 'MODULE_DISABLED';
    end if;
    if v_config.config_schema_version <> p_config_schema_version then
      raise exception using errcode = 'P0001', message = 'CONFIG_SCHEMA_UNSUPPORTED';
    end if;
    if not internal.is_valid_trivia_config_v1(v_config.config) then
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
    end if;

    if exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where (item.value ->> 'format_key') is not null
        and not (v_config.config -> 'allowed_formats' ? (item.value ->> 'format_key'))
    ) or exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where (item.value ->> 'topic_key') is not null
        and not (v_config.config -> 'allowed_topics' ? (item.value ->> 'topic_key'))
    ) or exists (
      select 1
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where (item.value ->> 'interaction_goal') is not null
        and not (v_config.config -> 'allowed_interaction_goals' ? (item.value ->> 'interaction_goal'))
    ) then
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
    end if;

    select (workspace.settings ->> 'default_plan_chunk_size')::integer
    into v_workspace_chunk_size
    from public.workspaces as workspace
    where workspace.id = v_claim.workspace_id;
    if v_workspace_chunk_size is null then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;

    select coalesce(pg_catalog.jsonb_agg(value order by value), '[]'::jsonb)
    into v_requested_formats
    from (
      select distinct item.value ->> 'format_key' as value
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where item.value ->> 'format_key' is not null
    ) as requested;
    select coalesce(pg_catalog.jsonb_agg(value order by value), '[]'::jsonb)
    into v_requested_topics
    from (
      select distinct item.value ->> 'topic_key' as value
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where item.value ->> 'topic_key' is not null
    ) as requested;
    select coalesce(pg_catalog.jsonb_agg(value order by value), '[]'::jsonb)
    into v_requested_goals
    from (
      select distinct item.value ->> 'interaction_goal' as value
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where item.value ->> 'interaction_goal' is not null
    ) as requested;

    v_plan_config := pg_catalog.jsonb_build_object(
      'schema_version', 1,
      'plan_intent', v_intent,
      'requested_chunk_size', least(v_item_count, v_workspace_chunk_size),
      'schedule', pg_catalog.jsonb_build_object('mode', 'unscheduled'),
      'requested_formats', v_requested_formats,
      'requested_topics', v_requested_topics,
      'requested_interaction_goals', v_requested_goals
    );

    -- Acquire every requested schedule lock in deterministic timestamp/order
    -- order before any plan row is written.  Each item is checked again just
    -- before its insert below, in the same transaction.
    for v_schedule in
      select (item.value ->> 'scheduled_at')::timestamptz
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where item.value ->> 'scheduled_at' is not null
      order by (item.value ->> 'scheduled_at')::timestamptz,
               (item.value ->> 'position')::integer
    loop
      perform internal.assert_page_schedule_available(v_page.id, v_schedule, null, null);
    end loop;

    insert into public.content_plans (
      workspace_id,
      page_id,
      niche_key,
      created_by_operation_id,
      name,
      status,
      requested_count,
      config_schema_version,
      plan_config
    ) values (
      v_claim.workspace_id,
      v_page.id,
      'trivia',
      v_claim.operation_id,
      v_name,
      'pending',
      v_item_count,
      p_config_schema_version,
      v_plan_config
    ) returning * into v_plan;

    for v_item in
      select item.value
      from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      order by (item.value ->> 'position')::integer
    loop
      if v_item ->> 'scheduled_at' is not null then
        perform internal.assert_page_schedule_available(
          v_page.id,
          (v_item ->> 'scheduled_at')::timestamptz,
          null,
          null
        );
      end if;

      insert into public.content_plan_items (
        workspace_id,
        plan_id,
        page_id,
        niche_key,
        position,
        created_by_operation_id,
        status,
        scheduled_at,
        topic_key,
        format_key,
        interaction_goal,
        item_config
      ) values (
        v_claim.workspace_id,
        v_plan.id,
        v_page.id,
        'trivia',
        (v_item ->> 'position')::integer,
        v_claim.operation_id,
        'pending',
        (v_item ->> 'scheduled_at')::timestamptz,
        v_item ->> 'topic_key',
        v_item ->> 'format_key',
        v_item ->> 'interaction_goal',
        v_item -> 'item_config'
      );
    end loop;
  else
    select (resource.value ->> 'public_id')::uuid
    into v_plan_public_id
    from pg_catalog.jsonb_array_elements(v_claim.response_snapshot -> 'resources') as resource(value)
    where resource.value ->> 'resource_type' = 'content_plan'
    limit 1;
    if v_plan_public_id is null then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  end if;

  if v_claim.claim_state <> 'first_use' then
    select plan.*
    into v_plan
    from public.content_plans as plan
    where plan.workspace_id = v_claim.workspace_id
      and plan.public_id = v_plan_public_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;

    select page.public_id, page.updated_at, config.updated_at
    into v_plan_page_public_id, v_plan_page_updated_at, v_plan_config_updated_at
    from public.pages as page
    join public.page_niche_configs as config
      on config.workspace_id = page.workspace_id
      and config.page_id = page.id
      and config.niche_key = 'trivia'
    where page.workspace_id = v_plan.workspace_id
      and page.id = v_plan.page_id;
    if not found then
      raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
    end if;
  else
    v_plan_page_public_id := v_page.public_id;
    v_plan_page_updated_at := v_page.updated_at;
    v_plan_config_updated_at := v_config.updated_at;
  end if;

  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'plan_item_public_id', item.public_id,
        'plan_public_id', v_plan.public_id,
        'position', item.position,
        'status', item.status,
        'scheduled_at', internal.iso_timestamp_v1(item.scheduled_at),
        'topic_key', item.topic_key,
        'format_key', item.format_key,
        'interaction_goal', item.interaction_goal,
        'item_config', item.item_config,
        'attempt_count', item.attempt_count,
        'claim_expires_at', internal.iso_timestamp_v1(item.claim_expires_at),
        'active_post_public_id', (
          select post.public_id
          from public.posts as post
          where post.workspace_id = item.workspace_id
            and post.content_plan_item_id = item.id
            and post.status <> 'discarded'
          order by post.updated_at desc, post.id desc
          limit 1
        ),
        'last_error', case when item.last_error_code is null then null else pg_catalog.jsonb_build_object(
          'code', item.last_error_code,
          'detail', pg_catalog.left(coalesce(item.last_error_detail, ''), 500)
        ) end,
        'created_at', internal.iso_timestamp_v1(item.created_at),
        'updated_at', internal.iso_timestamp_v1(item.updated_at)
      ) order by item.position, item.id
    ),
    '[]'::jsonb
  ) into v_items_projection
  from public.content_plan_items as item
  where item.workspace_id = v_plan.workspace_id
    and item.plan_id = v_plan.id;

  v_plan_summary := pg_catalog.jsonb_build_object(
    'plan_public_id', v_plan.public_id,
    'name', v_plan.name,
    'page_public_id', v_plan_page_public_id,
    'niche_key', v_plan.niche_key,
    'status', v_plan.status,
    'requested_count', v_plan.requested_count,
    'progress', pg_catalog.jsonb_build_object(
      'pending', (select count(*) from public.content_plan_items where plan_id = v_plan.id and status = 'pending'),
      'in_progress', (select count(*) from public.content_plan_items where plan_id = v_plan.id and status = 'in_progress'),
      'completed', (select count(*) from public.content_plan_items where plan_id = v_plan.id and status = 'completed'),
      'failed', (select count(*) from public.content_plan_items where plan_id = v_plan.id and status = 'failed'),
      'cancelled', (select count(*) from public.content_plan_items where plan_id = v_plan.id and status = 'cancelled')
    ),
    'created_at', internal.iso_timestamp_v1(v_plan.created_at),
    'updated_at', internal.iso_timestamp_v1(v_plan.updated_at)
  );
  v_context_version := pg_catalog.jsonb_build_object(
    'page_updated_at', internal.iso_timestamp_v1(v_plan_page_updated_at),
    'config_updated_at', internal.iso_timestamp_v1(v_plan_config_updated_at)
  );
  v_result := pg_catalog.jsonb_build_object(
    'response_schema_version', 1,
    'data', pg_catalog.jsonb_build_object(
      'plan', v_plan_summary,
      'items', v_items_projection,
      'context_version', v_context_version,
      'replayed', v_claim.claim_state = 'replay'
    )
  );

  if v_claim.claim_state = 'first_use' then
    v_snapshot := pg_catalog.jsonb_build_object(
      'schema_version', 1,
      'operation_name', 'create_content_plan',
      'resources', pg_catalog.jsonb_build_array(
        pg_catalog.jsonb_build_object(
          'resource_type', 'content_plan',
          'public_id', v_plan.public_id,
          'status', 'created',
          'occurred_at', internal.iso_timestamp_v1(v_plan.created_at)
        )
      )
    );
    perform internal.complete_operation_for_owner_v2(
      p_workspace_public_id,
      v_claim.operation_id,
      'create_content_plan',
      v_snapshot,
      'content_plan',
      v_plan.public_id
    );
  end if;

  return v_result;
exception when others then
  get stacked diagnostics
    v_sqlstate = returned_sqlstate,
    v_message = message_text,
    v_constraint = constraint_name;

  if v_message in (
    'AUTH_REQUIRED', 'OAUTH_CLIENT_REQUIRED', 'OWNER_ACCESS_REQUIRED',
    'OPERATION_KEY_REUSED', 'RATE_LIMITED', 'DATABASE_BUSY',
    'VALIDATION_FAILED', 'PAGE_NOT_FOUND', 'MODULE_DISABLED',
    'CONFIG_INVALID', 'CONFIG_SCHEMA_UNSUPPORTED', 'SCHEDULE_CONFLICT',
    'PLAN_LIMIT_EXCEEDED', 'INTERNAL_ERROR'
  ) then
    raise;
  end if;
  if v_sqlstate in ('40P01', '40001', '55P03', '57014') then
    raise exception using errcode = 'P0001', message = 'DATABASE_BUSY';
  end if;
  if v_constraint in ('content_plan_items_page_schedule_unique_key', 'posts_page_schedule_unique_idx') then
    raise exception using errcode = 'P0001', message = 'SCHEDULE_CONFLICT';
  end if;
  if v_message in ('PLAN_CONFIG_INVALID', 'PLAN_CONFIG_SCOPE_INVALID', 'TRIVIA_CONFIG_INVALID')
    or v_sqlstate = '23514' then
    raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
  end if;
  if v_sqlstate = '23505' then
    raise exception using errcode = 'P0001', message = 'SCHEDULE_CONFLICT';
  end if;
  raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
end;
$$;

-- Apply ownership and caller grants only after every public function exists.
grant create on schema api to content_producer_api_owner;

alter function api.create_page(integer, uuid, uuid, text, text, text, text[], text, integer, jsonb, boolean)
  owner to content_producer_api_owner;
alter function api.update_page(integer, uuid, uuid, uuid, timestamptz, jsonb, jsonb)
  owner to content_producer_api_owner;
alter function api.create_content_plan(integer, uuid, uuid, uuid, text, integer, jsonb, text, text)
  owner to content_producer_api_owner;

revoke all on function api.create_page(integer, uuid, uuid, text, text, text, text[], text, integer, jsonb, boolean)
  from public, anon, authenticated, service_role;
revoke all on function api.update_page(integer, uuid, uuid, uuid, timestamptz, jsonb, jsonb)
  from public, anon, authenticated, service_role;
revoke all on function api.create_content_plan(integer, uuid, uuid, uuid, text, integer, jsonb, text, text)
  from public, anon, authenticated, service_role;

grant execute on function api.create_page(integer, uuid, uuid, text, text, text, text[], text, integer, jsonb, boolean)
  to authenticated;
grant execute on function api.update_page(integer, uuid, uuid, uuid, timestamptz, jsonb, jsonb)
  to authenticated;
grant execute on function api.create_content_plan(integer, uuid, uuid, uuid, text, integer, jsonb, text, text)
  to authenticated;

revoke create on schema api from content_producer_api_owner;
revoke all on all functions in schema api from public, anon, service_role;
