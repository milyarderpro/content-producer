import { createMcpHandler } from '@modelcontextprotocol/server';
import type { RequestContext } from './auth.ts';
import { createMcpServer } from './server.ts';

// CR-034: The host schema validator can reject Unicode property regex
// escapes. Unicode General Category Cc is exactly U+0000..001F and
// U+007F..009F. Rewrite only JSON Schema pattern metadata in OAuth and
// No-auth catalogs; keep runtime Zod validation and all 33 tool contracts.
function portablePilotPatterns(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(portablePilotPatterns);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      key === 'pattern' && typeof entry === 'string'
        ? entry.replaceAll('\\p{Cc}', '\\x00-\\x1F\\x7F-\\x9F')
        : portablePilotPatterns(entry),
    ]),
  );
}

// The pinned MCP SDK emits its tool auth schemes only from _meta. ChatGPT's
// current descriptor contract also reads a top-level securitySchemes field.
// Mirror the already-declared per-tool policy in tools/list without changing
// handler authorization, RPCs, or the SDK's business-tool registrations.
function mirrorToolSchemes(value: unknown, pilot = false): unknown {
  if (Array.isArray(value)) return value.map((item) => mirrorToolSchemes(item, pilot));
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
        // CR-040: the host-facing catalog must be as portable and bounded
        // under OAuth as under No-auth. Preserve each actual OAuth scheme,
        // including the profile marker, and never alter registered validators.
        const originalSchemes = (meta as Record<string, unknown>).securitySchemes;
        if (!Array.isArray(originalSchemes)) return item;
        const schemes = pilot ? [{ type: 'noauth' }] : originalSchemes;
        const restMeta: Record<string, unknown> = {
          ...(meta as Record<string, unknown>),
          securitySchemes: schemes,
        };
        if (pilot) delete restMeta['openai/profile'];
        const published: Record<string, unknown> = {
          ...tool,
          securitySchemes: schemes,
          _meta: restMeta,
        };
        // FIX-37: the new closed enum is repeated in three candidate inputs.
        // In the historical No-auth fallback only, use the already-declared
        // concise title as the description to retain CR-033's 100 KB catalog
        // ceiling. OAuth descriptions and every inputSchema stay unchanged.
        if (pilot && typeof tool.title === 'string') {
          published.description = tool.title;
        }
        // Only optional catalog metadata is removed. Runtime output
        // verification, tool input schemas and OAuth guards are unchanged.
        // The designated OAuth profile is special: ChatGPT validates its
        // actual output schema during account linking. Never omit it.
        const isOAuthProfile = !pilot && restMeta['openai/profile'] === true;
        if (!isOAuthProfile) delete published.outputSchema;
        delete published.title;
        if (
          published.inputSchema &&
          typeof published.inputSchema === 'object' &&
          !Array.isArray(published.inputSchema)
        ) {
          const input = { ...(published.inputSchema as Record<string, unknown>) };
          delete input.$schema;
          published.inputSchema = portablePilotPatterns(input);
        }
        return published;
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

async function mirrorToolsListResponse(response: Response, pilot = false): Promise<Response> {
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
          return 'data: ' + JSON.stringify(mirrorToolSchemes(JSON.parse(line.slice(6)), pilot));
        } catch {
          return line;
        }
      })
      .join('\n');
  } else if (contentType.includes('application/json')) {
    try {
      updated = JSON.stringify(mirrorToolSchemes(JSON.parse(original), pilot));
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

// Registration needs a context, but public discovery must never hold a real
// identity or credential. The route and this transport both reject tool calls.
const catalogContext: RequestContext = {
  requestId: '00000000-0000-4000-8000-000000000000',
  actorUserId: '00000000-0000-4000-8000-000000000000',
  oauthClientId: '00000000-0000-4000-8000-000000000000',
  workspacePublicId: null,
  accessToken: '',
  supabaseUrl: 'https://invalid.example',
  publishableKey: '',
};

const catalogTransport = createMcpHandler(() => createMcpServer(catalogContext));
export async function fetchAnonymousDiscovery(request: Request): Promise<Response> {
  let method: unknown;
  try {
    const body: unknown = await request.clone().json();
    method =
      body && typeof body === 'object' && !Array.isArray(body)
        ? (body as { method?: unknown }).method
        : undefined;
  } catch {
    return new Response(null, { status: 400 });
  }
  if (
    request.method !== 'POST' ||
    typeof method !== 'string' ||
    !['initialize', 'notifications/initialized', 'tools/list'].includes(method)
  ) {
    return new Response(null, { status: 403 });
  }
  const response = await catalogTransport.fetch(request);
  return method === 'tools/list' ? mirrorToolsListResponse(response) : response;
}

// A new transport and server are created per authenticated request.
// Never store a user's JWT or context in a process-global variable.
export function createAuthenticatedTransport(context: RequestContext) {
  const transport = createMcpHandler(() => createMcpServer(context));
  return {
    ...transport,
    fetch: async (request: Request) => {
      const mirror = await shouldMirrorToolsList(request);
      const response = await transport.fetch(request);
      return mirror ? mirrorToolsListResponse(response, context.pilotMode === true) : response;
    },
  };
}
