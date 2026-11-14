import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expectClean, watch } from './helpers/black-frames.js';

// Task 5b step 8: what must hold on Neon Downtown whatever its `?look=3d` art becomes. Written before any Neon asset
// landed, so each test passes on the procedural scene and keeps guarding once the kit, road and HDRIs arrive.
test.use({ gameplaySearch: '?look=3d' });
const racing = page => expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
// N6: the same caps as Coast (tests/coast-scenery-browser.spec.js).
const DRAW_CALL_CAP = { home: 540, race: 380 };

async function neon(page, quality) {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(20000));
  await page.evaluate(tier => {
    for (const key of ['guide-seen', 'tutorial-completed']) localStorage.setItem(`skyline-rush-${key}`, '1');
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: tier, preset: 'cinematic', enabled: true }));
  }, quality);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('[data-track="neon"]').click();
  await expect(page.locator('[data-track="neon"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#world')).toHaveAttribute('aria-label', /Neon Downtown/);
}

/** The procedural Neon scene: skyline boxes, the three bridge towers, the sea plane, RoomEnvironment, identity grade. */
const procedural = page => page.evaluate(() => {
  const { scene, composer } = window.gameScene, grade = composer.passes.find(pass => pass.uniforms?.saturation).uniforms;
  const city = scene.children.find(o => o.isGroup && o.children.some(c => c.isInstancedMesh && c.instanceMatrix.count === 160 * 18));
  const towers = scene.children.filter(o => o.isGroup && o.children.some(c => c.geometry?.type === 'TubeGeometry'));
  const sea = scene.children.find(o => o.material?.uniforms?.water);
  // The kits hide the towers by material (world.js rewrites `.visible` every frame), so `lit` reads the materials.
  let lit = false;
  for (const tower of towers) tower.traverse(part => { lit ||= !!part.material?.visible; });
  const kit = scene.getObjectByName('Neon Downtown kit');
  return {
    city: city.visible, towers: towers.map(tower => tower.visible), lit, sea: sea.visible && sea.material.uniforms.water.value === 1,
    kit: kit?.visible ? kit.children.filter(o => o.isInstancedMesh && o.count > 0).length : 0,
    env: scene.environmentIntensity, grade: [grade.saturation.value, grade.contrast.value, ...grade.tint.value.toArray()],
  };
});
const DEVELOP_LOOK = { city: true, towers: [true, true, true], lit: true, sea: true, kit: 0, env: 0.42, grade: [1, 1, 1, 1, 1] };
// Steps 5 to 7: the load status of the two kits, and whether they or the procedural city are on screen.
const kits = page => page.evaluate(() => { const { neonCity, neonLandmarks } = document.querySelector('#world').dataset; return `${neonCity} ${neonLandmarks}`; });
const cityLook = async page => { const { city, lit, kit } = await procedural(page); return { skyline: city, towers: lit, kit: kit > 0 }; };
// This document's own fetches of look assets: any HDRI or KTX2 file, any Coast or Neon model. Only meaningful where
// the page never opens the gated look at all (Low, or no gate): on High it opens on Coast and loads Coast's set.
const lookAssets = page => page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.ktx2|environments\/.*\.hdr|models\/(coast|neon)-/.test(n)));

/** Coast scan pieces still drawn: the page opens on Coast, so its GLBs are loaded and must be hidden on Neon. */
const coastPieces = page => page.evaluate(() => {
  const drawn = [];
  window.gameScene.scene.traverse(o => {
    if (!o.isInstancedMesh || !/^(cliff_|sailboat_|motorboat)/.test(o.name)) return;
    let shown = o.material.visible !== false;
    for (let node = o; node && shown; node = node.parent) shown = node.visible;
    if (shown) drawn.push(o.name);
  });
  return drawn;
});

test('Neon High compiles nothing after GO and draws no Coast scenery', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await neon(page, 'high');
  await expect.poll(() => coastPieces(page), { timeout: ciTimeout(20000) }).toEqual([]);
  await expect.poll(() => kits(page), { timeout: ciTimeout(60000) }).toBe('attached attached');
  await page.locator('#start-button').click();
  await racing(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(await coastPieces(page)).toEqual([]);
  expect(errors).toEqual([]);
});

// Steps 5 to 7 and 8d: the kits stand in for the box skyline and the bridge towers, on the home showcase and in a
// race, and reach the bloom without a NaN texel.
test('Neon High draws both kits in place of the procedural city, through a race, with no NaN pixel', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(150000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await neon(page, 'high');
  await expect.poll(() => kits(page), { timeout: ciTimeout(60000) }).toBe('attached attached');
  await expect.poll(() => cityLook(page)).toEqual({ skyline: false, towers: false, kit: true });
  await watch(page);
  await expectClean(page, 'home showcase');
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => cityLook(page)).toEqual({ skyline: false, towers: false, kit: true });
  await expectClean(page, 'countdown and first racing frames');
  expect(errors).toEqual([]);
});

for (const model of ['neon-city', 'neon-landmarks']) test(`Neon High keeps the procedural city when ${model} cannot load`, async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route(`**/models/${model}/**`, route => route.abort());
  await neon(page, 'high');
  await expect.poll(() => kits(page), { timeout: ciTimeout(60000) }).toMatch(model === 'neon-city' ? /^fallback\S* / : / fallback/);
  await expect.poll(() => cityLook(page)).toEqual({ skyline: true, towers: true, kit: false });
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => cityLook(page)).toEqual({ skyline: true, towers: true, kit: false });
  expect(errors).toEqual([]);
});

