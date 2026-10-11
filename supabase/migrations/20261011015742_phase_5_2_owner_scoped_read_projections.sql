-- Phase 5, checkpoint 5.2: owner-scoped read projections.
--
-- This migration deliberately exposes only the ten read operations assigned
-- to checkpoint 5.2.  The API functions return a versioned JSON projection,
-- never a table row, and all data access runs through the narrow API-owner
-- role plus owner-scoped RLS policies.

grant select on table
  public.niches,
  public.pages,
  public.page_niche_configs,
  public.content_plans,
  public.content_plan_items,
  public.posts,
  public.post_metrics,
  public.trivia_facts,
  public.trivia_post_facts
to content_producer_api_owner;

create policy niches_api_owner_select
on public.niches
for select
to content_producer_api_owner
using ((select internal.current_auth_uid_v1()) is not null);

create policy pages_api_owner_select
on public.pages
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = pages.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy page_niche_configs_api_owner_select
on public.page_niche_configs
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = page_niche_configs.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy content_plans_api_owner_select
on public.content_plans
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = content_plans.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy content_plan_items_api_owner_select
on public.content_plan_items
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = content_plan_items.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy posts_api_owner_select
on public.posts
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = posts.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy post_metrics_api_owner_select
on public.post_metrics
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = post_metrics.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy trivia_facts_api_owner_select
on public.trivia_facts
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = trivia_facts.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create policy trivia_post_facts_api_owner_select
on public.trivia_post_facts
for select
to content_producer_api_owner
using (
  exists (
    select 1
    from public.workspaces as workspace
    where workspace.id = trivia_post_facts.workspace_id
      and workspace.is_active
      and workspace.owner_user_id = (select internal.current_auth_uid_v1())
  )
);

create function internal.begin_read_v1(
  p_request_schema_version integer,
  p_limit_group text
)
returns table(actor_user_id uuid, oauth_client_id text)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if p_request_schema_version <> 1
    or p_limit_group not in ('read', 'expensive_read') then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  select context.actor_user_id, context.oauth_client_id
  into actor_user_id, oauth_client_id
  from internal.assert_request_context_v1() as context;

  perform internal.consume_rate_limit_v1(p_limit_group);
  return next;
end;

$$;

create function api.get_workspace_context(
  p_request_schema_version integer,
  p_workspace_public_id uuid
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace_context record;
  v_workspace record;
  v_modules jsonb;
  v_active_count bigint;
  v_inactive_count bigint;
begin
  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');

  select * into v_workspace_context
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select workspace.*
  into v_workspace
  from public.workspaces as workspace
  where workspace.id = v_workspace_context.workspace_id;

  if not found then
    perform internal.raise_read_error_v1('WORKSPACE_NOT_FOUND');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'niche_key', niche.key,
      'display_name', left(niche.name, 120),
      'module_version', niche.module_version,
      'status', case niche.status
        when 'active' then 'active'
        when 'disabled' then 'inactive'
        else 'unavailable'
      end,
      'capabilities', case when niche.key = 'trivia' then jsonb_build_array(
        'project_generation_context',
        'validate_content_payload',
        'render_content',
        'find_similar_items',
        'register_and_reserve_items',
        'release_items',
        'reverify_sources',
        'correct_items',
        'project_performance_dimensions'
      ) else '[]'::jsonb end,
      'config_schema_versions', jsonb_build_array(niche.config_schema_version),
      'content_schema_versions', jsonb_build_array(niche.content_schema_version)
    ) order by niche.key
  ), '[]'::jsonb)
  into v_modules
  from public.niches as niche;

  select count(*) filter (where page.is_active), count(*) filter (where not page.is_active)
  into v_active_count, v_inactive_count
  from public.pages as page
  where page.workspace_id = v_workspace_context.workspace_id;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'workspace', jsonb_build_object(
        'public_id', v_workspace_context.workspace_public_id,
        'name', left(v_workspace.name, 120),
        'language_code', v_workspace.language_code,
        'target_markets', to_jsonb(v_workspace.target_markets),
        'default_timezone', 'UTC',
        'defaults', v_workspace.settings
      ),
      'modules', v_modules,
      'page_counts', jsonb_build_object(
        'active', v_active_count,
        'inactive', v_inactive_count
      )
    )
  );
end;
$$;

create function internal.raise_read_error_v1(p_code text)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_code not in (
    'AUTH_REQUIRED',
    'OAUTH_CLIENT_REQUIRED',
    'OWNER_ACCESS_REQUIRED',
    'RATE_LIMITED',
    'DATABASE_BUSY',
    'DATABASE_UNAVAILABLE',
    'VALIDATION_FAILED',
    'WORKSPACE_NOT_FOUND',
    'PAGE_NOT_FOUND',
    'MODULE_NOT_FOUND',
    'MODULE_DISABLED',
    'CONFIG_SCHEMA_UNSUPPORTED',
    'PLAN_NOT_FOUND',
    'POST_NOT_FOUND',
    'POST_NOT_PUBLISHED',
    'METRIC_DEFINITION_AMBIGUOUS'
  ) then
    raise exception using errcode = 'P0001', message = 'INTERNAL_ERROR';
  end if;

  raise exception using errcode = 'P0001', message = p_code;
end;
$$;

create function internal.iso_timestamp_v1(p_value timestamptz)
returns text
language sql
immutable
strict
security invoker
set search_path = ''
as $$
  select to_char(
    p_value at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'
  );
$$;

create function internal.mask_email_v1(p_email text)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_at integer;
  v_local text;
begin
  v_at := strpos(p_email, '@');
  if v_at <= 1 or v_at >= char_length(p_email) then
    return null;
  end if;

  v_local := left(p_email, v_at - 1);
  return left(v_local, 1) || '***' || substring(p_email from v_at);
end;
$$;

create function internal.encode_read_cursor_v1(
  p_kind text,
  p_sort_value text,
  p_tie_id bigint
)
returns text
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
begin
  if p_kind !~ '^[a-z][a-z0-9_]{1,31}$'
    or nullif(btrim(p_sort_value), '') is null
    or char_length(p_sort_value) > 80
    or p_tie_id <= 0 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  return replace(
    replace(
      encode(
        convert_to(
          jsonb_build_object(
            'version', 1,
            'kind', p_kind,
            'sort', p_sort_value,
            'tie', p_tie_id
          )::text,
          'UTF8'
        ),
        'base64'
      ),
      chr(10),
      ''
    ),
    chr(13),
    ''
  );
end;
$$;

create function internal.decode_read_cursor_v1(
  p_cursor text,
  p_expected_kind text
)
returns table(sort_value text, tie_id bigint)
language plpgsql
immutable
strict
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_decoded text;
begin
  begin
    if p_expected_kind !~ '^[a-z][a-z0-9_]{1,31}$'
      or char_length(p_cursor) > 512
      or p_cursor !~ '^[A-Za-z0-9+/]+={0,2}$'
      or mod(char_length(p_cursor), 4) <> 0 then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    v_decoded := convert_from(decode(p_cursor, 'base64'), 'UTF8');
    v_payload := v_decoded::jsonb;

    if jsonb_typeof(v_payload) <> 'object'
      or v_payload ->> 'version' <> '1'
      or v_payload ->> 'kind' <> p_expected_kind
      or jsonb_typeof(v_payload -> 'sort') <> 'string'
      or nullif(btrim(v_payload ->> 'sort'), '') is null
      or char_length(v_payload ->> 'sort') > 80
      or jsonb_typeof(v_payload -> 'tie') <> 'number'
      or v_payload ->> 'tie' !~ '^[1-9][0-9]*$' then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;

    sort_value := v_payload ->> 'sort';
    tie_id := (v_payload ->> 'tie')::bigint;
    if tie_id <= 0 then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
  exception when others then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end;

  return next;
end;
$$;

