import { clickLobbyOption } from './helpers/home-lobby.js';
import { test } from './helpers/gameplay-browser.js';
import { reloadWithBlockedStorage } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';

// ITEM-12 feedback and 12B acceptance (misses, blocked storage, touch layout) in the real game.
const startWithItems = async (page, { blockedStorage = false } = {}) => {
  await clickLobbyOption(page, 'button[data-race-mode="free"]');
  await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-rule="itemRules"]').evaluate(node => { node.value = 'active'; node.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.locator('#start-button').click();
  if (blockedStorage) await page.locator('#guide-start-race').click();
  await expect(page.locator('#item-status')).toContainText('EMPTY');
  // The HUD shows EMPTY before the race's first frame compiles its shaders: the program baseline waits for GO.
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
};
const programs = page => page.evaluate(() => window.gameScene.renderer.info.programs.length);

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`item feedback ${name}`, () => {
  test.use({ viewport, hasTouch });

  test('beams mark the next item ring, a miss banks nothing and the USE button is a reachable touch target', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await startWithItems(page);
    await page.evaluate(() => {
      const race = window.gameplay.race, ring = race.rings.find(ring => ring.type === 'mystery');
      Object.assign(race.player, { distance: ring.distance - 120, x: ring.x, speed: 0 });
    });
    const before = await programs(page);
    await page.waitForFunction(() => window.gameScene.scene.getObjectByName('Item beams').children.some(beam => beam.visible));
    await page.screenshot({ path: `test-results/item-feedback-beam-${name}.png` });
    expect(await programs(page), 'no shader compiled for the beams mid-race').toBe(before);
    // Miss: pass the ring well outside its radius, toward the road centre: rings use every lane, and an outer-lane
    // ring's far side is past ROAD_LIMIT, which would clamp the car back into the ring.
    await page.evaluate(() => {
      const race = window.gameplay.race, ring = race.rings.find(ring => ring.type === 'mystery' && !ring.hit);
      window.missed = ring;
      Object.assign(race.player, { distance: ring.distance - .5, x: ring.x - Math.sign(ring.x || 1) * (ring.radius + 3), altitude: ring.altitude, verticalSpeed: 0, speed: 50 });
    });
    await page.waitForFunction(() => window.gameplay.race.player.distance > window.missed.distance + 5);
    expect(await page.evaluate(() => [window.missed.hit ?? false, window.gameplay.race.player.heldItem])).toEqual([false, null]);
    await expect(page.locator('#item-status')).toContainText('EMPTY');
    // Hit the next one and use it.
    await page.evaluate(() => {
      const race = window.gameplay.race, ring = race.rings.find(ring => ring.type === 'mystery' && !ring.hit && ring.distance > race.player.distance);
      Object.assign(race.player, { distance: ring.distance - .1, x: ring.x, altitude: ring.altitude, verticalSpeed: 0, speed: 50 });
    });
    await expect(page.locator('#activate-item')).toBeEnabled();
    const box = await page.locator('#activate-item').boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(hasTouch ? 44 : 34);
    if (hasTouch) expect(box.width, 'USE is a full 44 px touch target').toBeGreaterThanOrEqual(44);
    expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height).toBe(true);
    expect(await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.id, { x: box.x + box.width / 2, y: box.y + box.height / 2 })).toBe('activate-item');
    if (hasTouch) await page.locator('#activate-item').tap();
    else await page.keyboard.press('q');
    await expect(page.locator('#item-status')).toContainText(/ACTIVE|COOLDOWN/);
    expect(errors).toEqual([]);
  });

  test('a shield-blocked hit flashes the blue ring and costs nothing', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await startWithItems(page);
    const before = await programs(page);
    await page.evaluate(() => {
      const race = window.gameplay.race, car = race.player;
      car.effects.shield = 10;
      Object.assign(car, { cooldown: 0, speed: 40 });
      race.traffic.push({ x: car.x, distance: car.distance + 3, speed: 5, color: 0, cruise: 5 });
    });
    await page.waitForFunction(() => !!window.gameplay.race.player.shieldBlock);
    await page.screenshot({ path: `test-results/item-feedback-shield-${name}.png` });
    expect(await page.evaluate(() => [window.gameplay.race.player.collisions, window.gameplay.race.player.effects.shield])).toEqual([0, 0]);
    expect(await programs(page), 'no shader compiled for the shield flash').toBe(before);
    expect(errors).toEqual([]);
  });
});

test('item rules still start a race when storage is blocked', async ({ gameplayPage: page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await reloadWithBlockedStorage(page);
  await startWithItems(page, { blockedStorage: true });
  await expect(page.locator('#item-slot')).toBeVisible();
  expect(errors).toEqual([]);
});

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['portrait', { width: 390, height: 844 }, true],
  ['landscape', { width: 844, height: 390 }, true],
]) test.describe(`incoming item feedback on ${name}`, () => {
  test.use({ viewport, hasTouch });

  test('a rival EMP makes the HUD show the hit while the player is slowed', async ({ gameplayPage: page }, testInfo) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await clickLobbyOption(page, 'button[data-race-mode="custom"]');
    await page.locator('#race-mode-rules > summary').click();
    await page.locator('#race-mode-rules').getByRole('combobox', { name: 'Item rules', exact: true }).click();
    await page.getByRole('listbox', { name: 'Item rules', exact: true }).getByRole('option', { name: /^All ·/ }).click();
    await page.locator('#start-button').click();
    await page.waitForFunction(() => ['countdown', 'racing'].includes(window.gameplay.race.phase));
    await page.evaluate(() => {
      const race = window.gameplay.race, [rival] = race.rivals;
      // Stage the live encounter independently of asynchronous scenery warmup.
      race.phase = 'racing';
      race.elapsed = 13;
      race.traffic = [];
      race.pickups = [];
      race.rivals.length = 1;
      Object.assign(rival, { distance: 200, x: -2.5, homeX: -2.5, speed: 60 });
      Object.assign(race.player, { distance: 220, x: 2.5, speed: 60 });
      race.rings = [{ distance: 200.5, x: -2.5, altitude: 0, radius: 2, group: 0, type: 'emp' }];
    });
    const status = page.locator('#bonus-status');
    const screen = page.locator('#player-hit-screen');
    await expect(screen).toHaveAttribute('data-hit', 'emp');
    await expect(screen).toBeVisible();
    await expect(screen).toHaveCSS('pointer-events', 'none');
    expect(await screen.boundingBox()).toEqual({ x: 0, y: 0, ...viewport });
    await expect(status).toBeVisible();
    await expect(status).toHaveText(/^EMP HIT · [12]s$/);
    const box = await status.boundingBox();
    expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width && box.y + box.height <= viewport.height).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('rival-emp.png') });
    // Advance to the end of the hit in game time. Software WebGL can spend many real seconds per simulated second.
    await page.evaluate(() => {
      const { race } = window.gameplay;
      race.elapsed = Math.max(race.elapsed, race.player.empUntil - .01);
    });
    await expect(status).toBeHidden();
    await expect(screen).toBeHidden();
    expect(errors).toEqual([]);
  });
});
