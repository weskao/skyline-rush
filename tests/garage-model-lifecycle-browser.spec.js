import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';

// Phase 2 `?model=probe` lifecycle checks not covered by garage-model-probe-browser.spec.js
// (docs/designs/3d-pipeline/phase2-model-contracts.md §2): racing compiles nothing, the production
// /skyline-rush/ base, and a forced 404 with one `[model-probe]` warning, no console error and no error overlay.
const GLB = /\/models\/pipeline-probe\/pipeline-probe\.glb$/;
const world = page => page.locator('#world');

/** Opens `url`, recording GLB request paths, console errors, uncaught errors and `[model-probe]` warnings. */
async function open(page, url) {
  const seen = { glb: [], errors: [], warnings: [] };
  page.on('request', request => { const { pathname } = new URL(request.url()); if (GLB.test(pathname)) seen.glb.push(pathname); });
  page.on('pageerror', error => seen.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') seen.errors.push(message.text());
    if (message.type() === 'warning' && message.text().startsWith('[model-probe]')) seen.warnings.push(message.text());
  });
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  return seen;
}
const frames = (page, count) => page.evaluate(n => new Promise(resolve => {
  const tick = () => (--n > 0 ? requestAnimationFrame(tick) : resolve());
  requestAnimationFrame(tick);
}), count);

test('a forced 404 falls back with one warning, no console error and no error overlay', async ({ gameplayPage: page, gameplayURL }) => {
  await page.route(GLB, route => route.fulfill({ status: 404, body: '' }));
  const seen = await open(page, `${gameplayURL}?model=probe`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'fallback:missing', { timeout: ciTimeout(15000) });
  await expect.poll(() => seen.warnings.length).toBe(1);
  expect(seen.warnings[0]).toContain('missing');
  await frames(page, 10);
  expect(seen.warnings).toHaveLength(1); // settled: 10 frames after the fallback, still exactly one
  await expect(page.locator('#error-message')).toBeHidden();
  // Chrome reports the forced 404 response itself; any app console error still fails.
  expect(seen.errors.filter(text => !/status of 404/.test(text))).toEqual([]);
});

test('racing after a probe Garage visit compiles no shader programs', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  const seen = await open(page, `${gameplayURL}?model=probe`);
  await page.evaluate(() => { // records the race phase of every compileAsync on the one world renderer
    const renderer = window.gameScene.renderer, compile = renderer.compileAsync.bind(renderer);
    window.compilePhases = [];
    renderer.compileAsync = (...args) => { window.compilePhases.push(window.gameplay.race.phase); return compile(...args); };
  });
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  await page.locator('#garage-close').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'off');
  await page.locator('#start-button').click();
  await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(15000) }).toBe('racing');
  await frames(page, 5);
  const programs = () => page.evaluate(() => window.gameScene.renderer.info.programs.length);
  const before = await programs();
  await page.keyboard.down('w');
  await frames(page, 120);
  await page.keyboard.up('w');
  expect(await programs()).toBe(before); // settled: 120 frames were rendered above
  expect(await page.evaluate(() => window.compilePhases.filter(phase => phase === 'racing'))).toEqual([]);
  expect(seen.glb).toHaveLength(1);
  expect(seen.errors).toEqual([]);
});

test('the probe loads under the production /skyline-rush/ base', async ({ gameplayPage: page }) => {
  const server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    base: '/skyline-rush/',
    server: { host: '127.0.0.1', port: 0 },
  });
  try {
    await server.listen();
    const seen = await open(page, `${server.resolvedUrls.local[0]}?model=probe`);
    await page.locator('#garage-button').click();
    await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
    expect(seen.glb).toEqual(['/skyline-rush/models/pipeline-probe/pipeline-probe.glb']);
    expect(seen.errors).toEqual([]);
  } finally { await server.close(); }
});
