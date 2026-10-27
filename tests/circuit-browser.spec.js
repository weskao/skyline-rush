import { test } from './helpers/gameplay-browser.js';
import { expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

for (const [name, viewport, hasTouch, locale] of [
  ['desktop', { width: 1440, height: 900 }, false, 'en'],
  ['desktop-zh', { width: 1440, height: 900 }, false, 'zh-TW'],
  ['phone-en', { width: 390, height: 844 }, true, 'en'],
  ['phone', { width: 390, height: 844 }, true, 'zh-TW'],
  ['landscape-en', { width: 844, height: 390 }, true, 'en'],
  ['landscape-zh', { width: 844, height: 390 }, true, 'zh-TW'],
]) test.describe('Circuit ' + name, () => {
  test.use({ viewport, hasTouch });
  test('real loop, valid sectors, result and retry preserve laps and Classic access', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(90000));
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#history-track')).toHaveValue('coast');
    await selectLocale(page, locale);
    await page.evaluate(async () => {
      const { normalizeRaceConfig } = await import('/src/race-config.ts');
      const config = normalizeRaceConfig({ mode: 'circuit', laps: 1 });
      localStorage.setItem('skyline-rush-mode-bests-v1', JSON.stringify({ [JSON.stringify(['harbor-circuit', config, 'lap'])]: 20 }));
    });
    await page.locator('[data-race-mode="circuit"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#circuit-rules > summary').click();
    const laps = page.locator('#circuit-laps + .custom-select');
    await laps.getByRole('combobox').click();
    await laps.getByRole('option', { name: '1', exact: true }).click();
    // Let the home camera finish its transition before checking landmark framing.
    await page.waitForTimeout(1000);
    expect.soft(await page.locator('#race-route-map .route-overview-line').evaluate(line => getComputedStyle(line).stroke)).not.toBe('none');
    const landmark = await page.evaluate(() => {
      const { scene, camera } = window.gameScene;
      const beacon = scene.getObjectByName('Harbor beacon');
      const point = beacon.children[1].getWorldPosition(camera.position.clone()).project(camera);
      return { x: point.x, y: point.y, z: point.z, camera: camera.position.toArray(), beacon: beacon.children[1].getWorldPosition(camera.position.clone()).toArray() };
    });
    expect.soft(Math.abs(landmark.x)).toBeLessThan(.95);
    expect.soft(Math.abs(landmark.y)).toBeLessThan(.95);
    expect.soft(landmark.z).toBeLessThan(1);
    await page.screenshot({ path: `artifacts/circuit/${name}-ready.png` });
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(100); await page.keyboard.up('ArrowLeft');
    await expect(page.locator('#circuit-hud')).toContainText(locale === 'en' ? 'LAP 1 / 1' : '第 1 / 1 圈');
    await expect(page.locator('#circuit-hud')).toContainText('00:20.00');
    await page.evaluate(async () => {
      const { stepRace } = await import('/src/game.js');
      const race = window.gameplay.race;
      while (race.phase === 'racing' && race.player.distance < 1940) stepRace(race, { throttle: true }, .05);
    });
    await expect.poll(async () => Number(await page.locator('#distance').textContent())).toBeGreaterThan(1.9);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    await page.locator('#world').screenshot({ path: `artifacts/circuit/${name}-seam.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#overlay-title')).toHaveText(locale === 'en' ? 'Circuit complete' : '環道賽完成');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-mode-history-v1')).at(-1).lapCount)).toBe(1);
    await page.screenshot({ path: `artifacts/circuit/${name}-result.png` });
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.circuit.player.completed)).toBe(0);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.locator('#pause-button').click();
    await page.locator('a.brand').click();
    await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await page.locator('[data-race-mode="classic"]').click();
    expect(await page.evaluate(() => window.gameplay.race.trackId)).toBe('coast');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(errors).toEqual([]);
  });
});
