import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Real bounding boxes of every top-level in-race HUD block must never intersect or touch (gap >= 2 CSS px),
// while racing with an event callout up, then with a collision report up, and while paused, in both HUD modes and
// both locales. The callout and the collision report never show together (callouts wait out the report).
// The fold sizes inject the Viewport Segments API exactly as tests/foldable-layout-browser.spec.js does.
const MIN_GAP = 2;
const COMPACT_HEIGHT = 44;
const LEADERBOARD_PHONE_HEIGHT = 50;
const HUD = ['.brand', '.route-heading', '.toolbar', '.aero-tools', '.airflow-hud', '.race-progress', '.progress-bar', '.mode-indicator',
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

/**
 * Runs in the page as one synchronous snapshot (no frame can run inside it): names every intersecting or touching pair of
 * visible, non-nested HUD blocks. `keep` lists transient overlays the game just raised (asserted visible beforehand): a slow
 * CI frame rate can end their ~1.4s life before this runs, so the same element with its real content is shown for the
 * snapshot and its hidden state restored afterwards. One that still cannot be measured is a failure, never a silent pass.
 * `clearOf` maps a selector to a rectangle (CSS px) it must not intersect.
 */
function collisions({ hud, pausePanel, pauseClearOf, minGap, keep = [], clearOf = {} }) {
  const restore = keep.map(selector => {
    const element = document.querySelector(selector);
    const wasHidden = element?.hidden;
    if (element) element.hidden = false;
    return () => { if (element) element.hidden = wasHidden; };
  });
  // Re-run the road-safe placement (src/race-feedback-placement.ts listens to resize) as the game does for each new callout.
  if (keep.length) dispatchEvent(new Event('resize'));
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
  for (const selector of keep) if (!blocks.some(block => block.label === selector)) found.push(`${selector} could not be measured`);
  for (const [selector, area] of Object.entries(clearOf)) {
    const block = blocks.find(candidate => candidate.label === selector);
    if (block && block.rect.left < area.right && block.rect.right > area.left && block.rect.top < area.bottom && block.rect.bottom > area.top)
      found.push(`${selector} covers the road view (${['left', 'top', 'right', 'bottom'].map(side => block.rect[side].toFixed(0)).join(',')})`);
  }
  restore.forEach(undo => undo());
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
        // Polled every frame: a callout lives ~0.85s of race time, shorter than the default poll interval on a slow runner.
        await page.waitForFunction(() => !document.querySelector('#event-callout').hidden, null, { polling: 'raf', timeout: ciTimeout(5_000) });
        const args = { hud: HUD, pausePanel: PAUSE_PANEL, pauseClearOf: PAUSE_CLEAR_OF, minGap: MIN_GAP };
        // The callout stays off the road view: the same centre rectangle pickPeripheralSlot (src/race-feedback-placement.ts) avoids.
        const road = { left: viewport.width * 0.325, right: viewport.width * 0.675, top: viewport.height * 0.2, bottom: viewport.height * 0.72 };
        // The progress bar (.progress-bar; mode rows stay in .race-progress) and ROAD/FLIGHT mode chip dock at the edges too (persistent blocks must never sit on the road view).
        // Phones show only the three nearby leaderboard rows, docked beside POSITION off the road view; desktop and tablet keep all eight.
        const phone = viewport.touch && (viewport.width <= 760 || viewport.height <= 500);
        const calloutArgs = { ...args, keep: ['.event-callout'], clearOf: { '.event-callout': road, '.progress-bar': road, '.mode-indicator': road, ...(phone ? { '.leaderboard': road } : {}) } };
        for (const pair of await page.evaluate(collisions, calloutArgs)) failures.push(`${locale}/${hud}/racing: ${pair}`);
        // Compact, not a panel: the slim progress bar and the one-line mode chip each stay at most COMPACT_HEIGHT px tall.
        for (const [selector, height] of await page.evaluate(selectors => selectors.map(selector => {
          const element = document.querySelector(selector);
          return [selector, element && element.getClientRects().length ? element.getBoundingClientRect().height : Infinity];
        }), ['.progress-bar', '.mode-indicator'])) if (!(height <= COMPACT_HEIGHT)) failures.push(`${locale}/${hud}/racing: ${selector} ${height.toFixed(0)}px tall`);
        const board = await page.evaluate(() => {
          const element = document.querySelector('.leaderboard');
          if (!element.getClientRects().length || getComputedStyle(element).visibility === 'hidden') return null;
          const rows = [...element.querySelectorAll('.racer')].filter(row => row.getClientRects().length);
          return { height: element.getBoundingClientRect().height, rows: rows.length, player: rows.some(row => row.classList.contains('is-player')) };
        });
        if (board && phone && !(board.height <= LEADERBOARD_PHONE_HEIGHT && board.rows === 3 && board.player))
          failures.push(`${locale}/${hud}/racing: phone leaderboard ${board.height.toFixed(0)}px tall, ${board.rows} rows, player ${board.player}`);
        if (board && !phone && board.rows !== 8) failures.push(`${locale}/${hud}/racing: leaderboard shows ${board.rows} of 8 rows`);
        // A vehicle hit's report: the same record game.js writes in its collision handler.
        await page.evaluate(() => {
          const { race } = window.gameplay, car = race.player;
          car.impact = { kind: 'vehicle', intensity: 1, side: 1, speedLost: 8, x: car.x, altitude: 0, distance: car.distance, time: race.elapsed };
        });
        await expect(page.locator('#impact-report')).not.toHaveAttribute('hidden', '', { timeout: ciTimeout(5_000) });
        // The collision chip docks at an edge like the callout, never centred over the road. Only a short landscape, whose edges
        // are all HUD, may have it yield (style.visibility hidden); the red collision vignette and speed readout still show the hit.
        const yielded = await page.locator('#impact-report').evaluate(element => element.style.visibility === 'hidden');
        if (yielded && viewport.height > 500) failures.push(`${locale}/${hud}/impact: chip yielded on a ${viewport.width}x${viewport.height} screen`);
        for (const pair of await page.evaluate(collisions, { ...args, keep: yielded ? [] : ['.impact-report'], clearOf: { '.impact-report': road } })) failures.push(`${locale}/${hud}/impact: ${pair}`);
        await page.locator('#pause-button').click();
        await expect(page.locator(PAUSE_PANEL)).toBeVisible();
        for (const pair of await page.evaluate(collisions, args)) failures.push(`${locale}/${hud}/paused: ${pair}`);
      }
      expect(failures).toEqual([]);
    });
  });
}

