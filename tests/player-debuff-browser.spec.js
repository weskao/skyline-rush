import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

for (const [name, width, height, hasTouch, locale] of [
  ['desktop', 1440, 900, false, 'zh-TW'],
  ['portrait', 390, 844, true, 'zh-TW'],
  ['landscape', 844, 390, true, 'en'],
  ['foldable', 844, 390, true, 'zh-TW'],
]) test.describe(`incoming debuffs on ${name}`, () => {
  test.use({ viewport: { width, height }, hasTouch });

  test('labels incoming attacks in the race centre and clears them at expiry and pause', async ({ page, gameplayURL }) => {
    if (name === 'portrait') await page.emulateMedia({ reducedMotion: 'reduce' });
    if (name === 'foldable') await page.addInitScript(() => {
      Object.defineProperty(window, 'viewport', { value: { segments: [
        { left: 0, top: 0, width: 412, height: 390 },
        { left: 432, top: 0, width: 412, height: 390 },
      ] } });
    });
    await page.goto(`${gameplayURL}tests/fixtures/player-debuff.html?locale=${locale}`);
    await page.waitForFunction(() => !!window.debuffHud);
    if (name === 'landscape') await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });

    const freeze = page.locator('#race-player-hit-center [data-debuff="freeze"]');
    const emp = page.locator('#race-player-hit-center [data-debuff="emp"]');
    await expect(freeze).toBeHidden();
    await expect(emp).toBeHidden();
    await page.evaluate(() => window.debuffHud.hit('freeze', 220));

    const detail = locale === 'en' ? 'SPEED REDUCED' : '速度受限';
    await expect(freeze).toContainText(locale === 'en' ? 'FROZEN' : '車輛冰凍');
    await expect(freeze).toContainText(detail);
    await expect(freeze.locator('time')).toHaveText(locale === 'en' ? '2s' : '2 秒');
    await expect(freeze).toHaveCSS('pointer-events', 'none');
    await expect(freeze).toHaveCSS('animation-name', ['desktop', 'foldable'].includes(name) ? /^player-hit-in/ : 'none');
    const centre = await freeze.evaluate(card => {
      const box = card.parentElement.getBoundingClientRect();
      return { x: box.left + box.width / 2, y: box.top + box.height / 2, height: box.height };
    });
    const expectedX = name === 'foldable' ? 638 : width / 2;
    expect(Math.abs(centre.x - expectedX)).toBeLessThan(1);
    expect(Math.abs(centre.y - height / 2)).toBeLessThan(1);
    expect(centre.height).toBeLessThan(height * .18);

    await page.evaluate(() => {
      const { race, hit } = window.debuffHud;
      hit('emp', race.length / 2 + 1);
    });
    await expect(emp).toContainText(locale === 'en' ? 'EMP HIT' : '遭受電擊');
    await expect(emp).toContainText(detail);
    await expect(freeze).toBeVisible();
    const separation = await (await page.waitForFunction(() => {
      const halfway = document.querySelector('#race-halfway-card');
      const hits = document.querySelector('#race-player-hit-center');
      return halfway && hits ? { gap: hits.getBoundingClientRect().top - halfway.getBoundingClientRect().bottom } : null;
    })).jsonValue();
    expect(separation.gap).toBeGreaterThanOrEqual(0);

    await page.evaluate(() => {
      const { race, update } = window.debuffHud;
      race.elapsed = race.player.empUntil;
      update();
    });
    await expect(emp).toBeHidden();
    await expect(freeze.locator('time')).toHaveText(locale === 'en' ? '1s' : '1 秒');
    await page.evaluate(() => {
      window.debuffHud.race.phase = 'paused';
      window.debuffHud.update();
    });
    await expect(freeze).toBeHidden();
    await page.evaluate(() => {
      window.debuffHud.race.phase = 'racing';
      window.debuffHud.update();
    });
    await expect(freeze).toBeVisible();
    await page.evaluate(() => {
      const { race, update } = window.debuffHud;
      race.elapsed = race.player.freezeUntil;
      race.player.effects.freeze = 2;
      update();
    });
    await expect(freeze).toBeHidden();
  });
});
