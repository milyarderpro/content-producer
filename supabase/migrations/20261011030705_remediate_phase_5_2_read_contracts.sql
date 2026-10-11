-- Phase 5.2 remediation: cursors may contain only public identifiers.  The
-- API still receives the private tie-breaker internally after the helper maps
-- the public identifier through owner-scoped RLS.
create or replace function internal.encode_read_cursor_v1(
  p_kind text,
  p_sort_value text,
  p_tie_id bigint
)
returns text
language plpgsql
stable
strict
security invoker
set search_path = ''
as $$
declare
  v_tie_public_id uuid;
begin
  if p_kind !~ '^[a-z][a-z0-9_]{1,31}$'
    or nullif(btrim(p_sort_value), '') is null
    or char_length(p_sort_value) > 80
    or p_tie_id <= 0 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end if;

  case p_kind
    when 'pages' then
      select public_id into v_tie_public_id from public.pages where id = p_tie_id;
    when 'plans' then
      select public_id into v_tie_public_id from public.content_plans where id = p_tie_id;
    when 'posts' then
      select public_id into v_tie_public_id from public.posts where id = p_tie_id;
    when 'plan_items' then
      select public_id into v_tie_public_id from public.content_plan_items where id = p_tie_id;
    when 'metrics' then
      select public_id into v_tie_public_id from public.post_metrics where id = p_tie_id;
    else
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end case;

  if v_tie_public_id is null then
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
            'tie_public_id', v_tie_public_id
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

