import { seedGtCareer } from './helpers/gt-progress.js';
import { expect } from '@playwright/test';
import { test, glbRoots } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// WebKit builds shaders and GPU pipelines at first draw; an effect that first appears mid-race (boost afterimages,
// shockwave, top-speed LED flow, rare pickup tiers) stalls the frame and flashes black patches on iPhone. Every
// material must therefore be drawn by the first-frame warmup, so no program may be compiled once the race runs.
const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);

const noMidRaceCompile = async ({ gameplayPage: page }) => {
  await expect.poll(() => glbRoots(page), { timeout: ciTimeout(20000) }).toBe(1);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
  await page.waitForTimeout(300);
  const before = await programs(page);
  expect(before).toBeGreaterThan(0);
  expect(await glbRoots(page), 'the race car wears its model').toBe(1);
  // Ghost Phase fades the car and draws its outline without compiling a new program.
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; player.effects.ghost = 3; });
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

for (const [car, name] of [['roadster', 'Roadster'], ['crimson-gt', 'Crimson GT']]) {
  for (const quality of ['low', 'high']) {
    test.describe(`${name} on ${quality}`, () => {
      test.beforeEach(async ({ page }) => {
        if (car === 'crimson-gt') await seedGtCareer(page);
        await page.addInitScript(([car, quality]) => {
          localStorage.setItem('skyline-rush-car', JSON.stringify(car));
          localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality }));
        }, [car, quality]);
      });
      test('no shader compiles mid-race', noMidRaceCompile);
    });
  }
}
