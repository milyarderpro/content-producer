-- Phase 3 remediation: contract-complete evidence, configuration, locale, and metrics validation.

create or replace function internal.is_json_integer_between(p_value jsonb, p_min integer, p_max integer)
returns boolean
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_value) = 'number'
      and p_value #>> '{}' ~ '^(0|[1-9][0-9]*)$'
      and length(p_value #>> '{}') <= 10
      then (p_value #>> '{}')::bigint between p_min and p_max
    else false
  end;
$$;

create or replace function internal.json_integer_value(p_value jsonb)
returns bigint
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select case
    when jsonb_typeof(p_value) = 'number'
      and p_value #>> '{}' ~ '^(0|[1-9][0-9]*)$'
      and length(p_value #>> '{}') <= 10
      then (p_value #>> '{}')::bigint
    else null
  end;
$$;

create function internal.is_valid_timestamp_text(p_value text)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog
as $$
begin
  if p_value !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$' then
    return false;
  end if;
  perform p_value::timestamptz;
  return true;
exception when others then
  return false;
end;
$$;

create function internal.is_valid_timezone_name(p_timezone text)
returns boolean
language sql
stable
strict
set search_path = pg_catalog
as $$
  select exists (select 1 from pg_timezone_names where name = p_timezone);
$$;

create function internal.normalize_target_markets(p_markets text[])
returns text[]
language sql
immutable
set search_path = pg_catalog
as $$
  with normalized as (
    select case market when 'UK' then 'GB' else market end as market
    from unnest(p_markets) as input(market)
  )
  select case
    when p_markets is null or cardinality(p_markets) = 0 then null
    when exists (select 1 from normalized where market is null or market not in ('US', 'GB', 'CA', 'AU')) then null
    when (select count(*) from normalized) <> (select count(distinct market) from normalized) then null
    else (select array_agg(market order by market) from normalized)
  end;
$$;

create or replace function internal.is_valid_trivia_config_v1(p_config jsonb)
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
  v_profile jsonb;
  v_sum bigint;
begin
  if not internal.has_exact_json_keys(p_config, array[
    'allowed_formats', 'format_weights', 'allowed_topics', 'topic_group_weights',
    'fact_count', 'profiles', 'fact_reuse_scope', 'render_style',
    'allowed_interaction_goals', 'text_budget', 'caption', 'hashtags', 'style'
  ]) then return false; end if;
  if not internal.is_allowed_text_array(p_config -> 'allowed_formats', array[
    'single_subject_fast', 'themed_utility', 'emotional_animal_collection', 'comparison', 'myth_vs_fact'
  ], 1) or not internal.has_exact_json_keys(p_config -> 'format_weights', array[
    'single_subject_fast', 'themed_utility', 'emotional_animal_collection', 'comparison', 'myth_vs_fact'
  ]) then return false; end if;
  if exists (select 1 from jsonb_each(p_config -> 'format_weights') as weight(key, value) where not internal.is_json_integer_between(value, 0, 100)) then return false; end if;
  select sum(internal.json_integer_value(value)) into v_sum from jsonb_each(p_config -> 'format_weights') as weight(key, value);
  if v_sum <> 100 then return false; end if;
  if not internal.is_allowed_text_array(p_config -> 'allowed_topics', array[
    'animals', 'pet_safety', 'food_science', 'food_storage_home', 'practical_utility',
    'human_body', 'nature_science', 'geography', 'history_origins', 'inventions_everyday', 'general_trivia'
  ], 1) or not internal.has_exact_json_keys(p_config -> 'topic_group_weights', array[
    'animals_pet_safety', 'human_body_food_myth', 'practical_utility', 'places_geography',
    'nature_space', 'history_inventions_people'
  ]) then return false; end if;
  if exists (select 1 from jsonb_each(p_config -> 'topic_group_weights') as weight(key, value) where not internal.is_json_integer_between(value, 0, 100)) then return false; end if;
  select sum(internal.json_integer_value(value)) into v_sum from jsonb_each(p_config -> 'topic_group_weights') as weight(key, value);
  if v_sum <> 100 then return false; end if;
  v_fact_count := p_config -> 'fact_count';
  if v_fact_count ->> 'mode' = 'adaptive' then
    if not internal.has_exact_json_keys(v_fact_count, array['mode', 'min', 'preferred', 'max'])
      or not internal.is_json_integer_between(v_fact_count -> 'min', 5, 9)
      or not internal.is_json_integer_between(v_fact_count -> 'preferred', 5, 9)
      or not internal.is_json_integer_between(v_fact_count -> 'max', 5, 9)
      or internal.json_integer_value(v_fact_count -> 'min') > internal.json_integer_value(v_fact_count -> 'preferred')
      or internal.json_integer_value(v_fact_count -> 'preferred') > internal.json_integer_value(v_fact_count -> 'max') then return false; end if;
  elsif v_fact_count ->> 'mode' = 'fixed' then
    if not internal.has_exact_json_keys(v_fact_count, array['mode', 'value']) or not internal.is_json_integer_between(v_fact_count -> 'value', 5, 9) then return false; end if;
  else return false; end if;
  if not internal.has_exact_json_keys(p_config -> 'profiles', array['fast_trivia', 'practical_utility']) then return false; end if;
  foreach v_profile in array array[p_config -> 'profiles' -> 'fast_trivia', p_config -> 'profiles' -> 'practical_utility'] loop
    if not internal.has_exact_json_keys(v_profile, array['fact_count_min', 'fact_count_max', 'words_per_fact_min', 'words_per_fact_max', 'total_words_min', 'total_words_max'])
      or not internal.is_json_integer_between(v_profile -> 'fact_count_min', 1, 9)
      or not internal.is_json_integer_between(v_profile -> 'fact_count_max', 1, 9)
      or not internal.is_json_integer_between(v_profile -> 'words_per_fact_min', 1, 18)
      or not internal.is_json_integer_between(v_profile -> 'words_per_fact_max', 1, 18)
      or not internal.is_json_integer_between(v_profile -> 'total_words_min', 1, 500)
      or not internal.is_json_integer_between(v_profile -> 'total_words_max', 1, 500)
      or internal.json_integer_value(v_profile -> 'fact_count_min') > internal.json_integer_value(v_profile -> 'fact_count_max')
      or internal.json_integer_value(v_profile -> 'words_per_fact_min') > internal.json_integer_value(v_profile -> 'words_per_fact_max')
      or internal.json_integer_value(v_profile -> 'total_words_min') > internal.json_integer_value(v_profile -> 'total_words_max') then return false; end if;
  end loop;
  if not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'fact_count_min', 7, 8)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'fact_count_max', 7, 8)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'words_per_fact_min', 8, 11)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'words_per_fact_max', 8, 11)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'fact_count_min', 5, 6)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'fact_count_max', 5, 6)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'words_per_fact_min', 10, 14)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'words_per_fact_max', 10, 14)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'total_words_min', 65, 85)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'fast_trivia' -> 'total_words_max', 65, 85)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'total_words_min', 65, 85)
    or not internal.is_json_integer_between(p_config -> 'profiles' -> 'practical_utility' -> 'total_words_max', 65, 85) then return false; end if;
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
    or internal.json_integer_value(v_budget -> 'facts_total_max_chars') > internal.json_integer_value(v_budget -> 'canva_total_max_chars') then return false; end if;
  v_caption := p_config -> 'caption'; v_hashtags := p_config -> 'hashtags'; v_style := p_config -> 'style';
  if not internal.has_exact_json_keys(v_caption, array['max_chars']) or not internal.is_json_integer_between(v_caption -> 'max_chars', 1, 500)
    or not internal.has_exact_json_keys(v_hashtags, array['default_count', 'min_count', 'max_count'])
    or not internal.is_json_integer_between(v_hashtags -> 'min_count', 0, 5)
    or not internal.is_json_integer_between(v_hashtags -> 'default_count', 0, 5)
    or not internal.is_json_integer_between(v_hashtags -> 'max_count', 0, 5)
    or internal.json_integer_value(v_hashtags -> 'min_count') > internal.json_integer_value(v_hashtags -> 'default_count')
    or internal.json_integer_value(v_hashtags -> 'default_count') > internal.json_integer_value(v_hashtags -> 'max_count')
    or not internal.has_exact_json_keys(v_style, array['english_variant', 'tone', 'emoji_allowed', 'regional_slang_allowed'])
    or v_style ->> 'english_variant' <> 'en-US' or v_style ->> 'tone' <> 'conversational_credible'
    or v_style -> 'emoji_allowed' <> 'false'::jsonb or v_style -> 'regional_slang_allowed' <> 'false'::jsonb then return false; end if;
  return true;
