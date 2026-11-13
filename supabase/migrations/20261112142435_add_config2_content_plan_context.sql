-- CR-062 task6: config2 plans, fresh item context and immutable completion history.
create function internal.plan_override_shape_config2_v2(x jsonb) returns boolean
language plpgsql immutable security invoker set search_path='' as $$
declare k text; ceiling jsonb:=internal.post_engine_rules_config2_v2('plain_lines')->'text_budget';
begin
  if jsonb_typeof(x) is distinct from 'object' or octet_length(x::text)>8192
    or exists(select 1 from jsonb_each(x) e where e.key not in ('profile_key','fact_count','render_style','text_budget','caption','hashtags') or e.value='null'::jsonb) then return false; end if;
  if x ? 'profile_key' and (jsonb_typeof(x->'profile_key') is distinct from 'string' or x->>'profile_key' !~ '^[a-z][a-z0-9_]{1,49}$') then return false; end if;
  if x ? 'fact_count' and internal.editorial_count_v2(x->'fact_count') is distinct from true then return false; end if;
  if x ? 'render_style' and (jsonb_typeof(x->'render_style') is distinct from 'string' or x->>'render_style' not in ('plain_lines','numbered')) then return false; end if;
  if x ? 'text_budget' then
    if jsonb_typeof(x->'text_budget') is distinct from 'object' then return false; end if;
    for k in select jsonb_object_keys(x->'text_budget') loop
      if not(ceiling ? k) or internal.is_json_integer_between(x->'text_budget'->k,1,(ceiling->>k)::integer) is distinct from true then return false; end if;
    end loop;
  end if;
  if x ? 'caption' and (internal.has_exact_json_keys(x->'caption',array['max_chars']) is distinct from true or internal.is_json_integer_between(x#>'{caption,max_chars}',1,500) is distinct from true) then return false; end if;
  if x ? 'hashtags' and (internal.has_exact_json_keys(x->'hashtags',array['min_count','default_count','max_count']) is distinct from true
    or internal.is_json_integer_between(x#>'{hashtags,min_count}',0,5) is distinct from true
    or internal.is_json_integer_between(x#>'{hashtags,default_count}',(x#>>'{hashtags,min_count}')::integer,5) is distinct from true
    or internal.is_json_integer_between(x#>'{hashtags,max_count}',(x#>>'{hashtags,default_count}')::integer,5) is distinct from true) then return false; end if;
  return true;
exception when others then return false;
end; $$;

create function internal.plan_post_context_shape_config2_v2(x jsonb) returns boolean
language sql immutable security invoker set search_path='' as $$
  select coalesce(internal.has_exact_json_keys(x,array['plan_public_id','plan_item_public_id','item_config','intent_goal']) is true
    and internal.plan_is_uuid_v1(x->'plan_public_id') is true and internal.plan_is_uuid_v1(x->'plan_item_public_id') is true
    and internal.plan_override_shape_config2_v2(x->'item_config') is true
    and (x->'intent_goal'='null'::jsonb or (jsonb_typeof(x->'intent_goal')='string' and x->>'intent_goal' in ('share','save','comment','follow'))),false);
$$;

create function internal.plan_item_resolve_config2_v2(c public.page_niche_configs,fmt text,topic text,goal text,item jsonb)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare r jsonb;
begin
  if c.config_schema_version<>2 or internal.plan_override_shape_config2_v2(item) is distinct from true
    or (goal is not null and goal not in ('share','save','comment','follow')) then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  r:=internal.editorial_resolve_v2(c.workspace_id,c.config,c.editorial_bindings,fmt,item);
  if fmt is not null and not(r#>'{rules,allowed_formats}' ? fmt) then raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if topic is not null and not(r#>'{rules,allowed_topics}' ? topic) then raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  return r;
end; $$;

create function internal.plan_context_snapshot_config2_v2(page public.pages,c public.page_niche_configs)
returns jsonb language sql stable security invoker set search_path='' as $$
  select jsonb_build_object('schema_version',2,'module_version',1,
    'page',jsonb_build_object('page_public_id',page.public_id,'name',page.name,'slug',page.slug,'platform',page.platform,
      'language_code',page.language_code,'locale',page.locale,'timezone',page.timezone,'target_markets',to_jsonb(page.target_markets),
      'platform_config',page.platform_config,'is_active',page.is_active,'updated_at',internal.iso_timestamp_v1(page.updated_at)),
    'niche_config',jsonb_build_object('config_public_id',c.public_id,'niche_key',c.niche_key,'config_schema_version',2,
      'config',c.config,'is_enabled',c.is_enabled,'is_default',c.is_default,'updated_at',internal.iso_timestamp_v1(c.updated_at),
      'editorial_bindings',c.editorial_bindings,'effective_rules',c.editorial_rules,'effective_rules_hash',c.editorial_rules_hash));
$$;

create function internal.plan_config_shape_config2_v2(x jsonb) returns boolean
language plpgsql stable security invoker set search_path='' as $$
declare ctx jsonb:=x->'context_snapshot'; p jsonb:=ctx->'page'; c jsonb:=ctx->'niche_config'; k text; a jsonb;
begin
  if octet_length(x::text)>262144 or internal.has_exact_json_keys(x,array['schema_version','plan_intent','requested_chunk_size','schedule','requested_formats','requested_topics','requested_interaction_goals','context_snapshot']) is distinct from true
    or x->'schema_version' is distinct from '3'::jsonb or jsonb_typeof(x->'plan_intent') is distinct from 'string'
    or char_length(btrim(x->>'plan_intent')) not between 1 and 1000
    or internal.is_json_integer_between(x->'requested_chunk_size',1,5) is distinct from true
    or internal.has_exact_json_keys(x->'schedule',array['mode']) is distinct from true
    or (x#>>'{schedule,mode}' in ('unscheduled','explicit_slots')) is distinct from true
    or internal.has_exact_json_keys(ctx,array['schema_version','module_version','page','niche_config']) is distinct from true
    or ctx->'schema_version' is distinct from '2'::jsonb or ctx->'module_version' is distinct from '1'::jsonb
    or internal.has_exact_json_keys(p,array['page_public_id','name','slug','platform','language_code','locale','timezone','target_markets','platform_config','is_active','updated_at']) is distinct from true
    or internal.has_exact_json_keys(c,array['config_public_id','niche_key','config_schema_version','config','is_enabled','is_default','updated_at','editorial_bindings','effective_rules','effective_rules_hash']) is distinct from true
    or internal.plan_is_uuid_v1(p->'page_public_id') is distinct from true or internal.plan_is_uuid_v1(c->'config_public_id') is distinct from true
    or p->>'platform' is distinct from 'facebook' or p->>'locale' is distinct from 'en-US' or p->>'language_code' is distinct from 'en'
    or p->'is_active' is distinct from 'true'::jsonb or c->'is_enabled' is distinct from 'true'::jsonb
    or c->>'niche_key' is distinct from 'trivia' or c->'config_schema_version' is distinct from '2'::jsonb
    or internal.editorial_config_input_v2(c->'config') is distinct from true
    or jsonb_typeof(c->'is_default') is distinct from 'boolean'
    or jsonb_typeof(c->'editorial_bindings') is distinct from 'array'
    or jsonb_array_length(c->'editorial_bindings') not between 3 and 257
    or c#>'{effective_rules,config_schema_version}' is distinct from '2'::jsonb
    or (c->>'effective_rules_hash' ~ '^[0-9a-f]{64}$') is distinct from true
    or internal.plan_is_time_v1(c->'updated_at') is distinct from true or internal.plan_is_time_v1(p->'updated_at') is distinct from true
    or internal.is_valid_timezone_name(p->>'timezone') is distinct from true
    or jsonb_typeof(p->'platform_config') is distinct from 'object' or jsonb_typeof(p->'target_markets') is distinct from 'array' then return false; end if;
  foreach k in array array['name','slug','timezone'] loop
    if jsonb_typeof(p->k) is distinct from 'string' then return false; end if;
  end loop;
  if char_length(p->>'name') not between 1 and 120 or p->>'slug' !~ '^[a-z0-9-]{2,80}$' then return false; end if;
  foreach k in array array['requested_formats','requested_topics'] loop
    a:=x->k;
    if jsonb_typeof(a) is distinct from 'array' or jsonb_array_length(a)>128
      or exists(select 1 from jsonb_array_elements(a) v where jsonb_typeof(v) is distinct from 'string' or v#>>'{}' !~ '^[a-z][a-z0-9_]{1,49}$')
      or (select count(distinct value) from jsonb_array_elements(a))<>jsonb_array_length(a) then return false; end if;
  end loop;
  return internal.is_allowed_text_array(x->'requested_interaction_goals',array['share','save','comment','follow'],0) is true;
exception when others then return false;
end; $$;

CREATE OR REPLACE FUNCTION internal.plan_context_snapshot_v1(p_page pages, p_config page_niche_configs)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select case when p_config.config_schema_version=2 then internal.plan_context_snapshot_config2_v2(p_page,p_config) else pg_catalog.jsonb_build_object('schema_version',1,'module_version',1,
    'page',pg_catalog.jsonb_build_object('page_public_id',p_page.public_id,
      'name',p_page.name,'slug',p_page.slug,'platform',p_page.platform,
      'language_code',p_page.language_code,'locale',p_page.locale,'timezone',p_page.timezone,
      'target_markets',pg_catalog.to_jsonb(p_page.target_markets),
      'platform_config',p_page.platform_config,'is_active',p_page.is_active,
      'updated_at',internal.iso_timestamp_v1(p_page.updated_at)),
    'niche_config',pg_catalog.jsonb_build_object('config_public_id',p_config.public_id,
      'niche_key',p_config.niche_key,'config_schema_version',p_config.config_schema_version,
      'config',p_config.config,'is_enabled',p_config.is_enabled,'is_default',p_config.is_default,
      'updated_at',internal.iso_timestamp_v1(p_config.updated_at))) end;
$function$
;

CREATE OR REPLACE FUNCTION internal.validate_content_plan_config()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_page public.pages; v_config public.page_niche_configs; v_settings jsonb;
begin
  if new.config_schema_version=2 then
    if internal.plan_config_shape_config2_v2(new.plan_config) is distinct from true then raise exception using errcode='23514',message='PLAN_CONFIG_INVALID'; end if;
    if tg_op='UPDATE' then
      if old.config_schema_version<>2 or new.plan_config->'context_snapshot' is distinct from old.plan_config->'context_snapshot' then
        raise exception using errcode='23514',message='PLAN_CONFIG_INVALID'; end if;
      return new;
    end if;
    select * into v_page from public.pages where workspace_id=new.workspace_id and id=new.page_id;
    select * into v_config from public.page_niche_configs where workspace_id=new.workspace_id and page_id=new.page_id and niche_key=new.niche_key;
    select settings into v_settings from public.workspaces where id=new.workspace_id;
    if v_config.config_schema_version<>2 or new.plan_config->'context_snapshot' is distinct from internal.plan_context_snapshot_v1(v_page,v_config)
      or (new.plan_config->>'requested_chunk_size')::integer>(v_settings->>'default_plan_chunk_size')::integer
      or exists(select 1 from jsonb_array_elements_text(new.plan_config->'requested_formats') k where not(v_config.editorial_rules->'allowed_formats' ? k))
      or exists(select 1 from jsonb_array_elements_text(new.plan_config->'requested_topics') k where not(v_config.editorial_rules->'allowed_topics' ? k)) then
      raise exception using errcode='23514',message='PLAN_CONFIG_SCOPE_INVALID'; end if;
    return new;
  end if;
  if tg_op='UPDATE' and old.plan_config -> 'schema_version'='2'::jsonb and (
    new.plan_config -> 'schema_version' is distinct from '2'::jsonb
    or new.plan_config -> 'context_snapshot' is distinct from old.plan_config -> 'context_snapshot') then
    raise exception using errcode='23514',message='PLAN_CONFIG_INVALID';
  end if;
  if new.config_schema_version <> 1 then raise exception using errcode='23514',message='PLAN_CONFIG_INVALID'; end if;
  if new.plan_config -> 'schema_version' = '2'::jsonb then
    if internal.is_valid_plan_config_v2(new.plan_config) is distinct from true then
      raise exception using errcode='23514',message='PLAN_CONFIG_INVALID';
    end if;
    if tg_op = 'UPDATE' then
      if new.plan_config -> 'context_snapshot' is distinct from old.plan_config -> 'context_snapshot' then
        raise exception using errcode='23514',message='PLAN_CONFIG_INVALID';
      end if;
      return new; -- Historical context is not revalidated against mutable current config.
    end if;
  elsif internal.is_valid_plan_config_v1(new.plan_config) is distinct from true then
    raise exception using errcode='23514',message='PLAN_CONFIG_INVALID';
  end if;
  select * into v_page from public.pages where workspace_id=new.workspace_id and id=new.page_id;
  select * into v_config from public.page_niche_configs where workspace_id=new.workspace_id and page_id=new.page_id and niche_key=new.niche_key;
  select settings into v_settings from public.workspaces where id=new.workspace_id;
  if new.plan_config -> 'schema_version' = '2'::jsonb and new.plan_config -> 'context_snapshot'
    is distinct from internal.plan_context_snapshot_v1(v_page,v_config) then
    raise exception using errcode='23514',message='PLAN_CONFIG_SCOPE_INVALID';
  end if;
  if (new.plan_config ->> 'requested_chunk_size')::integer > (v_settings ->> 'default_plan_chunk_size')::integer
    or exists (select 1 from pg_catalog.jsonb_array_elements_text(new.plan_config -> 'requested_formats') as k(value) where not (v_config.config -> 'allowed_formats' ? value))
    or exists (select 1 from pg_catalog.jsonb_array_elements_text(new.plan_config -> 'requested_topics') as k(value) where not (v_config.config -> 'allowed_topics' ? value))
    or exists (select 1 from pg_catalog.jsonb_array_elements_text(new.plan_config -> 'requested_interaction_goals') as k(value) where not (v_config.config -> 'allowed_interaction_goals' ? value)) then
    raise exception using errcode='23514',message='PLAN_CONFIG_SCOPE_INVALID';
  end if;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION internal.plan_is_item_v1(p_value jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare v_key text;
begin
  if internal.has_exact_json_keys(p_value,array['plan_item_public_id','plan_public_id','position','status','scheduled_at',
    'topic_key','format_key','interaction_goal','item_config','attempt_count','claim_expires_at','active_post_public_id',
    'last_error','created_at','updated_at']) is distinct from true
    or not internal.plan_is_uuid_v1(p_value->'plan_item_public_id') or not internal.plan_is_uuid_v1(p_value->'plan_public_id')
    or internal.is_json_integer_between(p_value->'position',1,100) is distinct from true
    or pg_catalog.jsonb_typeof(p_value->'status') is distinct from 'string'
    or p_value->>'status' not in ('pending','in_progress','completed','failed','cancelled')
    or internal.is_json_integer_between(p_value->'attempt_count',0,2147483647) is distinct from true
    or pg_catalog.jsonb_typeof(p_value->'item_config') is distinct from 'object'
    or (internal.is_valid_trivia_plan_override_v1(p_value->'item_config',
      internal.default_trivia_config_v1() || '{"text_budget":{"hook_max_chars":90,"fact_max_chars":90,"facts_total_max_chars":500,"cta_max_chars":100,"canva_total_max_chars":600}}'::jsonb) is true or internal.plan_override_shape_config2_v2(p_value->'item_config') is true) is distinct from true
    or not (p_value->'interaction_goal'='null'::jsonb or p_value->>'interaction_goal' in ('share','save','comment','follow'))
    or not internal.plan_is_time_v1(p_value->'scheduled_at',true)
    or not internal.plan_is_time_v1(p_value->'claim_expires_at',true)
    or not internal.plan_is_time_v1(p_value->'created_at') or not internal.plan_is_time_v1(p_value->'updated_at')
    or not (p_value->'active_post_public_id'='null'::jsonb or internal.plan_is_uuid_v1(p_value->'active_post_public_id')) then return false; end if;
  foreach v_key in array array['topic_key','format_key','interaction_goal'] loop
    if not (p_value->v_key='null'::jsonb or (pg_catalog.jsonb_typeof(p_value->v_key)='string'
      and pg_catalog.char_length(p_value->>v_key) between 1 and 120)) then return false; end if;
  end loop;
  if p_value->'last_error'<>'null'::jsonb and (internal.has_exact_json_keys(p_value->'last_error',array['code','detail']) is distinct from true
    or not internal.plan_failure_code_v1(p_value#>>'{last_error,code}')
    or not internal.plan_safe_reason_v1(p_value#>>'{last_error,detail}')) then return false; end if;
  return true;
exception when others then return false;
end;
$function$
;

CREATE OR REPLACE FUNCTION api.create_content_plan(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_page_public_id uuid, p_niche_key text, p_config_schema_version integer, p_items jsonb, p_plan_intent text, p_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_claim record;
  v_page public.pages;
  v_config public.page_niche_configs;
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
  v_schedule_lock bigint;
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
  perform internal.assert_request_context_v1();
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
  if p_config_schema_version is null or p_config_schema_version not in (1,2) then
    raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
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
 then
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


  if v_claim.claim_state = 'replay' then
    if v_claim.response_snapshot -> 'schema_version' is distinct from '3'::jsonb then
      raise exception using errcode='P0001',message='INTERNAL_ERROR';
    end if;
    return pg_catalog.jsonb_set(v_claim.response_snapshot -> 'response','{data,replayed}','true'::jsonb);
  end if;
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
    if v_niche.module_version <> 1 or (p_config_schema_version=1 and v_niche.config_schema_version <> 1) then
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
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
      raise exception using errcode = 'P0001', message = 'CONFIG_INVALID';
    end if;
    if v_config.config_schema_version=2 then
      for v_item in select value from pg_catalog.jsonb_array_elements(v_normalized_items) loop
        perform internal.plan_item_resolve_config2_v2(v_config,v_item->>'format_key',v_item->>'topic_key',v_item->>'interaction_goal',v_item->'item_config');
      end loop;
    else
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


    if exists (select 1 from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where internal.is_valid_trivia_plan_override_v1(item.value -> 'item_config',v_config.config) is distinct from true) then
      raise exception using errcode='P0001',message='CONFIG_INVALID';
    end if;
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
      'schema_version', case when v_config.config_schema_version=2 then 3 else 2 end,
      'context_snapshot', internal.plan_context_snapshot_v1(v_page::public.pages,v_config::public.page_niche_configs),
      'plan_intent', v_intent,
      'requested_chunk_size', least(v_item_count, v_workspace_chunk_size),

      'schedule', pg_catalog.jsonb_build_object('mode',case when exists (
        select 1 from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
        where item.value ->> 'scheduled_at' is not null) then 'explicit_slots' else 'unscheduled' end),
      'requested_formats', v_requested_formats,
      'requested_topics', v_requested_topics,
      'requested_interaction_goals', v_requested_goals
    );

    -- Materialize every distinct key before acquiring any lock, numeric order.
    for v_schedule_lock in
      with keys as materialized (
        select distinct pg_catalog.hashtextextended(v_page.id::text || ':' ||
          ((extract(epoch from (item.value ->> 'scheduled_at')::timestamptz) * 1000000)::bigint)::text,0) as key
        from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
        where item.value ->> 'scheduled_at' is not null)
      select key from keys order by key
    loop
      perform pg_catalog.pg_advisory_xact_lock(v_schedule_lock);
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

    v_snapshot := v_snapshot || pg_catalog.jsonb_build_object('schema_version',3,'response',v_result);
    perform internal.complete_page_plan_operation_v3(
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
    'CONFIG_INVALID', 'CONFIG_INVALID', 'SCHEDULE_CONFLICT',
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
$function$
;

CREATE OR REPLACE FUNCTION api.claim_content_plan_items(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_plan_public_id uuid, p_limit integer DEFAULT 1, p_lease_minutes integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_op record; v_target record; v_plan public.content_plans; v_item public.content_plan_items;
  c public.page_niche_configs; v_before text; v_time timestamptz; v_items jsonb:='[]'::jsonb; v_response jsonb; v_remaining integer;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  perform internal.plan_assert_write_input_v1(p_request_schema_version,p_workspace_public_id,p_operation_key,p_plan_public_id);
  if p_request_schema_version is distinct from 1 or p_workspace_public_id is null or p_operation_key is null
    or p_plan_public_id is null or p_limit is null or p_limit not between 1 and 3 or p_lease_minutes is distinct from 30 then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  select * into v_op from internal.claim_operation_for_owner_v1(p_workspace_public_id,p_operation_key,
    'claim_content_plan_items',p_request_schema_version,
    pg_catalog.jsonb_build_object('plan_public_id',p_plan_public_id,'limit',p_limit,'lease_minutes',p_lease_minutes));
  if v_op.claim_state='replay' then
    return internal.plan_replay_operation_v4(v_op.operation_id,'claim_content_plan_items',v_op.response_snapshot);
  elsif v_op.claim_state<>'first_use' then raise exception using errcode='P0001',message='DATABASE_BUSY'; end if;
  select * into v_target from internal.plan_lock_target_v1(v_op.workspace_id,p_plan_public_id,null,'claim_content_plan_items');
  select * into v_plan from public.content_plans where id=v_target.plan_id;
  v_time:=pg_catalog.clock_timestamp();
  for v_item in select i.* from public.content_plan_items i where i.workspace_id=v_op.workspace_id and i.plan_id=v_plan.id
    and v_plan.status<>'completed' and (i.status='pending' or (i.status='in_progress' and i.claim_expires_at<=v_time))
    order by i.position,i.id limit p_limit for update skip locked
  loop
    select * into c from public.page_niche_configs where workspace_id=v_op.workspace_id and page_id=v_plan.page_id and niche_key='trivia';
    if c.config_schema_version=2 then
      perform internal.plan_item_resolve_config2_v2(c,v_item.format_key,v_item.topic_key,v_item.interaction_goal,v_item.item_config);
    end if;
    v_before:=v_item.status;
    update public.content_plan_items set status='in_progress',attempt_count=attempt_count+1,
      claim_token=extensions.gen_random_uuid(),claimed_at=v_time,claim_expires_at=v_time+interval '30 minutes',
      claim_renewal_count=0,started_at=coalesce(started_at,v_time),completed_at=null,
      last_error_code=null,last_error_detail=null
      where id=v_item.id and workspace_id=v_op.workspace_id returning * into v_item;
    perform internal.plan_append_event_v1(v_op.operation_id,v_item,v_plan.public_id,
      case when v_before='pending' then 'claimed' else 'reclaimed' end,v_before);
    v_items:=v_items||pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
      'item',internal.plan_project_item_v1(v_item,v_plan.public_id),'claim_token',v_item.claim_token,
      'claimed_at',internal.iso_timestamp_v1(v_item.claimed_at),'claim_expires_at',internal.iso_timestamp_v1(v_item.claim_expires_at),
      'claim_renewal_count',v_item.claim_renewal_count));
  end loop;
  if pg_catalog.jsonb_array_length(v_items)>0 then perform internal.plan_refresh_status_v1(v_plan.id); end if;
  select count(*) into v_remaining from public.content_plan_items where plan_id=v_plan.id and workspace_id=v_op.workspace_id
    and v_plan.status<>'completed' and (status='pending' or (status='in_progress' and claim_expires_at<=pg_catalog.clock_timestamp()));
  v_response:=pg_catalog.jsonb_build_object('response_schema_version',1,'data',pg_catalog.jsonb_build_object(
    'plan_public_id',v_plan.public_id,'claimed_items',v_items,'remaining_claimable_count',v_remaining,'replayed',false));
  perform internal.plan_complete_operation_v4(v_op.operation_id,'claim_content_plan_items',v_plan.public_id,v_response);
  return v_response;
exception when query_canceled then
  raise exception using errcode='P0001',message='DATABASE_BUSY';
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  perform internal.plan_raise_error_v1(v_state,v_message);
end;
$function$
;

create function internal.editorial_plan_generation_v2(w bigint,page_id uuid,lim integer,topic text,fmt text,goal text,item_id uuid)
returns jsonb language plpgsql volatile security invoker set search_path='' as $$
declare page public.pages; c public.page_niche_configs; item public.content_plan_items; plan public.content_plans;
  result jsonb; resolved jsonb; final_fmt text; final_topic text;
begin
  perform 1 from public.workspaces where id=w for share;
  select * into page from public.pages p where p.workspace_id=w and p.public_id=page_id;
  select * into c from public.page_niche_configs n where n.workspace_id=w and n.page_id=page.id and n.niche_key='trivia';
  select * into item from public.content_plan_items i where i.workspace_id=w and i.page_id=page.id and i.public_id=item_id and i.niche_key='trivia';
  if item.id is null then raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
  select * into plan from public.content_plans where workspace_id=w and id=item.plan_id;
  if plan.status='cancelled' or item.status='cancelled' then raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
  if (fmt is not null and item.format_key is not null and fmt<>item.format_key)
    or (topic is not null and item.topic_key is not null and topic<>item.topic_key) then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  final_fmt:=coalesce(fmt,item.format_key); final_topic:=coalesce(topic,item.topic_key);
  resolved:=internal.plan_item_resolve_config2_v2(c,final_fmt,final_topic,item.interaction_goal,item.item_config);
  result:=internal.editorial_generation_v2(w,page_id,lim,final_topic,final_fmt,goal);
  result:=jsonb_set(result,'{data,generation_rules}',resolved->'rules');
  result:=jsonb_set(result,'{data,editorial_context,effective_rules_hash}',resolved->'rules_hash');
  result:=jsonb_set(result,'{data,plan_context}',jsonb_build_object('plan_public_id',plan.public_id,'plan_item_public_id',item.public_id,
    'item_config',item.item_config,'intent_goal',item.interaction_goal,'status',item.status,'plan_intent',plan.plan_config->'plan_intent',
    'requires_review',plan.plan_config#>>'{context_snapshot,niche_config,updated_at}' is distinct from internal.iso_timestamp_v1(c.updated_at),
    'completed_historical',item.status='completed'));
  if octet_length(result::text)>262144 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  return result;
end; $$;

drop function api.get_page_generation_context(p_request_schema_version integer, p_workspace_public_id uuid, p_page_public_id uuid, p_niche_key text, p_recent_post_limit integer, p_intent_topic_key text, p_intent_format_key text, p_intent_interaction_goal text, p_intent_scheduled_at timestamp with time zone);
CREATE OR REPLACE FUNCTION api.get_page_generation_context(p_request_schema_version integer, p_workspace_public_id uuid, p_page_public_id uuid, p_niche_key text, p_recent_post_limit integer DEFAULT 12, p_intent_topic_key text DEFAULT NULL::text, p_intent_format_key text DEFAULT NULL::text, p_intent_interaction_goal text DEFAULT NULL::text, p_intent_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_plan_item_public_id uuid DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
  if v_page.config_schema_version=2 then
    if p_plan_item_public_id is not null then return internal.editorial_plan_generation_v2(v_workspace.workspace_id,p_page_public_id,p_recent_post_limit,
      p_intent_topic_key,p_intent_format_key,p_intent_interaction_goal,p_plan_item_public_id); end if;
    return internal.editorial_generation_v2(v_workspace.workspace_id,p_page_public_id,p_recent_post_limit,
      p_intent_topic_key,p_intent_format_key,p_intent_interaction_goal);
  end if;
  if p_plan_item_public_id is not null then perform internal.raise_read_error_v1('CONFIG_SCHEMA_UNSUPPORTED'); end if;
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
        'config_schema_version', v_niche.config_schema_version, 'config_schema_versions', jsonb_build_array(1,2),
        'content_schema_versions', jsonb_build_array(2),
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
      'config_public_id', v_page.config_public_id, 'config', v_page.config,
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
$function$
;
grant create on schema api to content_producer_api_owner;
alter function api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamptz,uuid) owner to content_producer_api_owner;
revoke all on function api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamptz,uuid) from public,anon,authenticated,service_role;
grant execute on function api.get_page_generation_context(integer,uuid,uuid,text,integer,text,text,text,timestamptz,uuid) to authenticated;
revoke create on schema api from content_producer_api_owner;

drop function internal.post_prepare_config2_v2(c page_niche_configs, page pages, p_content jsonb, p_format text, p_topic text, p_goal text, p_context jsonb);
CREATE OR REPLACE FUNCTION internal.post_prepare_config2_v2(c page_niche_configs, page pages, p_content jsonb, p_format text, p_topic text, p_goal text, p_context jsonb, p_plan_context jsonb DEFAULT NULL)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare resolved jsonb; rules jsonb; r jsonb; ctx jsonb; snap jsonb;
  f public.trivia_editorial_definitions; t public.trivia_editorial_definitions;
  p public.trivia_editorial_definitions; defs jsonb;
begin
  if c.config_schema_version<>2 or c.workspace_id<>page.workspace_id or c.page_id<>page.id
    or internal.post_editorial_context_shape_config2_v2(p_context) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if p_plan_context is not null and internal.plan_post_context_shape_config2_v2(p_plan_context) is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  resolved:=internal.editorial_resolve_v2(c.workspace_id,c.config,c.editorial_bindings,p_format,coalesce(p_plan_context->'item_config','{}'::jsonb));
  if p_plan_context#>'{item_config,profile_key}' is not null and p_context->'profile_key' is distinct from p_plan_context#>'{item_config,profile_key}' then
    raise exception using errcode='P0001',message='PROFILE_UNSUPPORTED'; end if;
  rules:=resolved->'rules';
  if p_format is null or not(rules->'allowed_formats' ? p_format) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if p_topic is null or not(rules->'allowed_topics' ? p_topic) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if p_context->'editorial_profile_ref' is distinct from c.config->'editorial_profile_ref'
    or p_context->>'effective_rules_hash' is distinct from resolved->>'rules_hash' then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  if p_context->'format_ref' is distinct from rules->'format_reference'
    or not(c.config->'allowed_topic_refs' @> jsonb_build_array(p_context->'topic_ref')) then
    raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
  p:=internal.editorial_reference_v1(c.workspace_id,p_context->'editorial_profile_ref','profile',
    internal.editorial_bound_time_v2(c.editorial_bindings,'profile',p_context->'editorial_profile_ref'));
  f:=internal.editorial_reference_v1(c.workspace_id,p_context->'format_ref','format',
    internal.editorial_bound_time_v2(c.editorial_bindings,'format',p_context->'format_ref'));
  t:=internal.editorial_reference_v1(c.workspace_id,p_context->'topic_ref','topic',
    internal.editorial_bound_time_v2(c.editorial_bindings,'topic',p_context->'topic_ref'));
  if f.key is distinct from p_format or t.key is distinct from p_topic
    or not(f.payload->'architectures' ? (p_context->>'architecture')) then
    raise exception using errcode='P0001',message='EDITORIAL_DEFINITION_UNAVAILABLE'; end if;
  if p_context->'profile_key'<>'null'::jsonb
    and not(rules#>'{preferences,density_preferences}' ? (p_context->>'profile_key')) then
    raise exception using errcode='P0001',message='PROFILE_UNSUPPORTED'; end if;
  r:=internal.post_render_config2_v2(p_content,rules,p_goal,p_context->'cta_actions');
  ctx:=p_context||jsonb_build_object('cta_actions',r->'cta_actions');
  -- Effective rules contain profile preferences and selected format guidance;
  -- immutable references recover full examples. Topic scope is retained inline.
  defs:=jsonb_build_object(
    'profile',jsonb_build_object('reference',ctx->'editorial_profile_ref','key',p.key,'definition_schema_version',p.definition_schema_version),
    'format',jsonb_build_object('reference',ctx->'format_ref','key',f.key,'definition_schema_version',f.definition_schema_version),
    'topic',jsonb_build_object('reference',ctx->'topic_ref','key',t.key,'definition_schema_version',t.definition_schema_version,'payload',t.payload-'examples'));
  snap:=jsonb_build_object('schema_version',3,'content_schema_version',2,'config_schema_version',2,
    'config_public_id',c.public_id,'config_updated_at',internal.iso_timestamp_v1(c.updated_at),
    'fact_count',rules->'fact_count','fact_count_applied',jsonb_array_length(r#>'{content_payload,body,facts}'),
    'text_budget',rules->'text_budget','fact_reuse_scope',rules->'fact_reuse_scope',
    'profile_key',ctx->'profile_key','render_style',rules->'render_style','target_markets',to_jsonb(page.target_markets),
    'locale','en-US','line_width_chars',34,'target_video_seconds',13,'estimator_version',1,
    'editorial_context',ctx,'editorial_definitions',defs,'effective_rules',rules,'effective_rules_hash',resolved->'rules_hash',
    'cta',jsonb_build_object('text',r#>'{content_payload,cta}','placement',r#>'{content_payload,cta_placement}','actions',r->'cta_actions'));
  if p_plan_context is not null then snap:=snap||jsonb_build_object('plan_context',p_plan_context); end if;
  if octet_length(snap::text)>131072 then raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  return jsonb_build_object('content',r->'content_payload','snapshot',snap);
end; $function$
;

CREATE OR REPLACE FUNCTION internal.post_generation_config2_valid_v2(s jsonb)
 RETURNS boolean
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare k text; ctx jsonb:=s->'editorial_context'; rules jsonb:=s->'effective_rules'; d jsonb;
begin
  if (octet_length(s::text)>131072
    or internal.has_exact_json_keys(s-'plan_context',array['schema_version','content_schema_version','config_schema_version','config_public_id','config_updated_at',
      'fact_count','fact_count_applied','text_budget','fact_reuse_scope','profile_key','render_style','target_markets','locale',
      'line_width_chars','target_video_seconds','estimator_version','editorial_context','editorial_definitions','effective_rules','effective_rules_hash','cta']) is distinct from true
    or s->'schema_version' is distinct from '3'::jsonb or s->'content_schema_version' is distinct from '2'::jsonb
    or s->'config_schema_version' is distinct from '2'::jsonb
    or internal.plan_is_uuid_v1(s->'config_public_id') is distinct from true
    or internal.trivia_is_valid_rfc3339_v1(s->>'config_updated_at') is distinct from true
    or s->>'config_updated_at' !~ '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$'
    or internal.post_editorial_context_shape_config2_v2(ctx) is distinct from true
    or s->'effective_rules_hash' is distinct from ctx->'effective_rules_hash'
    or rules->'config_schema_version' is distinct from '2'::jsonb
    or rules->'editorial_profile_ref' is distinct from ctx->'editorial_profile_ref'
    or rules->'format_reference' is distinct from ctx->'format_ref'
    or internal.editorial_count_v2(s->'fact_count') is distinct from true
    or internal.is_json_integer_between(s->'fact_count_applied',1,12) is distinct from true
    or s->>'fact_reuse_scope' not in ('workspace_unique','page_unique')
    or s->>'render_style' not in ('plain_lines','numbered') or s->>'locale' is distinct from 'en-US'
    or jsonb_typeof(s->'target_markets') is distinct from 'array' or jsonb_array_length(s->'target_markets')=0
    or s->'line_width_chars' is distinct from '34'::jsonb or s->'target_video_seconds' is distinct from '13'::jsonb
    or s->'estimator_version' is distinct from '1'::jsonb or s->'profile_key' is distinct from ctx->'profile_key'
    or (s->'profile_key'<>'null'::jsonb and not(rules#>'{preferences,density_preferences}' ? (s->>'profile_key')))
    or internal.has_exact_json_keys(s->'editorial_definitions',array['profile','format','topic']) is distinct from true
    or internal.has_exact_json_keys(s->'cta',array['text','placement','actions']) is distinct from true
    or s#>'{cta,actions}' is distinct from ctx->'cta_actions'
    or jsonb_typeof(s#>'{editorial_definitions,topic,payload}') is distinct from 'object'
    or not (coalesce(rules#>'{format_guidance,architectures}','[]'::jsonb) ? (ctx->>'architecture'))
    or not (rules->'allowed_formats' ? (s#>>'{editorial_definitions,format,key}'))
    or not (rules->'allowed_topics' ? (s#>>'{editorial_definitions,topic,key}'))
    ) is distinct from false then return false; end if;
  if s ? 'plan_context' and internal.plan_post_context_shape_config2_v2(s->'plan_context') is distinct from true then return false; end if;
  foreach k in array array['fact_count','text_budget','fact_reuse_scope','render_style','locale'] loop
    if s->k is distinct from rules->k then return false; end if;
  end loop;
  foreach k in array array['profile','format','topic'] loop
    d:=s#>array['editorial_definitions',k];
    if internal.has_exact_json_keys(d-(case when k='topic' then 'payload' else '' end),array['reference','key','definition_schema_version']) is distinct from true
      or d->'reference' is distinct from ctx->(case when k='profile' then 'editorial_profile_ref' else k||'_ref' end)
      or d->'definition_schema_version' is distinct from '1'::jsonb
      or jsonb_typeof(d->'key') is distinct from 'string'
      or d->>'key' !~ '^[a-z][a-z0-9_]{1,49}$' then return false; end if;
  end loop;
  return true;
exception when others then return false;
end; $function$
;

CREATE OR REPLACE FUNCTION api.save_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_page_public_id uuid, p_niche_key text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text DEFAULT NULL::text, p_scheduled_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_plan_item jsonb DEFAULT NULL::jsonb, p_facts jsonb DEFAULT NULL::jsonb, p_content_payload jsonb DEFAULT NULL::jsonb, p_editorial_checks jsonb DEFAULT NULL::jsonb, p_editorial_context jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prepared jsonb; o record; c public.page_niche_configs; page public.pages;
  plan public.content_plans; item public.content_plan_items; post public.posts;
  fact public.trivia_facts; entry jsonb; content jsonb; snapshot jsonb;
  result jsonb; summary jsonb:='null'::jsonb; budget jsonb; metrics jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; editorial jsonb; systems jsonb;
  v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_niche_key is distinct from 'trivia'
    or p_workspace_public_id is null or p_page_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or (p_scheduled_at is not null and not pg_catalog.isfinite(p_scheduled_at))
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 12
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED';
  end if;
  if p_plan_item is not null and p_plan_item<>'null'::jsonb and (
    internal.has_exact_json_keys(p_plan_item,array['plan_item_public_id','claim_token'])
      is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'plan_item_public_id') is distinct from true
    or internal.plan_is_uuid_v1(p_plan_item->'claim_token') is distinct from true) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  if p_editorial_context is null or p_editorial_context='null'::jsonb then
    content:=internal.post_render_v2(p_content_payload);
  else
    if internal.post_editorial_context_shape_config2_v2(p_editorial_context) is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    content:=internal.post_render_config2_v2(p_content_payload,
      internal.post_engine_rules_config2_v2(p_content_payload->>'render_style'),
      p_interaction_goal,p_editorial_context->'cta_actions')->'content_payload';
  end if;
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;

  -- Claim first: a completed operation replays before any mutable config,
  -- catalog or claim/lease check. The semantic payload is never normalized by
  -- a JavaScript date conversion or changed on a retry.
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'save_post_v2',2,
    pg_catalog.jsonb_build_object('page_public_id',p_page_public_id,
      'niche_key',p_niche_key,'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'scheduled_at',internal.iso_timestamp_v1(p_scheduled_at),
      'plan_item',coalesce(p_plan_item,'null'::jsonb),
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks)
      ||case when p_editorial_context is null or p_editorial_context='null'::jsonb then '{}'::jsonb
        else pg_catalog.jsonb_build_object('editorial_context',p_editorial_context) end);
  if o.claim_state='replay' then return internal.post_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  c:=internal.trivia_lock_page_v1(o.workspace_id,p_page_public_id);
  select * into page from public.pages where workspace_id=o.workspace_id and id=c.page_id;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  if c.config_schema_version=2 then
    if p_plan_item is null or p_plan_item='null'::jsonb then
    prepared:=internal.post_prepare_config2_v2(c,page,content,p_format_key,p_topic_key,p_interaction_goal,p_editorial_context);
    content:=prepared->'content'; snapshot:=prepared->'snapshot';
    end if;
  else
    if p_editorial_context is not null and p_editorial_context<>'null'::jsonb then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if internal.is_valid_trivia_config_v1(c.config) is distinct from true then
    raise exception using errcode='P0001',message='CONFIG_INVALID'; end if;
  if p_format_key is null or not(c.config->'allowed_formats' ? p_format_key) then
    raise exception using errcode='P0001',message='FORMAT_UNSUPPORTED'; end if;
  if p_topic_key is null or not(c.config->'allowed_topics' ? p_topic_key) then
    raise exception using errcode='P0001',message='TOPIC_UNSUPPORTED'; end if;
  if p_interaction_goal is null
    or not(c.config->'allowed_interaction_goals' ? p_interaction_goal) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  if content->>'render_style' is distinct from c.config->>'render_style' then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  if not (case c.config#>>'{fact_count,mode}'
      when 'fixed' then count_facts=(c.config#>>'{fact_count,value}')::integer
      else count_facts between (c.config#>>'{fact_count,min}')::integer
        and (c.config#>>'{fact_count,max}')::integer end) then
    raise exception using errcode='P0001',message='CONTENT_PAYLOAD_INVALID',
      detail='facts'; end if;
  budget:=c.config->'text_budget'; metrics:=content->'text_metrics';
  if (metrics->>'hook_chars')::integer>(budget->>'hook_max_chars')::integer
    or (metrics->>'cta_chars')::integer>(budget->>'cta_max_chars')::integer
    or (metrics->>'facts_total_chars')::integer>(budget->>'facts_total_max_chars')::integer
    or (metrics->>'canva_total_chars')::integer>(budget->>'canva_total_max_chars')::integer
    or exists(select 1 from pg_catalog.jsonb_array_elements(metrics->'fact_chars') x
      where (x.value#>>'{}')::integer>(budget->>'fact_max_chars')::integer)
    or pg_catalog.char_length(content->>'caption')>
      (c.config#>>'{caption,max_chars}')::integer
    or pg_catalog.jsonb_array_length(content->'hashtags') not between
      (c.config#>>'{hashtags,min_count}')::integer and
      (c.config#>>'{hashtags,max_count}')::integer then
    raise exception using errcode='P0001',message='CONTENT_BUDGET_EXCEEDED'; end if;

  end if;
  perform internal.post_lock_slots_v1(page.id,null,p_scheduled_at);
  if p_plan_item is not null and p_plan_item<>'null'::jsonb then
    select * into item from public.content_plan_items where workspace_id=o.workspace_id
      and public_id=(p_plan_item->>'plan_item_public_id')::uuid
      and page_id=page.id and niche_key='trivia';
    if item.id is null then
      raise exception using errcode='P0001',message='PLAN_ITEM_NOT_FOUND'; end if;
    select * into plan from public.content_plans where id=item.plan_id
      and workspace_id=o.workspace_id for update;
    select * into item from public.content_plan_items where id=item.id
      and workspace_id=o.workspace_id for update;
    if plan.status='cancelled' then
      raise exception using errcode='P0001',message='PLAN_STATUS_CONFLICT'; end if;
    if c.config_schema_version=2 then
      perform internal.plan_item_resolve_config2_v2(c,item.format_key,item.topic_key,item.interaction_goal,item.item_config);
      prepared:=internal.post_prepare_config2_v2(c,page,content,p_format_key,p_topic_key,p_interaction_goal,p_editorial_context,
        pg_catalog.jsonb_build_object('plan_public_id',plan.public_id,'plan_item_public_id',item.public_id,'item_config',item.item_config,'intent_goal',item.interaction_goal));
      content:=prepared->'content'; snapshot:=prepared->'snapshot';
    end if;
    perform internal.plan_assert_current_claim_v1(item,
      (p_plan_item->>'claim_token')::uuid);
    if item.scheduled_at is distinct from p_scheduled_at
      or (item.format_key is not null and item.format_key<>p_format_key)
      or (item.topic_key is not null and item.topic_key<>p_topic_key)
      or (c.config_schema_version=1 and item.interaction_goal is not null
        and item.interaction_goal<>p_interaction_goal) then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    if c.config_schema_version=1 and plan.plan_config ? 'context_snapshot' and
      (plan.plan_config#>>'{context_snapshot,niche_config,updated_at}')::timestamptz
        <>c.updated_at then
      raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  end if;
  perform internal.assert_page_schedule_available(page.id,p_scheduled_at,item.id,null);

  -- Validate every final fact against the same locked catalog before the
  -- first identity is inserted; newly inserted facts need no invented reviews.
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    if entry->>'candidate_key'=any(seen_keys)
      or internal.trivia_normalize_claim_v1(entry->>'claim_text')=any(seen_normal)
      or content#>>array['body','facts',(i-1)::text,'text'] is null then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    seen_keys:=pg_catalog.array_append(seen_keys,entry->>'candidate_key');
    seen_normal:=pg_catalog.array_append(seen_normal,
      internal.trivia_normalize_claim_v1(entry->>'claim_text'));
    selected:=internal.post_fact_review_v2(o.workspace_id,entry,i);
    if selected is not null and selected=any(resolved) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    resolved:=pg_catalog.array_append(resolved,selected);
  end loop;

  if c.config_schema_version=1 then
  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  end if;
  insert into public.posts(workspace_id,page_id,niche_key,content_plan_item_id,
    created_by_operation_id,format_key,topic_key,interaction_goal,
    content_schema_version,content_payload,generation_snapshot,content_hash,scheduled_at)
  values(o.workspace_id,page.id,'trivia',item.id,o.operation_id,p_format_key,
    p_topic_key,p_interaction_goal,2,content,snapshot,pg_catalog.repeat('0',64),
    p_scheduled_at) returning * into post;
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    selected:=resolved[i];
    if selected is null then
      insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
        claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
        qualifiers,ontology_version,structured_key,structured_hash,topic_key,
        dedup_review_snapshot,source_data,freshness_class,risk_class)
      values(o.workspace_id,entry->>'claim_text','',pg_catalog.repeat('0',64),
        false,null,null,null,null,null,null,null,null,null,null,null,null,null)
      returning * into fact;
    else
      select * into fact from public.trivia_facts where workspace_id=o.workspace_id
        and id=selected for update;
    end if;
    if fact.id is null or fact.verification_status in
      ('invalidated','superseded','rejected')
      or (fact.reservation_status='reserved'
        and fact.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||i||']'; end if;
    if exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=o.workspace_id and u.fact_id=fact.id
        and u.is_current and u.allocation_state in ('allocated','published')
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=page.id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,page.id,post.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;
  post.content_hash:=internal.post_hash_v2(post);
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',1,'content_hash',post.content_hash,'overall_status','passed',
    'checks',p_editorial_checks);
  update public.posts set content_hash=post.content_hash,system_checks=systems,
    editorial_checks=editorial,quality_status='passed'
    where id=post.id returning * into post;
  if item.id is not null then
    update public.content_plan_items set status='completed',
      completed_at=pg_catalog.clock_timestamp(),claim_token=null,
      claimed_at=null,claim_expires_at=null,claim_renewal_count=0,
      last_error_code=null,last_error_detail=null
      where id=item.id returning * into item;
    perform internal.plan_append_event_v1(o.operation_id,item,plan.public_id,
      'completed','in_progress');
    perform internal.plan_refresh_status_v1(plan.id);
    summary:=internal.plan_project_summary_v1(plan.id);
    summary:=pg_catalog.jsonb_build_object('plan_public_id',summary->'plan_public_id',
      'requested_count',summary->'requested_count','status',summary->'status',
      'progress',summary->'progress');
  end if;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',post.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',post.revision,
      'content_hash',post.content_hash),'plan',summary,'replayed',false));
  perform internal.post_complete_v2(o.operation_id,post,result);
  return result;
exception when query_canceled then
  perform internal.post_raise_v1('57014','');
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  if v_message=any(array['FACT_CATALOG_CONFLICT','PAGE_VERSION_CONFLICT',
    'FACT_REVIEW_REQUIRED','EDITORIAL_REVIEW_REQUIRED','CONTENT_BUDGET_EXCEEDED','EDITORIAL_DEFINITION_UNAVAILABLE'])
    then raise; end if;
  perform internal.post_raise_v1(v_state,v_message);
end;
$function$
;

CREATE OR REPLACE FUNCTION api.revise_post_v2(p_request_schema_version integer, p_workspace_public_id uuid, p_operation_key uuid, p_post_public_id uuid, p_expected_revision integer, p_expected_content_hash text, p_config_public_id uuid, p_expected_config_updated_at text, p_expected_catalog_version text, p_content_schema_version integer, p_format_key text, p_topic_key text, p_interaction_goal text DEFAULT NULL::text, p_facts jsonb DEFAULT NULL::jsonb, p_content_payload jsonb DEFAULT NULL::jsonb, p_editorial_checks jsonb DEFAULT NULL::jsonb, p_revision_reason text DEFAULT NULL::text, p_editorial_context jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare prepared jsonb; o record; p public.posts; old public.posts; c public.page_niche_configs;
  page public.pages; fact public.trivia_facts; entry jsonb; content jsonb;
  snapshot jsonb; result jsonb; editorial jsonb; systems jsonb;
  resolved bigint[]:='{}'; selected bigint; seen_keys text[]:='{}';
  seen_normal text[]:='{}'; count_facts integer; i integer:=0;
  catalog bigint; v_state text; v_message text;
begin
  perform internal.assert_request_context_v1();
  if p_request_schema_version is distinct from 2
    or p_content_schema_version is distinct from 2
    or p_workspace_public_id is null or p_post_public_id is null
    or p_config_public_id is null or p_operation_key is null
    or internal.trivia_is_valid_uuid_v4_v1(p_operation_key::text) is distinct from true
    or p_expected_revision is null or p_expected_revision<1
    or p_expected_content_hash !~ '^[0-9a-f]{64}$'
    or p_expected_config_updated_at is null
    or p_expected_config_updated_at !~
      '^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}(Z|[+-]\d{2}:\d{2})$'
    or internal.trivia_is_valid_rfc3339_v1(p_expected_config_updated_at)
      is distinct from true
    or p_expected_catalog_version !~ '^(0|[1-9][0-9]*)$'
    or pg_catalog.char_length(p_expected_catalog_version)>19
    or pg_catalog.jsonb_typeof(p_facts) is distinct from 'array'
    or pg_catalog.jsonb_array_length(p_facts) not between 1 and 12
    or internal.has_exact_json_keys(p_editorial_checks,array[
      'meaning_preserved','caption_no_new_claim','no_known_substantive_issue'])
      is distinct from true
    or internal.plan_safe_reason_v1(pg_catalog.btrim(p_revision_reason))
      is distinct from true then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_editorial_checks->>'meaning_preserved'<>'pass'
    or p_editorial_checks->>'caption_no_new_claim'<>'pass'
    or p_editorial_checks->>'no_known_substantive_issue'<>'pass' then
    raise exception using errcode='P0001',message='EDITORIAL_REVIEW_REQUIRED'; end if;
  count_facts:=pg_catalog.jsonb_array_length(p_facts);
  if p_editorial_context is null or p_editorial_context='null'::jsonb then
    content:=internal.post_render_v2(p_content_payload);
  else
    if internal.post_editorial_context_shape_config2_v2(p_editorial_context) is distinct from true then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
    content:=internal.post_render_config2_v2(p_content_payload,
      internal.post_engine_rules_config2_v2(p_content_payload->>'render_style'),
      p_interaction_goal,p_editorial_context->'cta_actions')->'content_payload';
  end if;
  if pg_catalog.jsonb_array_length(content#>'{body,facts}')<>count_facts then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  select * into o from internal.claim_operation_for_owner_v1(
    p_workspace_public_id,p_operation_key,'revise_post_v2',2,
    pg_catalog.jsonb_build_object('post_public_id',p_post_public_id,
      'expected_revision',p_expected_revision,
      'expected_content_hash',p_expected_content_hash,
      'config_public_id',p_config_public_id,
      'expected_config_updated_at',p_expected_config_updated_at,
      'expected_catalog_version',p_expected_catalog_version,
      'content_schema_version',2,'format_key',p_format_key,
      'topic_key',p_topic_key,'interaction_goal',p_interaction_goal,
      'facts',p_facts,'content_payload',content,
      'editorial_checks',p_editorial_checks,
      'revision_reason',pg_catalog.btrim(p_revision_reason))
      ||case when p_editorial_context is null or p_editorial_context='null'::jsonb then '{}'::jsonb
        else pg_catalog.jsonb_build_object('editorial_context',p_editorial_context) end);
  if o.claim_state='replay' then
    return internal.post_revise_replay_v2(o.operation_id); end if;

  perform internal.trivia_lock_workspace_v1(o.workspace_id);
  p:=internal.post_lock_target_v1(o.workspace_id,p_post_public_id);
  old:=p;
  if p.content_schema_version<>2 then
    raise exception using errcode='P0001',message='CONTENT_SCHEMA_UNSUPPORTED'; end if;
  if p.revision<>p_expected_revision then
    raise exception using errcode='P0001',message='REVISION_CONFLICT'; end if;
  if p.content_hash<>p_expected_content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.status not in ('draft','ready') then
    raise exception using errcode='P0001',message='INVALID_STATUS_TRANSITION'; end if;
  select * into c from public.page_niche_configs where page_id=p.page_id
    and workspace_id=o.workspace_id and niche_key='trivia';
  select * into page from public.pages where id=p.page_id
    and workspace_id=o.workspace_id;
  if not page.is_active or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  if c.public_id is distinct from p_config_public_id
    or c.updated_at is distinct from p_expected_config_updated_at::timestamptz then
    raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  select version into catalog from internal.trivia_fact_catalog_v2
    where workspace_id=o.workspace_id;
  if coalesce(catalog,0)::text is distinct from p_expected_catalog_version then
    raise exception using errcode='P0001',message='FACT_CATALOG_CONFLICT'; end if;
  if c.config_schema_version=2 then
    prepared:=internal.post_prepare_config2_v2(c,page,content,p_format_key,p_topic_key,p_interaction_goal,p_editorial_context,p.generation_snapshot->'plan_context');
    content:=prepared->'content'; snapshot:=prepared->'snapshot';
  else
    if p_editorial_context is not null and p_editorial_context<>'null'::jsonb then
      raise exception using errcode='P0001',message='VALIDATION_FAILED'; end if;
  perform internal.post_assert_edit_v2(c,content,count_facts,p_format_key,
    p_topic_key,p_interaction_goal);
  end if;


  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1;
    if entry->>'candidate_key'=any(seen_keys)
      or internal.trivia_normalize_claim_v1(entry->>'claim_text')=any(seen_normal)
      or content#>>array['body','facts',(i-1)::text,'text'] is null then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    seen_keys:=pg_catalog.array_append(seen_keys,entry->>'candidate_key');
    seen_normal:=pg_catalog.array_append(seen_normal,
      internal.trivia_normalize_claim_v1(entry->>'claim_text'));
    selected:=internal.post_fact_review_v2(o.workspace_id,entry,i);
    if selected is not null and selected=any(resolved) then
      raise exception using errcode='P0001',message='FACT_REVIEW_REQUIRED',
        detail='facts['||i||']'; end if;
    resolved:=pg_catalog.array_append(resolved,selected);
  end loop;

  -- Every previous usage row remains immutable. Retained identities receive
  -- successor bindings too, so a draft-local URL update never edits history.
  update public.trivia_post_facts set allocation_state='released',
    released_at=pg_catalog.clock_timestamp(),is_current=false
    where workspace_id=o.workspace_id and post_id=p.id and is_current
      and allocation_state='allocated';
  i:=0;
  for entry in select value from pg_catalog.jsonb_array_elements(p_facts) loop
    i:=i+1; selected:=resolved[i];
    if selected is null then
      insert into public.trivia_facts(workspace_id,claim_text,normalized_claim,
        claim_hash,has_v1_envelope,subject_key,relation_key,object_key,numbers,
        qualifiers,ontology_version,structured_key,structured_hash,topic_key,
        dedup_review_snapshot,source_data,freshness_class,risk_class)
      values(o.workspace_id,entry->>'claim_text','',pg_catalog.repeat('0',64),
        false,null,null,null,null,null,null,null,null,null,null,null,null,null)
      returning * into fact;
    else
      select * into fact from public.trivia_facts where workspace_id=o.workspace_id
        and id=selected for update;
    end if;
    if fact.id is null or fact.verification_status in
      ('invalidated','superseded','rejected')
      or (fact.reservation_status='reserved'
        and fact.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE',
        detail='facts['||i||']'; end if;
    if exists(select 1 from public.trivia_post_facts u
      where u.workspace_id=o.workspace_id and u.fact_id=fact.id
        and u.is_current and u.allocation_state in ('allocated','published')
        and u.post_id<>p.id
        and (c.config->>'fact_reuse_scope'='workspace_unique'
          or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED',
        detail='facts['||i||']'; end if;
    insert into public.trivia_fact_evidence_v2(workspace_id,fact_id,source_url)
      values(o.workspace_id,fact.id,entry->>'source_url')
      on conflict (workspace_id,fact_id) do nothing;
    insert into public.trivia_post_facts(workspace_id,page_id,post_id,fact_id,
      position,fact_role,rendered_text,claim_hash_snapshot,source_snapshot,
      verified_at_snapshot,snapshot_schema_version)
    values(o.workspace_id,p.page_id,p.id,fact.id,i,'general',
      content#>>array['body','facts',(i-1)::text,'text'],fact.claim_hash,
      pg_catalog.jsonb_build_object('schema_version',2,
        'canonical_claim',fact.claim_text,'source_url',entry->>'source_url'),
      null,2);
  end loop;

  if c.config_schema_version=1 then
  snapshot:=internal.post_generation_v2(c,page,content,
    case when p_format_key='themed_utility' then 'practical_utility'
      else 'fast_trivia' end);
  end if;
  p.content_payload:=content; p.generation_snapshot:=snapshot;
  p.format_key:=p_format_key; p.topic_key:=p_topic_key;
  p.interaction_goal:=p_interaction_goal;
  p.content_hash:=internal.post_hash_v2(p);
  p.revision:=p.revision+1;
  systems:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
  editorial:=pg_catalog.jsonb_build_object('schema_version',2,
    'post_revision',p.revision,'content_hash',p.content_hash,
    'overall_status','passed','checks',p_editorial_checks);
  update public.posts set status='draft',revision=p.revision,
    format_key=p_format_key,topic_key=p_topic_key,interaction_goal=p_interaction_goal,
    content_payload=content,generation_snapshot=snapshot,content_hash=p.content_hash,
    system_checks=systems,editorial_checks=editorial,quality_status='passed',
    ready_at=null,approval_snapshot=null
    where id=p.id returning * into p;
  result:=pg_catalog.jsonb_build_object('response_schema_version',2,'data',
    pg_catalog.jsonb_build_object('post',pg_catalog.jsonb_build_object(
      'post_public_id',p.public_id,'page_public_id',page.public_id,
      'content_schema_version',2,'status','draft','revision',p.revision,
      'content_hash',p.content_hash),'plan','null'::jsonb,'replayed',false));
  perform internal.post_revise_complete_v2(o.operation_id,p,result,old,
    pg_catalog.btrim(p_revision_reason));
  return result;
exception when query_canceled then
  perform internal.post_raise_v1('57014','');
when others then
  get stacked diagnostics v_state=returned_sqlstate,v_message=message_text;
  if v_message=any(array['FACT_CATALOG_CONFLICT','PAGE_VERSION_CONFLICT',
    'FACT_REVIEW_REQUIRED','EDITORIAL_REVIEW_REQUIRED','CONTENT_BUDGET_EXCEEDED','EDITORIAL_DEFINITION_UNAVAILABLE'])
    then raise; end if;
  perform internal.post_raise_v1(v_state,v_message);
end;
$function$
;

CREATE OR REPLACE FUNCTION internal.lifecycle_current_system_v2(p posts)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare c public.page_niche_configs; page public.pages; j public.trivia_post_facts;
  f public.trivia_facts; content jsonb; prepared jsonb; n integer:=0; seen bigint[]:='{}';
begin
  select * into c from public.page_niche_configs where workspace_id=p.workspace_id
    and page_id=p.page_id and niche_key=p.niche_key;
  select * into page from public.pages where workspace_id=p.workspace_id and id=p.page_id;
  if p.niche_key<>'trivia' or page.id is null or not page.is_active
    or c.id is null or not c.is_enabled then
    raise exception using errcode='P0001',message='MODULE_DISABLED'; end if;
  if p.generation_snapshot->'schema_version'='3'::jsonb then
    if c.config_schema_version<>2 then raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
    prepared:=internal.post_prepare_config2_v2(c,page,p.content_payload,p.format_key,p.topic_key,p.interaction_goal,p.generation_snapshot->'editorial_context',p.generation_snapshot->'plan_context');
    content:=prepared->'content';
    if prepared->'snapshot' is distinct from p.generation_snapshot then
      raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  else
    if c.config_schema_version<>1 then raise exception using errcode='P0001',message='PAGE_VERSION_CONFLICT'; end if;
  content:=internal.post_render_v2(p.content_payload);
  if content is distinct from p.content_payload then
    raise exception using errcode='P0001',message='CONTENT_RENDER_MISMATCH'; end if;
  perform internal.post_assert_edit_v2(c,content,
    pg_catalog.jsonb_array_length(content#>'{body,facts}'),p.format_key,p.topic_key,p.interaction_goal);
  if p.generation_snapshot->>'locale' is distinct from c.config#>>'{style,english_variant}'
    or p.generation_snapshot->>'profile_key' is distinct from
      (case when p.format_key='themed_utility' then 'practical_utility' else 'fast_trivia' end) then
    raise exception using errcode='P0001',message='QUALITY_SYSTEM_CHECK_FAILED'; end if;
  end if;
  for j in select * from public.trivia_post_facts where workspace_id=p.workspace_id
    and post_id=p.id and is_current order by position loop
    n:=n+1;
    select * into f from public.trivia_facts where workspace_id=p.workspace_id and id=j.fact_id;
    if j.position<>n or j.page_id<>p.page_id or j.snapshot_schema_version<>2
      or j.allocation_state<>'allocated' or f.id is null or f.id=any(seen)
      or j.rendered_text is distinct from content#>>array['body','facts',(n-1)::text,'text']
      or j.claim_hash_snapshot is distinct from f.claim_hash
      or j.source_snapshot->>'canonical_claim' is distinct from f.claim_text then
      raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
    seen:=pg_catalog.array_append(seen,f.id);
    if internal.has_exact_json_keys(j.source_snapshot,array[
      'schema_version','canonical_claim','source_url']) is distinct from true
      or j.source_snapshot->'schema_version' is distinct from '2'::jsonb
      or internal.trivia_web_source_url_v2(j.source_snapshot->>'source_url') is distinct from true then
      raise exception using errcode='P0001',message='FACT_SOURCE_INSUFFICIENT'; end if;
    if f.verification_status in ('invalidated','superseded','rejected')
      or exists(select 1 from public.trivia_facts sf where sf.workspace_id=p.workspace_id
        and sf.supersedes_fact_id=f.id and sf.verification_status in ('needs_review','verified'))
      or (f.reservation_status='reserved' and f.reserved_until>pg_catalog.clock_timestamp()) then
      raise exception using errcode='P0001',message='FACT_NOT_ELIGIBLE'; end if;
    if exists(select 1 from public.trivia_post_facts u where u.workspace_id=p.workspace_id
      and u.fact_id=f.id and u.post_id<>p.id and u.is_current
      and u.allocation_state in ('allocated','published')
      and (c.config->>'fact_reuse_scope'='workspace_unique' or u.page_id=p.page_id)) then
      raise exception using errcode='P0001',message='FACT_REUSE_BLOCKED'; end if;
  end loop;
  if n not between 1 and (case when p.generation_snapshot->'schema_version'='3'::jsonb then 12 else 9 end) or n<>pg_catalog.jsonb_array_length(content#>'{body,facts}') then
    raise exception using errcode='P0001',message='MODULE_RELATION_INVALID'; end if;
  if internal.post_hash_v2(p) is distinct from p.content_hash then
    raise exception using errcode='P0001',message='CONTENT_HASH_CONFLICT'; end if;
  if p.scheduled_at is not null and (exists(select 1 from public.posts pp
    where pp.page_id=p.page_id and pp.id<>p.id and pp.status<>'discarded' and pp.scheduled_at=p.scheduled_at)
    or exists(select 1 from public.content_plan_items i where i.page_id=p.page_id
      and i.id is distinct from p.content_plan_item_id and i.status<>'cancelled'
      and i.scheduled_at=p.scheduled_at)) then
    raise exception using errcode='P0001',message='SCHEDULE_CONFLICT'; end if;
  -- Only the revision binding changes; these are newly computed server results.
  return pg_catalog.jsonb_build_object('schema_version',2,'post_revision',p.revision+1,
    'content_hash',p.content_hash,'overall_status','passed','checks',pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object('id','trivia.facts.count_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.exact_match','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.render.hard_budget','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.sources.url_valid','status','passed'),
      pg_catalog.jsonb_build_object('id','trivia.reuse.allowed','status','passed')));
end; $function$
;

CREATE OR REPLACE FUNCTION api.get_content_plan(p_request_schema_version integer, p_workspace_public_id uuid, p_plan_public_id uuid, p_item_statuses text[] DEFAULT NULL::text[], p_limit integer DEFAULT 50, p_cursor text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    ) || case when exists(select 1 from public.page_niche_configs c where c.workspace_id=v_plan.workspace_id and c.page_id=v_plan.page_id and c.niche_key=v_plan.niche_key and c.config_schema_version=2) then
      jsonb_build_object('page_review',jsonb_build_object('plan_config_updated_at',v_plan.plan_config#>'{context_snapshot,niche_config,updated_at}',
        'current_config_updated_at',(select internal.iso_timestamp_v1(c.updated_at) from public.page_niche_configs c where c.workspace_id=v_plan.workspace_id and c.page_id=v_plan.page_id and c.niche_key=v_plan.niche_key),
        'requires_review',(select internal.iso_timestamp_v1(c.updated_at) from public.page_niche_configs c where c.workspace_id=v_plan.workspace_id and c.page_id=v_plan.page_id and c.niche_key=v_plan.niche_key) is distinct from v_plan.plan_config#>>'{context_snapshot,niche_config,updated_at}',
        'completed_historical_count',(select count(*) from public.content_plan_items i where i.plan_id=v_plan.id and i.workspace_id=v_plan.workspace_id and i.status='completed'))) else '{}'::jsonb end
  );
end;
$function$
;

CREATE OR REPLACE FUNCTION internal.plan_raise_error_v1(p_sqlstate text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_sqlstate in ('40P01','40001','55P03','57014') then
    raise exception using errcode='P0001',message='DATABASE_BUSY';
  end if;
  if p_sqlstate='P0001' and p_message in ('AUTH_REQUIRED','OAUTH_CLIENT_REQUIRED','OWNER_ACCESS_REQUIRED',
    'OPERATION_KEY_REUSED','RATE_LIMITED','DATABASE_BUSY','VALIDATION_FAILED','PLAN_NOT_FOUND','PLAN_ITEM_NOT_FOUND',
    'PLAN_STATUS_CONFLICT','PLAN_ITEM_CLAIM_MISMATCH','PLAN_ITEM_CLAIM_EXPIRED','PLAN_CLAIM_RENEWAL_LIMIT',
    'PLAN_ITEM_REPLACEMENT_BLOCKED','POST_NOT_FOUND','SCHEDULE_CONFLICT','INTERNAL_ERROR','CONFIG_INVALID','FORMAT_UNSUPPORTED','TOPIC_UNSUPPORTED','PROFILE_UNSUPPORTED','PAGE_VERSION_CONFLICT','EDITORIAL_DEFINITION_UNAVAILABLE') then
    raise exception using errcode='P0001',message=p_message;
  end if;
  raise exception using errcode='P0001',message='INTERNAL_ERROR';
end;
$function$
;

grant create on schema internal to content_producer_api_owner;
do $$ declare r record; begin
  for r in select p.oid::regprocedure f from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='internal'
    and p.proname in ('plan_override_shape_config2_v2','plan_post_context_shape_config2_v2','plan_item_resolve_config2_v2',
      'plan_context_snapshot_config2_v2','plan_config_shape_config2_v2','editorial_plan_generation_v2','post_prepare_config2_v2') loop
    execute format('alter function %s owner to content_producer_api_owner',r.f);
    execute format('revoke all on function %s from public,anon,authenticated,service_role',r.f);
  end loop;
end $$;
revoke create on schema internal from content_producer_api_owner;
notify pgrst,'reload schema';
