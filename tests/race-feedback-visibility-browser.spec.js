import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// These run against the actual Vite/Three.js game, not an HTML mock.
for (const { name, width, height, touch } of [
  { name: 'portrait', width: 390, height: 844, touch: true },
  { name: 'landscape', width: 844, height: 390, touch: true },
  { name: 'compact landscape', width: 568, height: 320, touch: true },
  { name: 'desktop', width: 1440, height: 900, touch: false },
]) {
  test.describe(`forward road remains visible: ${name}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch });
    test('reward stays peripheral, accessible and clear of live HUD and steering', async ({ gameplayPage: page }) => {
      test.setTimeout(ciTimeout(120_000));
      await page.locator('#start-button').click();
      await expect.poll(() => page.evaluate(() => window.gameplay.race.phase)).toBe('racing');
      await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 80, nitroTime: 4, x: 0 }));
      await expect(page.locator('#event-callout')).toBeVisible({ timeout: ciTimeout(10_000) });
      const result = await page.evaluate(() => {
        const el = document.getElementById('event-callout');
        const r = el.getBoundingClientRect();
        const road = { left: innerWidth * .325, right: innerWidth * .675, top: innerHeight * .2, bottom: innerHeight * .72 };
        const overlaps = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 &&
          a.top < b.bottom - 1 && a.bottom > b.top + 1;
        const obstructed = [...document.querySelectorAll('.position-stat, .race-progress, .leaderboard, .race-route-map, .speedometer, .flight-telemetry, .aero-tools, .toolbar, .mode-indicator, #touch-controls [data-control]')]
          .filter(other => other.getClientRects().length && getComputedStyle(other).visibility !== 'hidden')
          .filter(other => overlaps(r, other.getBoundingClientRect()))
          .map(other => other.id || other.className);
        return {
          roadOverlap: overlaps(r, road),
          obstructed,
          text: el.textContent.trim(),
          pointer: getComputedStyle(el).pointerEvents,
          canvas: !!document.querySelector('#world'),
        };
      });
      expect(result.roadOverlap, 'reward must not cover the center-forward road').toBe(false);
      expect(result.obstructed, 'reward must not cover live HUD or controls').toEqual([]);
      expect(result.text.length).toBeGreaterThan(0);
      expect(result.pointer).toBe('none');
      expect(result.canvas).toBe(true);
      await page.screenshot({ path: `test-results/road-safe-feedback-${name.replace(/ /g, '-')}.png` });
    });
  });
}
