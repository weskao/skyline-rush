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
      await page.evaluate(() => { window.gameplay.race.countdown = .01; });
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await expect(page.locator('#countdown')).toBeHidden();
      await page.evaluate(() => {
        const { player } = window.gameplay.race;
        Object.assign(player, { speed: 80, nitroTime: 4, x: 0 });
        player.nitroUses++; // Register a fresh event even if the HUD is between simulation updates.
      });
      await expect(page.locator('#event-callout')).toHaveAttribute('data-kind', 'nitro');
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

// The "GO" countdown hides the flight telemetry (style.css: body:has(#countdown:not([hidden])) .telemetry), so a reward
// placed during GO saw that space as free; when GO cleared under a still-visible chip, the telemetry reappeared under it
// (develop CI 844x390, race-hud-overlap-browser.spec.js). GO is cleared by hand so slow and fast machines see the same order.
test.describe('reward placed during GO stays clear once the telemetry returns', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });
  test('phone landscape', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(120_000));
    await page.locator('#start-button').click();
    // rAF polling: an interval poll can land after GO has already cleared.
    await page.waitForFunction(() => window.gameplay.race.phase === 'racing', null, { polling: 'raf', timeout: ciTimeout(20_000) });
    const result = await page.evaluate(async () => {
      const chip = document.getElementById('event-callout'), go = document.getElementById('countdown');
      const telemetry = document.querySelector('.flight-telemetry');
      if (go.hidden) return 'GO already cleared';
      Object.assign(window.gameplay.race.player, { speed: 80, nitroTime: 4, x: 0 });
      while (chip.hidden) await new Promise(requestAnimationFrame);
      go.hidden = true; // what the HUD does when GO ends
      await new Promise(resolve => setTimeout(resolve, 0)); // let observers run, but no new callout frame decides it
      if (getComputedStyle(telemetry).visibility !== 'visible') return 'telemetry still hidden';
      const a = chip.getBoundingClientRect(), b = telemetry.getBoundingClientRect();
      return a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
        ? 'clear' : `chip ${JSON.stringify(a)} overlaps telemetry ${JSON.stringify(b)}`;
    });
    expect(result).toBe('clear');
  });
});
