import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';

// Phase 2 `?model=probe` Garage adapter, real WebGL lifecycle (docs/designs/3d-pipeline/phase2-model-contracts.md §2).
// The Garage Home (main scene, showcase car) and the Preview Studio (garage stage) both show the probe while the
// Garage is open; it is released when the Garage closes. State is read from #world's data-garage-model* attributes
// and the renderer captured by the gameplay fixture.
const GLB = /\/models\/pipeline-probe\/pipeline-probe\.glb$/;

async function prepare(page, url, { quality = 'high' } = {}) {
  await page.addInitScript(q => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true, comfortable: false }));
  }, quality);
  const glbRequests = [];
  page.on('request', request => { if (GLB.test(new URL(request.url()).pathname)) glbRequests.push(request.url()); });
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  return glbRequests;
}

const world = page => page.locator('#world');
const instances = async page => JSON.parse((await world(page).getAttribute('data-garage-model-instances')) ?? '{}');
const memory = page => page.evaluate(() => {
  const { geometries, textures } = window.gameScene.renderer.info.memory;
  return { geometries, textures };
});
/** Procedural Roadster meshes drawn by the camera vs probe meshes attached under the showcase car. */
const homeCar = page => page.evaluate(() => {
  const { player, camera } = window.gameScene;
  let roadster = 0, probe = 0;
  player.traverse(object => {
    if (!object.isMesh || !object.layers.test(camera.layers)) return;
    let node = object, inProbe = false, inVfx = false;
    while (node && node !== player) {
      if (node.userData.garageModel) inProbe = true;
      if (node.name === 'Airflow showcase') inVfx = true; // aero VFX riding on the car stays drawn by design
      node = node.parent;
    }
    if (inProbe) probe++; else if (!inVfx) roadster++;
  });
  return { roadster, probe };
});
const attach = async (page, name) => {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path });
};

test('without ?model=probe the Garage never requests the GLB and keeps the Roadster', async ({ gameplayPage: page, gameplayURL }) => {
  const requests = await prepare(page, gameplayURL);
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
  await page.waitForTimeout(ciTimeout(1500)); // give a would-be load time to start
  expect(requests).toEqual([]); // settled: absence check after the wait above
  await expect(world(page)).not.toHaveAttribute('data-garage-model', /.+/);
  await expect.poll(async () => (await homeCar(page)).probe).toBe(0);
});

test('camera switch: Home dock views and Home ↔ Studio reuse the instances with one fetch', async ({ gameplayPage: page, gameplayURL }) => {
  const requests = await prepare(page, `${gameplayURL}?model=probe`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  await expect.poll(() => homeCar(page)).toEqual(expect.objectContaining({ roadster: 0 }));
  expect((await homeCar(page)).probe).toBeGreaterThan(0); // settled: polled above
  const { home } = await instances(page);
  expect(home).toBeTruthy();
  await attach(page, 'probe-garage-home');

  for (const view of ['front', 'rear', 'left']) {
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-dock')).toHaveAttribute('data-view', view);
  }
  await page.locator('#garage-studio-open').click();
  await expect.poll(async () => (await instances(page)).studio ?? null).not.toBeNull();
  const { studio } = await instances(page);
  await page.locator('[data-garage-angle="front"]').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
  await attach(page, 'probe-garage-studio');
  await page.locator('#garage-studio-back').click();
  await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');

  await expect.poll(() => instances(page)).toEqual({ home, studio });
  expect(requests).toHaveLength(1); // settled: instances unchanged means no new load ran
});

test('quality: the low tier loads the main URL (no LOD) and shows the probe', async ({ gameplayPage: page, gameplayURL }) => {
  const requests = await prepare(page, `${gameplayURL}?model=probe`, { quality: 'low' });
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  expect(requests.map(u => new URL(u).pathname)).toEqual(['/models/pipeline-probe/pipeline-probe.glb']); // settled: model state polled above
});

test('track switch after closing the Garage returns GPU memory to the no-probe baseline', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(120000));
  const cycle = async () => {
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');
    await page.waitForTimeout(ciTimeout(1200)); // both runs render the Garage Home for the same time
    await page.locator('#garage-close').click();
    await expect(page.locator('#garage-screen')).not.toHaveAttribute('open', '');
    const tracks = page.locator('[data-track]');
    const original = await page.locator('[data-track][aria-pressed="true"]').getAttribute('data-track');
    const other = await tracks.evaluateAll((buttons, id) => buttons.map(b => b.dataset.track).find(t => t !== id), original);
    await page.locator(`[data-track="${other}"]`).click();
    await expect(page.locator(`[data-track="${other}"]`)).toHaveAttribute('aria-pressed', 'true');
    await page.locator(`[data-track="${original}"]`).click();
    await expect(page.locator(`[data-track="${original}"]`)).toHaveAttribute('aria-pressed', 'true');
  };
  const stable = async () => {
    let last = null;
    await expect.poll(async () => { const now = JSON.stringify(await memory(page)); const same = now === last; last = now; return same; },
      { intervals: [ciTimeout(500)], timeout: ciTimeout(20000) }).toBe(true);
    return JSON.parse(last);
  };

  await prepare(page, gameplayURL);
  await cycle();
  const baseline = await stable();

  await page.goto(`${gameplayURL}?model=probe`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  await page.locator('#garage-close').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'off');
  await page.goto(`${gameplayURL}?model=probe`);
  await cycle();
  expect(await stable()).toEqual(baseline);
});

test('context loss: the model survives restore without a re-fetch and warmup runs again', async ({ gameplayPage: page, gameplayURL }) => {
  const requests = await prepare(page, `${gameplayURL}?model=probe`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  const warmups = Number(await world(page).getAttribute('data-garage-model-warmups'));
  const before = await instances(page);
  await page.evaluate(() => new Promise(resolve => {
    const canvas = document.querySelector('#world');
    const ext = window.gameScene.renderer.getContext().getExtension('WEBGL_lose_context');
    canvas.addEventListener('webglcontextlost', () => setTimeout(() => ext.restoreContext(), 50), { once: true });
    canvas.addEventListener('webglcontextrestored', () => resolve(), { once: true });
    ext.loseContext();
  }));
  await expect.poll(async () => Number(await world(page).getAttribute('data-garage-model-warmups'))).toBeGreaterThan(warmups);
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model');
  await expect.poll(() => instances(page)).toEqual(before);
  expect(requests).toHaveLength(1); // settled: warmup count polled above
  await attach(page, 'probe-after-context-restore');
});

test('missing GLB falls back to the procedural Roadster', async ({ gameplayPage: page, gameplayURL }) => {
  await page.route(GLB, route => route.fulfill({ status: 404, body: '' }));
  await prepare(page, `${gameplayURL}?model=probe`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'fallback:missing', { timeout: ciTimeout(15000) });
  await expect.poll(() => homeCar(page)).toEqual(expect.objectContaining({ probe: 0 }));
  expect((await homeCar(page)).roadster).toBeGreaterThan(0); // settled: polled above
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('probe shows in Garage Home and Studio on a phone', async ({ gameplayPage: page, gameplayURL }) => {
    await prepare(page, `${gameplayURL}?model=probe`);
    await page.locator('#garage-button').click();
    await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
    await attach(page, 'probe-phone-home');
    await page.locator('#garage-studio-open').click();
    await expect.poll(async () => (await instances(page)).studio ?? null).not.toBeNull();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    await attach(page, 'probe-phone-studio');
  });
});