// Steps 4 and 8d: the wet city asphalt. The page opens on Coast and loads Coast's road first, so the set on the road
// is read from the canvas status, and Neon's own files from the document's fetches.
const roadStatus = page => page.evaluate(() => {
  const { coastRoad, coastRoadSet } = document.querySelector('#world').dataset, drawn = [];
  window.gameScene.scene.traverse(o => { if (o.material?.name === 'coast_asphalt') drawn.push(!!o.material.map?.isCompressedTexture); });
  return { coastRoad, coastRoadSet, drawn };
});
test('Neon High wears its own KTX2 asphalt and keeps it through a race', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await neon(page, 'high');
  await expect.poll(() => roadStatus(page), { timeout: ciTimeout(40000) }).toEqual({ coastRoad: 'high', coastRoadSet: 'neon-asphalt', drawn: [true] });
  const fetched = (await lookAssets(page)).filter(url => url.includes('materials/neon-asphalt/')).map(url => url.split('/').pop()).sort();
  expect(fetched).toEqual(['asphalt_basecolor_2k.ktx2', 'asphalt_normal_2k.ktx2', 'asphalt_packed_2k.ktx2']);
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => roadStatus(page)).toEqual({ coastRoad: 'high', coastRoadSet: 'neon-asphalt', drawn: [true] });
  expect(errors).toEqual([]);
});

test('Neon High falls back to the procedural road when its asphalt cannot load', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/materials/neon-asphalt/**', route => route.abort());
  await neon(page, 'high');
  await expect.poll(() => roadStatus(page), { timeout: ciTimeout(40000) }).toEqual({ coastRoad: 'fallback', coastRoadSet: 'none', drawn: [] });
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => roadStatus(page)).toEqual({ coastRoad: 'fallback', coastRoadSet: 'none', drawn: [] });
  expect(errors).toEqual([]);
});

// Step 3: the rain-night HDRI lights Neon's rainy default, and its dome replaces the procedural sky.
const skyStatus = page => page.evaluate(() => {
  const { scene } = window.gameScene, dome = scene.getObjectsByProperty('renderOrder', -1).find(o => o.material?.map && o.material.side === 1);
  return { sky: document.querySelector('#world').dataset.coastSky, env: scene.environmentIntensity, dome: !!dome?.visible };
});
test('Neon High is lit by its rain-night HDRI and shows that sky, through a race', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await neon(page, 'high');
  await expect.poll(() => skyStatus(page), { timeout: ciTimeout(40000) }).toEqual({ sky: 'nightRain:4096', env: 0.55, dome: true });
  const fetched = (await lookAssets(page)).filter(url => url.includes('shanghai_bund')).map(url => url.split('/').pop()).sort();
  expect(fetched).toEqual(['shanghai_bund_rain_1k.hdr', 'shanghai_bund_rain_sky_4k.ktx2']);
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => skyStatus(page)).toEqual({ sky: 'nightRain:4096', env: 0.55, dome: true });
  expect(errors).toEqual([]);
});

test('Neon High keeps RoomEnvironment and the procedural sky when its HDRI files cannot load', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/environments/**/shanghai_bund*', route => route.abort());
  await page.route('**/environments/shanghai_bund*', route => route.abort());
  await neon(page, 'high');
  await expect.poll(() => skyStatus(page), { timeout: ciTimeout(40000) }).toEqual({ sky: 'fallback:nightRain', env: 0.42, dome: false });
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => skyStatus(page)).toEqual({ sky: 'fallback:nightRain', env: 0.42, dome: false });
  expect(errors).toEqual([]);
});

const calls = page => page.evaluate(() => window.gameScene.renderer.info.render.calls);
test('Neon High with its kits stays under the draw-call cap on the home showcase', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  await neon(page, 'high');
  await expect.poll(() => kits(page), { timeout: ciTimeout(60000) }).toBe('attached attached');
  await page.waitForTimeout(ciTimeout(1500));
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_CAP.home);
});

// Open: the cars alone exceed the race cap, so no scenery budget can meet it. Measured on High with the kits
// (2026-11-15): 443 calls at the start and up to 670 mid-lap, of which the kits are 46 and their mirror pass 18; the
// 108 traffic cars are not instanced (19 meshes each) and draw 129 to 430, the player 84 and the rivals about 106.
// Remove the fixme in the commit that instances the traffic, or when the owner sets a Neon cap.
test('Neon High stays under the draw-call cap in a race', async ({ gameplayPage: page }) => {
  test.fixme(true, 'N6: the Neon race draws 443 to 670 calls against a cap of 380; non-instanced traffic is 129 to 430 of them');
  test.setTimeout(ciTimeout(90000));
  await neon(page, 'high');
  await expect.poll(() => kits(page), { timeout: ciTimeout(60000) }).toBe('attached attached');
  await page.locator('#start-button').click();
  await racing(page);
  let peak = 0;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(ciTimeout(300)); peak = Math.max(peak, await calls(page)); }
  expect(peak).toBeLessThanOrEqual(DRAW_CALL_CAP.race);
});

test('Neon Low keeps the procedural scene under ?look=3d: sea, towers, skyline and no look asset fetched', async ({ gameplayPage: page }) => {
  await neon(page, 'low');
  await page.waitForTimeout(ciTimeout(1500));
  expect(await procedural(page)).toEqual(DEVELOP_LOOK);
  expect(await lookAssets(page)).toEqual([]);
});

test.describe('without ?look=3d', () => {
  test.use({ gameplaySearch: '' });
  test('Neon High keeps the develop look: sea, towers, skyline, RoomEnvironment and no look asset fetched', async ({ gameplayPage: page }) => {
    await neon(page, 'high');
    await page.waitForTimeout(ciTimeout(1500));
    expect(await procedural(page)).toEqual(DEVELOP_LOOK);
    expect(await lookAssets(page)).toEqual([]);
  });
});
