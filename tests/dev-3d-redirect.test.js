import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';

test('a dev server with the old 3D option serves the original URL without redirecting', async t => {
  const previous = process.env.DEV_3D;
  process.env.DEV_3D = '1';
  t.after(() => { if (previous === undefined) delete process.env.DEV_3D; else process.env.DEV_3D = previous; });
  const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
  try {
    await server.listen();
    for (const search of ['', '?3d=1&debug=1']) {
      const url = server.resolvedUrls.local[0] + search;
      const response = await fetch(url, { redirect: 'manual' });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('location'), null);
    }
  } finally {
    await server.close();
  }
});
