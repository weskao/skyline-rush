import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Task 5: Coast Medium+ draws the coast-scenery.glb scans (cliffs, rocks, palms, sea arch, rails) instead of the
// procedural rocks/trees. The GLB attaches before GO and its programs are built by the warmup, never mid-race.
const status = page => page.locator('#world').getAttribute('data-coast-scenery');
const layer = page => page.evaluate(() => {
  const pieces = {};
  window.gameScene.scene.getObjectByName('Coast scenic details').traverse(o => { if (o.isInstancedMesh) pieces[o.name] = { visible: o.visible, count: o.count }; });
  return pieces;
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
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('Coast Low never fetches the scenery GLB and keeps the procedural rocks and trees', async ({ gameplayPage: page }) => {
  await withQuality(page, 'low');
  await page.waitForTimeout(ciTimeout(1500));
  expect(await status(page)).toBeNull(); // settled: Low never requests, so nothing can arrive later
  const pieces = await layer(page);
  expect(pieces['Coast shoreline rocks'].visible).toBe(true);
  expect(Object.keys(pieces).some(name => name.startsWith('cliff_'))).toBe(false);
  // This document's own fetches; the fixture's first (default-tier) page may have requested it before the reload.
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('coast-scenery.glb')));
  expect(requests).toEqual([]);
});

test('Coast High puts the KTX2 asphalt on the road before GO, offline: transcoder and textures come from this origin', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const foreign = [];
  await page.route(url => !['127.0.0.1', 'localhost'].includes(url.hostname), route => { foreign.push(route.request().url()); return route.abort(); });
  await withQuality(page, 'high');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(40000) }).toBe('1024');
  const road = await page.evaluate(() => {
    let found = null;
    window.gameScene.scene.traverse(o => { if (o.material?.name === 'coast_asphalt') found = { maps: ['map', 'normalMap', 'roughnessMap', 'aoMap'].map(k => !!o.material[k]?.isCompressedTexture) }; });
    return found;
  });
  expect(road).toEqual({ maps: [true, true, true, true] });
  const ktx2 = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /basis_transcoder|asphalt_.*\.ktx2/.test(n)));
  expect(ktx2.some(n => n.includes('basis_transcoder'))).toBe(true);
  expect(ktx2.filter(n => n.includes('asphalt_')).length).toBe(3);
  expect(foreign).toEqual([]);
});

test('switching Coast to rain mid-race only moves uniforms: no program compiles', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  await withQuality(page, 'high');
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(40000) }).toBe('1024');
  await expect.poll(() => status(page), { timeout: ciTimeout(40000) }).toBe('attached');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  // world.js shows a session preset in custom/free races; flip this race to rain in place.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(await page.locator('#world').getAttribute('data-coast-road')).toBe('1024'); // settled: the road never swaps while racing
});
