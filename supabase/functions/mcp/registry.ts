import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
// No business tools until checkpoint 6.3.
export const MCP_TOOL_COUNT = 0;
export function registerTools(server: McpServer, context?: RequestContext): void {
  void server;
  void context;
}
