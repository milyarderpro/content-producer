-- CR-021: issue MCP-bound OAuth tokens while leaving ordinary Supabase sessions unchanged.
-- Supabase Auth calls this hook for both authorization-code and refresh issuance.
create function internal.mcp_oauth_resource_audience_v1(event jsonb)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_client_id text := v_claims ->> 'client_id';
  v_issuer text;
  v_resource text;
begin
  -- A direct login token has no OAuth client. Preserve its Supabase audience.
  if v_client_id is null or v_client_id !~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return event;
  end if;

  v_issuer := v_claims ->> 'iss';
  if v_issuer is null or not (
    v_issuer ~ '^https://[a-z0-9.-]+/auth/v1$'
    or v_issuer ~ '^http://(127[.]0[.]0[.]1|localhost):[0-9]+/auth/v1$'
  ) then
    raise exception 'Unexpected OAuth issuer for MCP audience' using errcode = '22023';
  end if;

  v_resource := pg_catalog.left(v_issuer, pg_catalog.length(v_issuer) - 8)
    || '/functions/v1/mcp';
  return pg_catalog.jsonb_set(event, '{claims,aud}', pg_catalog.to_jsonb(v_resource), false);
end;
$$;

-- The Auth service alone may call the hook; internal remains outside the Data API.
revoke all on function internal.mcp_oauth_resource_audience_v1(jsonb)
  from public, anon, authenticated, service_role;
grant usage on schema internal to supabase_auth_admin;
grant execute on function internal.mcp_oauth_resource_audience_v1(jsonb)
  to supabase_auth_admin;
