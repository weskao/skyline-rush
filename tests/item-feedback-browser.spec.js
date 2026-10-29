import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

// ITEM-12 feedback and 12B acceptance (misses, blocked storage, touch layout) in the real game.
// With storage blocked the guide's seen flag cannot be read, so the first Start of a page load runs the guided
// practice and Skip continues straight into the chosen race (main.js start/beginTutorial). Play is never blocked.
const skipFirstRunTutorial = async page => {
  await expect(page.locator('body')).toHaveAttribute('data-tutorial', 'active');
  await page.locator('#tutorial-exit').click();
};
const startWithItems = async (page, { blockedStorage = false } = {}) => {
  await page.locator('[data-race-mode="free"]').click();
  await page.locator('#race-mode-rules > summary').click();
  await page.locator('[data-race-rule="itemRules"]').evaluate(node => { node.value = 'active'; node.dispatchEvent(new Event('change', { bubbles: true })); });
  await page.locator('#start-button').click();
  if (blockedStorage) await skipFirstRunTutorial(page);
  await expect(page.locator('#item-status')).toContainText('EMPTY');
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
    // Miss: pass the ring well outside its radius.
    await page.evaluate(() => {
      const race = window.gameplay.race, ring = race.rings.find(ring => ring.type === 'mystery' && !ring.hit);
      window.missed = ring;
      Object.assign(race.player, { distance: ring.distance - .5, x: ring.x + ring.radius + 3, altitude: ring.altitude, verticalSpeed: 0, speed: 50 });
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
  await page.addInitScript(() => {
    for (const method of ['getItem', 'setItem', 'removeItem'])
      Storage.prototype[method] = () => { throw new DOMException('blocked', 'SecurityError'); };
  });
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await startWithItems(page, { blockedStorage: true });
  await expect(page.locator('#item-slot')).toBeVisible();
  expect(errors).toEqual([]);
});
