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
  // Short landscape opens the details beside the action column; it counts as part of the card.
  const c = card.getBoundingClientRect();
  const panel = card.querySelector('.wave3-demo-results__details').getBoundingClientRect();
  const box = { left: Math.min(c.left, panel.left), right: Math.max(c.right, panel.right), bottom: Math.max(c.bottom, panel.bottom) };
  if (card.dataset.open !== undefined) {
    const actions = document.querySelector('#race-overlay .overlay-actions');
    if (panel.top < 0 || panel.bottom > innerHeight) misses.push('details off screen');
    for (const control of actions.querySelectorAll('.overlay-buttons button:not([hidden])')) {
      const r = control.getBoundingClientRect();
      if (r.width && r.height && panel.right > r.left + 1 && panel.left < r.right - 1 &&
        panel.bottom > r.top + 1 && panel.top < r.bottom - 1) misses.push('details cover actions');
    }
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
  { width: 1024, height: 768 }, // tablet landscape
  { width: 1366, height: 768 }, // laptop
  { width: 1440, height: 900 }, // desktop
]) {
  test.describe(`Wave 3 earned results layout ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport, hasTouch: viewport.width < 900,
      reducedMotion: viewport.width === 667 ? 'reduce' : 'no-preference' });

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
        const slot = document.querySelector('#result-rewards');
        const b = reward.getBoundingClientRect();
        const s = slot.getBoundingClientRect();
        return {
          // Relative only anchors the short-landscape details panel; never fixed/absolute.
          inline: reward.parentElement === slot && ['static', 'relative'].includes(getComputedStyle(reward).position),
          withinSlot: b.left >= s.left - 1 && b.right <= s.right + 1,
        };
      });
      await expect.poll(geometry, { timeout: ciTimeout(4000) }).toEqual({
        inline: true, withinSlot: true,
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
      if (viewport.width === 360) {
        // No scrolling to see rank, time, record, both awarded resources or the primary action.
        await expect.poll(() => page.evaluate(() => {
          const overlay = document.querySelector('#race-overlay');
          const box = overlay.getBoundingClientRect();
          return ['#result-stats > div:nth-child(1)', '#result-stats > div:nth-child(2)',
            '#result-stats > div:nth-child(3)', '.wave3-demo-results__credit:not(.wave3-demo-results__coin-credit)',
            '.wave3-demo-results__coin-credit', '#next-button'].filter(selector => {
            const node = document.querySelector(selector);
            const r = node.getBoundingClientRect();
            return !r.width || !r.height || r.top < box.top || r.bottom > box.bottom ||
              !node.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2));
          });
        })).toEqual([]);
      }
      if (viewport.height <= 500) {
        // The strip opens a details panel alongside the results actions.
        await reward.click({ position: { x: 20, y: 10 } });
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');
        await page.locator('#next-button').click({ trial: true });
        const coins = reward.locator('.wave3-demo-results__coin-credit');
        await expect(coins).toBeVisible();
        await expect(coins.locator('.wave3-demo-results__balance-value')).toHaveText(/^\d+$/);
        if (viewport.width === 667) {
          await expect(coins).not.toHaveAttribute('data-reward-reveal', '');
          const amount = await coins.locator('.wave3-demo-results__points').textContent();
          await expect(coins.locator('.wave3-demo-results__balance-value')).toHaveText(amount.match(/\d+/)[0]);
        }
      } else await expect(toggle).toBeHidden();
      await expect.poll(() => page.evaluate(clipped), { timeout: ciTimeout(3000) }).toEqual([]);
      // Laptops and tablets in landscape: the card ran past the overlay's bottom edge with no
      // way to scroll to it, which hid the coin row and mission progress.
      await expect.poll(() => page.evaluate(() => {
        const overlay = document.querySelector('#race-overlay');
        overlay.scrollTop = overlay.scrollHeight;
        const card = document.querySelector('.wave3-demo-results--earned').getBoundingClientRect();
        return Math.max(0, Math.round(card.bottom - overlay.getBoundingClientRect().bottom));
      }), { timeout: ciTimeout(3000) }).toBe(0);
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
      if (viewport.width === 360) {
        const history = page.locator('#result-links [data-open-history]');
        await history.tap();
        await expect(page.locator('#history-tab-races')).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(page.locator('#history-screen')).toBeHidden();
        await expect(history).toBeFocused();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
        await page.locator('#next-button').tap();
        await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
      }
    });
  });
}

for (const [locale, raceMode] of [['zh-TW', 'classic'], ['en', 'classic'], ['en', 'time']]) {
  test.describe(`demo mission progress layout (${locale}, ${raceMode})`, () => {
    test.use({ viewport: { width: 360, height: 740 }, hasTouch: true, reducedMotion: 'reduce' });

    test('claimed progress fits on one line with bars at the bottom of the reward details', async ({ page, gameplayURL }) => {
      await page.route('**/demo-reward-layout', route => route.fulfill({
        contentType: 'text/html',
        body: '<body data-phase="finished"><main style="width:min(100%, 460px);margin:220px auto 0"></main></body>',
      }));
      await page.goto(new URL('demo-reward-layout', gameplayURL).href);
      await page.evaluate(async ({ locale, raceMode }) => {
        await import('/src/wave3-demo-results.css');
        const { mountWave3DemoResults } = await import('/src/wave3-demo-results-ui.ts');
        const missions = {
          [raceMode === 'time' ? 'mission-time' : 'mission-race']: { progress: 1, goal: 1, claimed: true },
          'mission-drift': { progress: 1, goal: 2, claimed: false },
          'mission-combo': { progress: 1, goal: 1, claimed: true },
        };
        mountWave3DemoResults({
          container: document.querySelector('main'), locale, raceMode,
          settlement: { status: 'completed', snapshot: { mode: 'local-demo', authority: 'local', syncState: 'local-only', missions } },
        });
      }, { locale, raceMode });
      const reward = page.locator('.wave3-demo-results--earned');
      const progress = reward.getByRole('progressbar');
      await expect(progress.first()).toHaveAccessibleName(locale === 'zh-TW' ? /1\/1.*已領取/ : /1\/1.*claimed/i);
      await expect(progress).toHaveCount(3);
      if (raceMode === 'time') {
        // Font metrics vary across Chromium hosts. Allow for a wider English system font.
        await page.addStyleTag({ content: '.wave3-demo-results__mission-label { letter-spacing: .25px; }' });
      }

      for (const viewport of [
        { width: 320, height: 568 },
        { width: 360, height: 740 },
        { width: 667, height: 375 },
        { width: 1024, height: 768 },
      ]) {
        await page.setViewportSize(viewport);
        if (viewport.width === 667) await reward.getByRole('button', { name: /詳情|Details/ }).tap();
        await expect.poll(() => reward.locator('.wave3-demo-results__missions').evaluate(missions => {
          const section = missions.getBoundingClientRect();
          const disclaimer = missions.parentElement.querySelector('.wave3-demo-results__disclaimer').getBoundingClientRect();
          const cards = [...missions.querySelectorAll('.wave3-demo-results__mission')].map(card => {
            const range = document.createRange();
            const label = card.querySelector('.wave3-demo-results__mission-label');
            range.selectNodeContents(label);
            const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
            const bar = card.querySelector('progress').getBoundingClientRect();
            const style = getComputedStyle(card);
            const innerBottom = card.getBoundingClientRect().bottom - parseFloat(style.paddingBottom) - parseFloat(style.borderBottomWidth);
            return { lines, fits: label.scrollWidth <= label.clientWidth + 1, barAtBottom: Math.abs(bar.bottom - innerBottom) < 1 };
          });
          return { progressAtBottom: section.top >= disclaimer.bottom, cards };
        }), { message: `${viewport.width}×${viewport.height}` }).toEqual({
          progressAtBottom: true,
          cards: Array.from({ length: 3 }, () => ({ lines: 1, fits: true, barAtBottom: true })),
        });
      }
    });
  });
}
