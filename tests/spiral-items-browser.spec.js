import { clickLobbyOption } from './helpers/home-lobby.js';
import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Rings and pickups on Sky Spiral are drawn where the race collects them: on the helix road
// (skyPosition), not on a flat straight road at the same distance.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Sky Spiral items ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('rings and pickups sit on the helix road where they are collected', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral'])));
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await clickLobbyOption(page, '[data-track="spiral"]');
    await page.locator('#start-button').click();
    await page.evaluate(() => { window.gameplay.race.countdown = .01; });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    const worst = await page.evaluate(async () => {
      const { skyPosition } = await import('/src/sky-track.ts');
      const { drawnMarkers } = await import('/src/marker-pool.js');
      const { PICKUP_GROUND_LIFT, PICKUP_SIZES } = await import('/src/pickup-art.js');
      const frame = () => new Promise(requestAnimationFrame);
      const race = window.gameplay.race;
      for (let i = 0; i < 10; i++) { Object.assign(race.player, { distance: 1250, x: 0, speed: 0, altitude: 0 }); await frame(); }
      const { scene } = window.gameScene, d = race.player.distance;
      const off = (groupName, items, pickup) => {
        const group = scene.getObjectByName(groupName), meshes = drawnMarkers(group);
        const live = items.filter(item => !(item.taken || item.hit || item.downUntil > race.elapsed) && item.distance > d && item.distance <= d + 900);
        return { count: Math.min(meshes.length, live.length), max: Math.max(0, ...live.slice(0, meshes.length).map((item, i) => {
          const [x, y, z] = skyPosition(item.distance, item.x, item.altitude + (pickup ? 0.85 : 0), d);
          const { position, scale } = meshes[i];
          if (!(pickup && item.altitude < 0.5)) return Math.hypot(position.x - x, position.y - y, position.z - z);
          // A ground pickup grows with distance and is lifted to keep its base on the road: judge the base, not the origin.
          const shape = group.getObjectByName(item.tier).geometry;
          if (!shape.boundingBox) shape.computeBoundingBox();
          const low = shape.boundingBox.min.y;
          const base = y + PICKUP_GROUND_LIFT[item.tier] + low * PICKUP_SIZES[item.tier];
          return Math.hypot(position.x - x, position.y + low * scale.y - base, position.z - z);
        })) };
      };
      return { rings: off('Race rings', race.rings, false), pickups: off('Nitro pickups', race.pickups, true) };
    });
    expect(worst.rings.count + worst.pickups.count, 'items ahead on the helix are drawn').toBeGreaterThan(3);
    expect(worst.rings.count).toBeGreaterThan(0);
    expect(worst.pickups.count).toBeGreaterThan(0);
    expect(worst.rings.max, `rings off the helix by ${worst.rings.max} m`).toBeLessThan(0.05);
    expect(worst.pickups.max, `pickups off the helix by ${worst.pickups.max} m`).toBeLessThan(0.05);
    expect(errors).toEqual([]);
  });
});
