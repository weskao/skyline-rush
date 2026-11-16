import { expect } from './test.js';
import { CATALOGS } from '../../src/i18n.ts';

// Race HUD matrix shared by tests/responsive-browser.spec.js and its in-page-resize equivalence proof.
// Device insets: iPhone landscape keeps a home-indicator inset below the page, a notch or Android 15's bars a top one.
const NOTCH = { top: 47, bottom: 34, left: 0, right: 0 };
const ANDROID_15_BUTTONS = { top: 48, bottom: 48, left: 0, right: 0 };
const LANDSCAPE_ISLAND = { left: 62, right: 62, top: 0, bottom: 21 };
// [width, height, insets]; touch/mobile contexts cannot be mixed with the desktop one inside a single page.
const TOUCH_SIZES = [[844, 390, { left: 47, right: 47, top: 0, bottom: 21 }], [874, 339, LANDSCAPE_ISLAND],
  // Landscape phones under 761px wide (Android Chrome with its bars, Safari with toolbars) once got the portrait phone HUD.
  [740, 360], [750, 342], [780, 360], [814, 380], [480, 1040], [658, 320], [640, 360], [1024, 768], [820, 1180],
  [390, 844, NOTCH], [412, 892, ANDROID_15_BUTTONS], [375, 667], [360, 780], [320, 568]];
// zh-TW runs the tight viewports only: its CJK font stack widens HUD text (the place-change arrow once did), the roomy ones add no signal.
const ZH_TW_HUD_SIZES = ['844x390', '780x360', '874x339', '750x342', '1024x768', '390x844', '375x667', '320x568'];
// One booted page per class, split so no test passes ~150 estimated CI seconds. The first size of a class is the fresh boot.
export const RACE_HUD_CLASSES = [
  { name: 'touch phones and tablets A', locale: 'en-US', hasTouch: true, sizes: TOUCH_SIZES.slice(0, 8) },
  { name: 'touch phones and tablets B', locale: 'en-US', hasTouch: true, sizes: TOUCH_SIZES.slice(8) },
  { name: 'desktop', locale: 'en-US', hasTouch: false, sizes: [[1440, 900]] },
  { name: 'touch phones and tablets zh-TW', locale: 'zh-TW', hasTouch: true,
    sizes: ZH_TW_HUD_SIZES.map(size => TOUCH_SIZES.find(([w, h]) => `${w}x${h}` === size)) },
];

// AIRFLOW on: its telemetry panel once covered the speed readout on phones (375x667 Android report).
export async function bootAirflowRace(page, context, locale, insets) {
  if (insets) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets });
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.keyboard.press('v');
  await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await expect(page.locator('#race-status')).toHaveText(CATALOGS[locale === 'zh-TW' ? 'zh-TW' : 'en']['phase.racing']);
  await expect(page.locator('#countdown')).toBeHidden();
  // The live map only steps aside on short screens with no free HUD slot.
  await expect(page.locator('.race-route-map')).toBeVisible();
}

const BLOCKS = ['.position-stat', '.leaderboard', '.race-route-map', '.race-progress', '.mode-indicator', '.speedometer',
  '.flight-telemetry', '.aero-tools', '.airflow-hud', '.brand', '#controls-button', '#pause-button',
  // .touch-pad is left out: it is the invisible slide zone the pointer-transparent HUD sits on.
  ...['fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];

// One synchronous evaluate with the place-change arrow forced on: it widens POSITION for a moment,
// and sampling it by luck made this test flaky.
export const readHudBoxes = page => page.evaluate(selectors => {
  const arrow = document.querySelector('#position-change');
  const [hidden, text] = [arrow.hidden, arrow.textContent];
  Object.assign(arrow, { hidden: false, textContent: '↓' });
  const rects = selectors.flatMap(selector => {
    const el = document.querySelector(selector);
    if (!el || !el.checkVisibility({ opacityProperty: true })) return [];
    const { x, y, width, height } = el.getBoundingClientRect();
    return [[selector, { x, y, width, height }]];
  });
  Object.assign(arrow, { hidden, textContent: text });
  return rects;
}, BLOCKS);

const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
export function expectHudBlocksApart(boxes, width, height) {
  const tag = `${width}x${height}`;
  const overlaps = boxes.flatMap(([name, box], i) => boxes.slice(i + 1).filter(([, other]) => !apart(box, other)).map(([other]) => `${name} × ${other}`));
  expect(overlaps, `${tag} HUD blocks overlap`).toEqual([]);
  for (const [name, box] of boxes) {
    expect(box.y + box.height, `${tag} ${name} below the screen`).toBeLessThanOrEqual(height);
    expect(box.x, `${tag} ${name} off the left edge`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${tag} ${name} off the right edge`).toBeLessThanOrEqual(width);
  }
}
