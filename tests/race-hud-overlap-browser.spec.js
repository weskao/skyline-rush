import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Real bounding boxes of every top-level in-race HUD block must never intersect or touch (gap >= 2 CSS px),
// while racing with an event callout up, then with a collision report up, and while paused, in both HUD modes and
// both locales. The callout and the collision report never show together (callouts wait out the report).
// The fold sizes inject the Viewport Segments API exactly as tests/foldable-layout-browser.spec.js does.
const MIN_GAP = 2;
const HUD = ['.brand', '.route-heading', '.toolbar', '.aero-tools', '.airflow-hud', '.race-progress', '.mode-indicator',
  '.position-stat', '.speedometer', '.flight-telemetry', '#nitro-status', '.event-callout', '.leaderboard',
  '.race-route-map', '.impact-report', '#touch-controls [data-control]'];
// The pause panel is meant to cover the HUD; it must only stay clear of the top-bar controls and language picker.
const PAUSE_PANEL = '.race-overlay .overlay-content';
const PAUSE_CLEAR_OF = ['.brand', '.toolbar', '.aero-tools'];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, touch: false },
  { name: 'tablet', width: 1024, height: 768, touch: true },
  { name: 'phone portrait', width: 390, height: 844, touch: true },
  { name: 'small phone', width: 320, height: 740, touch: true },
  { name: 'phone landscape', width: 844, height: 390, touch: true },
  { name: 'vertical fold', width: 844, height: 390, touch: true, segments: [
    { left: 0, top: 0, width: 410, height: 390 }, { left: 434, top: 0, width: 410, height: 390 }] },
  { name: 'horizontal fold', width: 600, height: 900, touch: true, segments: [
    { left: 0, top: 0, width: 600, height: 430 }, { left: 0, top: 460, width: 600, height: 440 }] },
];

/** Runs in the page: names every intersecting or touching pair of visible, non-nested HUD blocks. */
function collisions({ hud, pausePanel, pauseClearOf, minGap }) {
  const shown = element => {
    for (let node = element; node && node !== document.body; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (node.hidden || style.display === 'none' || style.visibility === 'hidden') return false;
      if (Number(style.opacity) === 0 && !node.getAnimations().length) return false;
    }
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const blocks = [];
  for (const selector of [...hud, pausePanel]) for (const element of document.querySelectorAll(selector)) {
    if (!shown(element)) continue;
    const label = selector.includes('[data-control]') ? `control:${element.dataset.control}` : selector;
    blocks.push({ label, element, rect: element.getBoundingClientRect() });
  }
  const found = [];
  for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
    const a = blocks[i], b = blocks[j];
    if (a.element.contains(b.element) || b.element.contains(a.element)) continue;
    const panel = [a.label, b.label].includes(pausePanel);
    if (panel && !pauseClearOf.includes(a.label === pausePanel ? b.label : a.label)) continue;
    const gapX = Math.max(a.rect.left, b.rect.left) - Math.min(a.rect.right, b.rect.right);
    const gapY = Math.max(a.rect.top, b.rect.top) - Math.min(a.rect.bottom, b.rect.bottom);
    const gap = Math.max(gapX, gapY);
    if (gap < minGap) found.push(`${a.label} × ${b.label} (${gap < 0 ? 'overlap' : `gap ${gap.toFixed(1)}px`})`);
  }
  return found;
}

const test = gameplayTest.extend({
  // An object, not a bare array: test.use() would read an array as a [value, options] fixture tuple.
  fold: [null, { option: true }],
  // Runs before gameplayPage navigates, so locale, HUD mode and fold segments apply on first paint.
  page: async ({ page, fold }, use) => {
    await page.addInitScript(segments => {
      if (segments) Object.defineProperty(window, 'getWindowSegments', { configurable: true, value: () => segments });
      const pending = sessionStorage.getItem('hud-overlap-setup');
      if (pending) {
        const { locale, hud } = JSON.parse(pending);
        localStorage.setItem('skyline-rush-locale', locale);
        localStorage.setItem('skyline-rush-hud-mode', hud);
      }
    }, fold?.segments ?? null);
    await use(page);
  },
});

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height }, hasTouch: viewport.touch, fold: viewport.segments ? { segments: viewport.segments } : null });

    test('in-race HUD blocks never overlap or touch, racing and paused, en/zh-TW, hybrid/competitive', async ({ gameplayPage: page }) => {
      test.setTimeout(ciTimeout(240_000));
      const failures = [];
      for (const locale of ['en', 'zh-TW']) for (const hud of ['hybrid', 'competitive']) {
        await page.evaluate(setup => sessionStorage.setItem('hud-overlap-setup', JSON.stringify(setup)), { locale, hud });
        await page.reload();
        if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await page.locator('#start-button').click();
        if (viewport.segments) await expect(page.locator('#touch-controls')).toHaveAttribute('data-fold-axis', /vertical|horizontal/);
        await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(20_000) }).toBe('racing');
        // A NITRO activation raises the event callout, the transient overlay most likely to land on other blocks.
        await page.evaluate(() => Object.assign(window.gameplay.race.player, { x: 0, speed: 80, nitroTime: 4 }));
        await expect(page.locator('#event-callout')).toBeVisible({ timeout: ciTimeout(5_000) });
        const args = { hud: HUD, pausePanel: PAUSE_PANEL, pauseClearOf: PAUSE_CLEAR_OF, minGap: MIN_GAP };
        for (const pair of await page.evaluate(collisions, args)) failures.push(`${locale}/${hud}/racing: ${pair}`);
        // A vehicle hit's report: the same record game.js writes in its collision handler.
        await page.evaluate(() => {
          const { race } = window.gameplay, car = race.player;
          car.impact = { kind: 'vehicle', intensity: 1, side: 1, speedLost: 8, x: car.x, altitude: 0, distance: car.distance, time: race.elapsed };
        });
        await expect(page.locator('#impact-report')).toBeVisible({ timeout: ciTimeout(5_000) });
        for (const pair of await page.evaluate(collisions, args)) failures.push(`${locale}/${hud}/impact: ${pair}`);
        await page.locator('#pause-button').click();
        await expect(page.locator(PAUSE_PANEL)).toBeVisible();
        for (const pair of await page.evaluate(collisions, args)) failures.push(`${locale}/${hud}/paused: ${pair}`);
      }
      expect(failures).toEqual([]);
    });
  });
}