create function internal.project_check_snapshot_v1(
  p_snapshot jsonb,
  p_include boolean
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_checks jsonb;
begin
  if not p_include or p_snapshot is null then
    return null;
  end if;
  if p_snapshot = '{}'::jsonb then
    return '{}'::jsonb;
  end if;

  select coalesce(
    jsonb_agg(
      value - array[
        'internal_id', 'actor_user_id', 'operation_id', 'sqlstate',
        'stack_trace', 'raw_source_document', 'reservation_token',
        'claim_token', 'secret', 'access_token', 'refresh_token'
      ]
      order by ordinal
    ),
    '[]'::jsonb
  )
  into v_checks
  from jsonb_array_elements(
    case when jsonb_typeof(p_snapshot -> 'checks') = 'array'
      then p_snapshot -> 'checks'
      else '[]'::jsonb
    end
  ) with ordinality as check_item(value, ordinal);

  return jsonb_strip_nulls(jsonb_build_object(
    'schema_version', p_snapshot -> 'schema_version',
    'content_hash', p_snapshot -> 'content_hash',
    'overall_status', p_snapshot -> 'overall_status',
    'checks', v_checks
  ));
end;
$$;

create function internal.project_metric_source_v1(p_payload jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_version text;
  v_source_type text;
  v_reported_at text;
  v_timezone text;
  v_note text;
begin
  v_version := coalesce(
    p_payload #>> '{source,metric_definition_version}',
    p_payload ->> 'metric_definition_version'
  );
  v_source_type := coalesce(p_payload #>> '{source,source_type}', p_payload ->> 'source_type');
  v_reported_at := coalesce(p_payload #>> '{source,source_reported_at}', p_payload ->> 'source_reported_at');
  v_timezone := coalesce(p_payload #>> '{source,timezone}', p_payload ->> 'timezone');
  v_note := coalesce(p_payload #>> '{source,note}', p_payload ->> 'note');

  return jsonb_strip_nulls(jsonb_build_object(
    'source_type', v_source_type,
    'source_reported_at', v_reported_at,
    'timezone', v_timezone,
    'metric_definition_version', case
      when v_version ~ '^[0-9]+$' then v_version::integer
      else 1
    end,
    'note', left(v_note, 500)
  ));
exception when others then
  return jsonb_build_object('metric_definition_version', 1);
end;
$$;

create function internal.project_metric_snapshot_v1(
  p_public_id uuid,
  p_post_public_id uuid,
  p_captured_at timestamptz,
  p_views bigint,
  p_reach bigint,
  p_reactions bigint,
  p_likes bigint,
  p_comments bigint,
  p_shares bigint,
  p_saves bigint,
  p_follows bigint,
  p_watch_time_seconds numeric,
  p_average_watch_time_seconds numeric,
  p_metrics_payload jsonb,
  p_created_at timestamptz
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'metric_snapshot_public_id', p_public_id,
    'post_public_id', p_post_public_id,
    'captured_at', internal.iso_timestamp_v1(p_captured_at),
    'metrics', jsonb_strip_nulls(jsonb_build_object(
      'views', p_views,
      'reach', p_reach,
      'reactions', p_reactions,
      'likes', p_likes,
      'comments', p_comments,
      'shares', p_shares,
      'saves', p_saves,
      'follows', p_follows,
      'watch_time_seconds', p_watch_time_seconds,
      'average_watch_time_seconds', p_average_watch_time_seconds
    )),
    'source', internal.project_metric_source_v1(coalesce(p_metrics_payload, '{}'::jsonb)),
    'anomaly_flags', case
      when jsonb_typeof(coalesce(p_metrics_payload, '{}'::jsonb) -> 'anomaly_flags') = 'array'
        then coalesce(p_metrics_payload, '{}'::jsonb) -> 'anomaly_flags'
      else '[]'::jsonb
    end,
    'created_at', internal.iso_timestamp_v1(p_created_at)
  );
$$;

create function internal.project_fact_source_snapshot_v1(p_snapshot jsonb)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'schema_version', p_snapshot -> 'schema_version',
    'canonical_claim', p_snapshot -> 'canonical_claim',
    'normalized_claim', p_snapshot -> 'normalized_claim',
    'normalization_version', p_snapshot -> 'normalization_version',
    'claim_hash', p_snapshot -> 'claim_hash',
    'subject_key', p_snapshot -> 'subject_key',
    'relation_key', p_snapshot -> 'relation_key',
    'object_key', p_snapshot -> 'object_key',
    'numbers', p_snapshot -> 'numbers',
    'qualifiers', p_snapshot -> 'qualifiers',
    'ontology_version', p_snapshot -> 'ontology_version',
    'structured_key', p_snapshot -> 'structured_key',
    'structured_hash', p_snapshot -> 'structured_hash',
    'structured_match_eligible', p_snapshot -> 'structured_match_eligible',
    'topic_key', p_snapshot -> 'topic_key',
    'risk_class', p_snapshot -> 'risk_class',
    'source_schema_version', p_snapshot -> 'source_schema_version',
    'sources', case
      when jsonb_typeof(p_snapshot -> 'sources') = 'array' then (
        select coalesce(jsonb_agg(
          jsonb_build_object(
            'schema_version', source_item.value -> 'schema_version',
            'url', source_item.value -> 'url',
            'canonical_url', source_item.value -> 'canonical_url',
            'title', source_item.value -> 'title',
            'publisher', source_item.value -> 'publisher',
            'tier', source_item.value -> 'tier',
            'source_type', source_item.value -> 'source_type',
            'accessed_at', source_item.value -> 'accessed_at',
            'published_at', source_item.value -> 'published_at',
            'updated_at', source_item.value -> 'updated_at',
            'as_of', source_item.value -> 'as_of',
            'language', source_item.value -> 'language',
            'supports', source_item.value -> 'supports',
            'independence_group', source_item.value -> 'independence_group'
          ) order by source_item.ordinal
        ), '[]'::jsonb)
        from jsonb_array_elements(p_snapshot -> 'sources') with ordinality as source_item(value, ordinal)
      )
      else '[]'::jsonb
    end,
    'verification_status', p_snapshot -> 'verification_status',
    'verified_at', p_snapshot -> 'verified_at',
    'as_of_date', p_snapshot -> 'as_of_date',
    'expires_at', p_snapshot -> 'expires_at',
    'dedup_review_schema_version', p_snapshot -> 'dedup_review_schema_version'
  );
$$;

grant create on schema internal to content_producer_api_owner;

alter function internal.begin_read_v1(integer, text) owner to content_producer_api_owner;
alter function internal.raise_read_error_v1(text) owner to content_producer_api_owner;
alter function internal.iso_timestamp_v1(timestamptz) owner to content_producer_api_owner;
alter function internal.mask_email_v1(text) owner to content_producer_api_owner;
alter function internal.encode_read_cursor_v1(text, text, bigint) owner to content_producer_api_owner;
alter function internal.decode_read_cursor_v1(text, text) owner to content_producer_api_owner;
alter function internal.project_check_snapshot_v1(jsonb, boolean) owner to content_producer_api_owner;
alter function internal.project_metric_source_v1(jsonb) owner to content_producer_api_owner;
alter function internal.project_metric_snapshot_v1(uuid, uuid, timestamptz, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, numeric, numeric, jsonb, timestamptz) owner to content_producer_api_owner;
alter function internal.project_fact_source_snapshot_v1(jsonb) owner to content_producer_api_owner;

revoke all on function internal.begin_read_v1(integer, text) from public, anon, authenticated, service_role;
revoke all on function internal.raise_read_error_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.iso_timestamp_v1(timestamptz) from public, anon, authenticated, service_role;
revoke all on function internal.mask_email_v1(text) from public, anon, authenticated, service_role;
revoke all on function internal.encode_read_cursor_v1(text, text, bigint) from public, anon, authenticated, service_role;
revoke all on function internal.decode_read_cursor_v1(text, text) from public, anon, authenticated, service_role;
revoke all on function internal.project_check_snapshot_v1(jsonb, boolean) from public, anon, authenticated, service_role;
revoke all on function internal.project_metric_source_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.project_fact_source_snapshot_v1(jsonb) from public, anon, authenticated, service_role;

revoke create on schema internal from content_producer_api_owner;

create function api.get_account_profile(
  p_request_schema_version integer
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_claims jsonb;
  v_email text;
  v_display_name text;
  v_workspace record;
begin
  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');

  begin
    v_claims := coalesce(pg_catalog.current_setting('request.jwt.claims', true), '{}')::jsonb;
  exception when others then
    v_claims := '{}'::jsonb;
  end;

  v_email := nullif(btrim(v_claims ->> 'email'), '');
  v_display_name := coalesce(
    nullif(btrim(v_claims #>> '{user_metadata,full_name}'), ''),
    nullif(btrim(v_claims #>> '{user_metadata,name}'), ''),
    nullif(split_part(v_email, '@', 1), ''),
    'Content Producer account'
  );

  select workspace.public_id, workspace.name
  into v_workspace
  from public.workspaces as workspace
  where workspace.owner_user_id = v_context.actor_user_id
    and workspace.is_active
  order by workspace.id
  limit 1;

  if not found then
    perform internal.raise_read_error_v1('OWNER_ACCESS_REQUIRED');
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'profile', jsonb_build_object(
        'id', v_context.actor_user_id::text,
        'display_name', left(v_display_name, 120),
        'email_hint', internal.mask_email_v1(v_email),
        'workspace_public_id', v_workspace.public_id,
        'workspace_name', left(v_workspace.name, 120),
        'account_status', 'active'
      )
    )
  );
end;
$$;
revoke all on function internal.project_metric_snapshot_v1(uuid, uuid, timestamptz, bigint, bigint, bigint, bigint, bigint, bigint, bigint, bigint, numeric, numeric, jsonb, timestamptz) from public, anon, authenticated, service_role;

create function api.list_pages(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_query text default null,
  p_active boolean default null,
  p_niche_key text default null,
  p_limit integer default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_cursor record;
  v_cursor_sort timestamptz;
  v_cursor_id bigint;
  v_items jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_sort text;
  v_last_id bigint;
begin
  if p_limit is null
    or p_limit not between 1 and 50
    or (p_query is not null and (
      nullif(btrim(p_query), '') is null or char_length(btrim(p_query)) > 120
    ))
    or (p_niche_key is not null and p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$') then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  if p_niche_key is not null
    and not exists (select 1 from public.niches where key = p_niche_key) then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'pages');
    begin
      v_cursor_sort := v_cursor.sort_value::timestamptz;
      v_cursor_id := v_cursor.tie_id;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  with ordered as (
    select
      page.workspace_id,
      page.id,
      page.public_id,
      page.name,
      page.slug,
      page.timezone,
      page.target_markets,
      page.is_active,
      page.updated_at,
      row_number() over (order by page.updated_at desc, page.id desc) as row_number
    from public.pages as page
    where page.workspace_id = v_workspace.workspace_id
      and (p_active is null or page.is_active = p_active)
      and (p_query is null or position(lower(btrim(p_query)) in lower(page.name)) > 0)
      and (
        p_niche_key is null
        or exists (
          select 1
          from public.page_niche_configs as filter_config
          where filter_config.workspace_id = page.workspace_id
            and filter_config.page_id = page.id
            and filter_config.niche_key = p_niche_key
            and filter_config.is_enabled
        )
      )
      and (
        p_cursor is null
        or page.updated_at < v_cursor_sort
        or (page.updated_at = v_cursor_sort and page.id < v_cursor_id)
      )
  ), projected as (
    select
      ordered.*,
      coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'niche_key', config.niche_key,
            'is_enabled', config.is_enabled,
            'is_default', config.is_default,
            'config_schema_version', config.config_schema_version,
            'updated_at', internal.iso_timestamp_v1(config.updated_at)
          ) order by config.niche_key
        )
        from public.page_niche_configs as config
        where config.workspace_id = ordered.workspace_id
          and config.page_id = ordered.id
      ), '[]'::jsonb) as enabled_niches
    from ordered
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'page_public_id', projected.public_id,
        'name', left(projected.name, 120),
        'slug', projected.slug,
        'timezone', projected.timezone,
        'target_markets', to_jsonb(projected.target_markets),
        'is_active', projected.is_active,
        'enabled_niches', projected.enabled_niches,
        'updated_at', internal.iso_timestamp_v1(projected.updated_at)
      ) order by projected.updated_at desc, projected.id desc
    ) filter (where projected.row_number <= p_limit), '[]'::jsonb),
    count(*)
  into v_items, v_total
  from projected;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select internal.iso_timestamp_v1(page.updated_at), page.id
    into v_last_sort, v_last_id
    from public.pages as page
    where page.workspace_id = v_workspace.workspace_id
      and (p_active is null or page.is_active = p_active)
      and (p_query is null or position(lower(btrim(p_query)) in lower(page.name)) > 0)
      and (
        p_niche_key is null
        or exists (
          select 1 from public.page_niche_configs as filter_config
          where filter_config.workspace_id = page.workspace_id
            and filter_config.page_id = page.id
            and filter_config.niche_key = p_niche_key
            and filter_config.is_enabled
        )
      )
      and (
        p_cursor is null
        or page.updated_at < v_cursor_sort
        or (page.updated_at = v_cursor_sort and page.id < v_cursor_id)
      )
    order by page.updated_at desc, page.id desc
    offset p_limit - 1
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'items', v_items,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('pages', v_last_sort, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$$;

-- ownership and caller grants are applied after all API functions exist

-- deferred until all API functions are defined

-- deferred until all API functions are defined

-- API-owner CREATE is revoked by the final privilege block.

create function api.list_posts(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_page_public_id uuid default null,
  p_niche_key text default null,
  p_statuses text[] default null,
  p_format_key text default null,
  p_topic_key text default null,
  p_scheduled_from timestamptz default null,
  p_scheduled_to timestamptz default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null,
  p_query text default null,
  p_limit integer default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_cursor record;
  v_cursor_sort timestamptz;
  v_cursor_id bigint;
  v_items jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_sort text;
  v_last_id bigint;
begin
  if p_limit is null
    or p_limit not between 1 and 50
    or (p_query is not null and (
      nullif(btrim(p_query), '') is null or char_length(btrim(p_query)) > 120
    ))
    or (p_niche_key is not null and p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$')
    or (p_format_key is not null and p_format_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_topic_key is not null and p_topic_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_scheduled_from is not null and p_scheduled_to is not null and p_scheduled_from > p_scheduled_to)
    or (p_created_from is not null and p_created_to is not null and p_created_from > p_created_to)
    or (p_statuses is not null and (
      cardinality(p_statuses) = 0
      or exists (
        select 1 from unnest(p_statuses) as requested_status
        where requested_status not in ('draft', 'ready', 'posted', 'discarded', 'archived')
      )
    )) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  if p_niche_key is not null
    and not exists (select 1 from public.niches where key = p_niche_key) then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'posts');
    begin
      v_cursor_sort := v_cursor.sort_value::timestamptz;
      v_cursor_id := v_cursor.tie_id;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  with ordered as (
    select
      post.*,
      row_number() over (order by post.updated_at desc, post.id desc) as row_number
    from public.posts as post
    where post.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = post.page_id and page.workspace_id = post.workspace_id and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or post.niche_key = p_niche_key)
      and (p_statuses is null or post.status = any(p_statuses))
      and (p_format_key is null or post.format_key = p_format_key)
      and (p_topic_key is null or post.topic_key = p_topic_key)
      and (p_scheduled_from is null or post.scheduled_at >= p_scheduled_from)
      and (p_scheduled_to is null or post.scheduled_at <= p_scheduled_to)
      and (p_created_from is null or post.created_at >= p_created_from)
      and (p_created_to is null or post.created_at <= p_created_to)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(post.content_payload ->> 'hook', ''))) > 0)
      and (
        p_cursor is null
        or post.updated_at < v_cursor_sort
        or (post.updated_at = v_cursor_sort and post.id < v_cursor_id)
      )
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'post_public_id', ordered.public_id,
        'page_public_id', page.public_id,
        'niche_key', ordered.niche_key,
        'status', ordered.status,
        'revision', ordered.revision,
        'format_key', ordered.format_key,
        'topic_key', ordered.topic_key,
        'interaction_goal', ordered.interaction_goal,
        'scheduled_at', internal.iso_timestamp_v1(ordered.scheduled_at),
        'published_at', internal.iso_timestamp_v1(ordered.published_at),
        'quality_status', ordered.quality_status,
        'hook_preview', left(ordered.content_payload ->> 'hook', 120),
        'updated_at', internal.iso_timestamp_v1(ordered.updated_at)
      ) order by ordered.updated_at desc, ordered.id desc
    ) filter (where ordered.row_number <= p_limit), '[]'::jsonb),
    count(*)
  into v_items, v_total
  from ordered
  join public.pages as page
    on page.workspace_id = ordered.workspace_id
    and page.id = ordered.page_id;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select internal.iso_timestamp_v1(post.updated_at), post.id
    into v_last_sort, v_last_id
    from public.posts as post
    where post.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = post.page_id and page.workspace_id = post.workspace_id and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or post.niche_key = p_niche_key)
      and (p_statuses is null or post.status = any(p_statuses))
      and (p_format_key is null or post.format_key = p_format_key)
      and (p_topic_key is null or post.topic_key = p_topic_key)
      and (p_scheduled_from is null or post.scheduled_at >= p_scheduled_from)
      and (p_scheduled_to is null or post.scheduled_at <= p_scheduled_to)
      and (p_created_from is null or post.created_at >= p_created_from)
      and (p_created_to is null or post.created_at <= p_created_to)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(post.content_payload ->> 'hook', ''))) > 0)
      and (
        p_cursor is null
        or post.updated_at < v_cursor_sort
        or (post.updated_at = v_cursor_sort and post.id < v_cursor_id)
      )
    order by post.updated_at desc, post.id desc
    offset p_limit - 1
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'items', v_items,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('posts', v_last_sort, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$$;

create function api.get_post(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_post_public_id uuid,
  p_include_sources boolean default true,
  p_include_checks boolean default true,
  p_include_latest_metrics boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_post record;
  v_fact_bindings jsonb;
  v_fact_warnings jsonb;
  v_latest_metrics jsonb;
  v_plan_item_public_id uuid;
  v_content_payload jsonb;
  v_approval jsonb;
begin
  if p_include_sources is null
    or p_include_checks is null
    or p_include_latest_metrics is null then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select post.*, page.public_id as page_public_id
  into v_post
  from public.posts as post
  join public.pages as page
    on page.workspace_id = post.workspace_id
    and page.id = post.page_id
  where post.workspace_id = v_workspace.workspace_id
    and post.public_id = p_post_public_id;

  if not found then
    perform internal.raise_read_error_v1('POST_NOT_FOUND');
  end if;

  select item.public_id
  into v_plan_item_public_id
  from public.content_plan_items as item
  where item.workspace_id = v_post.workspace_id
    and item.id = v_post.content_plan_item_id;

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'fact_public_id', fact.public_id,
      'position', usage.position,
      'fact_role', usage.fact_role,
      'rendered_text', usage.rendered_text,
      'allocation_state', usage.allocation_state,
      'source_snapshot', case
        when p_include_sources then internal.project_fact_source_snapshot_v1(usage.source_snapshot)
        else null
      end
    )) order by usage.position asc, usage.id asc
  ), '[]'::jsonb)
  into v_fact_bindings
  from public.trivia_post_facts as usage
  join public.trivia_facts as fact
    on fact.workspace_id = usage.workspace_id
    and fact.id = usage.fact_id
  where usage.workspace_id = v_post.workspace_id
    and usage.post_id = v_post.id;

  select coalesce(jsonb_agg(jsonb_build_object(
    'fact_public_id', fact.public_id,
    'code', case
      when fact.verification_status in ('invalidated', 'superseded') then 'FACT_CORRECTION_CURRENT'
      when fact.verification_status <> 'verified' then 'FACT_NOT_VERIFIED'
      when fact.expires_at is null or fact.expires_at <= clock_timestamp() then 'FACT_FRESHNESS_EXPIRED'
      else 'FACT_WARNING'
    end,
    'message', case
      when fact.verification_status in ('invalidated', 'superseded') then 'The current fact has a correction or successor warning.'
      when fact.verification_status <> 'verified' then 'The current fact is not verified.'
      else 'The current fact freshness window has expired.'
    end
  ) order by usage.position asc), '[]'::jsonb)
  into v_fact_warnings
  from public.trivia_post_facts as usage
  join public.trivia_facts as fact
    on fact.workspace_id = usage.workspace_id
    and fact.id = usage.fact_id
  where usage.workspace_id = v_post.workspace_id
    and usage.post_id = v_post.id
    and (
      fact.verification_status <> 'verified'
      or fact.expires_at is null
      or fact.expires_at <= clock_timestamp()
    );

  v_content_payload := jsonb_build_object(
    'schema_version', v_post.content_payload -> 'schema_version',
    'hook', v_post.content_payload -> 'hook',
    'body', v_post.content_payload -> 'body',
    'cta', v_post.content_payload -> 'cta',
    'canva_copy', v_post.content_payload -> 'canva_copy',
    'caption', v_post.content_payload -> 'caption',
    'hashtags', v_post.content_payload -> 'hashtags',
    'render_style', v_post.content_payload -> 'render_style',
    'text_metrics', v_post.content_payload -> 'text_metrics'
  );

  v_approval := case when v_post.approval_snapshot is null then null else jsonb_strip_nulls(jsonb_build_object(
    'status', 'approved',
    'revision', v_post.approval_snapshot -> 'revision',
    'content_hash', v_post.approval_snapshot -> 'content_hash',
    'approved_at', v_post.approval_snapshot -> 'approved_at'
  )) end;

  if p_include_latest_metrics then
    select internal.project_metric_snapshot_v1(
      metric.public_id,
      v_post.public_id,
      metric.captured_at,
      metric.views,
      metric.reach,
      metric.reactions,
      metric.likes,
      metric.comments,
      metric.shares,
      metric.saves,
      metric.follows,
      metric.watch_time_seconds,
      metric.average_watch_time_seconds,
      metric.metrics_payload,
      metric.created_at
    )
    into v_latest_metrics
    from public.post_metrics as metric
    where metric.workspace_id = v_post.workspace_id
      and metric.post_id = v_post.id
    order by metric.captured_at desc, metric.id desc
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'post', jsonb_build_object(
        'post_public_id', v_post.public_id,
        'page_public_id', v_post.page_public_id,
        'niche_key', v_post.niche_key,
        'status', v_post.status,
        'revision', v_post.revision,
        'content_hash', v_post.content_hash,
        'format_key', v_post.format_key,
        'topic_key', v_post.topic_key,
        'interaction_goal', v_post.interaction_goal,
        'scheduled_at', internal.iso_timestamp_v1(v_post.scheduled_at),
        'published_at', internal.iso_timestamp_v1(v_post.published_at),
        'content_payload', v_content_payload,
        'system_checks', internal.project_check_snapshot_v1(v_post.system_checks, p_include_checks),
        'editorial_checks', internal.project_check_snapshot_v1(v_post.editorial_checks, p_include_checks),
        'quality_status', v_post.quality_status,
        'fact_bindings', v_fact_bindings,
        'created_at', internal.iso_timestamp_v1(v_post.created_at),
        'updated_at', internal.iso_timestamp_v1(v_post.updated_at)
      ),
      'approval', v_approval,
      'plan_item_public_id', v_plan_item_public_id,
      'current_fact_warnings', v_fact_warnings,
      'latest_metrics', v_latest_metrics
    )
  );
