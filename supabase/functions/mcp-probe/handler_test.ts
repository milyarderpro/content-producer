import { handleProbeRequest } from './handler.ts';

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message);
}

function request(method: string, params?: object): Request {
  return new Request('https://example.test/functions/v1/mcp-probe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  });
}

async function result(response: Response): Promise<Record<string, unknown>> {
  assert(response.status === 200, `MCP HTTP status ${response.status}`);
  const body = await response.text();
  const event = body.split('\n').find((line) => line.startsWith('data: '));
  const message = JSON.parse(event ? event.slice(6) : body) as Record<string, unknown>;
  assert(!message.error, 'MCP protocol error');
  assert(message.result && typeof message.result === 'object', 'missing MCP result');
  return message.result as Record<string, unknown>;
}

Deno.test('10.1 anonymous probe initializes without a token', async () => {
  const initialized = await result(
    await handleProbeRequest(
      request('initialize', {
        protocolVersion: '2025-06-18',
        capabilities: {},
        clientInfo: { name: 'phase-10-1-probe-test', version: '1.0.0' },
      }),
    ),
  );
  assert(initialized.serverInfo, 'serverInfo missing');
});

Deno.test('10.1 anonymous probe lists only the read-only ping tool', async () => {
  const listed = await result(await handleProbeRequest(request('tools/list')));
  const tools = listed.tools as Array<Record<string, unknown>>;
  assert(Array.isArray(tools) && tools.length === 1, 'probe must list exactly one tool');
  assert(tools[0].name === 'ping', 'unexpected probe tool');
  assert(
    (tools[0].annotations as Record<string, unknown>).readOnlyHint === true,
    'ping is read-only',
  );
  assert(!('securitySchemes' in tools[0]), 'ping must not advertise OAuth');
  assert(
    Object.keys((tools[0].inputSchema as Record<string, unknown>).properties as object).length ===
      0,
    'ping must accept empty input',
  );
});

Deno.test('10.1 anonymous ping returns only OK', async () => {
  const called = await result(
    await handleProbeRequest(request('tools/call', { name: 'ping', arguments: {} })),
  );
  assert(called.isError !== true, 'ping failed');
  assert(
    JSON.stringify(called.structuredContent) === JSON.stringify({ status: 'OK' }),
    'unexpected structured result',
  );
  const content = called.content as Array<Record<string, unknown>>;
  assert(
    content.length === 1 && content[0].type === 'text' && content[0].text === 'OK',
    'ping text mismatch',
  );
});
