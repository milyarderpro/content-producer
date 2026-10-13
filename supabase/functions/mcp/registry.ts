import type { McpServer } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { FOUNDATION_TOOL_NAMES, registerFoundationTools } from './foundation.ts';

export const MCP_TOOL_COUNT = FOUNDATION_TOOL_NAMES.length;
export function registerTools(server: McpServer, context?: RequestContext): void {
  registerFoundationTools(server, context);
}
