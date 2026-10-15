const STORAGE_KEY = 'content-producer-auth-session';

// The browser uses only Supabase Auth public APIs, never admin/service-role APIs.
export function createAuth(config, storage = sessionStorage, request = fetch) {
  let origin;
  try {
    origin = new URL(config.url);
  } catch {
    throw new Error('Konfigurasi autentikasi belum tersedia.');
  }
  const local = ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (
    (origin.protocol !== 'https:' && !(origin.protocol === 'http:' && local)) ||
    origin.username ||
    origin.password ||
    origin.hash ||
    origin.search ||
    origin.pathname !== '/' ||
    !/^sb_publishable_[a-zA-Z0-9_-]+$/.test(config.publishableKey ?? '')
  ) {
    throw new Error('Konfigurasi autentikasi belum tersedia.');
  }

  const base = new URL('/auth/v1/', origin);
  let session = null;
  try {
    session = JSON.parse(storage.getItem(STORAGE_KEY) ?? 'null');
  } catch {
    storage.removeItem(STORAGE_KEY);
  }

  function clear() {
    session = null;
    storage.removeItem(STORAGE_KEY);
  }

  function save(data) {
    if (
      typeof data?.access_token !== 'string' ||
      typeof data?.refresh_token !== 'string' ||
      !Number.isFinite(data.expires_in)
    ) {
      throw new Error('Sesi tidak valid.');
    }
    session = {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_at: Date.now() + data.expires_in * 1000,
    };
    storage.setItem(STORAGE_KEY, JSON.stringify(session));
  }

  async function api(path, method = 'GET', body = undefined, token = '') {
    const response = await request(new URL(path, base), {
      method,
      headers: {
        apikey: config.publishableKey,
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
      cache: 'no-store',
      redirect: 'error',
    });
    if (!response.ok) throw new Error('Layanan autentikasi menolak permintaan.');
    if (response.status === 204) return {};
    return response.json();
  }

  async function refresh() {
    if (!session?.refresh_token) return null;
    try {
      save(await api('token?grant_type=refresh_token', 'POST', {
        refresh_token: session.refresh_token,
      }));
      return session.access_token;
    } catch {
      clear();
      return null;
    }
  }

  async function token() {
    if (!session?.access_token) return null;
    if (!Number.isFinite(session.expires_at) || session.expires_at < Date.now() + 30000) {
      return refresh();
    }
    return session.access_token;
  }

  async function user() {
    const bearer = await token();
    if (!bearer) return null;
    try {
      return await api('user', 'GET', undefined, bearer);
    } catch {
      const renewed = await refresh();
      if (!renewed) return null;
      try {
        return await api('user', 'GET', undefined, renewed);
      } catch {
        clear();
        return null;
      }
    }
  }

  return {
    async signIn(email, password) {
      save(await api('token?grant_type=password', 'POST', { email, password }));
    },
    user,
    async authorizationDetails(id) {
      const bearer = await token();
      if (!bearer) throw new Error('Sesi habis.');
      return api('oauth/authorize/' + encodeURIComponent(id), 'GET', undefined, bearer);
    },
    async decide(id, decision) {
      if (!['approve', 'deny'].includes(decision)) throw new Error('Keputusan tidak valid.');
      const bearer = await token();
      if (!bearer) throw new Error('Sesi habis.');
      return api('oauth/authorize/' + encodeURIComponent(id) + '/' + decision, 'POST', {}, bearer);
    },
    async signOut() {
      const bearer = await token();
      try {
        if (bearer) await api('logout', 'POST', {}, bearer);
      } finally {
        clear();
      }
    },
  };
}