end;
$$;

create function api.get_post_performance(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_post_public_id uuid,
  p_captured_from timestamptz default null,
  p_captured_to timestamptz default null,
  p_limit integer default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_post record;
  v_cursor record;
  v_cursor_sort timestamptz;
  v_cursor_id bigint;
  v_snapshots jsonb;
  v_deltas jsonb;
  v_latest_snapshot jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_sort text;
  v_last_id bigint;
  v_observed_from timestamptz;
  v_observed_to timestamptz;
begin
  if p_limit is null
    or p_limit not between 1 and 100
    or (p_captured_from is not null and p_captured_to is not null and p_captured_from > p_captured_to) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select post.*
  into v_post
  from public.posts as post
  where post.workspace_id = v_workspace.workspace_id
    and post.public_id = p_post_public_id;

  if not found then
    perform internal.raise_read_error_v1('POST_NOT_FOUND');
  end if;
  if v_post.status not in ('posted', 'archived') then
    perform internal.raise_read_error_v1('POST_NOT_PUBLISHED');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'metrics');
    begin
      v_cursor_sort := v_cursor.sort_value::timestamptz;
      v_cursor_id := v_cursor.tie_id;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  with ordered as (
    select
      metric.*,
      row_number() over (order by metric.captured_at desc, metric.id desc) as row_number
    from public.post_metrics as metric
    where metric.workspace_id = v_workspace.workspace_id
      and metric.post_id = v_post.id
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
      and (
        p_cursor is null
        or metric.captured_at < v_cursor_sort
        or (metric.captured_at = v_cursor_sort and metric.id < v_cursor_id)
      )
  )
  select
    coalesce(jsonb_agg(
      internal.project_metric_snapshot_v1(
        ordered.public_id,
        v_post.public_id,
        ordered.captured_at,
        ordered.views,
        ordered.reach,
        ordered.reactions,
        ordered.likes,
        ordered.comments,
        ordered.shares,
        ordered.saves,
        ordered.follows,
        ordered.watch_time_seconds,
        ordered.average_watch_time_seconds,
        ordered.metrics_payload,
        ordered.created_at
      ) order by ordered.captured_at desc, ordered.id desc
    ) filter (where ordered.row_number <= p_limit), '[]'::jsonb),
    count(*),
    min(ordered.captured_at) filter (where ordered.row_number <= p_limit),
    max(ordered.captured_at) filter (where ordered.row_number <= p_limit)
  into v_snapshots, v_total, v_observed_from, v_observed_to
  from ordered;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select internal.iso_timestamp_v1(metric.captured_at), metric.id
    into v_last_sort, v_last_id
    from public.post_metrics as metric
    where metric.workspace_id = v_workspace.workspace_id
      and metric.post_id = v_post.id
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
      and (
        p_cursor is null
        or metric.captured_at < v_cursor_sort
        or (metric.captured_at = v_cursor_sort and metric.id < v_cursor_id)
      )
    order by metric.captured_at desc, metric.id desc
    offset p_limit - 1
    limit 1;
  end if;

  select internal.project_metric_snapshot_v1(
    metric.public_id,
    v_post.public_id,
    metric.captured_at,
    metric.views,
    metric.reach,
    metric.reactions,
    metric.likes,
    metric.comments,
    metric.shares,
    metric.saves,
    metric.follows,
    metric.watch_time_seconds,
    metric.average_watch_time_seconds,
    metric.metrics_payload,
    metric.created_at
  )
  into v_latest_snapshot
  from public.post_metrics as metric
  where metric.workspace_id = v_workspace.workspace_id
    and metric.post_id = v_post.id
    and (p_captured_from is null or metric.captured_at >= p_captured_from)
    and (p_captured_to is null or metric.captured_at <= p_captured_to)
  order by metric.captured_at desc, metric.id desc
  limit 1;

  with ordered as (
    select
      metric.*,
      lag(metric.captured_at) over (order by metric.captured_at asc, metric.id asc) as previous_captured_at,
      lag(metric.views) over (order by metric.captured_at asc, metric.id asc) as previous_views,
      lag(metric.reach) over (order by metric.captured_at asc, metric.id asc) as previous_reach,
      lag(metric.reactions) over (order by metric.captured_at asc, metric.id asc) as previous_reactions,
      lag(metric.likes) over (order by metric.captured_at asc, metric.id asc) as previous_likes,
      lag(metric.comments) over (order by metric.captured_at asc, metric.id asc) as previous_comments,
      lag(metric.shares) over (order by metric.captured_at asc, metric.id asc) as previous_shares,
      lag(metric.saves) over (order by metric.captured_at asc, metric.id asc) as previous_saves,
      lag(metric.follows) over (order by metric.captured_at asc, metric.id asc) as previous_follows,
      lag(metric.watch_time_seconds) over (order by metric.captured_at asc, metric.id asc) as previous_watch_time_seconds,
      lag(metric.average_watch_time_seconds) over (order by metric.captured_at asc, metric.id asc) as previous_average_watch_time_seconds,
      lag(coalesce(metric.metrics_payload #>> '{source,metric_definition_version}', metric.metrics_payload ->> 'metric_definition_version', '1'))
        over (order by metric.captured_at asc, metric.id asc) as previous_definition_version,
      lag(coalesce(metric.metrics_payload #>> '{source,source_type}', metric.metrics_payload ->> 'source_type', ''))
        over (order by metric.captured_at asc, metric.id asc) as previous_source_type,
      coalesce(metric.metrics_payload #>> '{source,metric_definition_version}', metric.metrics_payload ->> 'metric_definition_version', '1') as definition_version,
      coalesce(metric.metrics_payload #>> '{source,source_type}', metric.metrics_payload ->> 'source_type', '') as source_type
    from public.post_metrics as metric
    where metric.workspace_id = v_workspace.workspace_id
      and metric.post_id = v_post.id
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
  ), compatible as (
    select
      ordered.*,
      row_number() over (order by ordered.captured_at desc, ordered.id desc) as delta_row_number
    from ordered
    where ordered.previous_captured_at is not null
      and ordered.definition_version = ordered.previous_definition_version
      and ordered.source_type = ordered.previous_source_type
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'from_captured_at', internal.iso_timestamp_v1(compatible.previous_captured_at),
      'to_captured_at', internal.iso_timestamp_v1(compatible.captured_at),
      'delta', jsonb_strip_nulls(jsonb_build_object(
        'views', case when compatible.views is not null and compatible.previous_views is not null then compatible.views - compatible.previous_views end,
        'reach', case when compatible.reach is not null and compatible.previous_reach is not null then compatible.reach - compatible.previous_reach end,
        'reactions', case when compatible.reactions is not null and compatible.previous_reactions is not null then compatible.reactions - compatible.previous_reactions end,
        'likes', case when compatible.likes is not null and compatible.previous_likes is not null then compatible.likes - compatible.previous_likes end,
        'comments', case when compatible.comments is not null and compatible.previous_comments is not null then compatible.comments - compatible.previous_comments end,
        'shares', case when compatible.shares is not null and compatible.previous_shares is not null then compatible.shares - compatible.previous_shares end,
        'saves', case when compatible.saves is not null and compatible.previous_saves is not null then compatible.saves - compatible.previous_saves end,
        'follows', case when compatible.follows is not null and compatible.previous_follows is not null then compatible.follows - compatible.previous_follows end,
        'watch_time_seconds', case when compatible.watch_time_seconds is not null and compatible.previous_watch_time_seconds is not null then compatible.watch_time_seconds - compatible.previous_watch_time_seconds end,
        'average_watch_time_seconds', case when compatible.average_watch_time_seconds is not null and compatible.previous_average_watch_time_seconds is not null then compatible.average_watch_time_seconds - compatible.previous_average_watch_time_seconds end
      )),
      'negative_delta', (
        (compatible.views is not null and compatible.previous_views is not null and compatible.views < compatible.previous_views)
        or (compatible.reach is not null and compatible.previous_reach is not null and compatible.reach < compatible.previous_reach)
        or (compatible.reactions is not null and compatible.previous_reactions is not null and compatible.reactions < compatible.previous_reactions)
        or (compatible.likes is not null and compatible.previous_likes is not null and compatible.likes < compatible.previous_likes)
        or (compatible.comments is not null and compatible.previous_comments is not null and compatible.comments < compatible.previous_comments)
        or (compatible.shares is not null and compatible.previous_shares is not null and compatible.shares < compatible.previous_shares)
        or (compatible.saves is not null and compatible.previous_saves is not null and compatible.saves < compatible.previous_saves)
        or (compatible.follows is not null and compatible.previous_follows is not null and compatible.follows < compatible.previous_follows)
      ),
      'caveat', 'Cumulative snapshots are not summed; a negative delta may reflect a platform correction.'
    ) order by compatible.captured_at desc
  ) filter (where compatible.delta_row_number <= p_limit), '[]'::jsonb)
  into v_deltas
  from compatible;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'post_public_id', v_post.public_id,
      'observation_period', jsonb_build_object(
        'from', internal.iso_timestamp_v1(v_observed_from),
        'to', internal.iso_timestamp_v1(v_observed_to)
      ),
      'metric_definition_version', 1,
      'snapshots', v_snapshots,
      'latest_snapshot', v_latest_snapshot,
      'compatible_deltas', v_deltas,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('metrics', v_last_sort, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$$;

create function api.get_performance_insights(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_page_public_id uuid,
  p_niche_key text,
  p_captured_from timestamptz default null,
  p_captured_to timestamptz default null,
  p_dimensions text[] default null,
  p_metric text default null,
  p_minimum_sample_size integer default 5,
  p_limit integer default 20
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_niche record;
  v_page record;
  v_config record;
  v_total_posts bigint;
  v_eligible_post_count bigint;
  v_excluded_post_count bigint;
  v_not_published_count bigint;
  v_no_snapshot_count bigint;
  v_missing_metric_count bigint;
  v_observed_from timestamptz;
  v_observed_to timestamptz;
  v_definition_version integer;
  v_definition_version_count bigint;
  v_groups jsonb;
begin
  if p_niche_key is null
    or p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$'
    or p_dimensions is null
    or cardinality(p_dimensions) not between 1 and 5
    or (select count(distinct dimension) from unnest(p_dimensions) as dimension) <> cardinality(p_dimensions)
    or exists (
      select 1 from unnest(p_dimensions) as dimension
      where dimension not in ('topic', 'format', 'interaction_goal', 'profile', 'fact_count', 'hook_pattern', 'cta_pattern')
    )
    or p_metric not in ('views', 'reach', 'reactions', 'likes', 'comments', 'shares', 'saves', 'follows', 'watch_time_seconds', 'average_watch_time_seconds')
    or p_minimum_sample_size is null
    or p_minimum_sample_size not between 1 and 100
    or p_limit is null
    or p_limit not between 1 and 50
    or (p_captured_from is not null and p_captured_to is not null and p_captured_from > p_captured_to) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'expensive_read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select niche.*
  into v_niche
  from public.niches as niche
  where niche.key = p_niche_key;
  if not found then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;
  if v_niche.status <> 'active' then
    perform internal.raise_read_error_v1('MODULE_DISABLED');
  end if;

  select page.*
  into v_page
  from public.pages as page
  where page.workspace_id = v_workspace.workspace_id
    and page.public_id = p_page_public_id;
  if not found then
    perform internal.raise_read_error_v1('PAGE_NOT_FOUND');
  end if;

  select config.*
  into v_config
  from public.page_niche_configs as config
  where config.workspace_id = v_workspace.workspace_id
    and config.page_id = v_page.id
    and config.niche_key = p_niche_key;
  if not found or not v_config.is_enabled then
    perform internal.raise_read_error_v1('MODULE_DISABLED');
  end if;
  if v_config.config_schema_version <> v_niche.config_schema_version
    or v_config.config_schema_version <> 1 then
    perform internal.raise_read_error_v1('CONFIG_SCHEMA_UNSUPPORTED');
  end if;

  select count(*)
  into v_total_posts
  from public.posts as post
  where post.workspace_id = v_workspace.workspace_id
    and post.page_id = v_page.id
    and post.niche_key = p_niche_key;

  select count(*)
  into v_not_published_count
  from public.posts as post
  where post.workspace_id = v_workspace.workspace_id
    and post.page_id = v_page.id
    and post.niche_key = p_niche_key
    and post.status not in ('posted', 'archived');

  with published_posts as (
    select post.id
    from public.posts as post
    where post.workspace_id = v_workspace.workspace_id
      and post.page_id = v_page.id
      and post.niche_key = p_niche_key
      and post.status in ('posted', 'archived')
  )
  select count(*)
  into v_no_snapshot_count
  from published_posts as post
  where not exists (
    select 1
    from public.post_metrics as metric
    where metric.workspace_id = v_workspace.workspace_id
      and metric.post_id = post.id
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
  );

  with latest as (
    select distinct on (metric.post_id)
      metric.post_id,
      metric.views,
      metric.reach,
      metric.reactions,
      metric.likes,
      metric.comments,
      metric.shares,
      metric.saves,
      metric.follows,
      metric.watch_time_seconds,
      metric.average_watch_time_seconds
    from public.post_metrics as metric
    join public.posts as post
      on post.id = metric.post_id
      and post.workspace_id = metric.workspace_id
      and post.page_id = metric.page_id
    where metric.workspace_id = v_workspace.workspace_id
      and metric.page_id = v_page.id
      and post.niche_key = p_niche_key
      and post.status in ('posted', 'archived')
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
    order by metric.post_id, metric.captured_at desc, metric.id desc
  )
  select count(*) filter (where case p_metric
      when 'views' then latest.views
      when 'reach' then latest.reach
      when 'reactions' then latest.reactions
      when 'likes' then latest.likes
      when 'comments' then latest.comments
      when 'shares' then latest.shares
      when 'saves' then latest.saves
      when 'follows' then latest.follows
      when 'watch_time_seconds' then latest.watch_time_seconds
      when 'average_watch_time_seconds' then latest.average_watch_time_seconds
    end is null),
    count(*)
  into v_missing_metric_count, v_eligible_post_count
  from latest;

  v_eligible_post_count := v_eligible_post_count - v_missing_metric_count;
  v_excluded_post_count := greatest(0, v_total_posts - v_eligible_post_count);

  with latest as (
    select distinct on (metric.post_id)
      metric.captured_at,
      metric.metrics_payload,
      case p_metric
        when 'views' then metric.views::numeric
        when 'reach' then metric.reach::numeric
        when 'reactions' then metric.reactions::numeric
        when 'likes' then metric.likes::numeric
        when 'comments' then metric.comments::numeric
        when 'shares' then metric.shares::numeric
        when 'saves' then metric.saves::numeric
        when 'follows' then metric.follows::numeric
        when 'watch_time_seconds' then metric.watch_time_seconds
        when 'average_watch_time_seconds' then metric.average_watch_time_seconds
      end as metric_value
    from public.post_metrics as metric
    join public.posts as post
      on post.id = metric.post_id
      and post.workspace_id = metric.workspace_id
      and post.page_id = metric.page_id
    where metric.workspace_id = v_workspace.workspace_id
      and metric.page_id = v_page.id
      and post.niche_key = p_niche_key
      and post.status in ('posted', 'archived')
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
    order by metric.post_id, metric.captured_at desc, metric.id desc
  )
  select
    min(case
      when coalesce(latest.metrics_payload #>> '{source,metric_definition_version}', latest.metrics_payload ->> 'metric_definition_version', '1') ~ '^[0-9]+$'
        then coalesce(latest.metrics_payload #>> '{source,metric_definition_version}', latest.metrics_payload ->> 'metric_definition_version', '1')::integer
      else 1
    end) filter (where latest.metric_value is not null),
    count(distinct coalesce(latest.metrics_payload #>> '{source,metric_definition_version}', latest.metrics_payload ->> 'metric_definition_version', '1')) filter (where latest.metric_value is not null),
    min(latest.captured_at) filter (where latest.metric_value is not null),
    max(latest.captured_at) filter (where latest.metric_value is not null)
  into v_definition_version, v_definition_version_count, v_observed_from, v_observed_to
  from latest;

  with latest as (
    select distinct on (metric.post_id)
      post.id as post_id,
      post.topic_key,
      post.format_key,
      post.interaction_goal,
      post.generation_snapshot,
      post.content_payload,
      post.published_at,
      metric.captured_at,
      metric.metrics_payload,
      case p_metric
        when 'views' then metric.views::numeric
        when 'reach' then metric.reach::numeric
        when 'reactions' then metric.reactions::numeric
        when 'likes' then metric.likes::numeric
        when 'comments' then metric.comments::numeric
        when 'shares' then metric.shares::numeric
        when 'saves' then metric.saves::numeric
        when 'follows' then metric.follows::numeric
        when 'watch_time_seconds' then metric.watch_time_seconds
        when 'average_watch_time_seconds' then metric.average_watch_time_seconds
      end as metric_value
    from public.post_metrics as metric
    join public.posts as post
      on post.id = metric.post_id
      and post.workspace_id = metric.workspace_id
      and post.page_id = metric.page_id
    where metric.workspace_id = v_workspace.workspace_id
      and metric.page_id = v_page.id
      and post.niche_key = p_niche_key
      and post.status in ('posted', 'archived')
      and (p_captured_from is null or metric.captured_at >= p_captured_from)
      and (p_captured_to is null or metric.captured_at <= p_captured_to)
    order by metric.post_id, metric.captured_at desc, metric.id desc
  ), eligible as (
    select
      latest.*,
      jsonb_strip_nulls(jsonb_build_object(
        'topic', case when 'topic' = any(p_dimensions) then latest.topic_key end,
        'format', case when 'format' = any(p_dimensions) then latest.format_key end,
        'interaction_goal', case when 'interaction_goal' = any(p_dimensions) then latest.interaction_goal end,
        'profile', case when 'profile' = any(p_dimensions) then latest.generation_snapshot ->> 'profile_key' end,
        'fact_count', case when 'fact_count' = any(p_dimensions)
          and latest.generation_snapshot ->> 'fact_count_applied' ~ '^[0-9]+$'
          then (latest.generation_snapshot ->> 'fact_count_applied')::integer end,
        'hook_pattern', case when 'hook_pattern' = any(p_dimensions) then case
          when lower(coalesce(latest.content_payload ->> 'hook', '')) like 'did you know%' then 'did_you_know'
          when position('?' in coalesce(latest.content_payload ->> 'hook', '')) > 0 then 'question'
          when position(' vs ' in lower(coalesce(latest.content_payload ->> 'hook', ''))) > 0 then 'comparison'
          when position('myth' in lower(coalesce(latest.content_payload ->> 'hook', ''))) > 0 then 'myth_vs_fact'
          else 'statement'
        end end,
        'cta_pattern', case when 'cta_pattern' = any(p_dimensions) then case
          when position('share' in lower(coalesce(latest.content_payload ->> 'cta', ''))) > 0 then 'share'
          when position('save' in lower(coalesce(latest.content_payload ->> 'cta', ''))) > 0 then 'save'
          when position('comment' in lower(coalesce(latest.content_payload ->> 'cta', ''))) > 0 then 'comment'
          when position('follow' in lower(coalesce(latest.content_payload ->> 'cta', ''))) > 0 then 'follow'
          else 'other'
        end end
      )) as dimension_values,
      greatest(0, extract(epoch from (latest.captured_at - latest.published_at)) / 86400.0) as age_days
    from latest
    where latest.metric_value is not null
  ), grouped as (
    select
      eligible.dimension_values,
      count(*)::integer as sample_size,
      min(eligible.captured_at) as observed_from,
      max(eligible.captured_at) as observed_to,
      percentile_cont(0.5) within group (order by eligible.metric_value) as median_value,
      avg(eligible.metric_value) as mean_value,
      min(eligible.metric_value) as min_value,
      max(eligible.metric_value) as max_value,
      min(eligible.age_days) as min_age_days,
      percentile_cont(0.5) within group (order by eligible.age_days) as median_age_days,
      max(eligible.age_days) as max_age_days
    from eligible
    group by eligible.dimension_values
  ), ranked as (
    select
      grouped.*,
      row_number() over (order by grouped.sample_size desc, grouped.dimension_values::text) as row_number
    from grouped
  )
  select coalesce(jsonb_agg(
    jsonb_build_object(
      'dimension_values', ranked.dimension_values,
      'sample_size', ranked.sample_size,
      'age_distribution', jsonb_build_object(
        'min_days', ranked.min_age_days,
        'median_days', ranked.median_age_days,
        'max_days', ranked.max_age_days
      ),
      'metric_summary', jsonb_build_object(
        'median', ranked.median_value,
        'mean', ranked.mean_value,
        'min', ranked.min_value,
        'max', ranked.max_value
      ),
      'observed_period', jsonb_build_object(
        'from', internal.iso_timestamp_v1(ranked.observed_from),
        'to', internal.iso_timestamp_v1(ranked.observed_to)
      ),
      'evidence_strength', case
        when ranked.sample_size < p_minimum_sample_size then 'insufficient'
        when ranked.sample_size >= greatest(10, p_minimum_sample_size * 2) then 'notable'
        else 'exploratory'
      end,
      'caveats', jsonb_build_array(
        'This is a descriptive observation, not a causal conclusion.',
        'Cumulative snapshots use the latest compatible observation per post and are not summed.',
        case when ranked.sample_size < p_minimum_sample_size
          then 'The requested minimum sample size was not met.'
          else 'Post age and observation period can affect comparisons.'
        end
      )
    ) order by ranked.sample_size desc, ranked.dimension_values::text
  ) filter (where ranked.row_number <= p_limit), '[]'::jsonb)
  into v_groups
  from ranked;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'scope', jsonb_build_object(
        'workspace_public_id', p_workspace_public_id,
        'page_public_id', p_page_public_id,
        'niche_key', p_niche_key
      ),
      'observation_period', jsonb_build_object(
        'requested_from', internal.iso_timestamp_v1(p_captured_from),
        'requested_to', internal.iso_timestamp_v1(p_captured_to),
        'observed_from', internal.iso_timestamp_v1(v_observed_from),
        'observed_to', internal.iso_timestamp_v1(v_observed_to)
      ),
      'metric_definition_version', case when v_definition_version_count = 1 then v_definition_version else null end,
      'eligible_post_count', v_eligible_post_count,
      'excluded_post_count', v_excluded_post_count,
      'excluded_reasons', jsonb_build_object(
        'not_published', v_not_published_count,
        'no_snapshot_in_period', v_no_snapshot_count,
        'missing_metric', v_missing_metric_count
      ),
      'groups', v_groups
    )
  );
end;
$$;

-- The config validator is private but is needed by the SECURITY DEFINER
-- generation-context projection.  It is executable only by the API-owner
-- role, never by a Data API caller.
grant execute on function internal.has_exact_json_keys(jsonb, text[])
  to content_producer_api_owner;
grant execute on function internal.is_allowed_text_array(jsonb, text[], integer)
  to content_producer_api_owner;
grant execute on function internal.is_json_integer_between(jsonb, integer, integer)
  to content_producer_api_owner;
grant execute on function internal.json_integer_value(jsonb)
  to content_producer_api_owner;
grant execute on function internal.is_valid_trivia_config_v1(jsonb)
  to content_producer_api_owner;

-- API function ownership and grants are applied after every function definition.

-- deferred until all API functions are defined

-- deferred until all API functions are defined

-- API-owner CREATE is revoked by the final privilege block below.

create function api.get_page_generation_context(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_page_public_id uuid,
  p_niche_key text,
  p_recent_post_limit integer default 12,
  p_intent_topic_key text default null,
  p_intent_format_key text default null,
  p_intent_interaction_goal text default null,
  p_intent_scheduled_at timestamptz default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_niche record;
  v_page record;
  v_recent_variety jsonb;
  v_performance_signals jsonb;
  v_enabled_niches jsonb;
  v_eligible_fact_count bigint;
begin
  if p_niche_key is null
    or p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$'
    or p_recent_post_limit is null
    or p_recent_post_limit not between 1 and 30
    or (p_intent_topic_key is not null and p_intent_topic_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_intent_format_key is not null and p_intent_format_key !~ '^[a-z][a-z0-9_]{1,79}$')
    or (p_intent_interaction_goal is not null and p_intent_interaction_goal not in ('share', 'save', 'comment', 'follow')) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select niche.*
  into v_niche
  from public.niches as niche
  where niche.key = p_niche_key;

  if not found then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;
  if v_niche.status <> 'active' then
    perform internal.raise_read_error_v1('MODULE_DISABLED');
  end if;

  select
    page.*,
    config.public_id as config_public_id,
    config.config_schema_version,
    config.config,
    config.is_enabled as config_is_enabled,
    config.is_default as config_is_default,
    config.created_at as config_created_at,
    config.updated_at as config_updated_at
  into v_page
  from public.pages as page
  join public.page_niche_configs as config
    on config.workspace_id = page.workspace_id
    and config.page_id = page.id
    and config.niche_key = p_niche_key
  where page.workspace_id = v_workspace.workspace_id
    and page.public_id = p_page_public_id;

  if not found or not v_page.is_active then
    perform internal.raise_read_error_v1('PAGE_NOT_FOUND');
  end if;
  if not v_page.config_is_enabled then
    perform internal.raise_read_error_v1('MODULE_DISABLED');
  end if;
  if v_page.config_schema_version <> v_niche.config_schema_version
    or v_page.config_schema_version <> 1
    or not internal.is_valid_trivia_config_v1(v_page.config) then
    perform internal.raise_read_error_v1('CONFIG_SCHEMA_UNSUPPORTED');
  end if;

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'niche_key', config.niche_key,
      'is_enabled', config.is_enabled,
      'is_default', config.is_default,
      'config_schema_version', config.config_schema_version,
      'updated_at', internal.iso_timestamp_v1(config.updated_at)
    ) order by config.niche_key
  ), '[]'::jsonb)
  into v_enabled_niches
  from public.page_niche_configs as config
  where config.workspace_id = v_page.workspace_id
    and config.page_id = v_page.id;

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'post_public_id', recent.public_id,
      'status', recent.status,
      'topic_key', recent.topic_key,
      'format_key', recent.format_key,
      'interaction_goal', recent.interaction_goal,
      'hook', left(recent.content_payload ->> 'hook', 120),
      'cta', left(recent.content_payload ->> 'cta', 120),
      'scheduled_at', internal.iso_timestamp_v1(recent.scheduled_at),
      'updated_at', internal.iso_timestamp_v1(recent.updated_at)
    )) order by recent.updated_at desc, recent.id desc
  ), '[]'::jsonb)
  into v_recent_variety
  from (
    select post.*
    from public.posts as post
    where post.workspace_id = v_page.workspace_id
      and post.page_id = v_page.id
      and post.niche_key = p_niche_key
      and post.status <> 'discarded'
      and (p_intent_topic_key is null or post.topic_key = p_intent_topic_key)
      and (p_intent_format_key is null or post.format_key = p_intent_format_key)
      and (p_intent_interaction_goal is null or post.interaction_goal = p_intent_interaction_goal)
    order by post.updated_at desc, post.id desc
    limit p_recent_post_limit
  ) as recent;

  select coalesce(jsonb_agg(
    jsonb_strip_nulls(jsonb_build_object(
      'format_key', signal.format_key,
      'sample_size', signal.sample_size,
      'observed_from', internal.iso_timestamp_v1(signal.observed_from),
      'observed_to', internal.iso_timestamp_v1(signal.observed_to),
      'median_views', signal.median_views,
      'caveats', jsonb_build_array(
        'Descriptive latest-snapshot signal only; it is not a causal conclusion.',
        'Cumulative observations are not summed.'
      )
    )) order by signal.sample_size desc, signal.format_key
  ), '[]'::jsonb)
  into v_performance_signals
  from (
    with latest as (
      select distinct on (metric.post_id)
        post.format_key,
        metric.captured_at,
        metric.views
      from public.post_metrics as metric
      join public.posts as post
        on post.id = metric.post_id
        and post.workspace_id = metric.workspace_id
        and post.page_id = metric.page_id
      where metric.workspace_id = v_page.workspace_id
        and metric.page_id = v_page.id
        and post.niche_key = p_niche_key
        and post.status in ('posted', 'archived')
      order by metric.post_id, metric.captured_at desc, metric.id desc
    )
    select
      latest.format_key,
      count(*) filter (where latest.views is not null)::integer as sample_size,
      min(latest.captured_at) as observed_from,
      max(latest.captured_at) as observed_to,
      percentile_cont(0.5) within group (order by latest.views)
        filter (where latest.views is not null) as median_views
    from latest
    group by latest.format_key
    having count(*) filter (where latest.views is not null) > 0
  ) as signal;

  select count(*)
  into v_eligible_fact_count
  from public.trivia_facts as fact
  where fact.workspace_id = v_page.workspace_id
    and fact.verification_status = 'verified'
    and fact.expires_at > clock_timestamp()
    and fact.reservation_status = 'available'
    and not exists (
      select 1
      from public.trivia_post_facts as usage
      where usage.workspace_id = fact.workspace_id
        and usage.fact_id = fact.id
        and usage.allocation_state in ('allocated', 'published')
        and (
          v_page.config ->> 'fact_reuse_scope' = 'workspace_unique'
          or usage.page_id = v_page.id
        )
    );

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'page', jsonb_build_object(
        'page_public_id', v_page.public_id,
        'name', left(v_page.name, 120),
        'slug', v_page.slug,
        'timezone', v_page.timezone,
        'target_markets', to_jsonb(v_page.target_markets),
        'is_active', v_page.is_active,
        'enabled_niches', v_enabled_niches,
        'created_at', internal.iso_timestamp_v1(v_page.created_at),
        'updated_at', internal.iso_timestamp_v1(v_page.updated_at)
      ),
      'module', jsonb_build_object(
        'niche_key', v_niche.key,
        'display_name', left(v_niche.name, 120),
        'module_version', v_niche.module_version,
        'status', 'active',
        'config_schema_version', v_niche.config_schema_version,
        'content_schema_versions', jsonb_build_array(v_niche.content_schema_version),
        'capabilities', jsonb_build_array(
          'project_generation_context',
          'validate_content_payload',
          'render_content',
          'find_similar_items',
          'register_and_reserve_items',
          'release_items',
          'reverify_sources',
          'correct_items',
          'project_performance_dimensions'
        )
      ),
      'config', v_page.config,
      'generation_rules', jsonb_build_object(
        'allowed_topics', v_page.config -> 'allowed_topics',
        'allowed_formats', v_page.config -> 'allowed_formats',
        'allowed_profiles', jsonb_build_array('fast_trivia', 'practical_utility'),
        'allowed_interaction_goals', v_page.config -> 'allowed_interaction_goals',
        'fact_count', v_page.config -> 'fact_count',
        'profiles', v_page.config -> 'profiles',
        'text_budget', v_page.config -> 'text_budget',
        'locale', v_page.locale,
        'english_variant', v_page.config #>> '{style,english_variant}',
        'render_style', v_page.config -> 'render_style'
      ),
      'reuse_policy', jsonb_build_object(
        'scope', v_page.config ->> 'fact_reuse_scope',
        'reservation_ttl_minutes', coalesce(
          ((select workspace.settings from public.workspaces as workspace where workspace.id = v_workspace.workspace_id) ->> 'reservation_ttl_minutes')::integer,
          30
        ),
        'requires_verified_facts', true,
        'eligible_fact_count', v_eligible_fact_count
      ),
      'recent_variety', v_recent_variety,
      'performance_signals', v_performance_signals,
      'context_version', jsonb_build_object(
        'page_updated_at', internal.iso_timestamp_v1(v_page.updated_at),
        'config_updated_at', internal.iso_timestamp_v1(v_page.config_updated_at)
      )
    )
  );
