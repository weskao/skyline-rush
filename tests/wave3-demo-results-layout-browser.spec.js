import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { selectLocale } from './helpers/locale-browser.js';

const SHOTS = process.env.DEMO_REWARD_SHOTS;
// Every reward line must be painted whole: no inner scrollbar, no ellipsis, no visually-hidden copy.
const clipped = () => {
  const card = document.querySelector('.wave3-demo-results--earned');
  const misses = [];
  if (card.scrollHeight > card.clientHeight + 1) misses.push(`card scrolls ${card.scrollHeight}/${card.clientHeight}`);
  // Short landscape opens the details as a panel above the strip; it counts as part of the card.
  const c = card.getBoundingClientRect();
  const panel = card.querySelector('.wave3-demo-results__details').getBoundingClientRect();
  const box = { left: Math.min(c.left, panel.left), right: Math.max(c.right, panel.right), bottom: Math.max(c.bottom, panel.bottom) };
  if (card.dataset.open !== undefined) {
    const actions = document.querySelector('#race-overlay .overlay-actions').getBoundingClientRect();
    if (panel.top < 0 || panel.bottom > innerHeight) misses.push('details off screen');
    if (panel.right > actions.left + 1 && panel.left < actions.right - 1 &&
      panel.bottom > actions.top + 1 && panel.top < actions.bottom - 1) misses.push('details cover actions');
  }
  for (const node of card.querySelectorAll('h3, p, h4, span, strong, progress')) {
    if (node.closest('[hidden]')) continue;
    const r = node.getBoundingClientRect();
    const name = node.className || node.tagName;
    if (!r.width || !r.height || getComputedStyle(node).clipPath !== 'none') misses.push(`${name} hidden`);
    else if (node.scrollWidth > node.clientWidth + 1 && node.tagName !== 'PROGRESS') misses.push(`${name} truncated`);
    else if (r.left < box.left - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1) misses.push(`${name} outside card`);
  }
  return misses;
};

// The bonus is a section of the podium, not a viewport-fixed toast. It must never
// jump to a corner or cover the Race again / Next / cloud controls at any size.
for (const viewport of [
  { width: 390, height: 844 }, // phone portrait
  { width: 360, height: 740 }, // small Android portrait
  { width: 844, height: 390 }, // phone landscape
  { width: 667, height: 375 }, // iPhone SE landscape
  { width: 768, height: 1024 }, // tablet portrait
  { width: 1440, height: 900 }, // desktop
]) {
  test.describe(`Wave 3 earned results layout ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 900 });

    test('reward stays with the result summary and clear of action targets', async ({ gameplayPage: page }) => {
      await selectLocale(page, 'zh-TW');
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      const reward = page.locator('.wave3-demo-results--earned');
      await expect(reward).toBeVisible({ timeout: ciTimeout(6000) });

      const geometry = () => page.evaluate(() => {
        const reward = document.querySelector('.wave3-demo-results--earned');
        const summary = document.querySelector('#race-overlay .overlay-summary');
        const actions = document.querySelector('#race-overlay .overlay-actions');
        const b = reward.getBoundingClientRect();
        const s = summary.getBoundingClientRect();
        const a = actions.getBoundingClientRect();
        return {
          // Relative only anchors the short-landscape details panel; never fixed/absolute.
          inline: reward.parentElement === summary && ['static', 'relative'].includes(getComputedStyle(reward).position),
          withinSummary: b.left >= s.left - 1 && b.right <= s.right + 1,
          clearOfActions: b.right <= a.left + 1 || b.left >= a.right - 1 ||
            b.bottom <= a.top + 1 || b.top >= a.bottom - 1,
        };
      });
      await expect.poll(geometry, { timeout: ciTimeout(4000) }).toEqual({
        inline: true, withinSummary: true, clearOfActions: true,
      });
      // The result entrance may slide the entire summary. The reward must retain
      // its relative position, rather than reanchoring after the transform ends.
      const relative = () => reward.evaluate(node => {
        const r = node.getBoundingClientRect();
        const s = node.parentElement.getBoundingClientRect();
        return { x: r.left - s.left, y: r.top - s.top };
      });
      const before = await relative();
      await page.waitForFunction(() =>
        [...document.querySelector('.overlay-content').getAnimations()].every(animation => animation.playState !== 'running'));
      const after = await relative();
      expect(Math.abs(after.x - before.x)).toBeLessThan(3);
      expect(Math.abs(after.y - before.y)).toBeLessThan(3);
      const toggle = page.locator('.wave3-demo-results__toggle');
      if (viewport.height <= 500) {
        // The strip itself is the tap target; the details rise as a panel and close again.
        await reward.click({ position: { x: 20, y: 10 } });
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      } else await expect(toggle).toBeHidden();
      await expect.poll(() => page.evaluate(clipped), { timeout: ciTimeout(3000) }).toEqual([]);
      if (SHOTS) {
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${SHOTS}/demo-reward-${viewport.width}x${viewport.height}.png` });
        await reward.screenshot({ path: `${SHOTS}/demo-reward-${viewport.width}x${viewport.height}-card.png` });
      }
      if (viewport.height <= 500) {
        await toggle.click();
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
        await expect(page.locator('.wave3-demo-results__disclaimer')).toHaveCSS('clip-path', 'inset(50%)');
      }
    });
  });
}
