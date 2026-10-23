import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

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
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(1500);
  expect(await programs(page)).toBe(before);
});
