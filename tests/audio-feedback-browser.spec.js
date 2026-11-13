import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { selectLocale } from './helpers/locale-browser.js';

for (const [name, viewport, hasTouch, muted] of [
  ['desktop', { width:1440, height:900 }, false, false],
  ['phone', { width:390, height:844 }, true, false],
  ['muted landscape', { width:844, height:390 }, true, true],
]) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch });
    test('real result and Garage actions schedule each confirmation once on SFX', async ({ page, gameplayURL }) => {
      await captureHooks(page);
      await page.route(/^https:\/\//, route => route.abort());
      await page.addInitScript(isMuted => {
        if (!location.origin.startsWith('http://')) return;
        // Audio coverage does not depend on render quality. Keep CPU-only runners responsive.
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality:'low', enabled:false }));
        localStorage.setItem('skyline-rush-music', 'off');
        localStorage.setItem('skyline-rush-sound', isMuted ? 'off' : 'on');
        window.feedbackNotes = [];
        const frequencies = new WeakMap();
        const setFrequency = AudioParam.prototype.setValueAtTime;
        AudioParam.prototype.setValueAtTime = function (value, time) {
          frequencies.set(this, value);
          return setFrequency.call(this, value, time);
        };
        const start = OscillatorNode.prototype.start;
        OscillatorNode.prototype.start = function (...args) {
          if (this.type === 'sine') window.feedbackNotes.push(frequencies.get(this.frequency));
          return start.apply(this, args);
        };
      }, muted);
      await page.emulateMedia({ reducedMotion:'reduce' });
      await page.goto(gameplayURL, { waitUntil:'domcontentloaded' });
      const notes = hz => page.evaluate(frequency => window.feedbackNotes.filter(note => note === frequency).length, hz);
      await page.locator('#start-button').click();
      await page.evaluate(() => { window.gameplay.race.countdown = .01; });
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout:ciTimeout(15000) });
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance:race.length - 10, speed:60 });
      });
      await expect(page.locator('.wave3-demo-results--earned')).toBeVisible();
      await expect(page.locator('.wave3-demo-results--earned')).toContainText('Demo points');
      await expect.poll(() => notes(880), { timeout:ciTimeout(5000) }).toBe(muted ? 0 : 1);
      await selectLocale(page, 'zh-TW');
      await expect(page.locator('.wave3-demo-results--earned')).toContainText('試玩點數');
      await selectLocale(page, 'en');
      expect(await notes(880)).toBe(muted ? 0 : 1);

      await page.locator('#choose-track').click();
      await page.locator('#garage-button').click();
      const mission = page.locator('[data-mission-id="mission-race:daily"]');
      await mission.getByRole('button', { name:/claim demo reward/i }).click();
      await expect(mission).toHaveAttribute('data-mission-state', 'claimed');
      await expect.poll(() => notes(880)).toBe(muted ? 0 : 2);

      await page.locator('[data-wave3-open-store]').click();
      const store = page.locator('[data-wave3-demo-store]');
      await store.locator('[data-demo-id="thruster-ion"]').click();
      await store.getByRole('button', { name:'Demo redeem', exact:true }).click();
      const beforeRedeem = await notes(990);
      await store.getByRole('button', { name:'Confirm demo redeem' }).click();
      await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status','demo-unlocked');
      await expect.poll(() => notes(990)).toBe(beforeRedeem + (muted ? 0 : 1));
      await store.getByRole('button', { name:'Demo Collection' }).click();
      const collection = page.locator('[data-wave3-demo-collection]');
      await collection.locator('[data-demo-id="thruster-ion"]').click();
      await collection.getByRole('button', { name:'Equip demo preview' }).click();
      await expect.poll(() => notes(235)).toBe(muted ? 0 : 1);
    });
  });
}
