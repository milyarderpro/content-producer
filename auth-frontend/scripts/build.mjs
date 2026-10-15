import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';

const src = new URL('../src/', import.meta.url);
const dest = new URL('../dist/', import.meta.url);
await mkdir(dest, { recursive: true });

for (const file of ['index.html', 'style.css', 'app.js', 'auth.js', 'routes.js']) {
  await cp(new URL(file, src), new URL(file, dest));
}

// Deliberately allowlist only two public build-time variables.
const url = process.env.VITE_SUPABASE_URL ?? '';
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';
if (url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Invalid public Supabase URL');
  }
  const loopback = ['localhost', '127.0.0.1'].includes(parsed.hostname);
  if (
    (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback)) ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.pathname !== '/'
  ) {
    throw new Error('Invalid public Supabase URL');
  }
}
if (publishableKey && !/^sb_publishable_[A-Za-z0-9_-]+$/.test(publishableKey)) {
  throw new Error('Expected a publishable key, not a secret key');
}
await writeFile(
  new URL('config.js', dest),
  'export const config = ' + JSON.stringify({ url, publishableKey }) + ';\n',
);
const html = await readFile(new URL('index.html', dest), 'utf8');
if (!html.includes('Content-Security-Policy')) throw new Error('Missing CSP');
console.log('Static auth frontend built (public configuration only).');
