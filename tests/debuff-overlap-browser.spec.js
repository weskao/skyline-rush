import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Freeze and EMP at once in the real race, while the 50% card shows: both cards stack under it, the screen and the
// speedometer give EMP precedence while both screen layers stay, and the player and a rival wear both effects.
for (const [name, width, height, hasTouch] of [
  ['desktop', 1280, 800, false],
  ['portrait', 390, 844, true],
  ['landscape', 844, 390, true],
]) test.describe(name, () => {
  test.use({ viewport: { width, height }, hasTouch });

  test('Freeze and EMP together stack with the halfway card and both show on the cars', async ({ page, gameplayURL }, testInfo) => {
    test.setTimeout(ciTimeout(110_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await captureHooks(page);
    await page.addInitScript(() => {
      if (!location.origin.startsWith('http://')) return;
      localStorage.setItem('skyline-rush-locale', 'zh-TW');
      localStorage.setItem('skyline-rush-music', 'off');
    });
    await page.goto(gameplayURL, { waitUntil: 'domcontentloaded' });
    await page.locator('#start-button').click();
    await page.evaluate(() => { window.gameplay.race.countdown = .01; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(30_000) });
    await page.evaluate(() => {
      const { race } = window.gameplay, [rival] = race.rivals;
      race.traffic.length = 0;
      Object.assign(race.player, { distance: race.length / 2 + 1, speed: 20 });
      Object.assign(rival, { distance: race.player.distance + 11, x: race.player.x - 2.6, homeX: race.player.x - 2.6, speed: 20 });
      for (const car of [race.player, rival]) Object.assign(car, { freezeUntil: race.elapsed + 3, empUntil: race.elapsed + 2 });
    });
    await page.keyboard.press('m'); // A setting toast must not cover the 50% / dual-debuff stack.
    // The halfway card lives 2.15 s of race time: find, read and measure everything in one page tick.
    const seen = await (await page.waitForFunction(() => {
      const halfway = document.querySelector('#race-halfway-card'), hits = document.querySelector('#race-player-hit-center');
      const tint = window.gameScene.scene.getObjectByName('Rival status tint'), kind = tint?.geometry.attributes.status;
      const cards = [...document.querySelectorAll('#race-player-hit-center [data-debuff]')].map(card => card.dataset.debuff);
      if (!halfway || halfway.hidden || !hits || cards.length < 2 || kind?.getX(tint.count - 1) !== 2) return null;
      const toast = document.querySelector('#game-toast .game-toast-pill');
      if (!toast) return null;
      const toastBox = toast.getBoundingClientRect(), hitsBox = hits.getBoundingClientRect();
      const toastClear = toastBox.right <= hitsBox.left || hitsBox.right <= toastBox.left ||
        toastBox.bottom + 6 <= hitsBox.top || hitsBox.bottom + 6 <= toastBox.top;
      const screen = document.querySelector('#player-hit-screen');
      return {
        gap: hits.getBoundingClientRect().top - halfway.getBoundingClientRect().bottom,
        toastClear,
        cards: cards.sort(),
        screen: screen.dataset.hit,
        layers: [...screen.querySelectorAll('[data-hit-layer]')].map(layer => layer.dataset.hitLayer).sort(),
        speedometer: document.querySelector('.speedometer').dataset.debuff,
        rival: kind.getX(0),
      };
    }, null, { timeout: ciTimeout(30_000) })).jsonValue();
    expect(seen).toEqual({ gap: seen.gap, toastClear: seen.toastClear, cards: ['emp', 'freeze'], screen: 'emp', layers: ['emp', 'freeze'], speedometer: 'emp', rival: 2 });
    expect(seen.gap).toBeGreaterThanOrEqual(0);
    expect(seen.toastClear, 'the setting toast and race notices stay apart').toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`debuff-overlap-${name}.png`) });
    expect(errors).toEqual([]);
  });
});
