import { expect } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Garage-only `?model=probe` adapter lifecycle: docs/designs/3d-pipeline/phase2-model-contracts.md §2.
const SHOTS = 'artifacts/model-probe';
const VIEWPORTS = [['desktop', { width: 1440, height: 900 }], ['portrait', { width: 390, height: 844 }], ['landscape', { width: 844, height: 390 }]];
const MODULES = /garage-model-probe|asset-model-loader|GLTFLoader/;

function watch(page) {
  const seen = { glb: [], modules: [], errors: [], warnings: [] };
  page.on('request', request => {
    const url = request.url();
    if (/\.glb(\?|$)/.test(url)) seen.glb.push(new URL(url).pathname);
    if (MODULES.test(url)) seen.modules.push(url);
  });
  page.on('pageerror', error => seen.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error') seen.errors.push(message.text());
    if (message.type() === 'warning' && message.text().startsWith('[model-probe]')) seen.warnings.push(message.text());
  });
  return seen;
}

async function open(page, url) {
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (await page.locator('#performance-notice-dismiss').isVisible()) await page.locator('#performance-notice-dismiss').click();
  // Counts every warmup on the one world renderer, and whether the probe was in the compiled scene.
  await page.evaluate(() => {
    const renderer = window.gameScene.renderer, compile = renderer.compileAsync.bind(renderer);
    window.probeWarmups = [];
    renderer.compileAsync = (scene, ...rest) => {
      window.probeWarmups.push({ probe: !!scene.getObjectByName('probe_body'), phase: window.gameplay.race.phase });
      return compile(scene, ...rest);
    };
  });
}

async function openStudio(page) {
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
}

async function leaveGarage(page) {
  await page.locator('#garage-close').click();
  await expect(page.locator('#garage-screen')).toBeHidden();
}

// The probe is drawn when its root is in the scene the composer renders and every ancestor is visible.
const probeShown = page => page.evaluate(() => {
  let node = window.gameScene.composer.passes[0].scene.getObjectByName('probe_body');
  if (!node) return false;
  for (; node; node = node.parent) if (!node.visible) return false;
  return true;
});
const memory = page => page.evaluate(() => {
  const { memory: { geometries, textures }, programs } = window.gameScene.renderer.info;
  return { geometries, textures, programs: programs.length };
});
const probeWarmups = page => page.evaluate(() => window.probeWarmups.filter(call => call.probe).length);
const frames = (page, count = 10) => page.evaluate(n => new Promise(resolve => {
  const tick = () => (--n > 0 ? requestAnimationFrame(tick) : resolve());
  requestAnimationFrame(tick);
}), count);
async function shot(page, name) {
  mkdirSync(SHOTS, { recursive: true });
  const { width, height } = page.viewportSize();
  await page.screenshot({ path: `${SHOTS}/${name}-${width}x${height}.png` });
}
// renderer.info evidence for the Phase 2 report; artifacts/ is gitignored.
function record(name, data) {
  mkdirSync(SHOTS, { recursive: true });
  writeFileSync(`${SHOTS}/renderer-info-${name}.json`, JSON.stringify(data, null, 2));
}

