import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Task 5: Coast Medium+ draws the coast-scenery.glb scans (cliffs, rocks, palms, sea arch, rails) instead of the
// procedural rocks/trees. The GLB attaches before GO and its programs are built by the warmup, never mid-race.
// All of it is the Phase 3 look behind `?look=3d` (src/look-gate.ts); the last test checks the develop look without it.
test.use({ gameplaySearch: '?look=3d' });
// CPU-only CI draws a ?look=3d High frame in ~0.5 s; the 3 s countdown (~70 clamped frames) outlasts the 30 s default.
const racing = page => expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
const status = page => page.locator('#world').getAttribute('data-coast-scenery');
const layer = page => page.evaluate(() => {
  const pieces = {};
  window.gameScene.scene.getObjectByName('Coast scenic details').traverse(o => { if (o.isInstancedMesh) pieces[o.name] = { visible: o.visible, count: o.count }; });
  return pieces;
});

/** The skyline group (160 buildings, 18 windows each) and the three bridge towers (the groups with a cable tube). */
const skyline = page => page.evaluate(() => {
  const { scene } = window.gameScene;
  const city = scene.children.find(o => o.isGroup && o.children.some(c => c.isInstancedMesh && c.instanceMatrix.count === 160 * 18));
  const towers = scene.children.filter(o => o.isGroup && o.children.some(c => c.geometry?.type === 'TubeGeometry'));
  return { city: city.visible, towers: towers.map(tower => tower.visible && tower.children.every(c => c.material.visible)) };
});

async function withQuality(page, quality) {
  // The dev server alone fills the default 250-entry resource-timing buffer; keep every fetch of the reloaded document.
  await page.addInitScript(() => performance.setResourceTimingBufferSize(20000));
  await page.evaluate(tier => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: tier, preset: 'cinematic', enabled: true })), quality);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}

test('Coast High attaches the scenery GLB before GO and compiles nothing after it', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await withQuality(page, 'high');
  await expect.poll(() => status(page), { timeout: ciTimeout(40000) }).toBe('attached');
  await expect.poll(async () => (await layer(page)).cliff_a?.visible || (await layer(page)).cliff_b?.visible).toBe(true);
  const pieces = await layer(page);
  expect(pieces['Coast shoreline rocks'].visible).toBe(false);
  expect(pieces.guard_rail.count).toBeGreaterThan(0);
  await page.locator('#start-button').click();
  await racing(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(errors).toEqual([]);
});

// Measured on High 2026-11-14 with the far coast in and the city and bridge towers out (full-scene steps 3 and 4):
// home 491, race 257 to 322. Before step 4 the same frames were 650 and 469 to 500.
const DRAW_CALL_CAP = { home: 540, race: 380 };
test('Coast High stays under the draw-call cap on the home showcase and in a race', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const calls = () => page.evaluate(() => window.gameScene.renderer.info.render.calls);
  await withQuality(page, 'high');
  await expect.poll(() => status(page), { timeout: ciTimeout(40000) }).toBe('attached');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-sea'), { timeout: ciTimeout(40000) }).toBe('water');
  const far = await page.evaluate(() => { // the far coast: scan cliffs at headland size in the close pools, cones off
    const { scene } = window.gameScene, sizes = [], m = new window.gameScene.scene.matrix.constructor();
    for (const name of ['cliff_a', 'cliff_b']) { const mesh = scene.getObjectByName(name); for (let i = 0; i < mesh.count; i++) { mesh.getMatrixAt(i, m); sizes.push(m.getMaxScaleOnAxis()); } }
    return { headlands: sizes.filter(size => size >= 5).length, cones: scene.children.find(o => o.isInstancedMesh && o.geometry.type === 'ConeGeometry').material.visible };
  });
  expect(far.headlands).toBeGreaterThanOrEqual(6);
  expect(far.cones).toBe(false);
  expect(await skyline(page)).toEqual({ city: false, towers: [false, false, false] }); // D1, D2
  expect(await calls()).toBeLessThanOrEqual(DRAW_CALL_CAP.home);
  await page.locator('#start-button').click();
  await racing(page);
  let peak = 0;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(ciTimeout(300)); peak = Math.max(peak, await calls()); }
  expect(peak).toBeLessThanOrEqual(DRAW_CALL_CAP.race);
});

