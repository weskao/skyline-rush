import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// ITEM-03: the magnet's pickup reach is visible mid-race without compiling a new shader.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`magnet radius ${name}`, () => {
  test.use({ viewport, hasTouch });

  for (const trackId of ['coast', 'tokyo']) test(`${trackId}: the ring follows the car while the magnet runs`, async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(id => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', id])), trackId);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator(`[data-track="${trackId}"]`).first().click();
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.waitForTimeout(500);
    const programs = await page.evaluate(() => window.gameScene.renderer.info.programs.length);
    await page.evaluate(() => { window.gameplay.race.player.effects.magnet = 4; });
    await page.waitForFunction(() => window.gameScene.scene.getObjectByName('magnet radius').visible);
    await page.waitForTimeout(300);
    const ring = await page.evaluate(() => {
      const { scene, player } = window.gameScene;
      const mesh = scene.getObjectByName('magnet radius');
      return { gap: Math.hypot(mesh.position.x - player.position.x, mesh.position.z - player.position.z),
        opacity: mesh.material.opacity, programs: window.gameScene.renderer.info.programs.length };
    });
    expect(ring.gap).toBeLessThan(1.5);
    expect(ring.opacity).toBeGreaterThan(0);
    expect(ring.programs, 'no shader compiled for the ring mid-race').toBe(programs);
    await page.screenshot({ path: `test-results/magnet-radius-${trackId}-${name}.png` });
    await page.evaluate(() => { window.gameplay.race.player.effects.magnet = 0; });
    await page.waitForFunction(() => !window.gameScene.scene.getObjectByName('magnet radius').visible);
    expect(errors).toEqual([]);
  });
});
