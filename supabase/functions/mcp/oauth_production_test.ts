import { createEdgeHandler } from './edge.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

const resource = 'http://127.0.0.1:54321/functions/v1/mcp';
const issuer = 'http://127.0.0.1:54321/auth/v1';
const variables = {
  MCP_RESOURCE_URL: resource,
  MCP_ISSUER_URL: issuer,
  MCP_OWNER_USER_ID: '11111111-1111-4111-8111-111111111111',
  SUPABASE_URL: 'http://127.0.0.1:54321',
  SUPABASE_ANON_KEY: 'local-public-key',
};

Deno.test(
  'CR-042 production OAuth route and no-token challenge without configured fixture',
  async () => {
    const names = [...Object.keys(variables), 'MCP_AUTH_MODE'];
    const previous = new Map(names.map((name) => [name, Deno.env.get(name)]));
    try {
      for (const [name, value] of Object.entries(variables)) Deno.env.set(name, value);
      Deno.env.delete('MCP_AUTH_MODE');
      const handle = createEdgeHandler();

      for (const path of [
        '/functions/v1/mcp/.well-known/oauth-protected-resource',
        '/mcp/.well-known/oauth-protected-resource',
        '/functions/v1/mcp/oauth-protected-resource',
      ]) {
        const response = await handle(new Request('http://127.0.0.1:54321' + path));
        assert(response.status === 200, `${path}: protected-resource metadata unavailable`);
        assert(
          response.headers.get('content-type')?.includes('application/json'),
          'metadata media type',
        );
        const metadata = await response.json();
        assert(metadata.resource === resource, 'metadata resource mismatch');
        assert(
          JSON.stringify(metadata.authorization_servers) === JSON.stringify([issuer]),
          'issuer',
        );
        assert(
          JSON.stringify(metadata.scopes_supported) === JSON.stringify(['openid', 'email']),
          'scopes',
        );
        assert(
          JSON.stringify(metadata.bearer_methods_supported) === JSON.stringify(['header']),
          'bearer',
        );
      }

      const barePost = await handle(new Request(resource, { method: 'POST', body: '' }));
      assert(barePost.status === 401, 'bare no-token POST must challenge instead of 415');
      assert(
        barePost.headers.get('WWW-Authenticate')?.includes('resource_metadata="' + resource),
        'bare POST missing OAuth resource hint',
      );
      const missing = await barePost.json();
      assert(missing._meta?.['mcp/www_authenticate']?.length === 1, 'missing MCP auth hint');

      const post = (method: string, params?: object) =>
        handle(
          new Request(resource, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json, text/event-stream',
            },
            body: JSON.stringify({ jsonrpc: '2.0', id: 7, method, ...(params ? { params } : {}) }),
          }),
        );
      const initialized = await post('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'production-route-test', version: '1' },
      });
      assert(initialized.status === 200, 'anonymous protocol initialize unavailable');
      assert((await initialized.text()).includes('serverInfo'), 'initialize body');

      const listed = await post('tools/list');
      assert(listed.status === 200, 'anonymous OAuth catalog unavailable');
      const event = (await listed.text()).split('\n').find((line) => line.startsWith('data: '));
      assert(event, 'tools/list event missing');
      const tools = JSON.parse(event.slice(6)).result?.tools as Array<Record<string, unknown>>;
      assert(Array.isArray(tools) && tools.length === 33, 'OAuth catalog must list 33 tools');
      assert(
        tools.some((tool) => tool.name === 'create_page'),
        'create_page absent',
      );
      assert(
        tools.every(
          (tool) =>
            JSON.stringify(tool.securitySchemes) ===
            JSON.stringify([{ type: 'oauth2', scopes: ['openid', 'email'] }]),
        ),
        'anonymous catalog must require OAuth for every tool',
      );

      const call = await post('tools/call', { name: 'create_page', arguments: {} });
      assert(call.status === 200, 'tool-level OAuth challenge missing');
      const denied = await call.json();
      assert(denied.result?.isError === true, 'anonymous create_page must be denied');
      assert(
        denied.result?._meta?.['mcp/www_authenticate']?.[0]?.includes('insufficient_scope'),
        'denied business call must carry tool-level auth hint',
      );
    } finally {
      for (const [name, value] of previous) {
        if (value === undefined) Deno.env.delete(name);
        else Deno.env.set(name, value);
      }
    }
  },
);
