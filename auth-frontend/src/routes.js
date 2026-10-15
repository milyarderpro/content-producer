// Never accept a caller-controlled redirect/return URL.
export function authorizationId(search) {
  const values = new URLSearchParams(search).getAll('authorization_id');
  if (values.length !== 1 || !/^[a-zA-Z0-9_-]{1,512}$/.test(values[0])) return null;
  return values[0];
}

export function consentPath(id) {
  return '/oauth/consent?authorization_id=' + encodeURIComponent(id);
}

export function loginPath(id) {
  return '/login?authorization_id=' + encodeURIComponent(id);
}

// Only an Auth API result may provide the destination (never location.search).
export function safeOAuthRedirect(value, originalRedirectUri) {
  if (typeof value !== 'string') return null;
  try {
    const target = new URL(value);
    if (target.username || target.password || target.hash) return null;
    const loopback = ['localhost', '127.0.0.1'].includes(target.hostname);
    if (target.protocol !== 'https:' && !(target.protocol === 'http:' && loopback)) return null;
    if (originalRedirectUri) {
      const original = new URL(originalRedirectUri);
      if (target.origin !== original.origin || target.pathname !== original.pathname) return null;
      for (const [key, val] of original.searchParams) {
        if (target.searchParams.get(key) !== val) return null;
      }
    }
    return target.href;
  } catch {
    return null;
  }
}
