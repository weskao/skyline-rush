import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// WebKit builds shaders and GPU pipelines at first draw; an effect that first appears mid-race (boost afterimages,
// shockwave, top-speed LED flow, rare pickup tiers) stalls the frame and flashes black patches on iPhone. Every
// material must therefore be drawn by the first-frame warmup, so no program may be compiled once the race runs.
const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);

test('no shader compiles mid-race: hidden effects were drawn by the first-frame warmup', async ({ gameplayPage: page }) => {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.waitForTimeout(300);
  const before = await programs(page);
  expect(before).toBeGreaterThan(0);
  // cooldown: the post-hit grace fades the car, which must not need a new (transparent) program either.
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; player.cooldown = 1.5; });
  await page.waitForTimeout(1500);
  expect(await programs(page)).toBe(before);
  // Task 5 board effects: rain wheel spray (pooled particles), the wet road and the magenta plume tail are uniforms only.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; race.player.boosting = true; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
});
