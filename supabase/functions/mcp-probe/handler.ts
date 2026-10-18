import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'npm:zod@4.3.6';

function createProbeServer(): McpServer {
  const server = new McpServer(
    { name: 'content-producer-mcp-probe', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );
  server.registerTool(
    'ping',
    {
      title: 'Ping',
      description: 'Return the constant text OK to verify anonymous MCP tool discovery.',
      inputSchema: z.object({}).strict(),
      outputSchema: z.object({ status: z.literal('OK') }).strict(),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    () => ({
      structuredContent: { status: 'OK' },
      content: [{ type: 'text' as const, text: 'OK' }],
    }),
  );
  return server;
}

const transport = createMcpHandler(createProbeServer);
export const handleProbeRequest = (request: Request): Promise<Response> => transport.fetch(request);