end;
$$;

create function api.list_content_plans(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_page_public_id uuid default null,
  p_niche_key text default null,
  p_query text default null,
  p_statuses text[] default null,
  p_created_from timestamptz default null,
  p_created_to timestamptz default null,
  p_limit integer default 20,
  p_cursor text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_cursor record;
  v_cursor_sort timestamptz;
  v_cursor_id bigint;
  v_items jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_sort text;
  v_last_id bigint;
begin
  if p_limit is null
    or p_limit not between 1 and 50
    or (p_query is not null and (
      nullif(btrim(p_query), '') is null or char_length(btrim(p_query)) > 120
    ))
    or (p_niche_key is not null and p_niche_key !~ '^[a-z][a-z0-9_]{1,49}$')
    or (p_created_from is not null and p_created_to is not null and p_created_from > p_created_to)
    or (p_statuses is not null and (
      cardinality(p_statuses) = 0
      or exists (
        select 1 from unnest(p_statuses) as requested_status
        where requested_status not in ('pending', 'in_progress', 'partially_completed', 'completed', 'failed', 'cancelled')
      )
    )) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  if p_niche_key is not null
    and not exists (select 1 from public.niches where key = p_niche_key) then
    perform internal.raise_read_error_v1('MODULE_NOT_FOUND');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'plans');
    begin
      v_cursor_sort := v_cursor.sort_value::timestamptz;
      v_cursor_id := v_cursor.tie_id;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  with ordered as (
    select
      plan.*,
      row_number() over (order by plan.updated_at desc, plan.id desc) as row_number
    from public.content_plans as plan
    where plan.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = plan.page_id
          and page.workspace_id = plan.workspace_id
          and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or plan.niche_key = p_niche_key)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(plan.name, ''))) > 0)
      and (p_statuses is null or plan.status = any(p_statuses))
      and (p_created_from is null or plan.created_at >= p_created_from)
      and (p_created_to is null or plan.created_at <= p_created_to)
      and (
        p_cursor is null
        or plan.updated_at < v_cursor_sort
        or (plan.updated_at = v_cursor_sort and plan.id < v_cursor_id)
      )
  ), projected as (
    select
      ordered.*,
      jsonb_build_object(
        'plan_public_id', ordered.public_id,
        'name', case when ordered.name is null then null else left(ordered.name, 120) end,
        'page_public_id', page.public_id,
        'niche_key', ordered.niche_key,
        'status', ordered.status,
        'requested_count', ordered.requested_count,
        'progress', jsonb_build_object(
          'pending', (select count(*) from public.content_plan_items as item where item.plan_id = ordered.id and item.status = 'pending'),
          'in_progress', (select count(*) from public.content_plan_items as item where item.plan_id = ordered.id and item.status = 'in_progress'),
          'completed', (select count(*) from public.content_plan_items as item where item.plan_id = ordered.id and item.status = 'completed'),
          'failed', (select count(*) from public.content_plan_items as item where item.plan_id = ordered.id and item.status = 'failed'),
          'cancelled', (select count(*) from public.content_plan_items as item where item.plan_id = ordered.id and item.status = 'cancelled')
        ),
        'created_at', internal.iso_timestamp_v1(ordered.created_at),
        'updated_at', internal.iso_timestamp_v1(ordered.updated_at)
      ) as item
    from ordered
    join public.pages as page
      on page.workspace_id = ordered.workspace_id
      and page.id = ordered.page_id
  )
  select
    coalesce(jsonb_agg(projected.item order by projected.updated_at desc, projected.id desc)
      filter (where projected.row_number <= p_limit), '[]'::jsonb),
    count(*)
  into v_items, v_total
  from projected;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select internal.iso_timestamp_v1(plan.updated_at), plan.id
    into v_last_sort, v_last_id
    from public.content_plans as plan
    where plan.workspace_id = v_workspace.workspace_id
      and (p_page_public_id is null or exists (
        select 1 from public.pages as page
        where page.id = plan.page_id and page.workspace_id = plan.workspace_id and page.public_id = p_page_public_id
      ))
      and (p_niche_key is null or plan.niche_key = p_niche_key)
      and (p_query is null or position(lower(btrim(p_query)) in lower(coalesce(plan.name, ''))) > 0)
      and (p_statuses is null or plan.status = any(p_statuses))
      and (p_created_from is null or plan.created_at >= p_created_from)
      and (p_created_to is null or plan.created_at <= p_created_to)
      and (
        p_cursor is null
        or plan.updated_at < v_cursor_sort
        or (plan.updated_at = v_cursor_sort and plan.id < v_cursor_id)
      )
    order by plan.updated_at desc, plan.id desc
    offset p_limit - 1
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'items', v_items,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('plans', v_last_sort, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$$;

create function api.get_content_plan(
  p_request_schema_version integer,
  p_workspace_public_id uuid,
  p_plan_public_id uuid,
  p_item_statuses text[] default null,
  p_limit integer default 50,
  p_cursor text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_context record;
  v_workspace record;
  v_plan record;
  v_cursor record;
  v_cursor_position integer;
  v_cursor_id bigint;
  v_items jsonb;
  v_total bigint;
  v_has_more boolean;
  v_last_position text;
  v_last_id bigint;
  v_plan_summary jsonb;
begin
  if p_limit is null
    or p_limit not between 1 and 100
    or (p_item_statuses is not null and (
      cardinality(p_item_statuses) = 0
      or exists (
        select 1 from unnest(p_item_statuses) as requested_status
        where requested_status not in ('pending', 'in_progress', 'completed', 'failed', 'cancelled')
      )
    )) then
    perform internal.raise_read_error_v1('VALIDATION_FAILED');
  end if;

  select * into v_context
  from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace
  from internal.resolve_workspace_owner_v1(p_workspace_public_id);

  select plan.*, page.public_id as page_public_id
  into v_plan
  from public.content_plans as plan
  join public.pages as page
    on page.workspace_id = plan.workspace_id
    and page.id = plan.page_id
  where plan.workspace_id = v_workspace.workspace_id
    and plan.public_id = p_plan_public_id;

  if not found then
    perform internal.raise_read_error_v1('PLAN_NOT_FOUND');
  end if;

  if p_cursor is not null then
    select * into v_cursor
    from internal.decode_read_cursor_v1(p_cursor, 'plan_items');
    begin
      v_cursor_position := v_cursor.sort_value::integer;
      v_cursor_id := v_cursor.tie_id;
      if v_cursor_position < 1 then
        perform internal.raise_read_error_v1('VALIDATION_FAILED');
      end if;
    exception when others then
      perform internal.raise_read_error_v1('VALIDATION_FAILED');
    end;
  end if;

  select jsonb_build_object(
    'plan_public_id', v_plan.public_id,
    'name', case when v_plan.name is null then null else left(v_plan.name, 120) end,
    'page_public_id', v_plan.page_public_id,
    'niche_key', v_plan.niche_key,
    'status', v_plan.status,
    'requested_count', v_plan.requested_count,
    'progress', jsonb_build_object(
      'pending', (select count(*) from public.content_plan_items as item where item.plan_id = v_plan.id and item.status = 'pending'),
      'in_progress', (select count(*) from public.content_plan_items as item where item.plan_id = v_plan.id and item.status = 'in_progress'),
      'completed', (select count(*) from public.content_plan_items as item where item.plan_id = v_plan.id and item.status = 'completed'),
      'failed', (select count(*) from public.content_plan_items as item where item.plan_id = v_plan.id and item.status = 'failed'),
      'cancelled', (select count(*) from public.content_plan_items as item where item.plan_id = v_plan.id and item.status = 'cancelled')
    ),
    'created_at', internal.iso_timestamp_v1(v_plan.created_at),
    'updated_at', internal.iso_timestamp_v1(v_plan.updated_at)
  ) into v_plan_summary;

  with ordered as (
    select
      item.*,
      row_number() over (order by item.position asc, item.id asc) as row_number
    from public.content_plan_items as item
    where item.workspace_id = v_workspace.workspace_id
      and item.plan_id = v_plan.id
      and (p_item_statuses is null or item.status = any(p_item_statuses))
      and (
        p_cursor is null
        or item.position > v_cursor_position
        or (item.position = v_cursor_position and item.id > v_cursor_id)
      )
  ), projected as (
    select
      ordered.*,
      (
        select post.public_id
        from public.posts as post
        where post.workspace_id = ordered.workspace_id
          and post.content_plan_item_id = ordered.id
          and post.status <> 'discarded'
        order by post.updated_at desc, post.id desc
        limit 1
      ) as active_post_public_id
    from ordered
  )
  select
    coalesce(jsonb_agg(
      jsonb_build_object(
        'plan_item_public_id', projected.public_id,
        'plan_public_id', v_plan.public_id,
        'position', projected.position,
        'status', projected.status,
        'scheduled_at', internal.iso_timestamp_v1(projected.scheduled_at),
        'topic_key', projected.topic_key,
        'format_key', projected.format_key,
        'interaction_goal', projected.interaction_goal,
        'item_config', projected.item_config,
        'attempt_count', projected.attempt_count,
        'claim_expires_at', null,
        'active_post_public_id', projected.active_post_public_id,
        'last_error', case when projected.last_error_code is null then null else jsonb_build_object(
          'code', left(projected.last_error_code, 80),
          'detail', left(coalesce(projected.last_error_detail, ''), 500)
        ) end,
        'created_at', internal.iso_timestamp_v1(projected.created_at),
        'updated_at', internal.iso_timestamp_v1(projected.updated_at)
      ) order by projected.position asc, projected.id asc
    ) filter (where projected.row_number <= p_limit), '[]'::jsonb),
    count(*)
  into v_items, v_total
  from projected;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select ordered.position::text, ordered.id
    into v_last_position, v_last_id
    from public.content_plan_items as ordered
    where ordered.workspace_id = v_workspace.workspace_id
      and ordered.plan_id = v_plan.id
      and (p_item_statuses is null or ordered.status = any(p_item_statuses))
      and (
        p_cursor is null
        or ordered.position > v_cursor_position
        or (ordered.position = v_cursor_position and ordered.id > v_cursor_id)
      )
    order by ordered.position asc, ordered.id asc
    offset p_limit - 1
    limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'plan', v_plan_summary,
      'items', v_items,
      'next_cursor', case when v_has_more
        then internal.encode_read_cursor_v1('plan_items', v_last_position, v_last_id)
        else null
      end,
      'has_more', v_has_more
    )
  );
