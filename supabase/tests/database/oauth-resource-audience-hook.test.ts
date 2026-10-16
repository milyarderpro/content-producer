import { spawnSync } from 'node:child_process';
import { describe, it } from 'vitest';

function localQuery(sql: string): void {
  const result = spawnSync('pnpm', ['exec', 'supabase', 'db', 'query', '--local', sql], {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.trim());
}

describe('CR-021 Supabase OAuth audience hook', () => {
  it('binds OAuth code and refresh tokens to MCP without changing ordinary sessions', () => {
    localQuery(`do $$
    declare
      base_event jsonb := jsonb_build_object(
        'user_id', '11111111-1111-4111-8111-111111111111',
        'authentication_method', 'oauth_provider/authorization_code',
        'claims', jsonb_build_object(
          'iss', 'https://example.supabase.co/auth/v1',
          'aud', 'authenticated',
          'client_id', '22222222-2222-4222-8222-222222222222',
          'sub', '11111111-1111-4111-8111-111111111111',
          'role', 'authenticated', 'scope', 'openid email'
        )
      );
      result jsonb;
    begin
      result := internal.mcp_oauth_resource_audience_v1(base_event);
      if result -> 'claims' ->> 'aud' <> 'https://example.supabase.co/functions/v1/mcp'
        or result -> 'claims' ->> 'sub' <> base_event -> 'claims' ->> 'sub'
        or result -> 'claims' ->> 'scope' <> 'openid email'
        or result ->> 'user_id' <> base_event ->> 'user_id' then
        raise exception 'OAuth audience/claim preservation failed';
      end if;

      result := internal.mcp_oauth_resource_audience_v1(
        jsonb_set(base_event, '{authentication_method}', '"token_refresh"')
      );
      if result -> 'claims' ->> 'aud' <> 'https://example.supabase.co/functions/v1/mcp' then
        raise exception 'OAuth refresh audience failed';
      end if;

      result := internal.mcp_oauth_resource_audience_v1(
        base_event #- '{claims,client_id}'
      );
      if result -> 'claims' ->> 'aud' <> 'authenticated' then
        raise exception 'Ordinary login audience changed';
      end if;

      result := internal.mcp_oauth_resource_audience_v1(
        jsonb_set(base_event, '{claims,client_id}', '"malformed"')
      );
      if result -> 'claims' ->> 'aud' <> 'authenticated' then
        raise exception 'Malformed client was mapped to MCP';
      end if;

      if not has_schema_privilege('supabase_auth_admin', 'internal', 'usage')
        or not has_function_privilege('supabase_auth_admin',
          'internal.mcp_oauth_resource_audience_v1(jsonb)', 'execute')
        or has_function_privilege('anon',
          'internal.mcp_oauth_resource_audience_v1(jsonb)', 'execute')
        or has_function_privilege('authenticated',
          'internal.mcp_oauth_resource_audience_v1(jsonb)', 'execute')
        or has_function_privilege('service_role',
          'internal.mcp_oauth_resource_audience_v1(jsonb)', 'execute') then
        raise exception 'Hook grant mismatch';
      end if;

      begin
        perform internal.mcp_oauth_resource_audience_v1(
          jsonb_set(base_event, '{claims,iss}', '"https://other.example/auth/v2"')
        );
        raise exception 'Bad issuer did not fail closed';
      exception when sqlstate '22023' then
        null;
      end;
    end;
    $$;`);
  });
});
