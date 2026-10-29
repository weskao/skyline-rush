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
    const lapCount = name === 'desktop' ? 3 : name === 'phone-en' ? 5 : 1;
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await expect(page.locator('#history-track')).toHaveValue('coast');
    await selectLocale(page, locale);
    await page.evaluate(async lapCount => {
      const { normalizeRaceConfig } = await import('/src/race-config.ts');
      const config = normalizeRaceConfig({ mode: 'circuit', laps: lapCount });
      localStorage.setItem('skyline-rush-mode-bests-v1', JSON.stringify({ [JSON.stringify(['harbor-circuit', config, 'lap'])]: 20 }));
    }, lapCount);
    await page.locator('button[data-race-mode="circuit"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await page.locator('#circuit-rules > summary').click();
    const laps = page.locator('#circuit-laps + .custom-select');
    await laps.getByRole('combobox').click();
    await laps.getByRole('option', { name: String(lapCount), exact: true }).click();
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
    await expect(page.locator('#circuit-hud')).toContainText(locale === 'en' ? `LAP 1 / ${lapCount}` : `第 1 / ${lapCount} 圈`);
    await expect(page.locator('#circuit-hud')).toContainText('00:20.00');
    await page.evaluate(async lapCount => {
      const { stepRace } = await import('/src/game.js');
      const race = window.gameplay.race;
      while (race.phase === 'racing' && race.player.distance < lapCount * 2000 - 60) stepRace(race, { throttle: true }, .05);
    }, lapCount);
    await expect.poll(async () => Number(await page.locator('#distance').textContent())).toBeGreaterThan(lapCount * 2 - .1);
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
    await page.locator('#world').screenshot({ path: `artifacts/circuit/${name}-seam.png` });
    await page.keyboard.press('Escape');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
    await expect(page.locator('#overlay-title')).toHaveText(locale === 'en' ? 'Circuit complete' : '環道賽完成');
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-mode-history-v1')).at(-1).lapCount)).toBe(lapCount);
    await expect(page.locator('#race-overlay')).toBeVisible();
    expect(await page.locator('#result-stats').evaluate(element => {
      const bounds = element.getBoundingClientRect();
      return [...element.children].every(child => {
        const rect = child.getBoundingClientRect();
        return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1;
      });
    }), 'every lap metric must fit inside the results panel').toBe(true);
    await page.screenshot({ path: `artifacts/circuit/${name}-result.png`, animations: 'disabled' });
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => window.gameplay.race.circuit.player.completed)).toBe(0);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.locator('#pause-button').click();
    await page.locator('a.brand').click();
    await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await page.locator('button[data-race-mode="classic"]').click();
    expect(await page.evaluate(() => window.gameplay.race.trackId)).toBe('coast');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(errors).toEqual([]);
  });
});

for (const [width, locale] of [[1440, 'en'], [390, 'zh-TW']]) test.describe(`Circuit Ghost History ${locale}`, () => {
  test.use({ viewport: { width, height: width === 390 ? 844 : 900 }, hasTouch: width === 390 });
  test('saved Circuit Ghost is discoverable through the real History controls', async ({ gameplayPage: page }) => {
    await page.evaluate(async () => {
      const { normalizeRaceConfig } = await import('/src/race-config.ts');
      const { recordModeRace, saveModeGhost } = await import('/src/history.ts');
      const config = normalizeRaceConfig({ mode: 'circuit', laps: 1 });
      recordModeRace({ mode: 'circuit', trackId: 'harbor-circuit', config,
        result: { time: 20, success: true, position: 1, lapTimes: [{ time: 20, splits: [5, 10, 15, 20] }] } });
      if (!saveModeGhost('harbor-circuit', config, { time: 20, samples: Array.from({ length: 201 }, (_, i) => [i * 10, -2.5, 0]) })) throw new Error('Invalid capture Ghost');
    });
    await page.reload();
    await page.waitForTimeout(750);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await selectLocale(page, locale);
    await page.locator('.history-button').click();
    const track = page.locator('#history-track + .custom-select');
    await track.getByRole('combobox').click();
    await track.getByRole('option', { name: locale === 'en' ? 'Harbor Circuit' : '港灣環道', exact: true }).click();
    await expect(page.locator('#mode-history-runs [data-mode="circuit"][data-ghost="true"]')).toHaveCount(1);
    await expect(page.locator('#mode-history-runs')).toContainText(locale === 'en' ? 'GHOST READY' : '幽靈可用');
    await page.screenshot({ path: `artifacts/circuit/history-ghost-${locale}.png` });
  });
});
