import { expect } from './test.js';

// Home layout sizes shared by tests/responsive-browser.spec.js and its in-page-resize equivalence proof.
// [width, height, hasTouch]
export const START_LAYOUT_SIZES = [
  [320, 568, true], [390, 844, true], [568, 320, true], [844, 390, true],
  [768, 1024, true], [768, 600, true], [761, 501, false], [760, 501, true],
  [1024, 768, true], [900, 600, false],
  [1280, 720, false], [1440, 900, false], [1804, 504, false], [2560, 1440, false],
];

// The airflow flow ends by starting the race from the first >= 900 px size, so that size is last in its class
// (a started race cannot return to Home without a reload). hasTouch is fixed per browser context.
export const AIRFLOW_START_CLASSES = [
  // Turning AIRFLOW on at a phone width and then widening the page places Start differently from a fresh boot at the wide
  // size (equivalence dump: 108-338 px apart), so the phone and the tablet widths boot separately.
  { hasTouch: true, sizes: [[320, 568], [390, 844], [568, 320], [844, 390]] },
  { hasTouch: true, sizes: [[760, 501], [768, 600], [768, 1024], [1024, 768]] },
  { hasTouch: false, sizes: [[761, 501], [900, 600]] },
  { hasTouch: false, sizes: [[1280, 720]] },
  { hasTouch: false, sizes: [[1440, 900]] },
  { hasTouch: false, sizes: [[1804, 504]] },
  { hasTouch: false, sizes: [[2560, 1440]] },
];
{
  const covered = AIRFLOW_START_CLASSES.flatMap(({ hasTouch, sizes }) => sizes.map(([w, h]) => `${w}x${h}/${hasTouch}`)).sort();
  const wanted = START_LAYOUT_SIZES.map(([w, h, touch]) => `${w}x${h}/${touch}`).sort();
  if (JSON.stringify(covered) !== JSON.stringify(wanted)) throw new Error('AIRFLOW_START_CLASSES must cover START_LAYOUT_SIZES exactly once');
  for (const { sizes } of AIRFLOW_START_CLASSES) {
    if (sizes.slice(0, -1).some(([w]) => w >= 900)) throw new Error('a >= 900 px airflow size starts the race, so it must be last in its class');
  }
}

const AIRFLOW_PANELS = ['.airflow-hud', '.aero-tools', '.bottomline'];
export async function readAirflowStart(page) {
  // Judge the settled layout: the AIRFLOW panels slide in, and a read mid-slide differs from a read after a resize.
  await page.evaluate(() => Promise.all(document.getAnimations().filter(a => a.effect?.getComputedTiming().iterations !== Infinity).map(a => a.finished)));
  const start = await page.locator('#start-button').boundingBox();
  const panels = [];
  for (const selector of AIRFLOW_PANELS) {
    const panel = page.locator(selector);
    if (!await panel.isVisible()) continue;
    panels.push([selector, await panel.boundingBox()]);
  }
  return { start, panels };
}

export function expectAirflowStartClear({ start, panels }, width, height) {
  const tag = `${width}x${height}`;
  expect(start.x, `${tag} Start off the left edge`).toBeGreaterThanOrEqual(0);
  expect(start.x + start.width, `${tag} Start off the right edge`).toBeLessThanOrEqual(width);
  expect(start.y + start.height, `${tag} Start below the screen`).toBeLessThanOrEqual(height);
  for (const [selector, box] of panels) {
    expect(start.x + start.width <= box.x || box.x + box.width <= start.x ||
      start.y + start.height <= box.y || box.y + box.height <= start.y, `${tag} Start overlaps ${selector}`).toBe(true);
  }
}
