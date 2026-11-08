import { test, glbRoots, programs, modelInstances as instances } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';

// Task 4b regression matrix: `?model=roadster` on every playable track (classic and World Tour), desktop and phone.
// Drive, collide, BOOST, NITRO, FLY, land, finish and retry with the GLB dressing the player car; the procedural car
// keeps the physics, so the race state must progress as usual, with no page error and no shader compile after GO.
const TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];

const state = page => page.evaluate(() => {
  const car = window.gameScene.player, { player } = window.gameplay.race;
  return { fans: car.getObjectByName('lift_fans')?.visible ?? null, jets: car.userData.jets.visible, altitude: player.altitude, collisions: player.collisions };
});

function drive(id) {
  return async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(120000));
    await page.addInitScript(ids => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
    }, TRACKS);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(`${gameplayURL}?model=roadster`);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator(`[data-track="${id}"]`).click();
    await expect(page.locator(`[data-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
    await expect.poll(() => glbRoots(page)).toBe(1); // Home showcase car dressed
    const { home } = await instances(page);

    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
    await page.waitForTimeout(ciTimeout(300));
    const before = await programs(page);
    expect((await instances(page)).home).toBe(home); // settled: RACING polled above

    await page.evaluate(() => { const { race } = window.gameplay; race.traffic = [{ distance: race.player.distance + 6, x: race.player.x, speed: 0, altitude: race.player.altitude }]; });
    await expect.poll(async () => (await state(page)).collisions, { timeout: ciTimeout(10000) }).toBeGreaterThan(0);
    await page.keyboard.down('ShiftLeft');
    await page.waitForTimeout(ciTimeout(400));
    await page.keyboard.up('ShiftLeft');
    await page.evaluate(() => { const { player } = window.gameplay.race; Object.assign(player, { nitroTime: 3, speed: 90, fuel: 100 }); });
    await page.keyboard.down('Space');
    await expect.poll(() => state(page), { timeout: ciTimeout(10000) }).toEqual(expect.objectContaining({ fans: true, jets: true }));
    expect((await state(page)).altitude).toBeGreaterThan(0); // settled: thrusting polled above
    await page.keyboard.up('Space');
    await expect.poll(async () => (await state(page)).altitude, { timeout: ciTimeout(20000) }).toBe(0);
    await expect.poll(async () => (await state(page)).fans).toBe(false);
    expect(await programs(page)).toBe(before);

    await page.evaluate(() => { const { race } = window.gameplay; race.elapsed = Math.max(race.elapsed, 80); Object.assign(race.player, { distance: race.length - 10, speed: 60 }); });
    await expect(page.locator('#race-status')).toHaveText('FINISHED', { timeout: ciTimeout(30000) });
    await page.locator('#restart-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    await expect.poll(() => glbRoots(page)).toBe(1);
    expect((await instances(page)).home).toBe(home); // settled: polled above
    await page.screenshot({ path: test.info().outputPath(`${id}-retry.png`) });
    expect(errors).toEqual([]);
  };
}

const COURSES = ['dune-tempest', 'monsoon-ruins', 'skyfall-archipelago', 'volcanic-crown', 'stormline-megacity', 'frostbite-canyon'];

// Shared six-course carousel (.claude/rules/playable-course-shared-template.md): the one instance follows each card car,
// survives the shared camera dock, then returns to the Home car.
async function carousel({ gameplayPage: page, gameplayURL }) {
  test.setTimeout(ciTimeout(120000));
  await page.addInitScript(() => { for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value); });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${gameplayURL}?model=roadster`);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  let last = (await instances(page)).home;
  for (const id of COURSES) {
    await page.locator(`[data-upcoming-track="${id}"]`).click();
    await expect.poll(async () => (await instances(page)).showcase ?? last, { timeout: ciTimeout(20000) }).not.toBe(last);
    last = (await instances(page)).showcase;
    expect(await glbRoots(page)).toBe(0); // settled: instances polled above; the Home car gave its copy up
    const view = await page.locator('#showcase-camera-name').textContent();
    await page.locator('#showcase-camera-next').click();
    await expect(page.locator('#showcase-camera-name')).not.toHaveText(view ?? '');
    expect((await instances(page)).showcase).toBe(last); // settled: camera name polled above; the camera never rebuilds the car
  }
  await page.locator('[data-track="coast"]').click();
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['home']);
  expect(await glbRoots(page)).toBe(1); // settled: polled above
  expect(errors).toEqual([]);
}

for (const id of TRACKS) test(`GLB Roadster on ${id}: drive, collide, BOOST, NITRO, FLY, land, finish, retry`, drive(id));
test('GLB Roadster through the six-course carousel and camera dock', carousel);

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  for (const id of TRACKS) test(`phone: GLB Roadster on ${id}: drive, collide, BOOST, NITRO, FLY, land, finish, retry`, drive(id));
  test('phone: GLB Roadster through the six-course carousel and camera dock', carousel);
});
