-- CR-010. Additive remediation; prior migrations and completed history are immutable.
-- Refuse to invent an original response for a legacy local 5.3 completion.
do $$
begin
  if exists (select 1 from internal.operation_ledger
    where operation_name in ('create_page', 'update_page', 'create_content_plan')
      and completed_at is not null) then
    raise exception 'CR-010 requires a clean local reset: legacy 5.3 responses are not recoverable';
  end if;
end;
$$;

create function internal.normalize_page_target_markets_v1(p_markets text[])
returns text[] language sql immutable security invoker set search_path = '' as $$
  -- ISO 3166-1 officially assigned alpha-2 codes, pinned on 11 October 2026.
  select case when p_markets is null or pg_catalog.array_ndims(p_markets) <> 1
    or pg_catalog.cardinality(p_markets) not between 1 and 8
    or exists (select 1 from pg_catalog.unnest(p_markets) as m(value)
      where value is null or value <> all(pg_catalog.string_to_array(
        'AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW', ' ')))
    or (select count(distinct value) from pg_catalog.unnest(p_markets) as m(value)) <> pg_catalog.cardinality(p_markets)
    then null else (select pg_catalog.array_agg(value order by value)
      from pg_catalog.unnest(p_markets) as m(value)) end;
$$;

alter table public.pages drop constraint pages_target_markets_check;
alter table public.pages add constraint pages_target_markets_check check (
  internal.normalize_page_target_markets_v1(target_markets) is not null
);
alter table public.pages drop constraint pages_slug_format_check;
alter table public.pages add constraint pages_slug_format_check check (slug ~ '^[a-z0-9-]{2,80}$');

create or replace function internal.validate_page_locale_row()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.timezone := pg_catalog.btrim(new.timezone);
  new.target_markets := internal.normalize_page_target_markets_v1(new.target_markets);
  if not internal.is_valid_timezone_name(new.timezone) then
    raise exception using errcode = '23514', message = 'PAGE_TIMEZONE_INVALID';
  end if;
  if new.target_markets is null then
    raise exception using errcode = '23514', message = 'TARGET_MARKETS_INVALID';
  end if;
  return new;
end;
$$;

