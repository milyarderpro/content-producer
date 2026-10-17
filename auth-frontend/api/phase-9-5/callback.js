import {
  boundedJson,
  boundedMcpResult,
  callbackParams,
  clearCookie,
  constants,
  cookieValue,
  exactRequest,
  resultRedirect,
  safeHeaders,
  seal,
  setCookie,
  settings,
  unseal,
  verifyJwt,
} from './_shared.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const reads = ['get_account_profile', 'get_workspace_context', 'list_pages'];

async function tokenRequest(form, requireRefresh = false) {
  const response = await fetch(constants.SUPABASE + '/auth/v1/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
    redirect: 'error',
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok || response.status < 200 || response.status >= 300) throw new Error('token');
  const body = await boundedJson(response, 65536);
  if (
    typeof body.access_token !== 'string' ||
    (requireRefresh && typeof body.refresh_token !== 'string')
  )
    throw new Error('token');
  return { status: response.status, access: body.access_token, refresh: body.refresh_token };
}

async function rpc(token, method, params, id, stage) {
  const response = await fetch(constants.RESOURCE, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
      'MCP-Protocol-Version': '2025-06-18',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, ...(params ? { params } : {}) }),
    redirect: 'error',
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok)
    throw new Error(response.status === 401 ? 'mcp_401_' + stage : 'mcp_http_' + stage);
  return boundedMcpResult(response, method);
}

function toolOk(result) {
  return result && !result.isError && result.structuredContent?.response_schema_version === 1;
}

async function readOnlyGate(token) {
  await rpc(
    token,
    'initialize',
    {
      protocolVersion: '2025-06-18',
      capabilities: {},
      clientInfo: { name: 'content-producer-phase-9-5-test', version: '1.0.0' },
    },
    1,
    'initialize',
  );
  const listed = await rpc(token, 'tools/list', {}, 2, 'list');
  if (
    !Array.isArray(listed.tools) ||
    listed.tools.length !== 33 ||
    new Set(listed.tools.map((tool) => tool.name)).size !== 33 ||
    !reads.every((name) => listed.tools.some((tool) => tool.name === name))
  )
    throw new Error('tool_count');
  const profile = await rpc(
    token,
    'tools/call',
    {
      name: 'get_account_profile',
      arguments: { request_schema_version: 1 },
    },
    3,
    'profile',
  );
  if (!toolOk(profile)) throw new Error('profile');
  const workspaceId = profile.structuredContent.data?.profile?.workspace_public_id;
  if (typeof workspaceId !== 'string' || !UUID.test(workspaceId)) throw new Error('profile');
  for (const [index, name] of reads.slice(1).entries()) {
    const result = await rpc(
      token,
      'tools/call',
      {
        name,
        arguments: { request_schema_version: 1, workspace_public_id: workspaceId },
      },
      index + 4,
      name === 'list_pages' ? 'pages' : 'workspace',
    );
    if (!toolOk(result)) throw new Error(name === 'list_pages' ? 'pages' : 'workspace');
  }
  return { tool_count: 33, owner_reads: 3 };
}

async function finish(config, result) {
  const cookie = await seal(result, config.key);
  const headers = new Headers(safeHeaders({ Location: resultRedirect() }));
  headers.append('Set-Cookie', clearCookie(constants.COOKIE_FLOW));
  headers.append('Set-Cookie', setCookie(constants.COOKIE_RESULT, cookie, 120));
  return new Response(null, { status: 303, headers });
}

export async function GET(request) {
  const config = settings();
  if (!config || !exactRequest(request, '/api/phase-9-5/callback')) {
    return new Response(null, { status: 404, headers: safeHeaders() });
  }
  const flow = await unseal(cookieValue(request, constants.COOKIE_FLOW), config.key);
  const outcome = callbackParams(request.url, flow);
  if (outcome.kind === 'invalid') return finish(config, { status: 'invalid_flow' });
  if (outcome.kind === 'denied') return finish(config, { status: 'denied' });
  try {
    const first = await tokenRequest(
      {
        grant_type: 'authorization_code',
        code: outcome.code,
        client_id: config.clientId,
        redirect_uri: constants.CALLBACK,
        code_verifier: flow.verifier,
      },
      true,
    );
    if (!(await verifyJwt(first.access, config)))
      return finish(config, { status: 'invalid_token' });
    const renewed = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: first.refresh,
      client_id: config.clientId,
    });
    if (!(await verifyJwt(renewed.access, config)))
      return finish(config, { status: 'invalid_refresh' });
    const gate = await readOnlyGate(renewed.access);
    return finish(config, {
      status: 'owner_read_pass',
      token_http: first.status,
      refresh_http: renewed.status,
      ...gate,
    });
  } catch (error) {
    const allowed = new Set([
      'token',
      'mcp_size',
      'mcp_format',
      'mcp_result',
      'tool_count',
      'profile',
      'workspace',
      'pages',
      ...['initialize', 'list', 'profile', 'workspace', 'pages'].flatMap((stage) => [
        'mcp_401_' + stage,
        'mcp_http_' + stage,
      ]),
    ]);
    const status = allowed.has(error?.message) ? error.message : 'test_error';
    return finish(config, { status });
  }
}
