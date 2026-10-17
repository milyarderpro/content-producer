import {
  boundedJson,
  challenge,
  constants,
  exactRequest,
  randomUrlSafe,
  safeHeaders,
  seal,
  setCookie,
  settings,
  pilotEnabled,
} from './_shared.js';

export async function POST(request) {
  const config = settings();
  if (!config || !exactRequest(request, '/api/phase-9-5/start')) {
    return new Response(null, { status: 404, headers: safeHeaders() });
  }
  const intent = request.headers.get('x-phase95-intent');
  if (intent !== null && intent !== 'approved-create-page')
    return new Response(null, { status: 403, headers: safeHeaders() });
  const pilot = intent === 'approved-create-page';
  if (pilot && !pilotEnabled()) return new Response(null, { status: 404, headers: safeHeaders() });
  if (request.headers.get('origin') !== new URL(constants.CALLBACK).origin) {
    return new Response(null, { status: 403, headers: safeHeaders() });
  }
  const bearer = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(request.headers.get('authorization') || '');
  if (!bearer) return new Response(null, { status: 401, headers: safeHeaders() });
  try {
    const userResponse = await fetch(constants.SUPABASE + '/auth/v1/user', {
      headers: { apikey: config.publishableKey, Authorization: 'Bearer ' + bearer[1] },
      redirect: 'error',
      signal: AbortSignal.timeout(5000),
    });
    if (!userResponse.ok) return new Response(null, { status: 401, headers: safeHeaders() });
    const user = await boundedJson(userResponse, 65536);
    if (user.id !== config.ownerId)
      return new Response(null, { status: 403, headers: safeHeaders() });
    const state = randomUrlSafe();
    const verifier = randomUrlSafe();
    const flow = await seal({ state, verifier, createdAt: Date.now(), intent: pilot ? 'pilot' : 'read' }, config.key);
    const authorize = new URL(constants.SUPABASE + '/auth/v1/oauth/authorize');
    authorize.searchParams.set('response_type', 'code');
    authorize.searchParams.set('client_id', config.clientId);
    authorize.searchParams.set('redirect_uri', constants.CALLBACK);
    authorize.searchParams.set('state', state);
    authorize.searchParams.set('code_challenge', challenge(verifier));
    authorize.searchParams.set('code_challenge_method', 'S256');
    authorize.searchParams.set('scope', 'openid email profile');
    authorize.searchParams.set('resource', constants.RESOURCE);
    return Response.json(
      { authorize_url: authorize.href },
      {
        status: 200,
        headers: safeHeaders({ 'Set-Cookie': setCookie(constants.COOKIE_FLOW, flow) }),
      },
    );
  } catch {
    return new Response(null, { status: 503, headers: safeHeaders() });
  }
}