create function internal.is_valid_trivia_plan_override_v1(p_override jsonb, p_config jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
declare v_key text; v_effective jsonb;
begin
  if p_override is null or pg_catalog.jsonb_typeof(p_override) <> 'object'
    or pg_catalog.octet_length(p_override::text) > 8192 then return false; end if;
  if exists (select 1 from pg_catalog.jsonb_object_keys(p_override) as k(value)
    where value not in ('profile_key','fact_count','render_style','text_budget','caption','hashtags')) then
    return false;
  end if;
  if exists (select 1 from pg_catalog.jsonb_each(p_override) as k(key,value) where value='null'::jsonb) then return false; end if;
  if p_override ? 'render_style' and (pg_catalog.jsonb_typeof(p_override -> 'render_style') <> 'string'
    or p_override ->> 'render_style' not in ('plain_lines','numbered')) then return false; end if;
  if p_override ? 'profile_key' and (pg_catalog.jsonb_typeof(p_override -> 'profile_key') <> 'string'
    or p_override ->> 'profile_key' not in ('fast_trivia','practical_utility')) then return false; end if;
  v_effective := p_config || (p_override - 'profile_key');
  if internal.is_valid_trivia_config_v1(v_effective) is distinct from true then return false; end if;
  if p_override ? 'text_budget' then
    for v_key in select value from pg_catalog.jsonb_object_keys(p_override -> 'text_budget') as k(value) loop
      if internal.json_integer_value(p_override #> array['text_budget',v_key]) >
        internal.json_integer_value(p_config #> array['text_budget',v_key]) then return false; end if;
    end loop;
  end if;
  if p_override ? 'caption' and internal.json_integer_value(p_override #> '{caption,max_chars}') >
    internal.json_integer_value(p_config #> '{caption,max_chars}') then return false; end if;
  if p_override ? 'hashtags' and internal.json_integer_value(p_override #> '{hashtags,max_count}') >
    internal.json_integer_value(p_config #> '{hashtags,max_count}') then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create function internal.plan_context_snapshot_v1(p_page public.pages, p_config public.page_niche_configs)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object('schema_version',1,'module_version',1,
    'page',pg_catalog.jsonb_build_object('page_public_id',p_page.public_id,
      'name',p_page.name,'slug',p_page.slug,'platform',p_page.platform,
      'language_code',p_page.language_code,'locale',p_page.locale,'timezone',p_page.timezone,
      'target_markets',pg_catalog.to_jsonb(p_page.target_markets),
      'platform_config',p_page.platform_config,'is_active',p_page.is_active,
      'updated_at',internal.iso_timestamp_v1(p_page.updated_at)),
    'niche_config',pg_catalog.jsonb_build_object('config_public_id',p_config.public_id,
      'niche_key',p_config.niche_key,'config_schema_version',p_config.config_schema_version,
      'config',p_config.config,'is_enabled',p_config.is_enabled,'is_default',p_config.is_default,
      'updated_at',internal.iso_timestamp_v1(p_config.updated_at)));
$$;

create function internal.is_valid_plan_config_v2(p_config jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare v_context jsonb; v_page jsonb; v_niche jsonb; v_base jsonb;
begin
  if internal.has_exact_json_keys(p_config,array['schema_version','plan_intent','requested_chunk_size',
    'schedule','requested_formats','requested_topics','requested_interaction_goals','context_snapshot']) is distinct from true
    or p_config -> 'schema_version' <> '2'::jsonb then return false; end if;
  v_base := (p_config - 'context_snapshot') || '{"schema_version":1,"schedule":{"mode":"unscheduled"}}'::jsonb;
  if internal.is_valid_plan_config_v1(v_base) is distinct from true
    or pg_catalog.jsonb_typeof(p_config -> 'plan_intent') <> 'string'
    or pg_catalog.char_length(pg_catalog.btrim(p_config ->> 'plan_intent')) not between 1 and 1000
    or internal.has_exact_json_keys(p_config -> 'schedule',array['mode']) is distinct from true
    or p_config #>> '{schedule,mode}' not in ('unscheduled','explicit_slots') then return false; end if;
  v_context := p_config -> 'context_snapshot'; v_page := v_context -> 'page'; v_niche := v_context -> 'niche_config';
  if internal.has_exact_json_keys(v_context,array['schema_version','module_version','page','niche_config']) is distinct from true
    or v_context -> 'schema_version' <> '1'::jsonb or v_context -> 'module_version' <> '1'::jsonb
    or internal.has_exact_json_keys(v_page,array['page_public_id','name','slug','platform','language_code','locale',
      'timezone','target_markets','platform_config','is_active','updated_at']) is distinct from true
    or internal.has_exact_json_keys(v_niche,array['config_public_id','niche_key','config_schema_version','config',
      'is_enabled','is_default','updated_at']) is distinct from true then return false; end if;
  if pg_catalog.jsonb_typeof(v_page -> 'name') <> 'string' or pg_catalog.char_length(v_page ->> 'name') not between 1 and 120
    or v_page ->> 'slug' !~ '^[a-z0-9-]{2,80}$' or v_page ->> 'platform' <> 'facebook'
    or v_page ->> 'language_code' <> 'en' or v_page ->> 'locale' <> 'en-US'
    or v_page ->> 'page_public_id' !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or v_niche ->> 'config_public_id' !~ '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$'
    or not internal.is_valid_timezone_name(v_page ->> 'timezone')
    or pg_catalog.jsonb_typeof(v_page -> 'platform_config') <> 'object'
    or v_page -> 'is_active' <> 'true'::jsonb or v_niche -> 'is_enabled' <> 'true'::jsonb
    or pg_catalog.jsonb_typeof(v_niche -> 'is_default') <> 'boolean'
    or v_niche ->> 'niche_key' <> 'trivia' or v_niche -> 'config_schema_version' <> '1'::jsonb
    or not internal.is_valid_timestamp_text(v_page ->> 'updated_at')
    or not internal.is_valid_timestamp_text(v_niche ->> 'updated_at')
    or internal.is_valid_trivia_config_v1(v_niche -> 'config') is distinct from true
    or pg_catalog.jsonb_typeof(v_page -> 'target_markets') <> 'array'
    or exists (select 1 from pg_catalog.jsonb_array_elements(v_page -> 'target_markets') as m(value)
      where pg_catalog.jsonb_typeof(value) <> 'string')
    or internal.normalize_page_target_markets_v1(array(select value from
      pg_catalog.jsonb_array_elements_text(v_page -> 'target_markets') as m(value))) is null then return false; end if;
  return true;
exception when others then return false;
end;
$$;

create or replace function internal.validate_content_plan_config()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_page public.pages; v_config public.page_niche_configs; v_settings jsonb;
begin
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
$$;

create function internal.complete_page_plan_operation_v3(
  p_workspace_public_id uuid, p_operation_id bigint, p_operation_name text,
  p_response_snapshot jsonb, p_target_type text, p_target_public_id uuid
)
returns void language plpgsql volatile security invoker set search_path = '' as $$
declare v_workspace record; v_response jsonb;
begin
  select * into v_workspace from internal.resolve_workspace_owner_v1(p_workspace_public_id);
  v_response := p_response_snapshot -> 'response';
  if p_operation_name not in ('create_page','update_page','create_content_plan')
    or internal.has_exact_json_keys(p_response_snapshot,array['schema_version','operation_name','resources','response']) is distinct from true
    or p_response_snapshot -> 'schema_version' <> '3'::jsonb
    or internal.is_safe_operation_response_snapshot_v2(p_operation_name,
      (p_response_snapshot - 'response') || '{"schema_version":1}'::jsonb) is distinct from true
    or pg_catalog.octet_length(p_response_snapshot::text) > 1048576
    or internal.has_exact_json_keys(v_response,array['response_schema_version','data']) is distinct from true
    or v_response -> 'response_schema_version' <> '1'::jsonb
    or v_response #> '{data,replayed}' <> 'false'::jsonb
    or p_response_snapshot::text ~ '"(content_payload|source_data|source_snapshot|claim_token|reservation_token|access_token|refresh_token|password|secret|internal_id|actor_user_id)"[[:space:]]*:'
    or not exists (select 1 from pg_catalog.jsonb_array_elements(p_response_snapshot -> 'resources') as r(value)
      where value ->> 'resource_type'=p_target_type and value ->> 'public_id'=p_target_public_id::text) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  if p_operation_name = 'create_content_plan' then
    if internal.has_exact_json_keys(v_response -> 'data',array['plan','items','context_version','replayed']) is distinct from true
      or pg_catalog.jsonb_array_length(v_response #> '{data,items}') not between 1 and 100 then
      raise exception using errcode='P0001',message='VALIDATION_FAILED';
    end if;
  elsif not (internal.has_exact_json_keys(v_response -> 'data',array['page','config','replayed'])
    or (p_operation_name='update_page' and internal.has_exact_json_keys(v_response -> 'data',array['page','replayed']))) then
    raise exception using errcode='P0001',message='VALIDATION_FAILED';
  end if;
  update internal.operation_ledger set response_snapshot=p_response_snapshot,completed_at=pg_catalog.clock_timestamp(),
    target_type=p_target_type,target_public_id=p_target_public_id
    where id=p_operation_id and workspace_id=v_workspace.workspace_id and actor_user_id=v_workspace.actor_user_id
      and operation_name=p_operation_name and completed_at is null;
  if not found then raise exception using errcode='P0001',message='OWNER_ACCESS_REQUIRED'; end if;
end;
$$;

-- Migration-only, guarded definition edits preserve the already reviewed 5.3
-- typed signatures, validation, projections and ACLs without duplicating 1461
-- lines. Every anchor is asserted; unexpected source drift aborts the migration.
-- This is not a caller-executable SQL executor; the DO block disappears at commit.
do $migration$
declare v_oid regprocedure; v_name text; v_source text; v_old text; v_new text;
begin
  foreach v_oid in array array[
    'api.create_page(integer,uuid,uuid,text,text,text,text[],text,integer,jsonb,boolean)'::regprocedure,
    'api.update_page(integer,uuid,uuid,uuid,timestamptz,jsonb,jsonb)'::regprocedure,
    'api.create_content_plan(integer,uuid,uuid,uuid,text,integer,jsonb,text,text)'::regprocedure
  ] loop
    select proname into v_name from pg_catalog.pg_proc where oid=v_oid;
    v_source := pg_catalog.pg_get_functiondef(v_oid);
    v_old := '  if v_claim.claim_state = ''in_progress'' then';
    if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing replay anchor'; end if;
    v_source := pg_catalog.replace(v_source,v_old,$edit$
  if v_claim.claim_state = 'replay' then
    if v_claim.response_snapshot -> 'schema_version' is distinct from '3'::jsonb then
      raise exception using errcode='P0001',message='INTERNAL_ERROR';
    end if;
    return pg_catalog.jsonb_set(v_claim.response_snapshot -> 'response','{data,replayed}','true'::jsonb);
  end if;
  if v_claim.claim_state = 'in_progress' then$edit$);
    v_old := '    perform internal.complete_operation_for_owner_v2(';
    if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing completion anchor'; end if;
    v_source := pg_catalog.replace(v_source,v_old,$edit$
    v_snapshot := v_snapshot || pg_catalog.jsonb_build_object('schema_version',3,'response',v_result);
    perform internal.complete_page_plan_operation_v3($edit$);
    -- Authorization first, so invalid context cannot probe domain/config state.
    v_old := E'begin\n  ';
    v_new := E'begin\n  perform internal.assert_request_context_v1();\n  ';
    v_source := pg_catalog.replace(v_source,v_old,v_new);
    v_source := pg_catalog.replace(v_source,'internal.normalize_target_markets(', 'internal.normalize_page_target_markets_v1(');
    v_source := pg_catalog.replace(v_source,'^[a-z][a-z0-9-]{1,79}$','^[a-z0-9-]{2,80}$');
    v_source := pg_catalog.replace(v_source,$edit$v_constraint = 'pages_workspace_slug_key' or v_sqlstate = '23505'$edit$, $edit$v_constraint = 'pages_workspace_slug_key'$edit$);
    if v_name='create_content_plan' then
      v_source := pg_catalog.replace(v_source,'CONFIG_SCHEMA_UNSUPPORTED','CONFIG_INVALID');
      v_source := pg_catalog.replace(v_source,'  v_schedule timestamptz;', '  v_schedule_lock bigint;');
      v_old := E'      or pg_catalog.jsonb_typeof(v_item -> ''item_config'') <> ''object''\n      or pg_catalog.octet_length((v_item -> ''item_config'')::text) > 8192';
      if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing override anchor'; end if;
      v_source := pg_catalog.replace(v_source,v_old,'');
      v_old := '    select (workspace.settings ->> ''default_plan_chunk_size'')::integer';
      if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing override context anchor'; end if;
      v_source := pg_catalog.replace(v_source,v_old,$edit$
    if exists (select 1 from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
      where internal.is_valid_trivia_plan_override_v1(item.value -> 'item_config',v_config.config) is distinct from true) then
      raise exception using errcode='P0001',message='CONFIG_INVALID';
    end if;
    select (workspace.settings ->> 'default_plan_chunk_size')::integer$edit$);
      v_old := E'      ''schema_version'', 1,\n      ''plan_intent'', v_intent,';
      if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing snapshot anchor'; end if;
      v_source := pg_catalog.replace(v_source,v_old,E'      ''schema_version'', 2,\n      ''context_snapshot'', internal.plan_context_snapshot_v1(v_page::public.pages,v_config::public.page_niche_configs),\n      ''plan_intent'', v_intent,');
      v_source := pg_catalog.replace(v_source,$edit$'schedule', pg_catalog.jsonb_build_object('mode', 'unscheduled')$edit$,$edit$
      'schedule', pg_catalog.jsonb_build_object('mode',case when exists (
        select 1 from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
        where item.value ->> 'scheduled_at' is not null) then 'explicit_slots' else 'unscheduled' end)$edit$);
      v_old := $edit$    -- Acquire every requested schedule lock in deterministic timestamp/order
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
    end loop;$edit$;
      v_new := $edit$    -- Materialize every distinct key before acquiring any lock, numeric order.
    for v_schedule_lock in
      with keys as materialized (
        select distinct pg_catalog.hashtextextended(v_page.id::text || ':' ||
          ((extract(epoch from (item.value ->> 'scheduled_at')::timestamptz) * 1000000)::bigint)::text,0) as key
        from pg_catalog.jsonb_array_elements(v_normalized_items) as item(value)
        where item.value ->> 'scheduled_at' is not null)
      select key from keys order by key
    loop
      perform pg_catalog.pg_advisory_xact_lock(v_schedule_lock);
    end loop;$edit$;
      if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing numeric lock anchor'; end if;
      v_source := pg_catalog.replace(v_source,v_old,v_new);
    end if;
    execute v_source;
  end loop;
end;
$migration$;

grant create on schema internal to content_producer_api_owner;
alter function internal.normalize_page_target_markets_v1(text[]) owner to content_producer_api_owner;
alter function internal.is_valid_trivia_plan_override_v1(jsonb,jsonb) owner to content_producer_api_owner;
alter function internal.plan_context_snapshot_v1(public.pages,public.page_niche_configs) owner to content_producer_api_owner;
alter function internal.is_valid_plan_config_v2(jsonb) owner to content_producer_api_owner;
alter function internal.complete_page_plan_operation_v3(uuid,bigint,text,jsonb,text,uuid) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
-- CREATE OR REPLACE retains the original API owner and authenticated-only ACL.
revoke all on all functions in schema api from public,anon,service_role;