end;
$$;

-- Apply ownership and caller grants only after every public API function exists.
grant create on schema api to content_producer_api_owner;

alter function api.get_account_profile(integer) owner to content_producer_api_owner;
alter function api.get_workspace_context(integer, uuid) owner to content_producer_api_owner;
alter function api.list_pages(integer, uuid, text, boolean, text, integer, text) owner to content_producer_api_owner;
alter function api.get_page_generation_context(integer, uuid, uuid, text, integer, text, text, text, timestamptz) owner to content_producer_api_owner;
alter function api.list_content_plans(integer, uuid, uuid, text, text, text[], timestamptz, timestamptz, integer, text) owner to content_producer_api_owner;
alter function api.get_content_plan(integer, uuid, uuid, text[], integer, text) owner to content_producer_api_owner;
alter function api.list_posts(integer, uuid, uuid, text, text[], text, text, timestamptz, timestamptz, timestamptz, timestamptz, text, integer, text) owner to content_producer_api_owner;
alter function api.get_post(integer, uuid, uuid, boolean, boolean, boolean) owner to content_producer_api_owner;
alter function api.get_post_performance(integer, uuid, uuid, timestamptz, timestamptz, integer, text) owner to content_producer_api_owner;
alter function api.get_performance_insights(integer, uuid, uuid, text, timestamptz, timestamptz, text[], text, integer, integer) owner to content_producer_api_owner;