end;
$$;

create function internal.is_valid_system_checks_v1(p_snapshot jsonb, p_content_hash text, p_revision integer)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare v_check jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 32768
    or not internal.has_exact_json_keys(p_snapshot, array['schema_version', 'gate_version', 'evaluated_at', 'evaluator', 'post_revision', 'content_hash', 'config_version', 'renderer_version', 'overall_status', 'checks'])
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 2147483647)
    or not internal.is_json_integer_between(p_snapshot -> 'gate_version', 1, 2147483647)
    or not internal.is_valid_timestamp_text(p_snapshot ->> 'evaluated_at')
    or p_snapshot ->> 'evaluator' <> 'server'
    or internal.json_integer_value(p_snapshot -> 'post_revision') <> p_revision
    or p_snapshot ->> 'content_hash' <> p_content_hash
    or not internal.is_json_integer_between(p_snapshot -> 'config_version', 1, 2147483647)
    or not internal.is_json_integer_between(p_snapshot -> 'renderer_version', 1, 2147483647)
    or p_snapshot ->> 'overall_status' not in ('passed', 'failed', 'needs_review')
    or jsonb_typeof(p_snapshot -> 'checks') <> 'array' or jsonb_array_length(p_snapshot -> 'checks') = 0 then return false; end if;
  for v_check in select value from jsonb_array_elements(p_snapshot -> 'checks') loop
    if not internal.has_exact_json_keys(v_check, array['id', 'severity', 'status', 'expected', 'actual', 'evidence'])
      or nullif(btrim(v_check ->> 'id'), '') is null
      or v_check ->> 'severity' not in ('blocking', 'warning')
      or v_check ->> 'status' not in ('passed', 'failed', 'needs_review')
      or jsonb_typeof(v_check -> 'expected') = 'null' or jsonb_typeof(v_check -> 'actual') = 'null'
      or jsonb_typeof(v_check -> 'evidence') <> 'array'
      or exists (select 1 from jsonb_array_elements(v_check -> 'evidence') as entry where jsonb_typeof(entry) <> 'string' or nullif(btrim(entry #>> '{}'), '') is null) then return false; end if;
  end loop;
  return true;
end;
$$;

create function internal.is_valid_editorial_checks_v1(p_snapshot jsonb, p_content_hash text, p_revision integer)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
declare v_criterion jsonb;
begin
  if jsonb_typeof(p_snapshot) <> 'object' or octet_length(p_snapshot::text) > 32768
    or not (internal.has_exact_json_keys(p_snapshot, array['schema_version', 'rubric_version', 'evaluated_at', 'evaluator', 'post_revision', 'content_hash', 'overall_status', 'criteria', 'risk_flags'])
      or internal.has_exact_json_keys(p_snapshot, array['schema_version', 'rubric_version', 'evaluated_at', 'evaluator', 'evaluator_label', 'post_revision', 'content_hash', 'overall_status', 'criteria', 'risk_flags']))
    or not internal.is_json_integer_between(p_snapshot -> 'schema_version', 1, 2147483647)
    or not internal.is_json_integer_between(p_snapshot -> 'rubric_version', 1, 2147483647)
    or not internal.is_valid_timestamp_text(p_snapshot ->> 'evaluated_at')
    or p_snapshot ->> 'evaluator' <> 'chatgpt'
    or (p_snapshot ? 'evaluator_label' and (jsonb_typeof(p_snapshot -> 'evaluator_label') <> 'string' or nullif(btrim(p_snapshot ->> 'evaluator_label'), '') is null))
    or internal.json_integer_value(p_snapshot -> 'post_revision') <> p_revision
    or p_snapshot ->> 'content_hash' <> p_content_hash
    or p_snapshot ->> 'overall_status' not in ('passed', 'failed', 'needs_review')
    or jsonb_typeof(p_snapshot -> 'criteria') <> 'array' or jsonb_array_length(p_snapshot -> 'criteria') = 0
    or jsonb_typeof(p_snapshot -> 'risk_flags') <> 'array'
    or exists (select 1 from jsonb_array_elements(p_snapshot -> 'risk_flags') as flag where jsonb_typeof(flag) <> 'string' or nullif(btrim(flag #>> '{}'), '') is null) then return false; end if;
  for v_criterion in select value from jsonb_array_elements(p_snapshot -> 'criteria') loop
    if not internal.has_exact_json_keys(v_criterion, array['id', 'severity', 'status', 'note', 'evidence_paths'])
      or nullif(btrim(v_criterion ->> 'id'), '') is null
      or v_criterion ->> 'severity' not in ('critical', 'noncritical')
      or v_criterion ->> 'status' not in ('pass', 'fail', 'needs_review')
      or jsonb_typeof(v_criterion -> 'note') <> 'string'
      or jsonb_typeof(v_criterion -> 'evidence_paths') <> 'array'
      or exists (select 1 from jsonb_array_elements(v_criterion -> 'evidence_paths') as path where jsonb_typeof(path) <> 'string' or nullif(btrim(path #>> '{}'), '') is null) then return false; end if;
  end loop;
  return true;
end;
$$;

create function internal.is_valid_metrics_payload_v1(p_payload jsonb)
returns boolean
language plpgsql
stable
strict
set search_path = pg_catalog, internal
as $$
begin
  if p_payload = '{}'::jsonb then return true; end if;
  return internal.has_exact_json_keys(p_payload, array['metric_definition_version', 'source_type', 'source_reported_at', 'timezone', 'note'])
    and internal.is_json_integer_between(p_payload -> 'metric_definition_version', 1, 1)
    and p_payload ->> 'source_type' in ('facebook_ui', 'facebook_export', 'user_reported', 'other')
    and (p_payload -> 'source_reported_at' = 'null'::jsonb or (jsonb_typeof(p_payload -> 'source_reported_at') = 'string' and internal.is_valid_timestamp_text(p_payload ->> 'source_reported_at')))
    and (p_payload -> 'timezone' = 'null'::jsonb or (jsonb_typeof(p_payload -> 'timezone') = 'string' and internal.is_valid_timezone_name(p_payload ->> 'timezone')))
    and (p_payload -> 'note' = 'null'::jsonb or (jsonb_typeof(p_payload -> 'note') = 'string' and char_length(p_payload ->> 'note') between 1 and 500));
end;
$$;

create or replace function internal.validate_workspace_row()
returns trigger
language plpgsql
set search_path = pg_catalog, internal
as $$
begin
  new.target_markets := internal.normalize_target_markets(new.target_markets);
  if new.target_markets is null then raise exception using errcode = '23514', message = 'TARGET_MARKETS_INVALID'; end if;
  return new;
end;
$$;

create function internal.validate_page_locale_row()
returns trigger
language plpgsql
set search_path = pg_catalog, internal
as $$
begin
  new.timezone := btrim(new.timezone);
  new.target_markets := internal.normalize_target_markets(new.target_markets);
  if not internal.is_valid_timezone_name(new.timezone) then raise exception using errcode = '23514', message = 'PAGE_TIMEZONE_INVALID'; end if;
  if new.target_markets is null then raise exception using errcode = '23514', message = 'TARGET_MARKETS_INVALID'; end if;
  return new;
end;
$$;

create or replace function internal.validate_post_row()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare v_config jsonb;
begin
  if not internal.is_valid_post_payload_v1(new.content_payload, new.content_schema_version)
    or not internal.is_valid_generation_snapshot_v1(new.generation_snapshot) then
    raise exception using errcode = '23514', message = 'POST_SNAPSHOT_INVALID';
  end if;
  if new.system_checks = '{}'::jsonb then
    if new.status not in ('draft', 'discarded') then raise exception using errcode = '23514', message = 'SYSTEM_EVIDENCE_REQUIRED'; end if;
  elsif not internal.is_valid_system_checks_v1(new.system_checks, new.content_hash, new.revision) then
    raise exception using errcode = '23514', message = 'SYSTEM_EVIDENCE_INVALID';
  end if;
  if new.editorial_checks = '{}'::jsonb then
    if new.status not in ('draft', 'discarded') then raise exception using errcode = '23514', message = 'EDITORIAL_EVIDENCE_REQUIRED'; end if;
  elsif not internal.is_valid_editorial_checks_v1(new.editorial_checks, new.content_hash, new.revision) then
    raise exception using errcode = '23514', message = 'EDITORIAL_EVIDENCE_INVALID';
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

alter table public.post_metrics add column likes bigint;
alter table public.post_metrics drop constraint post_metrics_nonnegative_check;
alter table public.post_metrics drop constraint post_metrics_nonempty_snapshot_check;
alter table public.post_metrics add constraint post_metrics_nonnegative_check check (
  (views is null or views >= 0) and (reach is null or reach >= 0) and (reactions is null or reactions >= 0)
  and (likes is null or likes >= 0) and (comments is null or comments >= 0) and (shares is null or shares >= 0)
  and (saves is null or saves >= 0) and (follows is null or follows >= 0)
  and (watch_time_seconds is null or (watch_time_seconds >= 0 and watch_time_seconds::text not in ('NaN', 'Infinity', '-Infinity')))
  and (average_watch_time_seconds is null or (average_watch_time_seconds >= 0 and average_watch_time_seconds::text not in ('NaN', 'Infinity', '-Infinity')))
);
alter table public.post_metrics add constraint post_metrics_likes_reactions_check check (likes is null or reactions is null or likes <= reactions);
alter table public.post_metrics add constraint post_metrics_nonempty_snapshot_check check (
  views is not null or reach is not null or reactions is not null or likes is not null or comments is not null
  or shares is not null or saves is not null or follows is not null or watch_time_seconds is not null
  or average_watch_time_seconds is not null or metrics_payload <> '{}'::jsonb
);

create or replace function internal.validate_post_metric()
returns trigger
language plpgsql
set search_path = pg_catalog, internal, public
as $$
declare v_status text;
begin
  select status into v_status from public.posts where id = new.post_id and workspace_id = new.workspace_id and page_id = new.page_id;
  if v_status not in ('posted', 'archived') then raise exception using errcode = '23514', message = 'POST_METRICS_POST_NOT_PUBLISHED'; end if;
  if not internal.is_valid_metrics_payload_v1(new.metrics_payload) then raise exception using errcode = '23514', message = 'POST_METRICS_PAYLOAD_INVALID'; end if;
  return new;
end;
$$;

create trigger workspaces_validate_target_markets before insert or update on public.workspaces for each row execute function internal.validate_workspace_row();
create trigger pages_validate_locale before insert or update on public.pages for each row execute function internal.validate_page_locale_row();

revoke all on function internal.json_integer_value(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_timestamp_text(text) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_timezone_name(text) from public, anon, authenticated, service_role;
revoke all on function internal.normalize_target_markets(text[]) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_system_checks_v1(jsonb, text, integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_editorial_checks_v1(jsonb, text, integer) from public, anon, authenticated, service_role;
revoke all on function internal.is_valid_metrics_payload_v1(jsonb) from public, anon, authenticated, service_role;
revoke all on function internal.validate_workspace_row() from public, anon, authenticated, service_role;
revoke all on function internal.validate_page_locale_row() from public, anon, authenticated, service_role;
