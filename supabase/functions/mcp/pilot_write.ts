// CR-037: a default-closed, payload-exact MAN-02 exception, not caller authentication.
// A public No-auth endpoint still allows replay of the same approved request.
// The existing RPC operation ledger prevents replay from creating a second Page.
const CREATE_PAGE_ARGUMENTS = [
  'p_config',
  'p_config_schema_version',
  'p_make_default',
  'p_name',
  'p_niche_key',
  'p_operation_key',
  'p_request_schema_version',
  'p_slug',
  'p_target_markets',
  'p_timezone',
  'p_workspace_public_id',
] as const;

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(record)
        .sort()
        .map((key) => [key, sortJson(record[key])]),
    );
  }
  return value;
}

export function canonicalMan02RpcArguments(params: Record<string, unknown>): string {
  return JSON.stringify(sortJson(params));
}

export async function isApprovedMan02CreatePage(
  tool: string,
  params: Record<string, unknown>,
  grantDigest: string,
): Promise<boolean> {
  if (tool !== 'create_page' || !/^[a-f0-9]{64}$/.test(grantDigest)) return false;
  if (Object.keys(params).sort().join('\n') !== CREATE_PAGE_ARGUMENTS.join('\n')) return false;
  if (params.p_request_schema_version !== 1 || params.p_niche_key !== 'trivia') return false;
  // The MCP facade already enforces its strict, closed Zod input schema.
  // This check additionally binds the complete RPC arguments including
  // operation key and Page config, independent of JSON object key order.
  const bytes = new TextEncoder().encode(canonicalMan02RpcArguments(params));
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  const actual = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return actual === grantDigest;
}