revoke all on function api.get_account_profile(integer) from public, anon, service_role;
revoke all on function api.get_workspace_context(integer, uuid) from public, anon, service_role;
revoke all on function api.list_pages(integer, uuid, text, boolean, text, integer, text) from public, anon, service_role;
revoke all on function api.get_page_generation_context(integer, uuid, uuid, text, integer, text, text, text, timestamptz) from public, anon, service_role;
revoke all on function api.list_content_plans(integer, uuid, uuid, text, text, text[], timestamptz, timestamptz, integer, text) from public, anon, service_role;
revoke all on function api.get_content_plan(integer, uuid, uuid, text[], integer, text) from public, anon, service_role;
revoke all on function api.list_posts(integer, uuid, uuid, text, text[], text, text, timestamptz, timestamptz, timestamptz, timestamptz, text, integer, text) from public, anon, service_role;
revoke all on function api.get_post(integer, uuid, uuid, boolean, boolean, boolean) from public, anon, service_role;
revoke all on function api.get_post_performance(integer, uuid, uuid, timestamptz, timestamptz, integer, text) from public, anon, service_role;
revoke all on function api.get_performance_insights(integer, uuid, uuid, text, timestamptz, timestamptz, text[], text, integer, integer) from public, anon, service_role;

grant execute on function api.get_account_profile(integer) to authenticated;
grant execute on function api.get_workspace_context(integer, uuid) to authenticated;
grant execute on function api.list_pages(integer, uuid, text, boolean, text, integer, text) to authenticated;
grant execute on function api.get_page_generation_context(integer, uuid, uuid, text, integer, text, text, text, timestamptz) to authenticated;
grant execute on function api.list_content_plans(integer, uuid, uuid, text, text, text[], timestamptz, timestamptz, integer, text) to authenticated;
grant execute on function api.get_content_plan(integer, uuid, uuid, text[], integer, text) to authenticated;
grant execute on function api.list_posts(integer, uuid, uuid, text, text[], text, text, timestamptz, timestamptz, timestamptz, timestamptz, text, integer, text) to authenticated;
grant execute on function api.get_post(integer, uuid, uuid, boolean, boolean, boolean) to authenticated;
grant execute on function api.get_post_performance(integer, uuid, uuid, timestamptz, timestamptz, integer, text) to authenticated;
grant execute on function api.get_performance_insights(integer, uuid, uuid, text, timestamptz, timestamptz, text[], text, integer, integer) to authenticated;

revoke create on schema api from content_producer_api_owner;
revoke all on all functions in schema api from public, anon, service_role;
