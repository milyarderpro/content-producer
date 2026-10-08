import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const baselineQuery = `
  select
    (select extnamespace::regnamespace::text from pg_extension where extname = 'pgcrypto') as pgcrypto_schema,
    (select extnamespace::regnamespace::text from pg_extension where extname = 'pg_trgm') as pg_trgm_schema,
    has_schema_privilege('authenticated', 'api', 'usage') as authenticated_api_usage,
    has_schema_privilege('anon', 'api', 'usage') as anon_api_usage,
    has_schema_privilege('service_role', 'api', 'usage') as service_role_api_usage,
    has_schema_privilege('anon', 'internal', 'usage') as anon_internal_usage,
    has_schema_privilege('authenticated', 'internal', 'usage') as authenticated_internal_usage,
    has_schema_privilege('service_role', 'internal', 'usage') as service_role_internal_usage,
    (
      select count(*)
      from pg_default_acl default_acl
      cross join lateral aclexplode(default_acl.defaclacl) acl
      join pg_roles grantee on grantee.oid = acl.grantee
      join pg_namespace schema_name on schema_name.oid = default_acl.defaclnamespace
      where default_acl.defaclrole = 'postgres'::regrole
        and schema_name.nspname in ('public', 'api', 'internal')
        and grantee.rolname in ('anon', 'authenticated', 'service_role')
        and default_acl.defaclobjtype = 'r'
    ) as table_default_caller_privilege_count,
    (
      select count(*)
      from pg_default_acl default_acl
      cross join lateral aclexplode(default_acl.defaclacl) acl
      join pg_roles grantee on grantee.oid = acl.grantee
      join pg_namespace schema_name on schema_name.oid = default_acl.defaclnamespace
      where default_acl.defaclrole = 'postgres'::regrole
        and schema_name.nspname in ('public', 'api', 'internal')
        and grantee.rolname in ('anon', 'authenticated', 'service_role')
        and default_acl.defaclobjtype = 'S'
    ) as sequence_default_caller_privilege_count,
    (
      select count(*)
      from pg_default_acl default_acl
      cross join lateral aclexplode(default_acl.defaclacl) acl
      join pg_roles grantee on grantee.oid = acl.grantee
      join pg_namespace schema_name on schema_name.oid = default_acl.defaclnamespace
      where default_acl.defaclrole = 'postgres'::regrole
        and schema_name.nspname in ('public', 'api', 'internal')
        and grantee.rolname in ('anon', 'authenticated', 'service_role')
        and default_acl.defaclobjtype = 'f'
    ) as function_default_caller_privilege_count,
    (
      select count(*)
      from pg_default_acl default_acl
      cross join lateral aclexplode(default_acl.defaclacl) acl
      where default_acl.defaclrole = 'postgres'::regrole
        and default_acl.defaclnamespace is null
        and default_acl.defaclobjtype = 'f'
        and acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    ) as public_default_function_execute_grant_count;
`;

