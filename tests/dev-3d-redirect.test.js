import test from 'node:test';
import assert from 'node:assert/strict';
import { dev3dPlugin, dev3dRedirect } from '../scripts/dev-3d-redirect-plugin.mjs';

test('bare root gains the roadster and 3d look gates', () => {
  assert.equal(dev3dRedirect('/'), '/?model=roadster&look=3d');
});

test('other query params are kept and the gates appended', () => {
  assert.equal(dev3dRedirect('/?debug=1'), '/?debug=1&model=roadster&look=3d');
});

test('an explicit model or look wins, and non-root paths are untouched', () => {
  for (const url of ['/?model=probe', '/?look=3d', '/?look=off', '/src/main.js', '/models/roadster2/roadster2.glb']) {
    assert.equal(dev3dRedirect(url), null, url);
  }
});

test('plugin is serve-only, redirects GET / with 302 and passes everything else on', () => {
  const plugin = dev3dPlugin();
  assert.equal(plugin.apply, 'serve');
  let middleware;
  plugin.configureServer({ middlewares: { use: (fn) => { middleware = fn; } } });
  const run = (method, url) => {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end() { this.ended = true; } };
    let passed = false;
    middleware({ method, url }, res, () => { passed = true; });
    return { res, passed };
  };
  const hit = run('GET', '/');
  assert.equal(hit.res.statusCode, 302);
  assert.equal(hit.res.headers.Location, '/?model=roadster&look=3d');
  assert.equal(hit.passed, false);
  assert.equal(run('POST', '/').passed, true);
  assert.equal(run('GET', '/?model=roadster').passed, true);
});
