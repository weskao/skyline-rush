import { toggleSettingsSection } from './helpers/settings-browser.js';
import { test, expect, gotoHome, settled } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';

// With AUTO on the game holds the throttle (main.js), so GAS does nothing: it hides and NITRO widens over the
// top row. BOOST and FLY keep their rects so one thumb still slides across them.
const SIZES = [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 743, height: 340 }];
const CONTROLS = ['nitro', 'throttle', 'boost', 'fly'];

const start = async page => {
  await gotoHome(page);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await expect(page.locator('#touch-controls')).toBeVisible();
};
const auto = (page, on) => expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', String(on));
const toggleAuto = async (page, on) => {
  await page.keyboard.press('F2');
  await auto(page, on);
};
// Same path as the Controls panel: the radio's input event reaches setupTouchControlsUI.
const setPrefs = (page, prefs) => page.evaluate(values => {
  for (const [key, value] of Object.entries(values)) {
    const input = document.querySelector(`input[data-controls="${key}"][value="${value}"]`);
    input.checked = true;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}, prefs);
const snapshot = page => page.evaluate(controls => {
  const read = action => {
    const element = document.querySelector(`#touch-controls [data-control="${action}"]`);
    const { x, y, width, height } = element.getBoundingClientRect();
    const rect = { x, y, width, height };
    const centre = document.elementFromPoint(x + width / 2, y + height / 2);
    return { rect, visibility: getComputedStyle(element).visibility, hit: element.contains(centre),
      flame: getComputedStyle(element.querySelector('.sprint-ready-effect') ?? element, '::before').width };
  };
  return Object.fromEntries(controls.map(action => [action, read(action)]));
}, CONTROLS);
// Button width/height transition when the size changes: read only after every transition has finished
// (the flame's infinite animation never does, so only finite animations count).
const settledSnapshot = async page => {
  await page.evaluate(() => Promise.all(document.getAnimations()
    .filter(animation => animation.effect.getComputedTiming().endTime !== Infinity).map(animation => animation.finished.catch(() => {}))));
  return snapshot(page);
};
const near = (actual, expected, label) => {
  for (const key of ['x', 'y', 'width', 'height']) expect(actual[key], `${label} ${key}`).toBeCloseTo(expected[key], 0);
};

test.describe('GAS hides while AUTO is on', () => {
  test.use({ hasTouch: true, isMobile: true });

  for (const size of SIZES) {
    test(`NITRO spans the top row and BOOST/FLY stay put at ${size.width}x${size.height}`, async ({ page }) => {
      test.setTimeout(ciTimeout(90000));
      await page.setViewportSize(size);
      await start(page);
      await auto(page, true);
      for (const mode of ['buttons', 'slide']) for (const hand of ['right', 'left']) for (const scale of ['S', 'M', 'L']) {
        const tag = `${mode}/${hand}/${scale}`;
        await setPrefs(page, { mode, hand, size: scale });
        await toggleAuto(page, false);
        const off = await settledSnapshot(page);
        await toggleAuto(page, true);
        const on = await settledSnapshot(page);
        expect(on.throttle.visibility, `${tag} GAS hidden`).toBe('hidden');
        expect(on.throttle.hit, `${tag} GAS takes no touch`).toBe(false);
        expect(off.throttle.visibility, `${tag} GAS shown with AUTO off`).toBe('visible');
        near(on.boost.rect, off.boost.rect, `${tag} BOOST`);
        near(on.fly.rect, off.fly.rect, `${tag} FLY`);
        const row = { x: Math.min(off.nitro.rect.x, off.throttle.rect.x), right: Math.max(off.nitro.rect.x + off.nitro.rect.width, off.throttle.rect.x + off.throttle.rect.width) };
        near(on.nitro.rect, { x: row.x, y: off.nitro.rect.y, width: row.right - row.x, height: off.nitro.rect.height }, `${tag} NITRO`);
        expect(on.nitro.hit, `${tag} NITRO takes the touch`).toBe(true);
        // The flame keeps one button's proportions: its box does not stretch with the wide button.
        expect(parseFloat(on.nitro.flame), `${tag} NITRO flame width`).toBeCloseTo(parseFloat(off.nitro.flame), 0);
      }
    });
  }

  test('AUTO off keeps the original 2x2 and GAS accelerates', async ({ page, context }) => {
    test.setTimeout(ciTimeout(90000));
    await start(page);
    await setPrefs(page, { mode: 'buttons' });
    await toggleAuto(page, false);
    const { nitro, throttle, boost, fly } = await settledSnapshot(page);
    for (const button of [nitro, throttle, boost, fly]) expect(button.rect.width).toBeCloseTo(nitro.rect.width, 0);
    near({ ...nitro.rect, x: 0, width: 0 }, { ...throttle.rect, x: 0, width: 0 }, 'NITRO and GAS share the top row');
    expect(throttle.hit).toBe(true);
    const session = await context.newCDPSession(page);
    const gas = page.locator('[data-control="throttle"]');
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: throttle.rect.x + throttle.rect.width / 2, y: throttle.rect.y + throttle.rect.height / 2 }] });
    await expect(gas).toHaveClass(/is-held/);
    await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(30);
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(gas).not.toHaveClass(/is-held/);
  });

  test('a GAS finger held while AUTO turns on leaves no throttle after AUTO turns off', async ({ page, context }) => {
    test.setTimeout(ciTimeout(90000));
    await start(page);
    await setPrefs(page, { mode: 'buttons' });
    await toggleAuto(page, false);
    const { throttle } = await settledSnapshot(page);
    const gas = page.locator('[data-control="throttle"]');
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: throttle.rect.x + throttle.rect.width / 2, y: throttle.rect.y + throttle.rect.height / 2 }] });
    await expect(gas).toHaveClass(/is-held/);
    await toggleAuto(page, true);
    await expect(gas).toHaveCSS('visibility', 'hidden');
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await toggleAuto(page, false);
    await expect(gas).not.toHaveClass(/is-held/);
    await expect(gas).toHaveAttribute('aria-pressed', 'false');
  });

  test('a dragged NITRO keeps its place and width; toggling AUTO moves nothing custom', async ({ page }) => {
    test.setTimeout(ciTimeout(90000));
    await page.addInitScript(() => localStorage.setItem('skyline-rush-controls-layout-v2', JSON.stringify({
      version: 3, portrait: { nitro: { x: 0.6, y: 0.5 } }, landscape: {},
    })));
    await page.setViewportSize({ width: 390, height: 844 });
    await start(page);
    await setPrefs(page, { mode: 'buttons' });
    await toggleAuto(page, false);
    const off = await settledSnapshot(page);
    await toggleAuto(page, true);
    const on = await settledSnapshot(page);
    expect(await page.locator('[data-control="nitro"]').evaluate(element => element.classList.contains('is-positioned'))).toBe(true);
    near(on.nitro.rect, off.nitro.rect, 'positioned NITRO');
    near(on.boost.rect, off.boost.rect, 'BOOST');
    near(on.fly.rect, off.fly.rect, 'FLY');
  });

  test('layout editing shows GAS and the 2x2 even with AUTO on', async ({ page }) => {
    test.setTimeout(ciTimeout(90000));
    await start(page);
    await setPrefs(page, { mode: 'buttons' });
    await toggleAuto(page, false);
    const off = await settledSnapshot(page);
    await toggleAuto(page, true);
    await page.locator('#pause-button').click();
    await settled(page.locator('.overlay-content'));
    await toggleSettingsSection(page, 'driving');
    await page.locator('#layout-edit').click();
    await expect(page.locator('body')).toHaveClass(/layout-editing/);
    const editing = await settledSnapshot(page);
    expect(editing.throttle.visibility).toBe('visible');
    near(editing.nitro.rect, off.nitro.rect, 'NITRO while editing');
    near(editing.throttle.rect, off.throttle.rect, 'GAS while editing');
  });

  // Lesson 1 is an AUTO lesson: with AUTO on its touch copy never names GAS, so GAS hides there as in a race.
  test('the tutorial follows AUTO: GAS hidden and NITRO wide when on, the 2x2 when off', async ({ page }) => {
    test.setTimeout(ciTimeout(90000));
    await page.setViewportSize({ width: 390, height: 844 });
    await gotoHome(page);
    await toggleSettingsSection(page, 'driving');
    await page.locator('#tutorial-open').click();
    await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle', { timeout: ciTimeout(15000) });
    await expect(page.locator('body')).toHaveAttribute('data-tutorial', 'active');
    await auto(page, true);
    const on = await settledSnapshot(page);
    expect(on.throttle.visibility, 'tutorial GAS hidden with AUTO on').toBe('hidden');
    expect(on.throttle.hit, 'tutorial GAS takes no touch').toBe(false);
    expect(on.nitro.hit, 'tutorial NITRO takes the touch').toBe(true);
    await toggleAuto(page, false);
    const off = await settledSnapshot(page);
    expect(off.throttle.visibility, 'tutorial GAS shown with AUTO off').toBe('visible');
    expect(off.throttle.hit, 'tutorial GAS takes the touch with AUTO off').toBe(true);
    expect(off.nitro.rect.width, 'tutorial NITRO is one cell with AUTO off').toBeCloseTo(off.boost.rect.width, 0);
    const row = { x: Math.min(off.nitro.rect.x, off.throttle.rect.x), right: Math.max(off.nitro.rect.x + off.nitro.rect.width, off.throttle.rect.x + off.throttle.rect.width) };
    near(on.nitro.rect, { x: row.x, y: off.nitro.rect.y, width: row.right - row.x, height: off.nitro.rect.height }, 'tutorial NITRO spans the top row');
  });
});