create or replace function internal.decode_read_cursor_v1(
  p_cursor text,
  p_expected_kind text
)
returns table(sort_value text, tie_id bigint)
language plpgsql
stable
strict
security invoker
set search_path = ''
as $$
declare
  v_payload jsonb;
  v_decoded text;
  v_tie_public_id uuid;
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
      or jsonb_typeof(v_payload -> 'tie_public_id') <> 'string'
      or (v_payload ->> 'tie_public_id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    v_tie_public_id := (v_payload ->> 'tie_public_id')::uuid;

    case p_expected_kind
      when 'pages' then
        select id into tie_id from public.pages where public_id = v_tie_public_id;
      when 'plans' then
        select id into tie_id from public.content_plans where public_id = v_tie_public_id;
      when 'posts' then
        select id into tie_id from public.posts where public_id = v_tie_public_id;
      when 'plan_items' then
        select id into tie_id from public.content_plan_items where public_id = v_tie_public_id;
      when 'metrics' then
        select id into tie_id from public.post_metrics where public_id = v_tie_public_id;
      else
        raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end case;
    if tie_id is null then
      raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
    end if;
    sort_value := v_payload ->> 'sort';
  exception when others then
    raise exception using errcode = 'P0001', message = 'VALIDATION_FAILED';
  end;
  return next;
end;
$$;

create or replace function internal.project_check_snapshot_v1(
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
  v_entries jsonb;
begin
  if not p_include or p_snapshot is null then return null; end if;
  if p_snapshot = '{}'::jsonb then return '{}'::jsonb; end if;

  if jsonb_typeof(p_snapshot -> 'criteria') = 'array' then
    select coalesce(jsonb_agg(
      value - array['internal_id', 'actor_user_id', 'operation_id', 'sqlstate', 'stack_trace', 'secret', 'access_token', 'refresh_token']
      order by ordinal
    ), '[]'::jsonb)
    into v_entries
    from jsonb_array_elements(p_snapshot -> 'criteria') with ordinality as criterion(value, ordinal);

    return jsonb_strip_nulls(jsonb_build_object(
      'schema_version', p_snapshot -> 'schema_version',
      'rubric_version', p_snapshot -> 'rubric_version',
      'evaluated_at', p_snapshot -> 'evaluated_at',
      'evaluator', p_snapshot -> 'evaluator',
      'evaluator_label', p_snapshot -> 'evaluator_label',
      'post_revision', p_snapshot -> 'post_revision',
      'content_hash', p_snapshot -> 'content_hash',
      'overall_status', p_snapshot -> 'overall_status',
      'criteria', v_entries,
      'risk_flags', case when jsonb_typeof(p_snapshot -> 'risk_flags') = 'array' then p_snapshot -> 'risk_flags' else '[]'::jsonb end
    ));
  end if;

  select coalesce(jsonb_agg(
    value - array['internal_id', 'actor_user_id', 'operation_id', 'sqlstate', 'stack_trace', 'raw_source_document', 'reservation_token', 'claim_token', 'secret', 'access_token', 'refresh_token']
    order by ordinal
  ), '[]'::jsonb)
  into v_entries
  from jsonb_array_elements(case when jsonb_typeof(p_snapshot -> 'checks') = 'array' then p_snapshot -> 'checks' else '[]'::jsonb end)
    with ordinality as check_item(value, ordinal);

  return jsonb_strip_nulls(jsonb_build_object(
    'schema_version', p_snapshot -> 'schema_version',
    'content_hash', p_snapshot -> 'content_hash',
    'overall_status', p_snapshot -> 'overall_status',
    'checks', v_entries
  ));
end;
$$;

alter function internal.encode_read_cursor_v1(text, text, bigint) owner to content_producer_api_owner;
alter function internal.decode_read_cursor_v1(text, text) owner to content_producer_api_owner;
alter function internal.project_check_snapshot_v1(jsonb, boolean) owner to content_producer_api_owner;
revoke all on function internal.encode_read_cursor_v1(text, text, bigint) from public, anon, authenticated, service_role;
revoke all on function internal.decode_read_cursor_v1(text, text) from public, anon, authenticated, service_role;
revoke all on function internal.project_check_snapshot_v1(jsonb, boolean) from public, anon, authenticated, service_role;

create or replace function api.get_content_plan(
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

  select * into v_context from internal.begin_read_v1(p_request_schema_version, 'read');
  select * into v_workspace from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  select plan.*, page.public_id as page_public_id
  into v_plan
  from public.content_plans as plan
  join public.pages as page on page.workspace_id = plan.workspace_id and page.id = plan.page_id
  where plan.workspace_id = v_workspace.workspace_id and plan.public_id = p_plan_public_id;
  if not found then perform internal.raise_read_error_v1('PLAN_NOT_FOUND'); end if;

  if p_cursor is not null then
    select * into v_cursor from internal.decode_read_cursor_v1(p_cursor, 'plan_items');
    begin
      v_cursor_position := v_cursor.sort_value::integer;
      v_cursor_id := v_cursor.tie_id;
      if v_cursor_position < 1 then perform internal.raise_read_error_v1('VALIDATION_FAILED'); end if;
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
    select item.*, row_number() over (order by item.position asc, item.id asc) as row_number
    from public.content_plan_items as item
    where item.workspace_id = v_workspace.workspace_id
      and item.plan_id = v_plan.id
      and (p_item_statuses is null or item.status = any(p_item_statuses))
      and (p_cursor is null or item.position > v_cursor_position or (item.position = v_cursor_position and item.id > v_cursor_id))
  ), projected as (
    select ordered.*, (
      select post.public_id
      from public.posts as post
      where post.workspace_id = ordered.workspace_id and post.content_plan_item_id = ordered.id and post.status <> 'discarded'
      order by post.updated_at desc, post.id desc
      limit 1
    ) as active_post_public_id
    from ordered
  )
  select coalesce(jsonb_agg(
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
      'claim_expires_at', internal.iso_timestamp_v1(projected.claim_expires_at),
      'active_post_public_id', projected.active_post_public_id,
      'last_error', case when projected.last_error_code is null then null else jsonb_build_object(
        'code', left(projected.last_error_code, 80),
        'detail', left(coalesce(projected.last_error_detail, ''), 500)
      ) end,
      'created_at', internal.iso_timestamp_v1(projected.created_at),
      'updated_at', internal.iso_timestamp_v1(projected.updated_at)
    ) order by projected.position asc, projected.id asc
  ) filter (where projected.row_number <= p_limit), '[]'::jsonb), count(*)
  into v_items, v_total
  from projected;

  v_has_more := v_total > p_limit;
  if v_has_more then
    select ordered.position::text, ordered.id into v_last_position, v_last_id
    from public.content_plan_items as ordered
    where ordered.workspace_id = v_workspace.workspace_id
      and ordered.plan_id = v_plan.id
      and (p_item_statuses is null or ordered.status = any(p_item_statuses))
      and (p_cursor is null or ordered.position > v_cursor_position or (ordered.position = v_cursor_position and ordered.id > v_cursor_id))
    order by ordered.position asc, ordered.id asc
    offset p_limit - 1 limit 1;
  end if;

  return jsonb_build_object(
    'response_schema_version', 1,
    'data', jsonb_build_object(
      'plan', v_plan_summary,
      'items', v_items,
      'next_cursor', case when v_has_more then internal.encode_read_cursor_v1('plan_items', v_last_position, v_last_id) else null end,
      'has_more', v_has_more
    )
  );
end;
$$;

alter function api.get_content_plan(integer, uuid, uuid, text[], integer, text) owner to content_producer_api_owner;
revoke all on function api.get_content_plan(integer, uuid, uuid, text[], integer, text) from public, anon, service_role;
grant execute on function api.get_content_plan(integer, uuid, uuid, text[], integer, text) to authenticated;
