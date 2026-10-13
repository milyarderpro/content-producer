import { mcpTransport } from './transport.ts';
import { handleHttpRequest } from './http.ts';
import { MCP_TOOL_COUNT } from './registry.ts';

function assert(condition: unknown, detail: string): asserts condition {
  if (!condition) throw new Error(detail);
}

function protocolRequest(method: string, params?: object): Request {
  return new Request('http://localhost/mcp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, ...(params ? { params } : {}) }),
  });
}

Deno.test('6.1 internal Streamable HTTP initializes and lists zero tools', async () => {
  const initialized = await mcpTransport.fetch(
    protocolRequest('initialize', {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'phase-6-1-harness', version: '1.0.0' },
    }),
  );
  const initBody = await initialized.text();
  assert(initialized.status === 200, `internal initialize: ${initialized.status}`);
  assert(initBody.includes('serverInfo'), 'internal initialize did not return serverInfo');

  const listed = await mcpTransport.fetch(protocolRequest('tools/list'));
  const listBody = await listed.text();
  assert(listed.status === 200, `internal tools/list: ${listed.status}`);
  assert(/"tools"\s*:\s*\[\s*\]/.test(listBody), 'expected empty tool registry');
  assert(MCP_TOOL_COUNT === 0, 'tool registry count must remain zero');
});

Deno.test('6.1 internal protocol errors are structured', async () => {
  const response = await mcpTransport.fetch(protocolRequest('undefined/method'));
  const body = await response.text();
  assert(body.includes('error'), 'missing JSON-RPC protocol error');
});

Deno.test('6.1 public HTTP exposes only health and preflight', async () => {
  const url = 'http://localhost/functions/v1/mcp';
  const health = handleHttpRequest(new Request(`${url}/health`));
  const payload = await health.json();
  assert(health.status === 200, 'health must return 200');
  assert(payload.status === 'ok' && payload.version === '0.1.0', 'invalid health status');
  assert(Number.isFinite(Date.parse(payload.timestamp)), 'missing server timestamp');
  assert(!('owner' in payload) && !('tools' in payload), 'health exposed business data');

  const preflight = handleHttpRequest(new Request(url, { method: 'OPTIONS' }));
  assert(preflight.status === 204, 'preflight must return 204');
  assert((await preflight.text()) === '', 'preflight must have no payload');

  for (const method of ['initialize', 'tools/list', 'tools/call']) {
    for (const authorization of [undefined, 'Bearer never-validated']) {
      const request = protocolRequest(method);
      const headers = new Headers(request.headers);
      if (authorization) headers.set('Authorization', authorization);
      const blocked = handleHttpRequest(
        new Request(url, { method: 'POST', headers, body: await request.text() }),
      );
      assert(blocked.status === 401, `${method} unexpectedly passed the auth gate`);
      assert(blocked.headers.has('WWW-Authenticate'), 'missing bearer challenge');
    }
  }
  assert(handleHttpRequest(new Request(url)).status === 401, 'GET MCP must be closed');
  assert(handleHttpRequest(new Request(`${url}/unknown`)).status === 404, 'bad route');
  assert(
    handleHttpRequest(new Request(`${url}/health`, { method: 'POST' })).status === 405,
    'health must only accept GET',
  );
});
