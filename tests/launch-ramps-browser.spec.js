import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { mkdir } from 'node:fs/promises';
import { ciTimeout } from './helpers/ci.js';

const ALL = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const dir = 'artifacts/event-lab/launch';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Shared launch rule ${name}`, () => {
  test.use({ viewport, hasTouch });
  test.beforeEach(async ({ gameplayPage: page }) => {
    await page.evaluate(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), ALL);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await mkdir(dir, { recursive: true });
  });

  const fly = async (page, label) => {
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(.5);
    await page.screenshot({ path: `${dir}/${name}-${label}-airborne.png` });
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude), { timeout: ciTimeout(15000) }).toBe(0);
    await page.screenshot({ path: `${dir}/${name}-${label}-landed.png` });
    const car = await page.evaluate(() => {
      const { player } = window.gameScene;
      return [player.position.x, player.position.y, player.position.z, ...player.quaternion.toArray()];
    });
    expect(car.every(Number.isFinite)).toBe(true);
  };

  test('Sky Spiral helix, joins and launch ramps still fly and land', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-track="spiral"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    for (const [distance, x] of [[1100, 0], [1650, -7], [1650, 7], [2200, 0]]) {
      await page.evaluate(([d, lateral]) => Object.assign(window.gameplay.race.player, { distance: d, x: lateral, speed: 0, altitude: 0 }), [distance, x]);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${dir}/${name}-spiral-${distance}-${x}.png` });
    }
    await page.evaluate(() => {
      const race = window.gameplay.race, section = race.sections.find(s => s.type === 'launch');
      Object.assign(race.player, { distance: section.to - 30, x: 0, speed: 55, altitude: 0, verticalSpeed: 0 });
    });
    await fly(page, 'spiral-launch');
    expect(errors).toEqual([]);
  });

  test('an imported Event Lab ramp on Sky Spiral launches through the shared rule', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-track="spiral"]').click();
    // Pick a spot the validator accepts, then load it through the real import flow.
    const json = await page.evaluate(async ids => {
      const lab = await import('/src/event-lab.ts');
      const { createRace } = await import('/src/game.js');
      const props = createRace('spiral', { mode: 'custom', rivals: 0, traffic: 'off' }).props;
      for (let d = 400; d < 8000; d += 50) try {
        return lab.exportCourse(lab.validateCourse({ version: 1, label: 'Spiral ramp', trackId: 'spiral', seed: 3, modifier: 'standard',
          objects: [{ kind: 'ramp', distance: d, lane: 1 }] }, new Set(ids), props));
      } catch {}
      return null;
    }, ALL);
    expect(json).not.toBeNull();
    await page.locator('[data-race-mode="eventlab"]').click();
    await page.locator('.lab-share > summary').click();
    await page.locator('#lab-json').fill(json);
    await page.locator('#lab-import').click();
    await expect(page.locator('#lab-error')).toBeEmpty();
    await page.locator('#lab-use').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    await page.evaluate(() => {
      const race = window.gameplay.race, ramp = race.ramps[0];
      Object.assign(race.player, { distance: ramp.distance - 40, x: ramp.x, speed: 55, altitude: 0, verticalSpeed: 0 });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('launch-ramps').count)).toBeGreaterThan(0);
    await fly(page, 'spiral-authored-ramp');
    expect(errors).toEqual([]);
  });
});
