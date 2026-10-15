import { createAuth } from './auth.js';
import { config } from './config.js';
import { authorizationId, consentPath, loginPath, safeOAuthRedirect } from './routes.js';

const $ = (id) => document.getElementById(id);
const field = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id));
const button = (id) => /** @type {HTMLButtonElement} */ (document.getElementById(id));
const status = $('status');

function message(value) {
  status.textContent = value;
}

function page(name, title) {
  for (const id of ['login', 'consent', 'logout', 'error']) {
    $(id).hidden = id !== name;
  }
  $('title').textContent = title;
}

function error(
  text = 'Permintaan tidak valid atau telah kedaluwarsa. Silakan mulai lagi dari aplikasi Anda.',
) {
  page('error', 'Tidak dapat melanjutkan');
  $('safe-error').textContent = text;
  message('');
}

function navigate(path) {
  window.location.assign(path);
}

async function start() {
  const path = window.location.pathname;
  const id = authorizationId(window.location.search);
  if (!['/', '/login', '/oauth/consent', '/logout', '/error'].includes(path)) {
    return error();
  }
  if (path === '/error') return error();

  let auth;
  try {
    auth = createAuth(config);
  } catch {
    return error('Konfigurasi autentikasi belum tersedia.');
  }

  if (path === '/logout') {
    page('logout', 'Keluar');
    button('logout-button').addEventListener('click', async () => {
      button('logout-button').disabled = true;
      try {
        await auth.signOut();
        navigate('/login');
      } catch {
        error('Tidak dapat menyelesaikan logout. Tutup tab atau coba lagi.');
      }
    });
    return;
  }

  if (path === '/login' || path === '/') {
    if (window.location.search && !id) return error();
    page('login', 'Masuk');
    $('login-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const submit = $('login-form').querySelector('button');
      submit.disabled = true;
      message('Memeriksa akun…');
      try {
        await auth.signIn(field('email').value, field('password').value);
        navigate(id ? consentPath(id) : '/logout');
      } catch {
        message('Tidak dapat masuk. Periksa kredensial atau coba lagi.');
        submit.disabled = false;
      }
    });
    return;
  }

  if (!id) return error();
  page('consent', 'Memuat permintaan izin');
  message('Memeriksa sesi…');

  try {
    if (!(await auth.user())) return navigate(loginPath(id));
    const details = await auth.authorizationDetails(id);
    if (!details || typeof details !== 'object') return error();

    // Previously authorized requests can be redirected by Supabase directly.
    if (!('authorization_id' in details)) {
      const redirect = safeOAuthRedirect(details.redirect_url);
      return redirect ? navigate(redirect) : error();
    }
    if (
      details.authorization_id !== id ||
      !details.client ||
      typeof details.client.id !== 'string'
    ) {
      return error();
    }
    $('client-name').textContent = details.client.name || 'Aplikasi tanpa nama';
    $('client-id').textContent = 'Client ID: ' + details.client.id;
    const scopes =
      typeof details.scope === 'string' ? details.scope.split(/\s+/).filter(Boolean) : [];
    $('scope-list').replaceChildren(
      ...(scopes.length ? scopes : ['Tidak ada scope yang dinyatakan']).map((scope) => {
        const li = document.createElement('li');
        li.textContent = scope;
        return li;
      }),
    );
    page('consent', 'Izinkan akses?');
    message('');

    for (const decision of ['approve', 'deny']) {
      button(decision).addEventListener('click', async () => {
        button('approve').disabled = button('deny').disabled = true;
        message('Memproses pilihan…');
        try {
          const result = await auth.decide(id, decision);
          const redirect = safeOAuthRedirect(result?.redirect_url, details.redirect_uri);
          if (!redirect) return error();
          navigate(redirect);
        } catch {
          message('Permintaan gagal atau kedaluwarsa. Mulai lagi dari aplikasi Anda.');
          button('approve').disabled = button('deny').disabled = false;
        }
      });
    }
  } catch {
    error();
  }
}

void start();
