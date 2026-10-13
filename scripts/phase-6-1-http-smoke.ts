// Black-box smoke against local Supabase only; never send credentials.
const url = 'http://127.0.0.1:54321/functions/v1/mcp';

function expectStatus(actual: number, expected: number, label: string): void {
  if (actual !== expected) throw new Error(`${label}: expected ${expected}, got ${actual}`);
  console.log(`${label}: HTTP ${actual} (PASS)`);
}

let ready = false;
for (let attempt = 0; attempt < 45; attempt += 1) {
  try {
    const health = await fetch(`${url}/health`, { signal: AbortSignal.timeout(2000) });
    if (health.status === 200) {
      const payload = (await health.json()) as Record<string, unknown>;
      if (
        payload.status !== 'ok' ||
        payload.version !== '0.1.0' ||
        !Number.isFinite(Date.parse(String(payload.timestamp)))
      ) {
        throw new Error('Health lacks expected status/version/server timestamp.');
      }
      expectStatus(health.status, 200, 'GET /health');
      ready = true;
      break;
    }
  } catch {
    // The local function runner is still starting. Do not print credentials.
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
if (!ready) throw new Error('Local MCP function health did not become ready.');

const initializeBody = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'phase-6-1-smoke', version: '1.0.0' },
  },
});
const headers = {
  'Content-Type': 'application/json',
  Accept: 'application/json, text/event-stream',
};
for (const [label, body, bearer] of [
  ['initialize without auth', initializeBody, false],
  ['initialize with unverified bearer', initializeBody, true],
  [
    'tools/list without auth',
    JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
    false,
  ],
] as const) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { ...headers, ...(bearer ? { Authorization: 'Bearer invalid' } : {}) },
    body,
  });
  expectStatus(response.status, 401, label);
  if (!response.headers.has('WWW-Authenticate')) throw new Error(`${label}: missing challenge`);
}
expectStatus((await fetch(url)).status, 401, 'GET MCP is closed');
expectStatus((await fetch(url, { method: 'OPTIONS' })).status, 204, 'MCP preflight');
expectStatus((await fetch(`${url}/not-a-route`)).status, 404, 'unknown route');
console.log('6.1 local HTTP smoke PASS (zero tools).');
