import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Phone landscape: the pause and results panels must show every action (Resume, Next, Race again, Choose track,
// History, cloud Sign in) without scrolling. Before this layout the results stack was ~2x the landscape height and players had
// to swipe the overlay to find Race again / Choose track.
const SHOTS = process.env.OVERLAY_SHOTS;

// Every visible button inside the overlay must sit fully inside the overlay's visible box and receive a real hit test.
const unreachable = () => {
  const overlay = document.querySelector('#race-overlay');
  const box = overlay.getBoundingClientRect();
  const misses = [];
  for (const button of overlay.querySelectorAll('button')) {
    const r = button.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(button).visibility === 'hidden') continue;
    const inside = r.top >= box.top - 0.5 && r.bottom <= box.bottom + 0.5 && r.left >= 0 && r.right <= innerWidth && r.bottom <= innerHeight;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!inside || !button.contains(hit)) misses.push(`${button.id || button.textContent.trim()} ${Math.round(r.top)}-${Math.round(r.bottom)} / ${Math.round(box.bottom)}`);
  }
  return { misses, scroll: overlay.scrollHeight - overlay.clientHeight };
};

// Summary and actions must each stay inside one pane of a vertical fold (same injection as race-hud-overlap-browser.spec.js).
const FOLD = [{ left: 0, top: 0, width: 410, height: 390 }, { left: 434, top: 0, width: 410, height: 390 }];
const offHinge = ([left, right]) => [...document.querySelectorAll('.overlay-summary, .overlay-actions')].flatMap(element => {
  const r = element.getBoundingClientRect();
  return r.right <= left + 0.5 || r.left >= right - 0.5 ? [] : [`${element.className} ${Math.round(r.left)}-${Math.round(r.right)}`];
});
// Screenshots only: let the overlay fade-in finish so the saved frame shows the settled panel.
const shot = async (page, name) => { if (SHOTS) { await page.waitForTimeout(ciTimeout(800)); await page.screenshot({ path: `${SHOTS}/${name}.png` }); } };

for (const { segments, ...viewport } of [
  { width: 844, height: 390 }, // iPhone 14/15
  { width: 932, height: 430 }, // iPhone Pro Max
  { width: 667, height: 375 }, // iPhone SE
  { width: 740, height: 360 }, // small Android
  { width: 844, height: 390, segments: FOLD }, // vertical foldable
]) test.describe(`overlay fits phone landscape ${viewport.width}x${viewport.height}${segments ? ' fold' : ''}`, () => {
  test.use({ viewport, hasTouch: true });
  const tag = `${viewport.width}x${viewport.height}${segments ? '-fold' : ''}`;

  test('pause and podium results show every action without scrolling', async ({ gameplayPage: page }) => {
    if (segments) {
      await page.addInitScript(value => Object.defineProperty(window, 'getWindowSegments', { configurable: true, value: () => value }), segments);
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await expect(page.locator('body')).toHaveAttribute('data-fold-axis', 'vertical');
    }
    const hinge = [FOLD[0].width, FOLD[1].left];
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    await page.locator('#pause-button').click();
    await expect(page.locator('#resume-button')).toBeVisible();
    // Polled: overlay-in / enter() transforms move the panel for a few frames.
    await expect.poll(() => page.evaluate(unreachable), { timeout: ciTimeout(3000) }).toEqual({ misses: [], scroll: 0 });
    if (segments) expect(await page.evaluate(offHinge, hinge)).toEqual([]); // settled: the poll above waited for the final layout
    await shot(page, `pause-${tag}`);

    await page.locator('#resume-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    await page.evaluate(() => { const race = window.gameplay.race; race.elapsed = 80; Object.assign(race.player, { distance: race.length - 10, speed: 60 }); });
    await expect(page.locator('#next-button')).toBeVisible();
    await expect(page.locator('#result-links')).toBeVisible();
    // Signed out: the cloud line's sign-in button joins the actions column and must fit too (unreachable() checks every button).
    await expect(page.locator('#result-cloud-login')).toBeVisible();
    // Polled: the results slide in (enter() 'slow') and the stars arrive after ~1.1s.
    await expect.poll(() => page.evaluate(unreachable), { timeout: ciTimeout(4000) }).toEqual({ misses: [], scroll: 0 });
    // Polled: the hit test above can pass while the 'slow' slide-in still offsets the panel horizontally.
    if (segments) await expect.poll(() => page.evaluate(offHinge, hinge), { timeout: ciTimeout(3000) }).toEqual([]);
    await shot(page, `results-${tag}`);

    // Real clicks still work from the new layout.
    await page.locator('#again-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  });
});