test.describe('callout raised during GO! 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  // The telemetry stays visibility:hidden while the countdown's GO! is up (0.8s into racing); a NITRO chip placed then must
  // move off it as soon as the countdown hides, not stay on it for the rest of its life. Driven in one synchronous snapshot
  // (no frame runs inside it) because GO! and a callout last about as long as each other.
  test('the callout moves clear of the telemetry when the countdown hides', async ({ gameplayPage: page }) => {
    await page.locator('#start-button').click();
    await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(20_000) }).toBe('racing');
    await expect(page.locator('#countdown')).toBeHidden();
    const result = await page.evaluate(async () => {
      const countdown = document.querySelector('#countdown'), callout = document.querySelector('#event-callout');
      const telemetry = document.querySelector('.flight-telemetry'), report = callout.querySelector('#action-report');
      const overlaps = () => { const a = callout.getBoundingClientRect(), b = telemetry.getBoundingClientRect();
        return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; };
      countdown.hidden = false;
      callout.querySelectorAll('[id$="-report"]').forEach(other => { other.hidden = true; });
      report.hidden = false;
      report.innerHTML = 'NITRO<span>FULL THROTTLE</span>';
      callout.dataset.kind = 'nitro';
      callout.hidden = false;
      dispatchEvent(new Event('resize')); // placement runs while GO! still hides the telemetry
      await Promise.resolve(); // flush refreshes the resize's own attribute writes queued, so only the countdown can move it next
      const telemetryHidden = getComputedStyle(telemetry).visibility === 'hidden', placedOverTelemetry = overlaps();
      countdown.hidden = true;
      await Promise.resolve(); // MutationObserver callbacks run in this microtask checkpoint, before any frame
      return { telemetryHidden, placedOverTelemetry, overlapsAfterGo: overlaps() };
    });
    // placedOverTelemetry proves the scenario: while hidden, the telemetry's corner is a legal slot.
    expect(result).toEqual({ telemetryHidden: true, placedOverTelemetry: true, overlapsAfterGo: false });
  });
});