test('Coast Low never fetches the scenery GLB and keeps the procedural rocks and trees', async ({ gameplayPage: page }) => {
  await withQuality(page, 'low');
  await page.waitForTimeout(ciTimeout(1500));
  expect(await status(page)).toBeNull(); // settled: Low never requests, so nothing can arrive later
  const pieces = await layer(page);
  expect(pieces['Coast shoreline rocks'].visible).toBe(true);
  expect(Object.keys(pieces).some(name => name.startsWith('cliff_'))).toBe(false);
  expect(await skyline(page)).toEqual({ city: true, towers: [true, true, true] }); // owner decision 2026-11-14: Low keeps them
  // This document's own fetches; the fixture's first (default-tier) page may have requested it before the reload.
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('coast-scenery.glb')));
  expect(requests).toEqual([]);
});

test('Coast High puts the 2K KTX2 asphalt on the road before GO, offline: transcoder and textures come from this origin', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const foreign = [];
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => { foreign.push(route.request().url()); return route.abort(); });
  await withQuality(page, 'high');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(40000) }).toBe('high');
  const road = await page.evaluate(() => {
    let found = null;
    window.gameScene.scene.traverse(o => { if (o.material?.name === 'coast_asphalt') found = { maps: ['map', 'normalMap', 'roughnessMap', 'aoMap'].map(k => !!o.material[k]?.isCompressedTexture) }; });
    return found;
  });
  expect(road).toEqual({ maps: [true, true, true, true] });
  const ktx2 = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /basis_transcoder|asphalt_.*\.ktx2/.test(n)));
  expect(ktx2.some(n => n.includes('basis_transcoder'))).toBe(true);
  expect(ktx2.filter(n => /asphalt_.*_2k\.ktx2/.test(n)).length).toBe(3);
  expect(foreign).toEqual([]);
});

test('Coast Ultra compiles the detail-normal road before GO without shader errors', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await withQuality(page, 'ultra');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(40000) }).toBe('ultra');
  await page.locator('#start-button').click();
  await racing(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.waitForTimeout(ciTimeout(1000));
  expect(await programs(page)).toBe(before);
  expect(errors.filter(e => /shader|WebGLProgram|webgl/i.test(e))).toEqual([]);
});

test('switching Coast to rain mid-race only moves uniforms: no program compiles', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  await withQuality(page, 'high');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(40000) }).toBe('high');
  await expect.poll(() => status(page), { timeout: ciTimeout(40000) }).toBe('attached');
  await page.locator('#start-button').click();
  await racing(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  // world.js shows a session preset in custom/free races; flip this race to rain in place.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(await page.locator('#world').getAttribute('data-coast-road')).toBe('high'); // settled: the road never swaps while racing
});

test.describe('without ?look=3d', () => {
  test.use({ gameplaySearch: '' });
  test('Coast High keeps the develop look: no scenery GLB, KTX2 asphalt or HDRI is fetched or drawn', async ({ gameplayPage: page }) => {
    await withQuality(page, 'high');
    await page.waitForTimeout(ciTimeout(1500));
    expect(await status(page)).toBeNull(); // settled: nothing is ever requested, so nothing can arrive later
    expect(await page.locator('#world').getAttribute('data-coast-road')).toBeNull(); // settled: as above
    const pieces = await layer(page);
    expect(pieces['Coast shoreline rocks'].visible).toBe(true);
    expect(Object.keys(pieces).some(name => name.startsWith('cliff_'))).toBe(false);
    const look = await page.evaluate(() => {
      const { scene, composer } = window.gameScene, grade = composer.passes.find(pass => pass.uniforms?.saturation).uniforms;
      return { env: scene.environmentIntensity, grade: [grade.saturation.value, grade.contrast.value, ...grade.tint.value.toArray()] };
    });
    expect(await skyline(page)).toEqual({ city: true, towers: [true, true, true] }); // D1, D2 apply to the gated look only
    expect(look).toEqual({ env: 0.42, grade: [1, 1, 1, 1, 1] }); // RoomEnvironment, identity grade: no HDRI look
    // The basis transcoder is not Coast's: the always-on 3D pickups (pickup-models.ts, meshopt + KTX2) load it on every track.
    const fetched = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /coast-scenery\.glb|\.ktx2|environments\/.*\.hdr/.test(n)));
    expect(fetched).toEqual([]);
  });
});
