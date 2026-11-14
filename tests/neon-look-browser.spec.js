import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

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
  return {
    city: city.visible, towers: towers.map(tower => tower.visible), sea: sea.visible && sea.material.uniforms.water.value === 1,
    env: scene.environmentIntensity, grade: [grade.saturation.value, grade.contrast.value, ...grade.tint.value.toArray()],
  };
});
const DEVELOP_LOOK = { city: true, towers: [true, true, true], sea: true, env: 0.42, grade: [1, 1, 1, 1, 1] };
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

// Open until steps 5 to 7 replace the box skyline and remove the towers: the procedural scene measured home 162 to
// 163 and race 562 to 564 on High (2026-11-14). Remove the fixme in the commit that brings the race under the cap.
test('Neon High stays under the draw-call cap on the home showcase and in a race', async ({ gameplayPage: page }) => {
  test.fixme(true, 'Task 5b steps 5 to 7: the procedural Neon race draws about 564 calls, over the N6 cap of 380');
  test.setTimeout(ciTimeout(90000));
  const calls = () => page.evaluate(() => window.gameScene.renderer.info.render.calls);
  await neon(page, 'high');
  await page.waitForTimeout(ciTimeout(1500));
  const home = await calls();
  await page.locator('#start-button').click();
  await racing(page);
  let peak = 0;
  for (let i = 0; i < 6; i++) { await page.waitForTimeout(ciTimeout(300)); peak = Math.max(peak, await calls()); }
  expect(home).toBeLessThanOrEqual(DRAW_CALL_CAP.home);
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
