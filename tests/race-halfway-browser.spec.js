import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

for (const [name, width, height, hasTouch, locale, calm] of [
  ['desktop', 960, 600, false, 'en', false],
  ['portrait', 390, 844, true, 'zh-TW', true],
  ['landscape', 844, 390, true, 'en', false],
]) {
  test.describe(name, () => {
    test.use({ viewport: { width, height }, hasTouch });
    test('shows the halfway milestone and plays its chime while other race feedback is active', async ({ page, gameplayURL }) => {
      test.setTimeout(ciTimeout(110_000));
      await captureHooks(page);
      if (calm) await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.addInitScript(language => {
        if (!location.origin.startsWith('http://')) return;
        localStorage.setItem('skyline-rush-locale', language);
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
        localStorage.setItem('skyline-rush-target-fps-v1', '30');
        localStorage.setItem('skyline-rush-music', 'off');
        localStorage.setItem('skyline-rush-sound', 'on');
        const frequencies = new WeakMap();
        const set = AudioParam.prototype.setValueAtTime;
        const start = OscillatorNode.prototype.start;
        window.halfwayChimes = 0;
        AudioParam.prototype.setValueAtTime = function (value, time) {
          frequencies.set(this, value);
          return set.call(this, value, time);
        };
        OscillatorNode.prototype.start = function (...args) {
          if (this.type === 'sine' && frequencies.get(this.frequency) === 698) window.halfwayChimes++;
          return start.apply(this, args);
        };
      }, locale);
      await page.goto(gameplayURL, { waitUntil: 'domcontentloaded' });
      await page.locator('#start-button').click();
      await page.evaluate(() => { window.gameplay.race.countdown = .01; });
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(30_000) });
      await expect(page.locator('#countdown')).toBeHidden({ timeout: ciTimeout(30_000) });
      await page.evaluate(() => {
        const { race } = window.gameplay;
        // Hold the car just before halfway, then pass it during a NITRO callout.
        race.traffic.length = 0;
        Object.assign(race.player, { distance: race.length / 2 - 250, speed: 0, nitroTime: 4 });
        race.player.nitroUses++;
      });
      await expect(page.locator('#event-callout')).toHaveAttribute('data-kind', 'nitro', { timeout: ciTimeout(30_000) });
      await page.evaluate(() => {
        const { race } = window.gameplay;
        Object.assign(race.player, {
          distance: race.length / 2 + 1,
          impact: { time: race.elapsed, intensity: .4, kind: 'traffic', speedLoss: 4 },
        });
      });
      const card = page.locator('#race-halfway-card');
      await expect(card).toBeVisible();
      await expect(card).toContainText(locale === 'en' ? 'HALFWAY' : '賽事過半');
      await expect(card).toContainText(locale === 'en' ? 'KM TO GO' : '公里');
      const geometry = await card.evaluate(node => {
        const scene = document.querySelector('#world').getBoundingClientRect();
        const anchor = node.parentElement.getBoundingClientRect();
        const box = node.getBoundingClientRect();
        return { dx: anchor.x + anchor.width / 2 - scene.x - scene.width / 2,
          dy: anchor.y + anchor.height / 2 - scene.y - scene.height / 2,
          height: box.height / scene.height, area: box.width * box.height / (scene.width * scene.height),
          backdrop: Number(getComputedStyle(node).backgroundColor.match(/[\d.]+(?=\))/)?.[0] ?? 1),
          pointer: getComputedStyle(node).pointerEvents, animation: getComputedStyle(node).animationName };
      });
      expect(Math.abs(geometry.dx)).toBeLessThan(1);
      expect(Math.abs(geometry.dy)).toBeLessThan(1);
      // A slim, see-through strip: the road ahead stays visible behind and around it.
      expect(geometry.height).toBeLessThan(.1);
      expect(geometry.area).toBeLessThan(.04);
      expect(geometry.backdrop).toBeLessThanOrEqual(.6);
      expect(geometry.pointer).toBe('none');
      expect(geometry.animation === 'none').toBe(calm);
      expect(await page.evaluate(() => window.halfwayChimes)).toBe(1);
      await expect(card).toBeHidden({ timeout: ciTimeout(20_000) });
      expect(await page.evaluate(() => window.halfwayChimes)).toBe(1);
    });
  });
}