type JsonRecord = Record<string, unknown>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function runCli(args: string[]): string {
  const result = spawnSync('pnpm', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
    env: { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' },
    shell: process.platform === 'win32',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Supabase local command failed: ${result.stderr.trim()}`);
  }

  return result.stdout;
}

function parseJsonOutput(output: string, command: string): JsonRecord {
  const jsonStart = output.indexOf('{');

  if (jsonStart === -1) {
    throw new Error(`${command} did not return JSON output.`);
  }

  try {
    const parsed: unknown = JSON.parse(output.slice(jsonStart));

    if (!isJsonRecord(parsed)) {
      throw new Error(`${command} returned a JSON value instead of an object.`);
    }

    return parsed;
  } catch (error) {
    throw new Error(
      `${command} returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function querySingleRow(query: string): JsonRecord {
  const output = runCli(['exec', 'supabase', 'db', 'query', '--local', query]);
  const response = parseJsonOutput(output, 'supabase db query');

  if (
    !Array.isArray(response.rows) ||
    response.rows.length !== 1 ||
    !isJsonRecord(response.rows[0])
  ) {
    throw new Error('Expected exactly one JSON row from the local baseline query.');
  }

  return response.rows[0];
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Missing ${name} from local Supabase output.`);
  }

  return value;
}

describe('Phase 2 Supabase local baseline', () => {
  it('enforces the extension, privilege, Data API, and OAuth boundary', async () => {
    const baseline = querySingleRow(baselineQuery);

    expect(baseline.pgcrypto_schema).toBe('extensions');
    expect(baseline.pg_trgm_schema).toBe('extensions');
    expect(baseline.authenticated_api_usage).toBe(true);
    expect(baseline.anon_api_usage).toBe(false);
    expect(baseline.service_role_api_usage).toBe(false);
    expect(baseline.anon_internal_usage).toBe(false);
    expect(baseline.authenticated_internal_usage).toBe(false);
    expect(baseline.service_role_internal_usage).toBe(false);
    expect(baseline.table_default_caller_privilege_count).toBe(0);
    expect(baseline.sequence_default_caller_privilege_count).toBe(0);
    expect(baseline.function_default_caller_privilege_count).toBe(0);
    expect(baseline.public_default_function_execute_grant_count).toBe(0);

    const status = parseJsonOutput(
      runCli(['exec', 'supabase', 'status', '--output', 'json']),
      'supabase status',
    );
    const apiUrl = requiredString(status.API_URL, 'API_URL');
    const restUrl = requiredString(status.REST_URL, 'REST_URL');
    const anonKey = requiredString(status.ANON_KEY, 'ANON_KEY');
    const headers = {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
    };
    const authHealth = await fetch(`${apiUrl}/auth/v1/health`);
    const oauthDiscoveryResponse = await fetch(
      `${apiUrl}/auth/v1/.well-known/oauth-authorization-server`,
    );

    expect(authHealth.status).toBe(200);
    expect(oauthDiscoveryResponse.status).toBe(200);

    const oauthDiscovery: unknown = await oauthDiscoveryResponse.json();

    if (!isJsonRecord(oauthDiscovery)) {
      throw new Error('OAuth discovery returned a JSON value instead of an object.');
    }

    expect(oauthDiscovery.authorization_endpoint).toBe(`${apiUrl}/auth/v1/oauth/authorize`);
    expect(oauthDiscovery.token_endpoint).toBe(`${apiUrl}/auth/v1/oauth/token`);
    expect(oauthDiscovery.registration_endpoint).toBe(`${apiUrl}/auth/v1/oauth/clients/register`);
    expect(oauthDiscovery.code_challenge_methods_supported).toContain('S256');

    const apiProbe = await fetch(`${restUrl}/phase2_api_profile_probe?select=id`, {
      headers: { ...headers, 'Accept-Profile': 'api' },
    });
    const internalProbe = await fetch(`${restUrl}/phase2_internal_profile_probe?select=id`, {
      headers: { ...headers, 'Accept-Profile': 'internal' },
    });

    expect(apiProbe.status).toBe(404);
    expect(internalProbe.status).toBe(406);

    const probeTable = `phase2_baseline_access_probe_${process.pid}_${Date.now()}`;

    try {
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `create table public.${probeTable} (id integer primary key)`,
      ]);
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `alter table public.${probeTable} enable row level security`,
      ]);

      const tablePrivileges = querySingleRow(`
        select
          has_table_privilege('anon', 'public.${probeTable}', 'select') as anon_select,
          has_table_privilege('authenticated', 'public.${probeTable}', 'select') as authenticated_select,
          has_table_privilege('service_role', 'public.${probeTable}', 'select') as service_role_select;
      `);
      const publicProbe = await fetch(`${restUrl}/${probeTable}?select=id`, { headers });

      expect(tablePrivileges.anon_select).toBe(false);
      expect(tablePrivileges.authenticated_select).toBe(false);
      expect(tablePrivileges.service_role_select).toBe(false);
      expect(publicProbe.status).toBeGreaterThanOrEqual(400);
    } finally {
      runCli([
        'exec',
        'supabase',
        'db',
        'query',
        '--local',
        `drop table if exists public.${probeTable}`,
      ]);
    }
  }, 30_000);
});
