import { McpServer } from '@modelcontextprotocol/server';
import { registerTools } from './registry.ts';

export const MCP_SERVICE_NAME = 'content-producer-mcp';
export const MCP_SERVICE_VERSION = '0.1.0';

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: MCP_SERVICE_NAME, version: MCP_SERVICE_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        'Content Producer manages an owner-scoped trivia production workflow. ' +
        'Business tools require OAuth, workspace ownership, and explicit user intent. ' +
        'Tools are introduced only in the corresponding Phase 6 checkpoints.',
    },
  );
  registerTools(server);
  return server;
}
