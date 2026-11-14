// THROWAWAY (Task 6 Step 2 evidence, never committed): real frames of the sprint plume per car.
//   PLUME_FRAMES=1 LABEL=<x> VIEWPORT=portrait|landscape npx playwright test tests/zz-plume-frames-browser.spec.js
import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

const LABEL = process.env.LABEL ?? 'frames', VIEW = process.env.VIEWPORT ?? 'landscape';
const VIEWPORTS = {
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};
test.skip(!process.env.PLUME_FRAMES, 'run with PLUME_FRAMES=1');
test.use({ ...VIEWPORTS[VIEW] });

for (const [car, other] of [['roadster', 'crimson-gt'], ['crimson-gt', 'roadster']]) test(`${LABEL} ${VIEW}: ${car}`, async ({ gameplayPage: page }) => {
  test.setTimeout(180000);
  const OUT = `docs/designs/3d-pipeline/audits/sprint-plume/frames-${LABEL}-${VIEW}-${car}`;
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(([other]) => {
    for (const [key, value] of [['guide-seen', '1'], ['whats-new-seen-v1', '999.0.0'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-car', JSON.stringify(other));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high', enabled: true, comfortable: false }));
  }, [other]);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect.poll(() => page.evaluate(() => !!window.gameScene)).toBe(true);
  const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
  // Switch cars in the Garage, look at the Garage preview, then Home.
  await page.locator('#garage-button').click();
  await page.locator(`#garage-screen [data-car="${car}"]`).click();
  await expect(page.locator(`#garage-screen [data-car="${car}"]`)).toHaveAttribute('aria-pressed', 'true');
  if (car === 'crimson-gt') await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: 20000 });
  await page.waitForTimeout(1500); await shot('garage-home');
  await page.locator('#garage-studio-open').click();
  for (const angle of ['rear', 'side']) {
    const button = page.locator(`[data-garage-angle="${angle}"]`);
    if (await button.count()) { await button.click(); await page.waitForTimeout(1200); await shot(`garage-studio-${angle}`); }
  }
  await page.locator('#garage-close').click();
  await page.waitForTimeout(1500); await shot('home');
  await page.keyboard.press('v'); await page.waitForTimeout(1500); await shot('home-airflow');
  await page.keyboard.press('v');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: 20000 });
  const hold = (fields, seconds) => page.evaluate(async ([fields, seconds]) => {
    const player = window.gameplay.race.player, until = window.gameplay.race.elapsed + seconds;
    while (window.gameplay.race.elapsed < until) { Object.assign(player, fields); player.effects.ghost = 5; await new Promise(requestAnimationFrame); }
  }, [fields, seconds]);
  await page.keyboard.down('w');
  await hold({ speed: 88, x: 0 }, 2);
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { miniBoost: 3 }));
  await page.waitForTimeout(500); await shot('race-boost');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { miniBoost: 0, boosting: false }));
  await hold({ speed: 118, nitroTime: 30, x: 0 }, 1.5); await shot('race-nitro');
  await page.keyboard.down('a'); await hold({ speed: 118, nitroTime: 30 }, 0.6); await shot('race-nitro-lean'); await page.keyboard.up('a');
  const air = await page.evaluate(async () => {
    const race = window.gameplay.race, player = race.player, until = race.elapsed + 1;
    while (race.elapsed < until) { Object.assign(player, { speed: 118, nitroTime: 30, altitude: 3, x: 0 }); await new Promise(requestAnimationFrame); }
    return { glow: window.gameScene.player.getObjectByName('Sprint road glow').visible, flare: window.gameScene.player.getObjectByName('Sprint nozzle flare').visible };
  });
  await shot('race-nitro-air');
  fs.writeFileSync(`${OUT}/state.json`, JSON.stringify({ car, air, errors }, null, 2));
  expect(errors).toEqual([]);
});
