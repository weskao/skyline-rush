import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// User, 2026-11-09: rings and pickups were missing on the new courses (graph runtimes emptied them) and Classic had no
// road traffic. Real WebGL: rings and pickups are drawn where they score, and traffic is on the road.
test.use({ unlockedAccess: true });
for (const [device, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe('new-course items ' + device, () => {
  test.use({ viewport, hasTouch });
  for (const id of ['dune-tempest', 'skyfall-archipelago', 'frostbite-canyon']) {
    test(`${id}: rings, pickups and traffic are drawn on the course`, async ({ gameplayPage: page }, info) => {
      test.setTimeout(ciTimeout(60_000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.locator(`[data-upcoming-track="${id}"]`).click();
      await expect(page.locator('#start-button')).toBeEnabled();
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(16_000) });
      await page.locator('#pause-button').click(); // freeze, then assert: the paused frame keeps drawing the items
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
      await page.waitForTimeout(ciTimeout(300));
      const seen = await page.evaluate(async () => {
        const { drawnMarkers } = await import('/src/marker-pool.js');
        const { courseItemPoint } = await import('/src/course-items.ts');
        const { graphOrigin } = await import('/src/course-render-pose.ts');
        const { trackLocalPosition } = await import('/src/track-paths.ts');
        const race = window.gameplay.race, { scene } = window.gameScene, d = race.player.distance;
        const rings = drawnMarkers(scene.getObjectByName('Race rings')), pickups = drawnMarkers(scene.getObjectByName('Nitro pickups'));
        const ahead = race.rings.filter(r => r.distance > d && r.distance <= d + 900);
        const at = r => race.course ? courseItemPoint(race.course, r, r.x, r.altitude, graphOrigin(race.course))
          : trackLocalPosition(race.trackId, r.distance, r.x, r.altitude, d);
        const off = Math.max(...ahead.map(r => { const [x, y, z] = at(r);
          return Math.min(...rings.map(m => Math.hypot(m.position.x - x, m.position.y - y, m.position.z - z))); }));
        return { rings: rings.length, ahead: ahead.length, off, pickups: pickups.length, trafficCars: race.traffic.length };
      });
      expect(seen.ahead, 'rings within the 900 m draw range').toBeGreaterThan(3);
      expect(seen.rings, 'ring markers drawn').toBeGreaterThanOrEqual(seen.ahead);
      expect(seen.off, `rings drawn ${seen.off} m from where they score`).toBeLessThan(0.05);
      expect(seen.pickups, 'pickup markers drawn').toBeGreaterThan(0);
      expect(seen.trafficCars, 'Classic road traffic').toBeGreaterThan(20);
      await page.screenshot({ path: info.outputPath(`${device}-${id}-items.png`), style: '#race-overlay { display: none !important; }' });
      expect(errors).toEqual([]);
    });
  }
});
