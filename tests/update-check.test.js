import { test } from 'node:test';
import assert from 'node:assert/strict';
import { staleBuild, reloadOnce } from '../src/update-check.js';

const page = src => `<!doctype html><html><body><div id="app"></div><script type="module" crossorigin src="${src}"></script></body></html>`;

test('a served page whose module script differs from the running one is a new build', () => {
  assert.equal(staleBuild(page('/skyline-rush/assets/index-NEW.js'), 'https://weskao.github.io/skyline-rush/assets/index-OLD.js'), true);
});

test('the same module script means the running page is current', () => {
  assert.equal(staleBuild(page('/skyline-rush/assets/index-OLD.js'), 'https://weskao.github.io/skyline-rush/assets/index-OLD.js'), false);
});

test('a page with no module script (error page, offline fallback) never forces a reload', () => {
  assert.equal(staleBuild('<html><body>404</body></html>', 'https://weskao.github.io/skyline-rush/assets/index-OLD.js'), false);
});

test('an unknown running script (nothing to compare against) never forces a reload', () => {
  assert.equal(staleBuild(page('/skyline-rush/assets/index-NEW.js'), undefined), false);
});

test('a new build reloads once per served entry, so a stuck edge cache cannot loop the page', () => {
  const store = new Map();
  const memory = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  assert.equal(reloadOnce('/assets/index-NEW.js', memory), true);
  assert.equal(reloadOnce('/assets/index-NEW.js', memory), false);
  assert.equal(reloadOnce('/assets/index-NEWER.js', memory), true);
});
