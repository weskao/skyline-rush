import { test, expect } from './helpers/test.js';
import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// The live map is the race's progress readout: its orange trail is the bar and its caption carries the distance, so no
// separate progress strip sits on the road view. On touch short landscape it takes the top-right corner like desktop and
// portrait, the toolbar shifts left by its width and AIRFLOW/VFX join that row. Rules: src/style.css "Touch short landscape".
const LANDSCAPE = [
  { width: 844, height: 390 }, { width: 740, height: 360 }, { width: 640, height: 360 },
  { width: 874, height: 339 },
]; // Chromium cannot emulate env(safe-area-inset-*): the notch insets (map and toolbar both use max(12px, inset)) need a device.
const CLEAR = ['.brand', '.toolbar', '.aero-tools', '.flight-telemetry', '.mode-indicator', '.position-stat', '.leaderboard'];

const boxes = (page, selectors) => page.evaluate(list => Object.fromEntries(list.map(selector => {
  const el = document.querySelector(selector);
  if (!el || !el.checkVisibility({ visibilityProperty: true })) return [selector, null];
  const { left, top, right, bottom } = el.getBoundingClientRect();
  return [selector, { left, top, right, bottom }];
})), selectors);
const overlaps = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

async function startRace(page, { navigate = true } = {}) {
  if (navigate) {
    await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
    await page.goto('/');
  }
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
}

async function expectCaptionInMap(page) {
  await expect(page.locator('#progress-fill')).toHaveCount(0);
  await expect(page.locator('#race-route-map .route-travelled')).toHaveCount(1);
  await expect(page.locator('#race-status')).toBeHidden(); // the phase word shows only outside racing
  await expect(page.locator('#distance')).toBeVisible();
  const { map, caption } = await page.evaluate(() => ({
    map: document.querySelector('#race-route-map').getBoundingClientRect().toJSON(),
    caption: document.querySelector('#race-route-map > .progress-bar').getBoundingClientRect().toJSON(),
  }));
  expect(caption.left).toBeGreaterThanOrEqual(map.left);
  expect(caption.right).toBeLessThanOrEqual(map.right);
  expect(caption.bottom).toBeLessThanOrEqual(map.bottom + 0.5);
  // The text itself (not just its box) must fit: the map clips overflow, which cut "2.81" to ".81" on a 59px portrait map.
  const text = await page.evaluate(() => {
    const range = document.createRange();
    range.selectNodeContents(document.querySelector('#distance').parentElement);
    return range.getBoundingClientRect().toJSON();
  });
  expect(text.left).toBeGreaterThanOrEqual(map.left + 1);
  expect(text.right).toBeLessThanOrEqual(map.right - 1);
}

for (const locale of ['en', 'zh-TW']) {
  for (const { width, height } of LANDSCAPE) {
    test.describe(`${locale} ${width}x${height}`, () => {
      test.use({ viewport: { width, height }, hasTouch: true, isMobile: true, locale });

      test('the live map holds the top-right corner and the top row stays clear', async ({ page }) => {
        await startRace(page);
        await expectCaptionInMap(page);
        const box = await boxes(page, ['.race-route-map', ...CLEAR]);
        const map = box['.race-route-map'];
        expect(map, 'map visible').not.toBeNull();
        expect(map.top).toBeLessThanOrEqual(20);
        expect(Math.abs(width - 12 - map.right)).toBeLessThanOrEqual(1);
        // AIRFLOW/VFX sit on the toolbar's row, left of it.
        expect(Math.abs(box['.aero-tools'].top - box['.toolbar'].top)).toBeLessThanOrEqual(8);
        expect(box['.aero-tools'].right).toBeLessThanOrEqual(box['.toolbar'].left);
        const hits = [];
        for (const [i, a] of CLEAR.entries()) for (const b of ['.race-route-map', ...CLEAR.slice(i + 1)])
          if (box[a] && box[b] && overlaps(box[a], box[b])) hits.push(`${a} x ${b}`);
        expect(hits).toEqual([]);

        // Pause adds the language picker to AIRFLOW/VFX; the group drops under the toolbar and still clears the map.
        await page.locator('#pause-button').click();
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
        await expect(page.locator('#race-status')).toBeVisible();
        const paused = await boxes(page, ['.race-route-map', '.brand', '.toolbar', '.aero-tools']);
        const pausedHits = [];
        for (const a of ['.brand', '.toolbar', '.race-route-map'])
          if (paused[a] && overlaps(paused[a], paused['.aero-tools'])) pausedHits.push(`${a} x .aero-tools`);
        expect(pausedHits).toEqual([]);
      });
    });
  }
}

