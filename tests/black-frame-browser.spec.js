import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

import { expectClean, watch } from './helpers/black-frames.js';

// The NaN scan (helpers/black-frames.js) through the moments that first show each effect: the home showcase with
// airflow toggled, countdown, racing, nitro and its fade-out. Neon's kits: tests/neon-look-browser.spec.js.

const noNaN = async ({ gameplayPage: page }) => {
  await page.evaluate(() => document.fonts.ready);
  await watch(page);
  for (let i = 0; i < 4; i++) { await page.keyboard.press('v'); await page.waitForTimeout(400); }
  await expectClean(page, 'home airflow toggles');
  await page.locator('#start-button').click();
  // Reading two HDR buffers back every frame slows the countdown far past the default expect timeout on SwiftShader.
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30_000) });
  await page.waitForTimeout(1000);
  await expectClean(page, 'countdown and first racing frames');
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(1500);
  await expectClean(page, 'nitro');
  await page.waitForTimeout(1500);
  await expectClean(page, 'nitro fade-out');
  // Task 5: the wet road (puddle mask, flattened normals) and rain wheel spray.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; race.player.speed = 90; });
  await page.waitForTimeout(ciTimeout(1500));
  await expectClean(page, 'rain spray and wet road');
};

test('no NaN pixel reaches the bloom through the airflow showcase, nitro and its fade-out', noNaN);
test.describe('?look=3d', () => {
  test.use({ gameplaySearch: '?look=3d' }); // the Phase 3 look (src/look-gate.ts): HDRI grade, wet road, spray, plume tail
  test('no NaN pixel reaches the bloom with the Phase 3 look', noNaN);
});
