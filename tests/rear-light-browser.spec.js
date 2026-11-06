import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// The LED's own behaviour (shape, braking/nitro power, startup scan, flow, reduced motion) is tests/rear-light.test.js.
// This keeps only the wiring in src/world.js: the real race reaches update() and a new race reaches reset().
const lightState = page => page.evaluate(() => {
  const bar = window.gameScene.player.getObjectByName('Continuous rear LED');
  if (!bar) return null;
  const core = bar.getObjectByName('Rear LED core');
  return { width: core.parent.scale.x, intensity: core.material.emissiveIntensity };
});

test('rear LED follows the real race: braking brightens it and a restart scans it outward again', async ({ gameplayPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await expect.poll(() => lightState(page)).not.toBeNull();
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  await page.locator('#start-button').click();
  await expect.poll(async () => (await lightState(page)).width).toBeLessThan(1);
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  const cruising = await lightState(page);
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.phase = 'paused';
    race.player.braking = true;
  });
  await expect.poll(async () => (await lightState(page)).intensity).toBeGreaterThan(cruising.intensity * 2);
  await page.evaluate(() => { window.gameplay.race.phase = 'racing'; window.gameplay.race.player.braking = false; window.gameplay.race.traffic = []; });
  await page.locator('#restart-button').click();
  await expect.poll(async () => (await lightState(page)).width).toBeLessThan(1);
  await expect.poll(async () => (await lightState(page)).width).toBe(1);
  expect(errors).toEqual([]);
});