// Every other layout keeps the map in the top-right corner too, right under the toolbar row (and AIRFLOW/VFX where they
// share it), right-aligned with the toolbar; the leaderboard yields and joins POSITION on the left, as in short landscape.
// Short portrait (501-760px tall) used to park the map in the bottom row and desktop/tablet ~300px down. Rules: src/style.css
// "Live map: top-right corner".
const CORNER = [
  { width: 1440, height: 900, touch: false }, { width: 1280, height: 720, touch: false }, { width: 1024, height: 480, touch: false },
  { width: 1024, height: 768, touch: true }, { width: 820, height: 1180, touch: true }, { width: 884, height: 1104, touch: true },
  { width: 1104, height: 884, touch: true }, { width: 390, height: 844, touch: true }, { width: 430, height: 932, touch: true },
  { width: 344, height: 882, touch: true }, { width: 375, height: 667, touch: true }, { width: 320, height: 568, touch: true },
];
const CORNER_CLEAR = ['.toolbar', '.aero-tools', '.position-stat', '.leaderboard', '.mode-indicator', '.flight-telemetry', '.telemetry', '#touch-controls'];
for (const { width, height, touch } of CORNER) {
  test.describe(`corner ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });

    test('the live map sits top-right under the toolbar row in both HUD modes', async ({ page }) => {
      for (const hud of ['hybrid', 'competitive']) {
        await page.addInitScript(mode => localStorage.setItem('skyline-rush-hud-mode', mode), hud);
        await startRace(page);
        const box = await boxes(page, ['.race-route-map', ...CORNER_CLEAR]);
        const map = box['.race-route-map'];
        expect(map, `${hud}: map visible`).not.toBeNull();
        const toolbar = box['.toolbar'];
        // AIRFLOW/VFX belong to the top row when they sit right under the toolbar (tablets drop them below POSITION).
        const aero = box['.aero-tools'];
        const rowBottom = Math.max(toolbar.bottom, aero && aero.top < toolbar.bottom + 30 ? aero.bottom : 0);
        // The toolbar overruns its 12px margin on a 320px phone (ends 5px from the edge); the map keeps the 12px.
        expect(Math.abs(map.right - Math.min(toolbar.right, width - 12)), `${hud}: right-aligned with the toolbar`).toBeLessThanOrEqual(1);
        expect(map.top - rowBottom, `${hud}: right under the toolbar row`).toBeGreaterThanOrEqual(2);
        expect(map.top - rowBottom, `${hud}: right under the toolbar row`).toBeLessThanOrEqual(12);
        const hits = CORNER_CLEAR.filter(selector => box[selector] && overlaps(map, box[selector]));
        expect(hits, `${hud}: map overlaps`).toEqual([]);
        if (box['.leaderboard']) expect(box['.leaderboard'].right, `${hud}: leaderboard left of the map`).toBeLessThan(map.left);
      }
    });
  });
}

// zh-TW lifts the caption to 10px (Han strokes blur below it), the width that overflowed the 59px portrait map.
for (const locale of ['en', 'zh-TW']) for (const { width, height, touch } of [{ width: 390, height: 844, touch: true }, { width: 1440, height: 900, touch: false }]) {
  gameplayTest.describe(`${locale} ${width}x${height}`, () => {
    gameplayTest.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch, locale });

    gameplayTest('the distance caption lives inside the map and the trail grows with the race', async ({ gameplayPage: page }) => {
      await startRace(page, { navigate: false });
      await page.evaluate(() => { const race = window.gameplay.race; race.player.distance = race.length * 0.56; }); // widest digits
      await expectCaptionInMap(page);
      const map = (await boxes(page, ['.race-route-map']))['.race-route-map'];
      expect(map.top).toBeLessThan(height / 2); // upper right, as before
      expect(map.right).toBeGreaterThan(width - 60);
      const trail = () => page.locator('#race-route-map .route-travelled').getAttribute('points').then(points => points.trim().split(/\s+/).length);
      const start = await trail();
      await page.evaluate(() => { window.gameplay.race.player.distance = window.gameplay.race.length * 0.9; }); // +34% of 200 trail samples
      await expect.poll(trail).toBeGreaterThan(start + 50);
    });
  });
}
