import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { clickLobbyOption } from './helpers/home-lobby.js';
import { ciTimeout } from './helpers/ci.js';

test.use({ unlockedAccess: true });

for (const quality of ['low', 'high']) {
  test.describe(`race recovery on ${quality}`, () => {
    test.use({ viewport: quality === 'low' ? { width: 844, height: 390 } : { width: 960, height: 540 }, hasTouch: quality === 'low' });
    test('Sky Spiral shows the fall and landing, then R recovers the same race', async ({ page, gameplayPage }) => {
      await page.addInitScript(q => {
        localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q }));
        localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral']));
      }, quality);
      await gameplayPage.reload();
      await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', quality);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await clickLobbyOption(page, '[data-track="spiral"]');
      await page.locator('#start-button').click();
      await page.evaluate(() => { window.gameplay.race.countdown = .01; });
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(20_000) });
      const feedback = page.locator('#race-recovery');
      const frames = await page.evaluate(async () => {
        const race = window.gameplay.race, car = race.player, mesh = window.gameScene.player;
        const gap = race.sections.find(section => section.type === 'gap');
        Object.assign(car, { distance: gap.from + .2, x: 2.5, speed: 31 });
        const samples = [];
        while (race.elapsed < 18 && (!samples.length || car.recovery)) {
          await new Promise(requestAnimationFrame);
          const cue = document.querySelector('#race-recovery');
          if (car.recovery) samples.push({
            y: mesh.position.y, phase: cue?.dataset.stage,
            distance: car.distance, opacity: Number(cue?.style.getPropertyValue('--recovery-fade')),
          });
        }
        return { samples, gap: gap.from, seat: car.fall?.distance, falls: car.falls };
      });
      expect(frames.falls).toBe(1);
      expect(frames.seat).toBeLessThan(frames.gap - 20);
      expect(frames.samples.some(frame => frame.phase === 'fall' && frame.y < -1 && frame.distance >= frames.gap)).toBe(true);
      expect(frames.samples.some(frame => frame.phase === 'return' && frame.opacity >= .95)).toBe(true);
      expect(frames.samples.some(frame => frame.phase === 'return' && frame.y > .2 && frame.distance === frames.seat && frame.opacity < .7)).toBe(true);
      await expect(feedback).toBeHidden();

      const before = await page.evaluate(() => ({ elapsed: window.gameplay.race.elapsed, distance: window.gameplay.race.player.distance }));
      await page.keyboard.down('r');
      await expect(feedback).toHaveAttribute('data-stage', 'return', { timeout: ciTimeout(10_000) });
      await page.keyboard.down('r'); // OS repeat while held
      await page.keyboard.up('r');
      await expect(feedback).toBeHidden({ timeout: ciTimeout(20_000) });
      const after = await page.evaluate(() => ({
        falls: window.gameplay.race.player.falls,
        elapsed: window.gameplay.race.elapsed,
        distance: window.gameplay.race.player.distance,
        track: window.gameplay.race.trackId,
      }));
      expect(after).toMatchObject({ falls: 1, track: 'spiral' });
      expect(after.elapsed).toBeGreaterThan(before.elapsed);
      expect(after.distance).toBeLessThan(before.distance - 10);
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    });
  });
}

for (const [orientation, viewport, mode, locale] of [
  ['compact portrait', { width: 320, height: 640 }, 'slide', 'zh-TW'],
  ['phone portrait', { width: 390, height: 844 }, 'tilt', 'en-US'],
  ['short landscape', { width: 844, height: 390 }, 'buttons', 'en-US'],
]) test.describe(orientation, () => {
  test.use({ hasTouch: true, isMobile: true, viewport, locale });
  test('tap Reset vehicle beside Pause without changing the race or steering layout', async ({ gameplayPage: page }) => {
    await page.addInitScript(steering => localStorage.setItem('skyline-rush-controls', JSON.stringify({ version: 1, mode: steering })), mode);
    await page.reload();
    const button = page.getByRole('button', { name: locale === 'zh-TW' ? '重置車輛' : 'Reset vehicle', exact: true });
    await expect(button).toBeHidden();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').tap();
    await page.locator('#start-button').tap();
    await page.evaluate(() => { window.gameplay.race.countdown = .01; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(18000) });
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-steer-mode', mode);
    await expect(button).toBeEnabled();
    const bounds = await button.boundingBox();
    const pause = await page.locator('#pause-button').boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(pause.x);
    expect(await button.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2));
    })).toBe(true);
    const initial = await page.evaluate(() => {
      const race = window.gameplay.race;
      Object.assign(race.player, { distance: 500, speed: 0, altitude: 0 });
      return { track: race.trackId, elapsed: race.elapsed };
    });
    await button.tap();
    await expect(button).toBeDisabled();
    await expect(button).toBeEnabled({ timeout: ciTimeout(12000) });
    const after = await page.evaluate(() => {
      const race = window.gameplay.race;
      return { track: race.trackId, elapsed: race.elapsed, distance: race.player.distance, falls: race.player.falls };
    });
    expect(after.track).toBe(initial.track);
    expect(after.elapsed).toBeGreaterThan(initial.elapsed);
    expect(after.distance).toBeLessThan(495);
    expect(after.falls).toBe(0);
    await page.locator('#pause-button').tap();
    await expect(button).toBeHidden();
  });
});