for (const [label, viewport] of VIEWPORTS) {
  test.describe(`${label} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    test('?model=probe shows the warmed pipeline GLB in the Garage Studio', async ({ gameplayPage: page, gameplayURL }) => {
      const seen = watch(page);
      await open(page, `${gameplayURL}?model=probe`);
      await openStudio(page);
      await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
      expect(await probeWarmups(page)).toBeGreaterThan(0);
      expect(seen.glb).toEqual(['/models/pipeline-probe/pipeline-probe.glb']);
      await frames(page);
      await shot(page, 'probe-loaded');
      expect(seen.errors).toEqual([]);
      expect(seen.warnings).toEqual([]);
    });

    test('a 404 GLB keeps today\'s procedural car with one warning and no error', async ({ gameplayPage: page, gameplayURL }) => {
      const seen = watch(page);
      await page.route('**/*.glb', route => route.fulfill({ status: 404, body: 'not found' }));
      await open(page, `${gameplayURL}?model=probe`);
      await openStudio(page);
      await expect.poll(() => seen.warnings.length, { timeout: ciTimeout(15_000) }).toBe(1);
      expect(seen.warnings[0]).toContain('missing');
      await frames(page);
      expect(await probeShown(page)).toBe(false); // settled: the fallback warning is the adapter's last step
      await expect(page.locator('#error-message')).toBeHidden();
      await shot(page, 'probe-fallback');
      // Chrome reports the forced 404 itself; any app console error still fails.
      expect(seen.errors.filter(text => !/status of 404/.test(text))).toEqual([]);
      expect(seen.warnings).toHaveLength(1);
    });

    test('without the query the Garage fetches no GLB and loads no model code', async ({ gameplayPage: page, gameplayURL }) => {
      const seen = watch(page);
      await open(page, gameplayURL);
      await openStudio(page);
      await frames(page, 30);
      await shot(page, 'production');
      expect(seen.glb).toEqual([]);
      expect(seen.modules).toEqual([]);
      expect(await probeShown(page)).toBe(false); // settled: nothing was requested that could show it
      expect(seen.errors).toEqual([]);
    });
  });
}

test('camera switches reuse the probe instance without another GLB request', async ({ gameplayPage: page, gameplayURL }) => {
  const seen = watch(page);
  await open(page, `${gameplayURL}?model=probe`);
  await openStudio(page);
  await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
  const id = () => page.evaluate(() => window.gameScene.composer.passes[0].scene.getObjectByName('probe_body').uuid);
  const first = await id();
  for (const angle of ['front', 'rear', 'side', 'top', 'cinematic']) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    await expect(page.locator(`[data-garage-angle="${angle}"]`)).toHaveAttribute('aria-pressed', 'true');
    await frames(page, 3);
  }
  expect(await id()).toBe(first);
  expect(seen.glb).toHaveLength(1);
  expect(seen.errors).toEqual([]);
});

test('a quality change between Studio visits does not leak probe resources', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  const seen = watch(page);
  await open(page, `${gameplayURL}?model=probe`);
  const deltas = [];
  for (const quality of ['High', 'Low']) {
    await page.locator('#vfx-panel > summary').click();
    await page.getByRole('combobox', { name: 'Quality', exact: true }).click({ timeout: ciTimeout(15_000) });
    await page.getByRole('option', { name: quality, exact: true }).click();
    await page.locator('#vfx-panel > summary').click();
    await openStudio(page);
    await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
    await frames(page);
    const inStudio = await memory(page);
    const own = await page.evaluate(() => {
      const geometries = new Set();
      window.gameScene.composer.passes[0].scene.getObjectByName('probe_body').parent.traverse(o => o.geometry && geometries.add(o.geometry));
      return geometries.size;
    });
    await leaveGarage(page);
    await frames(page);
    const after = await memory(page);
    deltas.push({ quality, own, geometries: inStudio.geometries - after.geometries, textures: inStudio.textures - after.textures });
  }
  // Leaving the Studio frees exactly the probe's own geometry at every quality.
  for (const delta of deltas) expect(delta.geometries).toBe(delta.own);
  expect(deltas[1]).toEqual({ ...deltas[0], quality: 'Low' });
  record('quality', deltas);
  expect(seen.errors).toEqual([]);
});

test('after leaving the Garage and switching tracks, GPU memory returns to its baseline', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  const seen = watch(page);
  await open(page, `${gameplayURL}?model=probe`);
  const tracks = await page.locator('[data-track]').evaluateAll(cards => cards.map(card => card.dataset.track));
  const roundTrip = async () => {
    await leaveGarage(page);
    for (const track of [tracks[1], tracks[0]]) {
      await page.locator(`[data-track="${track}"]`).click();
      await expect.poll(() => page.evaluate(() => window.gameplay.race.trackId)).toBe(track);
      await frames(page);
    }
  };
  const gpuMemory = async () => { const { geometries, textures } = await memory(page); return { geometries, textures }; };
  // Baseline: the same Garage visit and track round trip with the probe failing, so the Studio stage is allocated.
  await page.route('**/*.glb', route => route.fulfill({ status: 404, body: 'not found' }));
  await openStudio(page);
  await expect.poll(() => seen.warnings.length, { timeout: ciTimeout(15_000) }).toBe(1);
  await roundTrip();
  const baseline = await gpuMemory();
  await page.unroute('**/*.glb');
  await openStudio(page);
  await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
  await frames(page);
  const inStudio = await memory(page);
  expect(inStudio.geometries).toBeGreaterThan(baseline.geometries);
  await roundTrip();
  await expect.poll(gpuMemory).toEqual(baseline);
  record('track-switch', { baseline, inStudio, after: await gpuMemory() });
  expect(seen.errors.filter(text => !/status of 404/.test(text))).toEqual([]);
});

test('context loss and restore re-warm the probe without a re-fetch', async ({ gameplayPage: page, gameplayURL }) => {
  const seen = watch(page);
  await open(page, `${gameplayURL}?model=probe`);
  await openStudio(page);
  await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
  const warmups = await probeWarmups(page);
  await page.evaluate(() => {
    window.lostContext = document.querySelector('#world').getContext('webgl2').getExtension('WEBGL_lose_context');
    window.lostContext.loseContext();
  });
  await expect.poll(() => page.evaluate(() => window.gameScene.renderer.getContext().isContextLost())).toBe(true);
  await page.evaluate(() => window.lostContext.restoreContext());
  await expect.poll(() => probeWarmups(page), { timeout: ciTimeout(15_000) }).toBeGreaterThan(warmups);
  await frames(page);
  expect(await probeShown(page)).toBe(true); // settled: the re-warm resolves after the probe is back in the scene
  await expect(page.locator('#error-message')).toBeHidden();
  expect(seen.glb).toHaveLength(1);
  expect(seen.errors).toEqual([]);
});

test('racing after a probe Garage visit compiles no shader programs', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90_000));
  const seen = watch(page);
  await open(page, `${gameplayURL}?model=probe`);
  await openStudio(page);
  await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
  await leaveGarage(page);
  await page.locator('#start-button').click();
  await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(15_000) }).toBe('racing');
  await frames(page, 5);
  const before = await memory(page);
  await page.keyboard.down('w');
  await frames(page, 120);
  await page.keyboard.up('w');
  const after = await memory(page);
  record('racing', { before, after });
  expect(after.programs).toBe(before.programs);
  expect(await page.evaluate(() => window.probeWarmups.filter(call => call.phase === 'racing').length)).toBe(0);
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
    const seen = watch(page);
    await open(page, `${server.resolvedUrls.local[0]}?model=probe`);
    await openStudio(page);
    await expect.poll(() => probeShown(page), { timeout: ciTimeout(15_000) }).toBe(true);
    expect(seen.glb).toEqual(['/skyline-rush/models/pipeline-probe/pipeline-probe.glb']);
    expect(seen.errors).toEqual([]);
  } finally { await server.close(); }
});
