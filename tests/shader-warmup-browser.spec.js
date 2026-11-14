import { expect } from '@playwright/test';
import { test, glbRoots } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// WebKit builds shaders and GPU pipelines at first draw; an effect that first appears mid-race (boost afterimages,
// shockwave, top-speed LED flow, rare pickup tiers) stalls the frame and flashes black patches on iPhone. Every
// material must therefore be drawn by the first-frame warmup, so no program may be compiled once the race runs.
const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);

const noMidRaceCompile = async ({ gameplayPage: page }) => {
  // A car with a model (Crimson GT) must be dressed before the start: a race begun earlier runs on the procedural car.
  const model = await page.evaluate(() => localStorage.getItem('skyline-rush-car')) !== null;
  if (model) await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) }); // ?look=3d: ~0.5 s CI frames
  await page.waitForTimeout(300);
  const before = await programs(page);
  expect(before).toBeGreaterThan(0);
  expect(await glbRoots(page), 'the race car wears its model').toBe(model ? 1 : 0);
  // cooldown: the post-hit grace fades the car, which must not need a new (transparent) program either.
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; player.cooldown = 1.5; });
  await page.waitForTimeout(1500);
  expect(await programs(page)).toBe(before);
  // A drift lays skid marks (src/skid-marks.js): their ribbon was drawn by the warmup too.
  await page.evaluate(() => { window.gameplay.race.player.speed = 70; });
  await page.keyboard.down('ArrowDown'); await page.keyboard.down('ArrowLeft');
  await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('Skid marks').geometry.drawRange.count),
    { message: 'the drift left marks', timeout: ciTimeout(10000) }).toBeGreaterThan(0);
  await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowDown');
  expect(await programs(page)).toBe(before);
  // Task 5 board effects: rain wheel spray (pooled particles), the wet road and the magenta plume tail are uniforms only.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; race.player.boosting = true; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
};

test('no shader compiles mid-race: hidden effects were drawn by the first-frame warmup', noMidRaceCompile);
test.describe('?look=3d', () => {
  test.use({ gameplaySearch: '?look=3d' }); // the Phase 3 look (src/look-gate.ts) adds the board effects
  test('no shader compiles mid-race with the Phase 3 look', noMidRaceCompile);
});

// Task 7: the equipped car's GLB (clearcoat flake paint, see-through glass, emissive bars) is compiled before GO too.
test.describe('Crimson GT equipped', () => {
  test.beforeEach(async ({ page }) => { await page.addInitScript(() => localStorage.setItem('skyline-rush-car', '"crimson-gt"')); });
  test('no shader compiles mid-race in the Crimson GT', noMidRaceCompile);
  test.describe('?look=3d', () => {
    test.use({ gameplaySearch: '?look=3d' });
    test('no shader compiles mid-race in the Crimson GT with the Phase 3 look', noMidRaceCompile);
  });
});
