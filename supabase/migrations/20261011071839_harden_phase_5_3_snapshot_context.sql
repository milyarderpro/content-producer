-- CR-010 follow-up: PL/pgSQL anonymous records cannot be cast to table row
-- types. Use typed records for the locked snapshot source; no data is rewritten.
do $$
declare v_source text;
begin
  v_source := pg_catalog.pg_get_functiondef('api.create_content_plan(integer,uuid,uuid,uuid,text,integer,jsonb,text,text)'::regprocedure);
  if pg_catalog.strpos(v_source,'  v_page record;')=0 or pg_catalog.strpos(v_source,'  v_config record;')=0 then
    raise exception 'Missing typed snapshot anchors';
  end if;
  v_source := pg_catalog.replace(v_source,'  v_page record;','  v_page public.pages;');
  v_source := pg_catalog.replace(v_source,'  v_config record;','  v_config public.page_niche_configs;');
  execute v_source;
end;
$$;

-- Invalid request claims fail safely before any lookup in the three write RPCs.
-- auth.uid() via CR-009 remains the only authoritative identity source.
create or replace function internal.assert_request_context_v1()
returns table(actor_user_id uuid, oauth_client_id text)
language plpgsql stable security invoker set search_path = '' as $$
declare v_claims jsonb;
begin
  begin
    v_claims := coalesce(pg_catalog.current_setting('request.jwt.claims',true),'{}')::jsonb;
    actor_user_id := internal.current_auth_uid_v1();
  exception when others then
    raise exception using errcode='P0001',message='AUTH_REQUIRED';
  end;
  if actor_user_id is null or pg_catalog.jsonb_typeof(v_claims) <> 'object'
    or pg_catalog.jsonb_typeof(v_claims -> 'sub') is distinct from 'string'
    or v_claims ->> 'role' is distinct from 'authenticated' then
    raise exception using errcode='P0001',message='AUTH_REQUIRED';
  end if;
  oauth_client_id := v_claims ->> 'client_id';
  if pg_catalog.jsonb_typeof(v_claims -> 'client_id') is distinct from 'string'
    or oauth_client_id is null or pg_catalog.btrim(oauth_client_id)=''
    or pg_catalog.octet_length(oauth_client_id)>512 or oauth_client_id ~ '[[:cntrl:]]' then
    raise exception using errcode='P0001',message='OAUTH_CLIENT_REQUIRED';
  end if;
  return next;
end;
$$;

-- Reject null and non-string scalar fields in the closed context. The original
-- snapshot validator remains available only behind this additional check.
alter function internal.is_valid_plan_config_v2(jsonb) rename to is_valid_plan_config_v2_shape;
create function internal.is_valid_plan_config_v2(p_config jsonb)
returns boolean language plpgsql stable security invoker set search_path = '' as $$
declare v_key text; v_context jsonb;
begin
  if internal.is_valid_plan_config_v2_shape(p_config) is distinct from true then return false; end if;
  v_context := p_config -> 'context_snapshot';
  foreach v_key in array array['page_public_id','name','slug','platform','language_code','locale','timezone','updated_at'] loop
    if pg_catalog.jsonb_typeof(v_context #> array['page',v_key]) is distinct from 'string' then return false; end if;
  end loop;
  foreach v_key in array array['config_public_id','niche_key','updated_at'] loop
    if pg_catalog.jsonb_typeof(v_context #> array['niche_config',v_key]) is distinct from 'string' then return false; end if;
  end loop;
  return true;
end;
$$;
grant create on schema internal to content_producer_api_owner;
alter function internal.is_valid_plan_config_v2(jsonb) owner to content_producer_api_owner;
revoke create on schema internal from content_producer_api_owner;
revoke all on all functions in schema internal from public,anon,authenticated,service_role;
revoke all on all functions in schema api from public,anon,service_role;