// Phones keep the three nearby rows whatever the player's rank: first shows YOU and the two behind, last the two ahead and YOU.
test.describe('phone leaderboard nearby rows 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true });

  test('first and last place keep three rows that include YOU', async ({ gameplayPage: page }) => {
    await page.locator('#start-button').click();
    await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(20_000) }).toBe('racing');
    const rows = () => page.evaluate(() => [...document.querySelectorAll('.leaderboard .racer')]
      .filter(row => row.getClientRects().length).map(row => row.classList.contains('is-player') ? 'YOU' : row.children[0].textContent));
    await page.evaluate(() => { const { race } = window.gameplay; race.player.distance = Math.max(...race.rivals.map(rival => rival.distance)) + 500; });
    await expect.poll(rows).toEqual(['YOU', '2', '3']);
    await page.evaluate(() => { const { race } = window.gameplay; race.player.distance = Math.min(...race.rivals.map(rival => rival.distance)) - 500; });
    await expect.poll(rows).toEqual(['6', '7', 'YOU']);
  });
});

// The Controls panel moves the touch controls (steering mode, hand, size, a custom drag): the leaderboard, progress bar,
// mode chip and collision chip must stay off every visible control and the slide pad afterwards.
const EDGE_HUD = ['.leaderboard', '.progress-bar', '.mode-indicator', '.impact-report'];
for (const { width, height, hud } of [{ width: 844, height: 390, hud: 'hybrid' }, { width: 390, height: 844, hud: 'competitive' }]) {
  test.describe(`touch controls moved by the Controls panel ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true });

    test('edge HUD stays clear of controls after hand, steering, size and layout changes', async ({ gameplayPage: page, context }) => {
      test.setTimeout(ciTimeout(120_000));
      await page.evaluate(setup => sessionStorage.setItem('hud-overlap-setup', JSON.stringify(setup)), { locale: 'en', hud });
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('#start-button').click();
      await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(20_000) }).toBe('racing');
      await expect(page.locator('.leaderboard')).toBeVisible();
      const target = await page.locator('.leaderboard').boundingBox();
      await page.locator('#pause-button').click();
      await page.locator('#controls-button').click();
      await page.locator('[data-controls="mode"][value="buttons"]').check();
      await page.locator('[data-controls="hand"][value="right"]').check();
      await page.locator('[data-controls="size"][value="L"]').check();
      await page.locator('#layout-edit').click();
      // Drag the action cluster's NITRO button onto the leaderboard's spot.
      const session = await context.newCDPSession(page);
      const nitro = await page.locator('[data-control="nitro"]').boundingBox();
      const touch = (type, points) => session.send('Input.dispatchTouchEvent', { type, touchPoints: points });
      await touch('touchStart', [{ id: 1, x: nitro.x + nitro.width / 2, y: nitro.y + nitro.height / 2 }]);
      await touch('touchMove', [{ id: 1, x: target.x + target.width / 2, y: target.y + target.height / 2 }]);
      await touch('touchEnd', []);
      await page.locator('#layout-done').click();
      await page.keyboard.press('p');
      await expect.poll(() => page.evaluate(() => window.gameplay.race.phase), { timeout: ciTimeout(10_000) }).toBe('racing');
      await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', 'right');
      await expect(page.locator('#touch-controls')).toHaveAttribute('data-size', 'L');
      await page.evaluate(() => {
        const { race } = window.gameplay, car = race.player;
        car.impact = { kind: 'vehicle', intensity: 1, side: 1, speedLost: 8, x: car.x, altitude: 0, distance: car.distance, time: race.elapsed };
      });
      await expect(page.locator('#impact-report')).not.toHaveAttribute('hidden', '', { timeout: ciTimeout(5_000) });
      const yielded = await page.locator('#impact-report').evaluate(element => element.style.visibility === 'hidden');
      const pairs = await page.evaluate(collisions, { hud: [...EDGE_HUD, '#touch-controls [data-control]', '.touch-pad'], pausePanel: PAUSE_PANEL,
        pauseClearOf: PAUSE_CLEAR_OF, minGap: MIN_GAP, keep: yielded ? [] : ['.impact-report'] });
      expect(pairs.filter(pair => EDGE_HUD.some(selector => pair.startsWith(`${selector} ×`) || pair.includes(`× ${selector} `)))).toEqual([]);
    });
  });
}
