import { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { registerTools } from './registry.ts';
export const MCP_SERVICE_NAME = 'content-producer-mcp';
export const MCP_SERVICE_VERSION = '0.1.0';
export function createMcpServer(context?: RequestContext): McpServer {
  const server = new McpServer(
    { name: MCP_SERVICE_NAME, version: MCP_SERVICE_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        'Resolve the authenticated workspace and Page before writes. Read Page generation context before drafting. ' +
        'Research occurs outside this server. Prefer available v2 tools: sentence-based dedup before copy, one source URL per fact, and atomic save without a separate reservation. ' +
        'Read back every save/revision with get_post. For multiple drafts use an unscheduled plan and one claimed item at a time; never recreate completed output. Legacy reservations apply only to supported v1 work. ' +
        'Never approve, discard, mark posted, archive, cancel, replace, or correct facts without explicit user intent. ' +
        'On conflicts, read current state rather than silently overwriting; release unused reservations. ' +
        'Record only user-supplied Facebook metrics, never infer missing values or causal winners.',
    },
  );
  registerTools(server, context);
  return server;
}
