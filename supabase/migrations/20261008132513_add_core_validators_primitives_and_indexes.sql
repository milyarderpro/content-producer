-- Phase 3, migration group 6: deterministic validators, private primitives,
-- generic triggers, and final foreign-key/query indexes.

create function internal.has_exact_json_keys(p_value jsonb, p_keys text[])
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select jsonb_typeof(p_value) = 'object'
    and (select count(*) from jsonb_object_keys(p_value)) = cardinality(p_keys)
    and not exists (
      select 1
      from jsonb_object_keys(p_value) as key
      where key <> all(p_keys)
    );
$$;

create function internal.is_json_integer_between(p_value jsonb, p_min integer, p_max integer)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_value) = 'number' and p_value #>> '{}' ~ '^[0-9]+$'
      then (p_value #>> '{}')::integer between p_min and p_max
    else false
  end;
$$;

create function internal.is_allowed_text_array(p_value jsonb, p_allowed text[], p_minimum integer)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case when jsonb_typeof(p_value) <> 'array' then false else
    jsonb_array_length(p_value) >= p_minimum
    and not exists (
      select 1 from jsonb_array_elements_text(p_value) as value
      where value <> all(p_allowed)
    )
    and (select count(distinct value) from jsonb_array_elements_text(p_value) as value)
      = jsonb_array_length(p_value)
  end;
$$;

create function internal.is_valid_workspace_settings_v1(p_settings jsonb)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select internal.has_exact_json_keys(
      p_settings,
      array['schema_version', 'reservation_ttl_minutes', 'default_post_status', 'default_plan_chunk_size']
    )
    and p_settings ->> 'schema_version' = '1'
    and internal.is_json_integer_between(p_settings -> 'reservation_ttl_minutes', 5, 120)
    and p_settings ->> 'default_post_status' = 'draft'
    and internal.is_json_integer_between(p_settings -> 'default_plan_chunk_size', 1, 5);
$$;

create function internal.default_trivia_config_v1()
returns jsonb
language sql
immutable
set search_path = pg_catalog
as $$
  select '{"allowed_formats":["single_subject_fast","themed_utility","emotional_animal_collection","comparison","myth_vs_fact"],"format_weights":{"single_subject_fast":35,"themed_utility":20,"emotional_animal_collection":20,"comparison":15,"myth_vs_fact":10},"allowed_topics":["animals","pet_safety","food_science","food_storage_home","practical_utility","human_body","nature_science","geography","history_origins","inventions_everyday","general_trivia"],"topic_group_weights":{"animals_pet_safety":30,"human_body_food_myth":20,"practical_utility":15,"places_geography":15,"nature_space":10,"history_inventions_people":10},"fact_count":{"mode":"adaptive","min":5,"preferred":7,"max":9},"profiles":{"fast_trivia":{"fact_count_min":7,"fact_count_max":8,"words_per_fact_min":8,"words_per_fact_max":11,"total_words_min":65,"total_words_max":85},"practical_utility":{"fact_count_min":5,"fact_count_max":6,"words_per_fact_min":10,"words_per_fact_max":14,"total_words_min":65,"total_words_max":85}},"fact_reuse_scope":"workspace_unique","render_style":"plain_lines","allowed_interaction_goals":["share","save","comment","follow"],"text_budget":{"hook_max_chars":45,"fact_max_chars":90,"facts_total_max_chars":500,"cta_max_chars":50,"canva_total_max_chars":600},"caption":{"max_chars":500},"hashtags":{"default_count":3,"min_count":0,"max_count":5},"style":{"english_variant":"en-US","tone":"conversational_credible","emoji_allowed":false,"regional_slang_allowed":false}}'::jsonb;
$$;

create function internal.is_valid_trivia_config_v1(p_config jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog, internal
as $$
declare
  v_fact_count jsonb;
  v_budget jsonb;
  v_caption jsonb;
  v_hashtags jsonb;
  v_style jsonb;
  v_sum integer;
begin
  if not internal.has_exact_json_keys(p_config, array[
    'allowed_formats', 'format_weights', 'allowed_topics', 'topic_group_weights',
    'fact_count', 'profiles', 'fact_reuse_scope', 'render_style',
    'allowed_interaction_goals', 'text_budget', 'caption', 'hashtags', 'style'
  ]) then return false; end if;
  if not internal.is_allowed_text_array(p_config -> 'allowed_formats', array[
    'single_subject_fast', 'themed_utility', 'emotional_animal_collection', 'comparison', 'myth_vs_fact'
  ], 1) then return false; end if;
  if not internal.has_exact_json_keys(p_config -> 'format_weights', array[
    'single_subject_fast', 'themed_utility', 'emotional_animal_collection', 'comparison', 'myth_vs_fact'
  ]) then return false; end if;
  select sum(value::integer) into v_sum from jsonb_each_text(p_config -> 'format_weights');
  if v_sum <> 100 then return false; end if;
  if not internal.is_allowed_text_array(p_config -> 'allowed_topics', array[
    'animals', 'pet_safety', 'food_science', 'food_storage_home', 'practical_utility',
    'human_body', 'nature_science', 'geography', 'history_origins', 'inventions_everyday', 'general_trivia'
  ], 1) then return false; end if;
  if not internal.has_exact_json_keys(p_config -> 'topic_group_weights', array[
    'animals_pet_safety', 'human_body_food_myth', 'practical_utility', 'places_geography',
    'nature_space', 'history_inventions_people'
  ]) then return false; end if;
  select sum(value::integer) into v_sum from jsonb_each_text(p_config -> 'topic_group_weights');
  if v_sum <> 100 then return false; end if;
  v_fact_count := p_config -> 'fact_count';
  if v_fact_count ->> 'mode' = 'adaptive' then
    if not internal.has_exact_json_keys(v_fact_count, array['mode', 'min', 'preferred', 'max'])
      or not internal.is_json_integer_between(v_fact_count -> 'min', 5, 9)
      or not internal.is_json_integer_between(v_fact_count -> 'preferred', 5, 9)
      or not internal.is_json_integer_between(v_fact_count -> 'max', 5, 9)
      or (v_fact_count ->> 'min')::integer > (v_fact_count ->> 'preferred')::integer
      or (v_fact_count ->> 'preferred')::integer > (v_fact_count ->> 'max')::integer then return false; end if;
  elsif v_fact_count ->> 'mode' = 'fixed' then
    if not internal.has_exact_json_keys(v_fact_count, array['mode', 'value'])
      or not internal.is_json_integer_between(v_fact_count -> 'value', 5, 9) then return false; end if;
  else return false; end if;
  if not internal.has_exact_json_keys(p_config -> 'profiles', array['fast_trivia', 'practical_utility'])
    or not internal.has_exact_json_keys(p_config -> 'profiles' -> 'fast_trivia', array['fact_count_min', 'fact_count_max', 'words_per_fact_min', 'words_per_fact_max', 'total_words_min', 'total_words_max'])
    or not internal.has_exact_json_keys(p_config -> 'profiles' -> 'practical_utility', array['fact_count_min', 'fact_count_max', 'words_per_fact_min', 'words_per_fact_max', 'total_words_min', 'total_words_max']) then return false; end if;
  if not internal.is_allowed_text_array(p_config -> 'allowed_interaction_goals', array['share', 'save', 'comment', 'follow'], 1)
    or p_config ->> 'fact_reuse_scope' not in ('workspace_unique', 'page_unique')
    or p_config ->> 'render_style' not in ('plain_lines', 'numbered') then return false; end if;
  v_budget := p_config -> 'text_budget';
  if not internal.has_exact_json_keys(v_budget, array['hook_max_chars', 'fact_max_chars', 'facts_total_max_chars', 'cta_max_chars', 'canva_total_max_chars'])
    or not internal.is_json_integer_between(v_budget -> 'hook_max_chars', 1, 90)
    or not internal.is_json_integer_between(v_budget -> 'fact_max_chars', 1, 90)
    or not internal.is_json_integer_between(v_budget -> 'facts_total_max_chars', 1, 500)
    or not internal.is_json_integer_between(v_budget -> 'cta_max_chars', 1, 100)
    or not internal.is_json_integer_between(v_budget -> 'canva_total_max_chars', 1, 600)
    or (v_budget ->> 'facts_total_max_chars')::integer > (v_budget ->> 'canva_total_max_chars')::integer then return false; end if;
  v_caption := p_config -> 'caption'; v_hashtags := p_config -> 'hashtags'; v_style := p_config -> 'style';
  if not internal.has_exact_json_keys(v_caption, array['max_chars']) or not internal.is_json_integer_between(v_caption -> 'max_chars', 1, 500)
    or not internal.has_exact_json_keys(v_hashtags, array['default_count', 'min_count', 'max_count'])
    or not internal.is_json_integer_between(v_hashtags -> 'min_count', 0, 5)
    or not internal.is_json_integer_between(v_hashtags -> 'default_count', 0, 5)
    or not internal.is_json_integer_between(v_hashtags -> 'max_count', 0, 5)
    or (v_hashtags ->> 'min_count')::integer > (v_hashtags ->> 'default_count')::integer
    or (v_hashtags ->> 'default_count')::integer > (v_hashtags ->> 'max_count')::integer
    or not internal.has_exact_json_keys(v_style, array['english_variant', 'tone', 'emoji_allowed', 'regional_slang_allowed'])
    or v_style ->> 'english_variant' <> 'en-US' or v_style ->> 'tone' <> 'conversational_credible'
    or v_style -> 'emoji_allowed' <> 'false'::jsonb or v_style -> 'regional_slang_allowed' <> 'false'::jsonb then return false; end if;
  return true;
end;
$$;

create function internal.is_valid_plan_config_v1(p_config jsonb)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select internal.has_exact_json_keys(
      p_config,
      array['schema_version', 'plan_intent', 'requested_chunk_size', 'schedule', 'requested_formats', 'requested_topics', 'requested_interaction_goals']
    )
    and p_config ->> 'schema_version' = '1'
    and nullif(btrim(p_config ->> 'plan_intent'), '') is not null
    and internal.is_json_integer_between(p_config -> 'requested_chunk_size', 1, 5)
    and internal.has_exact_json_keys(p_config -> 'schedule', array['mode'])
    and p_config -> 'schedule' ->> 'mode' = 'unscheduled'
    and internal.is_allowed_text_array(p_config -> 'requested_formats', array[
      'single_subject_fast', 'themed_utility', 'emotional_animal_collection', 'comparison', 'myth_vs_fact'
    ], 0)
    and internal.is_allowed_text_array(p_config -> 'requested_topics', array[
      'animals', 'pet_safety', 'food_science', 'food_storage_home', 'practical_utility',
      'human_body', 'nature_science', 'geography', 'history_origins', 'inventions_everyday', 'general_trivia'
    ], 0)
    and internal.is_allowed_text_array(p_config -> 'requested_interaction_goals', array['share', 'save', 'comment', 'follow'], 0);
$$;

create function internal.is_valid_post_payload_v1(p_payload jsonb, p_schema_version integer)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select p_schema_version = 1
    and internal.has_exact_json_keys(p_payload, array['schema_version', 'hook', 'body', 'cta', 'canva_copy', 'caption', 'hashtags', 'render_style', 'text_metrics'])
    and p_payload ->> 'schema_version' = '1'
    and jsonb_typeof(p_payload -> 'body') = 'object'
    and jsonb_typeof(p_payload -> 'hashtags') = 'array'
    and jsonb_typeof(p_payload -> 'text_metrics') = 'object'
    and p_payload ->> 'render_style' in ('plain_lines', 'numbered')
    and nullif(btrim(p_payload ->> 'hook'), '') is not null
    and nullif(btrim(p_payload ->> 'cta'), '') is not null
    and nullif(btrim(p_payload ->> 'canva_copy'), '') is not null
    and nullif(btrim(p_payload ->> 'caption'), '') is not null;
$$;

create function internal.is_valid_generation_snapshot_v1(p_snapshot jsonb)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select internal.has_exact_json_keys(p_snapshot, array[
      'config_schema_version', 'fact_count', 'fact_count_applied', 'fact_count_override',
      'text_budget', 'fact_reuse_scope', 'profile_key', 'render_style', 'target_markets', 'locale'
    ])
    and p_snapshot ->> 'config_schema_version' = '1'
    and jsonb_typeof(p_snapshot -> 'fact_count') = 'object'
    and internal.is_json_integer_between(p_snapshot -> 'fact_count_applied', 5, 9)
    and jsonb_typeof(p_snapshot -> 'fact_count_override') = 'boolean'
    and jsonb_typeof(p_snapshot -> 'text_budget') = 'object'
    and p_snapshot ->> 'fact_reuse_scope' in ('workspace_unique', 'page_unique')
    and p_snapshot ->> 'profile_key' in ('fast_trivia', 'practical_utility')
    and p_snapshot ->> 'render_style' in ('plain_lines', 'numbered')
    and p_snapshot ->> 'locale' = 'en-US'
    and internal.is_allowed_text_array(p_snapshot -> 'target_markets', array['US', 'GB', 'CA', 'AU'], 1);
$$;

create function internal.is_valid_check_snapshot_v1(p_snapshot jsonb, p_content_hash text)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog, internal
as $$
  select p_snapshot = '{}'::jsonb or (
    internal.has_exact_json_keys(p_snapshot, array['schema_version', 'content_hash', 'overall_status', 'checks'])
    and p_snapshot ->> 'schema_version' = '1'
    and p_snapshot ->> 'content_hash' = p_content_hash
    and p_snapshot ->> 'overall_status' in ('passed', 'failed', 'needs_review')
    and jsonb_typeof(p_snapshot -> 'checks') = 'array'
  );
$$;

create function internal.touch_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new is distinct from old then new.updated_at := now(); end if;
  return new;
end;
$$;

create function internal.validate_page_niche_config()
returns trigger
language plpgsql
set search_path = pg_catalog, internal
as $$
begin
  if new.niche_key = 'trivia' and (new.config_schema_version <> 1 or not internal.is_valid_trivia_config_v1(new.config)) then
    raise exception using errcode = '23514', message = 'TRIVIA_CONFIG_INVALID';
  end if;
  return new;
end;
$$;

create function internal.validate_content_plan_config()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare v_workspace_settings jsonb; v_config jsonb;
begin
  if new.config_schema_version <> 1 or not internal.is_valid_plan_config_v1(new.plan_config) then
    raise exception using errcode = '23514', message = 'PLAN_CONFIG_INVALID';
  end if;
  select settings into v_workspace_settings from public.workspaces where id = new.workspace_id;
  select config into v_config from public.page_niche_configs where workspace_id = new.workspace_id and page_id = new.page_id and niche_key = new.niche_key;
  if (new.plan_config ->> 'requested_chunk_size')::integer > (v_workspace_settings ->> 'default_plan_chunk_size')::integer
    or exists (select 1 from jsonb_array_elements_text(new.plan_config -> 'requested_formats') as value where not (v_config -> 'allowed_formats' ? value))
    or exists (select 1 from jsonb_array_elements_text(new.plan_config -> 'requested_topics') as value where not (v_config -> 'allowed_topics' ? value))
    or exists (select 1 from jsonb_array_elements_text(new.plan_config -> 'requested_interaction_goals') as value where not (v_config -> 'allowed_interaction_goals' ? value)) then
    raise exception using errcode = '23514', message = 'PLAN_CONFIG_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

create function internal.validate_post_row()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare v_config jsonb;
begin
  if not internal.is_valid_post_payload_v1(new.content_payload, new.content_schema_version)
    or not internal.is_valid_generation_snapshot_v1(new.generation_snapshot)
    or not internal.is_valid_check_snapshot_v1(new.system_checks, new.content_hash)
    or not internal.is_valid_check_snapshot_v1(new.editorial_checks, new.content_hash) then
    raise exception using errcode = '23514', message = 'POST_SNAPSHOT_INVALID';
  end if;
  select config into v_config from public.page_niche_configs where workspace_id = new.workspace_id and page_id = new.page_id and niche_key = new.niche_key;
  if not (v_config -> 'allowed_formats' ? new.format_key)
    or not (v_config -> 'allowed_topics' ? new.topic_key)
    or not (v_config -> 'allowed_interaction_goals' ? new.interaction_goal) then
    raise exception using errcode = '23514', message = 'POST_CONFIG_SCOPE_INVALID';
  end if;
  return new;
end;
$$;

create function internal.validate_post_metric()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare v_status text;
begin
  select status into v_status from public.posts where id = new.post_id and workspace_id = new.workspace_id and page_id = new.page_id;
  if v_status not in ('posted', 'archived') then
    raise exception using errcode = '23514', message = 'POST_METRICS_POST_NOT_PUBLISHED';
  end if;
  if new.metrics_payload ? 'schema_version' and new.metrics_payload ->> 'schema_version' <> '1' then
    raise exception using errcode = '23514', message = 'POST_METRICS_PAYLOAD_INVALID';
  end if;
  return new;
end;
$$;

create function internal.claim_operation(
  p_workspace_id bigint, p_actor_user_id uuid, p_operation_key uuid,
  p_operation_name text, p_request_schema_version integer, p_request_hash text
)
returns table (claim_state text, operation_id bigint, response_snapshot jsonb)
language plpgsql
set search_path = pg_catalog, internal
as $$
declare v_operation internal.operation_ledger%rowtype;
begin
  begin
    insert into internal.operation_ledger (workspace_id, actor_user_id, operation_key, operation_name, request_schema_version, request_hash)
    values (p_workspace_id, p_actor_user_id, p_operation_key, p_operation_name, p_request_schema_version, p_request_hash)
    returning * into v_operation;
    return query select 'first_use'::text, v_operation.id, null::jsonb;
    return;
  exception when unique_violation then null;
  end;
  select * into v_operation from internal.operation_ledger
    where workspace_id = p_workspace_id and operation_key = p_operation_key for update;
  if v_operation.actor_user_id <> p_actor_user_id or v_operation.operation_name <> p_operation_name
    or v_operation.request_schema_version <> p_request_schema_version or v_operation.request_hash <> p_request_hash then
    raise exception using errcode = 'P0001', message = 'OPERATION_KEY_REUSED';
  end if;
  if v_operation.completed_at is null then
    return query select 'in_progress'::text, v_operation.id, null::jsonb;
  else
    return query select 'replay'::text, v_operation.id, v_operation.response_snapshot;
  end if;
end;
$$;

create function internal.assert_page_schedule_available(
  p_page_id bigint, p_scheduled_at timestamptz,
  p_exclude_plan_item_id bigint default null, p_exclude_post_id bigint default null
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if p_scheduled_at is null then return; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_page_id::text || ':' || ((extract(epoch from p_scheduled_at) * 1000000)::bigint)::text, 0));
  if exists (select 1 from public.content_plan_items where page_id = p_page_id and scheduled_at = p_scheduled_at and status <> 'cancelled' and id is distinct from p_exclude_plan_item_id)
    or exists (select 1 from public.posts where page_id = p_page_id and scheduled_at = p_scheduled_at and status <> 'discarded' and id is distinct from p_exclude_post_id) then
    raise exception using errcode = 'P0001', message = 'SCHEDULE_CONFLICT';
  end if;
end;
$$;

alter table public.workspaces alter column settings set default '{"schema_version":1,"reservation_ttl_minutes":30,"default_post_status":"draft","default_plan_chunk_size":4}'::jsonb;
alter table public.workspaces add constraint workspaces_settings_v1_check check (internal.is_valid_workspace_settings_v1(settings));
alter table public.content_plans alter column plan_config set default '{"schema_version":1,"plan_intent":"batch","requested_chunk_size":1,"schedule":{"mode":"unscheduled"},"requested_formats":[],"requested_topics":[],"requested_interaction_goals":[]}'::jsonb;

create trigger workspaces_touch_updated_at before update on public.workspaces for each row execute function internal.touch_updated_at();
create trigger niches_touch_updated_at before update on public.niches for each row execute function internal.touch_updated_at();
create trigger pages_touch_updated_at before update on public.pages for each row execute function internal.touch_updated_at();
create trigger page_niche_configs_validate before insert or update on public.page_niche_configs for each row execute function internal.validate_page_niche_config();
create trigger page_niche_configs_touch_updated_at before update on public.page_niche_configs for each row execute function internal.touch_updated_at();
create trigger content_plans_validate before insert or update on public.content_plans for each row execute function internal.validate_content_plan_config();
create trigger content_plans_touch_updated_at before update on public.content_plans for each row execute function internal.touch_updated_at();
create trigger content_plan_items_touch_updated_at before update on public.content_plan_items for each row execute function internal.touch_updated_at();
create trigger posts_validate before insert or update on public.posts for each row execute function internal.validate_post_row();
create trigger posts_touch_updated_at before update on public.posts for each row execute function internal.touch_updated_at();
create trigger post_metrics_validate before insert or update on public.post_metrics for each row execute function internal.validate_post_metric();
create trigger rate_limit_buckets_touch_updated_at before update on internal.rate_limit_buckets for each row execute function internal.touch_updated_at();

create index workspaces_owner_user_id_idx on public.workspaces (owner_user_id, id);
create index pages_default_niche_key_idx on public.pages (default_niche_key) where default_niche_key is not null;
create index page_niche_configs_niche_key_idx on public.page_niche_configs (niche_key, page_id);
create index content_plans_workspace_operation_idx on public.content_plans (workspace_id, created_by_operation_id) where created_by_operation_id is not null;
create index content_plan_items_workspace_operation_idx on public.content_plan_items (workspace_id, created_by_operation_id) where created_by_operation_id is not null;
create index posts_workspace_page_niche_idx on public.posts (workspace_id, page_id, niche_key);
create index posts_content_plan_item_id_idx on public.posts (content_plan_item_id) where content_plan_item_id is not null;
create index posts_workspace_operation_idx on public.posts (workspace_id, created_by_operation_id) where created_by_operation_id is not null;
create index post_metrics_workspace_operation_idx on public.post_metrics (workspace_id, created_by_operation_id) where created_by_operation_id is not null;

revoke all on function internal.has_exact_json_keys(jsonb, text[]) from public, anon, authenticated, service_role;
revoke all on function internal.is_json_integer_between(jsonb, integer, integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_allowed_text_array(jsonb, text[], integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_workspace_settings_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.default_trivia_config_v1() from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_trivia_config_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_plan_config_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_post_payload_v1(jsonb, integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_generation_snapshot_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_check_snapshot_v1(jsonb, text) from public, anon, authenticated, service_role;
revoke all on function internal.touch_updated_at() from public, anon, authenticated, service_role;
revoke all on function internal.validate_page_niche_config() from public, anon, authenticated, service_role;
revoke all on function internal.validate_content_plan_config() from public, anon, authenticated, service_role;
revoke all on function internal.validate_post_row() from public, anon, authenticated, service_role;
revoke all on function internal.validate_post_metric() from public, anon, authenticated, service_role;
revoke all on function internal.claim_operation(bigint, uuid, uuid, text, integer, text) from public, anon, authenticated, service_role;
revoke all on function internal.assert_page_schedule_available(bigint, timestamptz, bigint, bigint) from public, anon, authenticated, service_role;
