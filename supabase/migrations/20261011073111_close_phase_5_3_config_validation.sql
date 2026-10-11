-- Required non-null config scalars must not pass through SQL three-valued logic.
-- Preserve all original config budgets/weights/profiles; fail closed on wrong shapes.
alter function internal.is_valid_trivia_config_v1(jsonb) rename to is_valid_trivia_config_v1_shape;
create function internal.is_valid_trivia_config_v1(p_config jsonb)
returns boolean language plpgsql immutable security invoker set search_path = '' as $$
begin
  if p_config is null or pg_catalog.jsonb_typeof(p_config) <> 'object' then return false; end if;
  if pg_catalog.jsonb_typeof(p_config -> 'fact_reuse_scope') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_config -> 'render_style') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_config #> '{style,english_variant}') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_config #> '{style,tone}') is distinct from 'string'
    or pg_catalog.jsonb_typeof(p_config #> '{style,emoji_allowed}') is distinct from 'boolean'
    or pg_catalog.jsonb_typeof(p_config #> '{style,regional_slang_allowed}') is distinct from 'boolean' then return false; end if;
  return internal.is_valid_trivia_config_v1_shape(p_config) is true;
exception when others then return false;
end;
$$;
grant create on schema internal to content_producer_api_owner;
alter function internal.is_valid_trivia_config_v1(jsonb) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;

-- An existing version-2 snapshot cannot be removed by changing envelope version.
do $$
declare v_source text; v_old text;
begin
  v_source := pg_catalog.pg_get_functiondef('internal.validate_content_plan_config()'::regprocedure);
  v_old := E'begin\n  if new.config_schema_version';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing immutable context anchor'; end if;
  v_source := pg_catalog.replace(v_source,v_old,$edit$begin
  if tg_op='UPDATE' and old.plan_config -> 'schema_version'='2'::jsonb and (
    new.plan_config -> 'schema_version' is distinct from '2'::jsonb
    or new.plan_config -> 'context_snapshot' is distinct from old.plan_config -> 'context_snapshot') then
    raise exception using errcode='23514',message='PLAN_CONFIG_INVALID';
  end if;
  if new.config_schema_version$edit$);
  execute v_source;
end;
$$;
-- The context snapshot explicitly describes module v1; do not label a newer
-- registry module as v1 just because its config version happens to match.
do $$
declare v_source text; v_old text;
begin
  v_source := pg_catalog.pg_get_functiondef('api.create_content_plan(integer,uuid,uuid,uuid,text,integer,jsonb,text,text)'::regprocedure);
  v_old := 'if v_niche.config_schema_version <> p_config_schema_version then';
  if pg_catalog.strpos(v_source,v_old)=0 then raise exception 'Missing module snapshot version anchor'; end if;
  v_source := pg_catalog.replace(v_source,v_old,'if v_niche.module_version <> 1 or v_niche.config_schema_version <> p_config_schema_version then');
  execute v_source;
end;
$$;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
revoke all on all functions in schema api from public,anon,service_role;
