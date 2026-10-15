import { createMcpHandler } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { createMcpServer } from './server.ts';

// Internal protocol harness has no authorization context.
export const mcpTransport = createMcpHandler(() => createMcpServer());

// A new transport and server are created per authenticated request.
// Never store a user's JWT or context in a process-global variable.
export function createAuthenticatedTransport(context: RequestContext) {
  return createMcpHandler(() => createMcpServer(context));
}
