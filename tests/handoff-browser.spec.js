import { toggleSettingsSection } from './helpers/settings-browser.js';
import { test, expect, settled } from './helpers/test.js';
import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { clickLobbyOption } from './helpers/home-lobby.js';

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
  await toggleSettingsSection(page, 'driving');
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
  await toggleSettingsSection(page, 'driving');
  await expect(page.locator('[data-rebind="fly"]')).toContainText('F');
  await toggleSettingsSection(page, 'driving');
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
    // This flow starts two full races and moves every touch control between them.
    test.setTimeout(ciTimeout(120000));
    const session = await context.newCDPSession(page);
    const touch = (type, ...touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
    await open(page);
    await start(page);
    await expect(page.locator('[data-control="nitro"]')).toBeVisible();
    await expect(page.locator('[data-control="nitro"]')).toHaveAttribute('aria-label', /NITRO/);
    const pad = await page.locator('.touch-pad').boundingBox();
    await touch('touchStart', { id: 1, x: pad.x + 40, y: pad.y + 50 });
    await touch('touchMove', { id: 1, x: pad.x + 100, y: pad.y + 50 });
    await expect.poll(() => bank(page)).toBeLessThan(-2);
    await touch('touchEnd');
    await expect.poll(() => bank(page)).toBeGreaterThan(-0.1);
    await page.locator('#pause-button').click();
    await settled(page.locator('.overlay-content'));
    await expect(page.locator('#race-status')).toHaveText('PAUSED');
    await toggleSettingsSection(page, 'driving');
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
    await toggleSettingsSection(page, 'driving');
    await page.locator('#layout-edit').click();
    await page.keyboard.press('p');
    await expect(page.locator('#layout-toolbar')).toBeHidden();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls-layout-v2')));
    expect(saved.version).toBe(2);
    expect(Object.keys(saved.landscape)).toHaveLength(7);
    expect(saved.portrait).toEqual({});
    await page.reload();
    await start(page);
    await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', 'right');
    const savedAgain = await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls-layout-v2')));
    expect(savedAgain.landscape).toEqual(saved.landscape);
    expect(savedAgain.portrait).toEqual({});
    for (const [action, point] of Object.entries(saved.landscape)) {
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
    await settled(page.locator('.overlay-content'));
    await toggleSettingsSection(page, 'driving');
    await page.locator('[data-controls="hand"][value="left"]').check();
    await page.locator('#layout-edit').click();
    const mirrored = await page.locator('[data-control="right"]').boundingBox();
    expect(mirrored.x + mirrored.width / 2).toBeCloseTo(saved.landscape.right.x * 844, 0);
    await page.locator('#layout-done').click();
    await toggleSettingsSection(page, 'driving');
    await page.locator('#layout-reset').click();
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-controls-layout-v2')).landscape)).toEqual({});
  });
  test('edited touch buttons remain inside notched-screen safe areas', async ({ page, context }) => {
    await open(page);
    await start(page);
    await page.locator('#pause-button').click();
    await settled(page.locator('.overlay-content'));
    await toggleSettingsSection(page, 'driving');
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

gameplayTest('earned ring rewards fill the nitro HUD, announce PERFECT LINE and fire once per press', async ({ gameplayPage: page }) => {
  gameplayTest.setTimeout(ciTimeout(90000));
  await toggleSettingsSection(page, 'driving');
  await page.locator('#controls-sensitivity').focus();
  await page.keyboard.press('Home');
  await expect(page.locator('#controls-sensitivity')).toHaveValue('0.4');
  await toggleSettingsSection(page, 'driving');
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
  // Ring types re-roll every race, so pin Coast's own layout seed (as tests/ring-rows.test.js does): its first
  // group is four gates, the last a full-width row. Pinned before the mode tab, which builds the race.
  const { RING_RADIUS, RING_NITRO, PERFECT_LINE_NITRO } = await page.evaluate(async () => {
    (await import('/src/game.js')).setLayoutSeed();
    const { RING_RADIUS, RING_NITRO, PERFECT_LINE_NITRO } = await import('/src/ring-layout.ts');
    return { RING_RADIUS, RING_NITRO, PERFECT_LINE_NITRO };
  });
  // Solo Time Trial: rivals ahead on the grid take Coast's first rings (2.5 s respawn), so the player's first charge
  // would skip 0.5 and the group could not complete. This test is about the player's own ring rewards.
  await clickLobbyOption(page, 'button[data-race-mode="time"]');
  await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'time');
  await page.getByRole('button', { name: 'Start race', exact: true }).click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  // Cross every gate in the real loop. Seeding the approach removes the software renderer's speed from the test;
  // pickup geometry, half-charge animation, the one-per-row rule and the PERFECT LINE reward still come from the game.
  const perfectLines = await page.evaluate(async ([radius, charge, bonus]) => {
    const { race } = window.gameplay;
    const { player } = race;
    const group = race.rings.filter(ring => ring.group === 0);
    const gates = [...new Map(group.map(ring => [ring.distance, ring])).values()];
    if (gates.length * charge + bonus < 3) throw new Error(`First group has only ${gates.length} gates`);
    for (const ring of group) Object.assign(ring, { type: 'nitro', radius });
    player.effects.ghost = 30; // traffic cannot knock the car out of a seeded approach
    for (const [index, ring] of gates.entries()) {
      Object.assign(player, { distance: ring.distance - 0.2, x: ring.x, altitude: ring.altitude, verticalSpeed: 0, speed: 50 });
      const until = race.elapsed + 1;
      while (!ring.hit && player.distance <= ring.distance && race.elapsed < until) await new Promise(requestAnimationFrame);
      if (!ring.hit) throw new Error(`Missed gate at ${ring.distance} m`);
      // Let the real HUD report the first half charge before crossing the next gate.
      if (index === 0) while (!window.halfCharge && race.elapsed < until) await new Promise(requestAnimationFrame);
    }
    if (player.rings !== gates.length) throw new Error(`Collected ${player.rings} rings across ${gates.length} gates`);
    return player.perfectLines;
  }, [RING_RADIUS, RING_NITRO.nitro, PERFECT_LINE_NITRO]);
  expect(perfectLines, 'The visible first ring group must produce a real PERFECT LINE').toBe(1);
  expect(await page.evaluate(() => window.halfCharge)).toEqual({ transform: 'scaleX(0.5)', refilling: 'true', color: 'rgb(255, 124, 118)' });
  await expect(page.locator('#maneuver-report')).toBeVisible();
  await expect(page.locator('#nitro-status')).toHaveText('NITRO READY');
  await expect(page.locator('#nitro-meter')).toHaveAttribute('data-nitro-state', 'ready');
  await expect(page.locator('.nitro-segment.is-full')).toHaveCount(3);
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'nitro-max');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#maneuver-report')).toBeHidden();
  // Settings is available on pause and results, but the charge must still be tested in the same race.
  await page.locator('#pause-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
  await toggleSettingsSection(page, 'display');
  await page.locator('[data-vfx="comfortable"]').check();
  await expect(page.locator('#nitro-meter')).toHaveCSS('animation-name', 'none');
  await toggleSettingsSection(page, 'display');
  // Record every charge change in-page: the race keeps refilling (rings, pickups, slipstream) while slow CI polls,
  // so "one charge per press" is the first change landing on 2 and the meter never dropping below it.
  await page.evaluate(() => {
    const meter = document.querySelector('#nitro-meter');
    window.nitroValues = [];
    new MutationObserver(() => window.nitroValues.push(Number(meter.getAttribute('aria-valuenow'))))
      .observe(meter, { attributes: true, attributeFilter: ['aria-valuenow'] });
  });
  await page.locator('#resume-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
  await page.keyboard.down('e');
  await expect.poll(() => page.evaluate(() => window.nitroValues[0])).toBe(2);
  await expect(page.locator('#nitro-status')).toHaveText('NITRO ACTIVE');
  await expect(page.locator('body')).toHaveClass(/nitro-active/);
  await page.waitForTimeout(450);
  expect(await page.evaluate(() => Math.min(...window.nitroValues)), 'holding NITRO fires one charge, not one per frame').toBe(2);
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
