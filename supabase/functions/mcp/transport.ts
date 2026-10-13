import { createMcpHandler } from '@modelcontextprotocol/server';
import { createMcpServer } from './server.ts';

// Stateless Streamable HTTP: a fresh server is built for every request.
// The public route must never forward here before OAuth is ready (6.2).
export const mcpTransport = createMcpHandler(() => createMcpServer());
