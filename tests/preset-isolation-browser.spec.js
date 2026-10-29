import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 10A: rule presets and saved Custom setups are shortcuts, never progress: unlocks, reward eligibility and the
// skyline-rush-controls / skyline-rush-history formats stay byte-identical through choosing, saving, loading and racing them.
const GUARDED = ['skyline-rush-unlocked', 'skyline-rush-controls', 'skyline-rush-history'];
const racing = page => expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
async function finish(page) {
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.elapsed = 80; race.traffic = [];
    Object.assign(race.player, { distance: race.length - 2, speed: 60, x: 2.5 });
  });
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
}

test.use({ viewport: { width: 1440, height: 900 } });
test('choosing, saving, loading and racing presets leaves unlocks, eligibility, controls and history untouched', async ({ gameplayPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    window.storageWrites = {};
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      window.storageWrites[key] = (window.storageWrites[key] ?? 0) + 1;
      return setItem.call(this, key, value);
    };
  });
  await page.evaluate(() => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon']));
    localStorage.setItem('skyline-rush-controls', JSON.stringify({ mode: 'buttons', hand: 'right', fullLock: 80, size: 'L', opacity: 0.8, flyMode: 'tap', sensitivity: 1.2, ghost: true, layout: {}, version: 1 }));
  });
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const stored = () => page.evaluate(keys => keys.map(key => localStorage.getItem(key)), GUARDED);
  const before = await stored();
  const counts = () => page.evaluate(keys => keys.map(key => window.storageWrites[key] ?? 0), GUARDED);
  const loadWrites = await counts();
  await page.locator('button[data-race-mode="custom"]').click();
  await page.locator('#race-mode-rules > summary').click();
  for (const preset of ['traffic', 'noitems', 'air', 'precision', 'traffic']) {
    await page.locator(`[data-race-preset="${preset}"]`).click();
    await expect(page.locator(`[data-race-preset="${preset}"]`)).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('#start-button').click();
  await racing(page);
  const chosen = await page.evaluate(() => JSON.stringify(window.gameplay.race.config));
  await finish(page);
  await page.locator('.brand').click();
  if (await page.locator('#leave-screen').isVisible()) await page.locator('#leave-end').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await page.locator('button[data-race-mode="custom"]').click(); // leaving the results screen returns to Classic
  if (!await page.locator('#race-mode-rules').evaluate(details => details.open)) await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-preset="standard"]').click(); // move off the saved rules so loading must restore them
  // Load the saved setup back from Recent Custom races and race it again.
  await page.locator('#recent-custom > summary').click();
  await page.locator('#recent-custom-runs button[data-recent="0"]').click();
  await page.locator('#start-button').click();
  await racing(page);
  expect(await page.evaluate(() => JSON.stringify(window.gameplay.race.config)), 'the saved preset restores its rules').toBe(chosen);
  await finish(page);
  expect(await page.evaluate(() => window.storageWrites['skyline-rush-recent-custom-v1']), 'the setup was saved').toBeGreaterThan(0);
  expect(await stored(), 'unlocks, controls and history are byte-identical').toEqual(before);
  expect(await counts(), 'and never rewritten after load').toEqual(loadWrites);
  // Eligibility: a preset race never offers Classic progress (no NEXT unlock, no Career medals).
  await expect(page.locator('#next-button')).toBeHidden();
  expect(errors).toEqual([]);
});
