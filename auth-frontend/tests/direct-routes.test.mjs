import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = fileURLToPath(new URL('../', import.meta.url));

test('each auth route opens directly and refreshes through static rewrite', async (t) => {
  execFileSync(process.execPath, ['scripts/build.mjs'], { cwd: root });
  const settings = JSON.parse(
    await readFile(new URL('../vercel.json', import.meta.url), 'utf8'),
  );
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://127.0.0.1').pathname;
    const rewrite = settings.rewrites.find((item) => item.source === path);
    const target = rewrite?.destination ?? path;
    try {
      const content = await readFile(
        new URL('.' + target, new URL('../dist/', import.meta.url)),
      );
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  for (const path of [
    '/login',
    '/oauth/consent?authorization_id=test-id',
    '/logout',
    '/error',
  ]) {
    for (let repeat = 0; repeat < 2; repeat++) {
      const response = await fetch('http://127.0.0.1:' + address.port + path);
      assert.equal(response.status, 200, path);
      assert.match(await response.text(), /id="(login|consent|logout|error)"/);
    }
  }
});
