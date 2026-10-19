// CR-032: fixed pilot identity under a downgraded PostgreSQL transaction role.
// SUPABASE_DB_URL is a built-in Edge Function secret. Never return/log its value.
// All business SQL remains inside the 33 existing api RPCs and their RLS policies.
import postgres from 'npm:postgres@3.4.7';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const identifier = /^[a-z][a-z0-9_]{0,79}$/;
const paramIdentifier = /^p_[a-z][a-z0-9_]{0,79}$/;
const fixedClientId = 'phase-10-1-noauth-fixed-pilot';

export function buildPilotRpcStatement(tool: string, params: Record<string, unknown>): string {
  if (!identifier.test(tool)) throw new Error('Invalid RPC name');
  const keys = Object.keys(params);
  if (keys.length > 40 || keys.some((key) => !paramIdentifier.test(key))) {
    throw new Error('Invalid RPC arguments');
  }
  return (
    'select api."' +
    tool +
    '"(' +
    keys
      .map(
        (key, index) =>
          '"' +
          key +
          '" => 
    ') as result'
  );
}

export function fixedPilotOwnerId(): string {
  const owner = Deno.env.get('MCP_OWNER_USER_ID') ?? '';
  if (!uuid.test(owner)) throw new Error('Missing fixed pilot owner');
  return owner;
}

export async function executePilotRpc(
  tool: string,
  params: Record<string, unknown>,
  ownerId: string,
): Promise<unknown> {
  if (!uuid.test(ownerId)) throw new Error('Invalid fixed pilot owner');
  // Only an Edge Function can access this built-in database connection secret.
  const url = Deno.env.get('SUPABASE_DB_URL');
  if (!url) throw new Error('Pilot database not configured');
  const statement = buildPilotRpcStatement(tool, params);
  const values = Object.values(params).map((value) =>
    value && !Array.isArray(value) && typeof value === 'object' ? JSON.stringify(value) : value,
  );
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 1 });
  try {
    return await sql.begin(async (tx) => {
      // Claims are minted from the server's fixed owner, never HTTP input.
      // Both settings are LOCAL to this transaction. Do not use service_role.
      const claims = JSON.stringify({
        sub: ownerId,
        role: 'authenticated',
        client_id: fixedClientId,
      });
      await tx`select pg_catalog.set_config('request.jwt.claims', ${claims}, true)`;
      await tx`set local role authenticated`;
      const rows = await tx.unsafe(statement, values as Parameters<typeof tx.unsafe>[1]);
      if (rows.length !== 1 || !Object.prototype.hasOwnProperty.call(rows[0], 'result')) {
        throw new Error('Unexpected RPC response');
      }
      return rows[0]!.result;
    });
  } finally {
    await sql.end();
  }
}

export async function resolvePilotWorkspace(ownerId: string): Promise<string> {
  // The existing owner-scoped RPC selects the active pilot workspace under
  // authenticated RLS; it is not a privileged tenant-selection query.
  const profile = (await executePilotRpc(
    'get_account_profile',
    { p_request_schema_version: 1 },
    ownerId,
  )) as { data?: { profile?: { id?: unknown; workspace_public_id?: unknown } } };
  const candidate = profile?.data?.profile;
  if (
    !candidate ||
    candidate.id !== ownerId ||
    typeof candidate.workspace_public_id !== 'string' ||
    !uuid.test(candidate.workspace_public_id)
  ) {
    throw new Error('Fixed pilot workspace unavailable');
  }
  return candidate.workspace_public_id;
}
 +
          (index + 1) +
          // postgres.js .unsafe can JSON-encode an already-stringified
          // config as a JSON string. Force text-to-jsonb parsing at the
          // one approved MAN-02 boundary, without changing other RPCs.
          (key === 'p_config' && tool === 'create_page' ? '::text::jsonb' : ''),
      )
      .join(', ') +
    ') as result'
  );
}

export function fixedPilotOwnerId(): string {
  const owner = Deno.env.get('MCP_OWNER_USER_ID') ?? '';
  if (!uuid.test(owner)) throw new Error('Missing fixed pilot owner');
  return owner;
}

export async function executePilotRpc(
  tool: string,
  params: Record<string, unknown>,
  ownerId: string,
): Promise<unknown> {
  if (!uuid.test(ownerId)) throw new Error('Invalid fixed pilot owner');
  // Only an Edge Function can access this built-in database connection secret.
  const url = Deno.env.get('SUPABASE_DB_URL');
  if (!url) throw new Error('Pilot database not configured');
  const statement = buildPilotRpcStatement(tool, params);
  const values = Object.values(params).map((value) =>
    value && !Array.isArray(value) && typeof value === 'object' ? JSON.stringify(value) : value,
  );
  const sql = postgres(url, { max: 1, prepare: false, connect_timeout: 5, idle_timeout: 1 });
  try {
    return await sql.begin(async (tx) => {
      // Claims are minted from the server's fixed owner, never HTTP input.
      // Both settings are LOCAL to this transaction. Do not use service_role.
      const claims = JSON.stringify({
        sub: ownerId,
        role: 'authenticated',
        client_id: fixedClientId,
      });
      await tx`select pg_catalog.set_config('request.jwt.claims', ${claims}, true)`;
      await tx`set local role authenticated`;
      const rows = await tx.unsafe(statement, values as Parameters<typeof tx.unsafe>[1]);
      if (rows.length !== 1 || !Object.prototype.hasOwnProperty.call(rows[0], 'result')) {
        throw new Error('Unexpected RPC response');
      }
      return rows[0]!.result;
    });
  } finally {
    await sql.end();
  }
}

export async function resolvePilotWorkspace(ownerId: string): Promise<string> {
  // The existing owner-scoped RPC selects the active pilot workspace under
  // authenticated RLS; it is not a privileged tenant-selection query.
  const profile = (await executePilotRpc(
    'get_account_profile',
    { p_request_schema_version: 1 },
    ownerId,
  )) as { data?: { profile?: { id?: unknown; workspace_public_id?: unknown } } };
  const candidate = profile?.data?.profile;
  if (
    !candidate ||
    candidate.id !== ownerId ||
    typeof candidate.workspace_public_id !== 'string' ||
    !uuid.test(candidate.workspace_public_id)
  ) {
    throw new Error('Fixed pilot workspace unavailable');
  }
  return candidate.workspace_public_id;
}
