import { test, expect } from './helpers/test.js';
import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
const start = async page => {
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
};
const bank = page => page.evaluate(() => parseFloat(document.body.style.getPropertyValue('--flight-bank')));

test('desktop remaps swap conflicts, reject reserved keys, persist and drive AIR DASH live', async ({ page }) => {
  await open(page);
  await page.locator('#controls-button').click();
  await expect(page.getByRole('slider', { name: 'Steering sensitivity', exact: true })).toBeVisible();
  await page.keyboard.down('d');
  await page.locator('[data-rebind="fly"]').click();
  await expect(page.locator('[data-control="right"]')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.up('d');
  await page.keyboard.press('c');
  await expect(page.locator('#keymap-status')).toContainText('reserved');
  await expect(page.locator('#camera-button')).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('f');
  await expect(page.locator('[data-rebind="fly"]')).toContainText('F');
  await page.locator('[data-rebind="left"]').click();
  await page.keyboard.press('d');
  await expect(page.locator('#keymap-status')).toContainText('swapped');
  await page.locator('#keymap-reset').click();
  await expect(page.locator('[data-rebind="left"]')).toContainText('A');
  await page.locator('[data-rebind="fly"]').click();
  await page.keyboard.press('f');
  await page.reload();
  await page.locator('#controls-button').click();
  await expect(page.locator('[data-rebind="fly"]')).toContainText('F');
  await page.locator('#controls-button').click();
  await start(page);
  await page.keyboard.down('w');
  await expect.poll(async () => Number(await page.locator('#speed').textContent())).toBeGreaterThan(70);
  await page.keyboard.down('f');
  await page.keyboard.down('Shift');
  await expect(page.locator('#flight-state')).toHaveText('AIR DASH');
  await page.keyboard.up('f');
  await page.keyboard.up('Shift');
});

test.describe('touch controls', () => {
  test.use({ hasTouch: true, viewport: { width: 844, height: 390 } });
  test('slide steers, classic buttons work, mirror and every editable button persist', async ({ page, context }) => {
    const session = await context.newCDPSession(page);
    const touch = (type, ...touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
    await open(page);
    await start(page);
    await expect(page.locator('[data-control="nitro"]')).toBeVisible();
    const pad = await page.locator('.touch-pad').boundingBox();
    await touch('touchStart', { id: 1, x: pad.x + 40, y: pad.y + 50 });
    await touch('touchMove', { id: 1, x: pad.x + 100, y: pad.y + 50 });
    await expect.poll(() => bank(page)).toBeLessThan(-2);
    await touch('touchEnd');
    await expect.poll(() => bank(page)).toBeGreaterThan(-0.1);
    await page.locator('#pause-button').click();
    await expect(page.locator('#race-status')).toHaveText('PAUSED');
    await page.locator('#controls-button').click();
    await page.locator('[data-controls="mode"][value="buttons"]').check();
    await page.locator('[data-controls="hand"][value="right"]').check();
    await page.locator('#layout-edit').click();
    for (const [index, action] of ['left', 'right', 'brake', 'fly', 'boost', 'nitro', 'throttle'].entries()) {
      const button = page.locator(`[data-control="${action}"]`);
      await expect(button).toBeVisible();
      const rect = await button.boundingBox();
      await touch('touchStart', { id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
      await touch('touchMove', { id: 1, x: 70 + index * 105, y: 210 });
      await touch('touchEnd');
    }
    await page.locator('#layout-done').click();
    await page.locator('#controls-button').click();
    await page.locator('#layout-edit').click();
    await page.keyboard.press('p');
    await expect(page.locator('#layout-toolbar')).toBeHidden();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')));
    expect(Object.keys(saved.layout)).toHaveLength(7);
    await page.reload();
    await start(page);
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', 'right');
    const savedAgain = await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')));
    expect(savedAgain.layout).toEqual(saved.layout);
    for (const [action, point] of Object.entries(saved.layout)) {
      const rect = await page.locator(`[data-control="${action}"]`).boundingBox();
      expect(rect.x + rect.width / 2).toBeCloseTo((1 - point.x) * 844, 0);
      expect(rect.y + rect.height / 2).toBeCloseTo(point.y * 390, 0);
    }
    const right = await page.locator('[data-control="right"]').boundingBox();
    await touch('touchStart', { id: 1, x: right.x + right.width / 2, y: right.y + right.height / 2 });
    await expect.poll(() => bank(page)).toBeLessThan(-2);
    await touch('touchEnd');
    await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuemax', '3');
    await expect(page.locator('.nitro-segment')).toHaveCount(3);
    await page.locator('#pause-button').click();
    await page.locator('#controls-button').click();
    await page.locator('[data-controls="hand"][value="left"]').check();
    await page.locator('#layout-edit').click();
    const mirrored = await page.locator('[data-control="right"]').boundingBox();
    expect(mirrored.x + mirrored.width / 2).toBeCloseTo(saved.layout.right.x * 844, 0);
    await page.locator('#layout-done').click();
    await page.locator('#controls-button').click();
    await page.locator('#layout-reset').click();
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls')).layout)).toEqual({});
  });
  test('edited touch buttons remain inside notched-screen safe areas', async ({ page, context }) => {
    await open(page);
    await start(page);
    await page.locator('#pause-button').click();
    await page.locator('#controls-button').click();
    await page.locator('#layout-edit').click();
    const session = await context.newCDPSession(page);
    await session.send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 59, right: 59, top: 20, bottom: 21 } });
    const button = page.locator('[data-control="nitro"]');
    const drag = async (x, y) => {
      const rect = await button.boundingBox();
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ id: 1, x, y }] });
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      return button.boundingBox();
    };
    const topLeft = await drag(2, 2);
    expect(topLeft.x).toBeGreaterThanOrEqual(67);
    expect(topLeft.y).toBeGreaterThanOrEqual(28);
    const bottomRight = await drag(842, 388);
    expect(bottomRight.x + bottomRight.width).toBeLessThanOrEqual(777);
    expect(bottomRight.y + bottomRight.height).toBeLessThanOrEqual(361);
  });

});

