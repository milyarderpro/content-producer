import { createMcpHandler } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { createMcpServer } from './server.ts';

// The pinned MCP SDK emits its tool auth schemes only from _meta. ChatGPT's
// current descriptor contract also reads a top-level securitySchemes field.
// Mirror the already-declared per-tool policy in tools/list without changing
// handler authorization, RPCs, or the SDK's business-tool registrations.
function mirrorToolSchemes(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(mirrorToolSchemes);
  if (!value || typeof value !== 'object') return value;
  const record = value as Record<string, unknown>;
  const result = record.result;
  if (!result || typeof result !== 'object') return value;
  const listing = result as Record<string, unknown>;
  if (!Array.isArray(listing.tools)) return value;
  return {
    ...record,
    result: {
      ...listing,
      tools: listing.tools.map((item: unknown) => {
        if (!item || typeof item !== 'object') return item;
        const tool = item as Record<string, unknown>;
        const meta = tool._meta;
        if (!meta || typeof meta !== 'object') return item;
        const schemes = (meta as Record<string, unknown>).securitySchemes;
        return Array.isArray(schemes) ? { ...tool, securitySchemes: schemes } : item;
      }),
    },
  };
}

function isToolsList(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(isToolsList);
  return (
    !!value && typeof value === 'object' && (value as { method?: unknown }).method === 'tools/list'
  );
}

async function shouldMirrorToolsList(request: Request): Promise<boolean> {
  if (request.method !== 'POST') return false;
  try {
    return isToolsList(await request.clone().json());
  } catch {
    return false;
  }
}

async function mirrorToolsListResponse(response: Response): Promise<Response> {
  if (response.status !== 200) return response;
  let original: string;
  try {
    original = await response.clone().text();
  } catch {
    return response;
  }
  const contentType = response.headers.get('content-type') ?? '';
  let updated: string;
  if (contentType.includes('text/event-stream')) {
    updated = original
      .split('\n')
      .map((line) => {
        if (!line.startsWith('data: ')) return line;
        try {
          return 'data: ' + JSON.stringify(mirrorToolSchemes(JSON.parse(line.slice(6))));
        } catch {
          return line;
        }
      })
      .join('\n');
  } else if (contentType.includes('application/json')) {
    try {
      updated = JSON.stringify(mirrorToolSchemes(JSON.parse(original)));
    } catch {
      updated = original;
    }
  } else {
    updated = original;
  }
  if (updated === original) return response;
  const headers = new Headers(response.headers);
  headers.delete('content-length');
  headers.delete('content-encoding');
  return new Response(updated, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

// Internal protocol harness has no authorization context.
export const mcpTransport = createMcpHandler(() => createMcpServer());

// A new transport and server are created per authenticated request.
// Never store a user's JWT or context in a process-global variable.
export function createAuthenticatedTransport(context: RequestContext) {
  const transport = createMcpHandler(() => createMcpServer(context));
  return {
    ...transport,
    fetch: async (request: Request) => {
      const mirror = await shouldMirrorToolsList(request);
      const response = await transport.fetch(request);
      return mirror ? mirrorToolsListResponse(response) : response;
    },
  };
}