test('earned ring rewards fill the nitro HUD, announce PERFECT LINE and fire once per press', async ({ page }) => {
  test.setTimeout(ciTimeout(90000));
  await open(page);
  await page.locator('#controls-button').click();
  await page.locator('#controls-sensitivity').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#controls-sensitivity')).toHaveValue('0.4');
  await page.locator('#controls-button').click();
  // Snapshot the HUD in-page the moment charge reads 0.5; polling from the test misses the 0.6s refill window on slow CI.
  await page.evaluate(() => {
    const meter = document.querySelector('#nitro-meter');
    const observer = new MutationObserver(() => {
      if (meter.getAttribute('aria-valuenow') !== '0.5') return;
      const bar = meter.querySelector('.nitro-segment i');
      window.halfCharge = { transform: bar.style.transform, refilling: meter.dataset.refilling, color: getComputedStyle(bar).backgroundColor };
      observer.disconnect();
    });
    observer.observe(meter, { attributes: true, attributeFilter: ['aria-valuenow'] });
  });
  await start(page);
  // Drive the real key handlers from the page frame: host round trips miss narrow flight windows under parallel WebGL load.
  const perfectLine = await page.evaluate(budget => new Promise(resolve => {
    let held = false;
    const deadline = performance.now() + budget;
    const key = type => window.dispatchEvent(new KeyboardEvent(type, { code: 'Space', key: ' ', bubbles: true, cancelable: true }));
    const pilot = () => {
      const collected = !document.querySelector('#maneuver-report').hidden;
      if (collected || performance.now() >= deadline || document.body.dataset.phase !== 'racing') {
        key('keyup'); resolve(collected); return;
      }
      const distance = Number(document.querySelector('#distance').textContent) * 1000;
      const altitude = Number(document.querySelector('#altitude').textContent);
      const nextGate = Math.ceil(Math.max(1, distance) / 220) * 220;
      const fly = nextGate <= 1100 && nextGate - distance < 125 && altitude < 8.8;
      if (fly !== held) { key(fly ? 'keydown' : 'keyup'); held = fly; }
      requestAnimationFrame(pilot);
    };
    pilot();
  }), ciTimeout(65000));
  expect(perfectLine, 'The visible first ring group must produce a real PERFECT LINE').toBe(true);
  expect(await page.evaluate(() => window.halfCharge)).toEqual({ transform: 'scaleX(0.5)', refilling: 'true', color: 'rgb(255, 124, 118)' });
  await expect(page.locator('#maneuver-report')).toBeVisible();
  await expect(page.locator('#nitro-status')).toHaveText('NITRO READY');
  await expect(page.locator('.nitro-segment.is-full')).toHaveCount(3);
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'nitro-max');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('#vfx-panel > summary').click();
  await page.locator('[data-vfx="comfortable"]').check();
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'none');
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('#maneuver-report')).toBeHidden();
  await page.keyboard.down('e');
  await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', '2');
  await expect(page.locator('#nitro-status')).toHaveText('NITRO ACTIVE');
  await expect(page.locator('body')).toHaveClass(/nitro-active/);
  await page.waitForTimeout(450);
  await expect(page.locator('#nitro-meter')).toHaveAttribute('aria-valuenow', '2');
  await page.keyboard.up('e');
  await expect(page.locator('body')).not.toHaveClass(/nitro-active/);
});

gameplayTest.describe('drift feedback', () => {
  gameplayTest.beforeEach(async ({ page }) => { await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') }); });
  gameplayTest('brake and steer build blue sparks and releasing earns a mini boost', async ({ gameplayPage: page }) => {
    await start(page);
    await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
    // Test drift feedback on a clear road, independent of the ring pilot's traffic and elapsed time.
    await page.evaluate(() => {
      const race = window.gameplay.race;
      race.traffic = []; race.pickups = []; race.rings = [];
      race.rivals.forEach(rival => { rival.distance = 1000; });
      Object.assign(race.player, { speed: 80, x: 0, distance: 0 });
    });
    await expect(page.locator('#altitude')).toHaveText('0.0');
    await page.keyboard.down('s');
    await page.keyboard.down('a');
    await page.clock.runFor(1100);
    await expect(page.locator('#flight-state')).toContainText('DRIFT');
    await expect(page.locator('#flight-state')).toContainText('BLUE');
    await page.keyboard.up('s');
    await page.keyboard.up('a');
    await page.clock.runFor(100);
    await expect(page.locator('#flight-state')).toHaveText('MINI BOOST');
  });
});
