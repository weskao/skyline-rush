import { dressedAs, test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

const TIERS = ['cell', 'can', 'tank', 'overcharge'];
const expectedModel = process.env.PICKUP_TEST_MODEL;
if (expectedModel === 'roadster2') test.use({ gameplaySearch: '?model=roadster' });
async function startRace(page) {
  await page.locator('#start-button').click();
  if (await page.locator('#tutorial-exit').isVisible()) await page.locator('#tutorial-exit').click();
  // This spec seeds pickups and tests the renderer. Let the next real game tick start the race.
  await page.evaluate(() => {
    if (window.gameplay.race.phase === 'countdown') window.gameplay.race.countdown = 0;
  });
  await expect(page.locator('#race-status')).toHaveText('RACING');
}
// A pickup the player has just taken: the renderer starts that tier's collection effect on its next frame.
const take = (page, tier) => page.evaluate(name => {
  const race = window.gameplay.race;
  race.pickups = [{ tier: name, x: race.player.x, altitude: 0, distance: race.player.distance + 8,
    taken: true, downUntil: race.elapsed + 2.5 }];
}, tier);
// The running effect of one tier, read in one evaluate so a short effect cannot end between two reads.
const running = (page, tier) => page.evaluate(name => {
  const { scene, player } = window.gameScene;
  const stage = scene.getObjectByName('Pickup collect VFX')?.children.find(group => group.userData.tier === name && group.visible);
  if (!stage) return null;
  const shards = stage.children.find(mesh => mesh.isInstancedMesh);
  const shell = player.getObjectByName('Pickup body sweep');
  const bounds = player.userData.visualBounds;
  const ring = stage.getObjectByName('energy shockwave 0');
  const streaks = stage.getObjectByName('Pickup body streaks');
  const tailOffset = name === 'can' && bounds && streaks?.visible
    ? player.worldToLocal(streaks.localToWorld(ring.position.clone().fromBufferAttribute(streaks.geometry.attributes.position, 0))).z - bounds.max.z
    : null;
  return {
    streaks: streaks?.visible === true,
    shockwaves: stage.children.filter(mesh => mesh.name.includes('energy shockwave') && mesh.visible).length,
    shards: shards.visible ? shards.count : 0,
    beam: stage.children.find(mesh => mesh.name === 'energy beam').visible,
    contact: stage.getObjectByName('Pickup contact pulse').visible,
    bodySweep: shell.visible,
    bodyMesh: shell.parent.name,
    tailOffset,
    fromCar: stage.position.distanceTo(player.getWorldPosition(stage.position.clone())),
  };
}, tier);

test('each tier plays its own collection effect on the car and its WebGL frame is captured', async ({ gameplayPage: page }) => {
  if (expectedModel) await expect.poll(() => dressedAs(page), { timeout: ciTimeout(15000) }).toBe(expectedModel);
  await startRace(page);
  for (const tier of TIERS) {
    await take(page, tier);
    let state = null;
    await expect.poll(async () => {
      state = await running(page, tier);
      if (!state) return false;
      if (tier === 'cell') return state.streaks;
      if (tier === 'can') return state.streaks && state.tailOffset !== null;
      return state.shockwaves > 0;
    }, { timeout: ciTimeout(4000) }).toBe(true);
    if (tier === 'cell' || tier === 'can') expect(state.streaks).toBe(true);
    else expect(state.shockwaves).toBeGreaterThanOrEqual(1);
    expect(state.shards).toBeGreaterThan(0);
    expect(state.bodySweep).toBe(true);
    if (expectedModel) expect(state.bodyMesh).toBe('body');
    if (tier === 'can') expect(state.tailOffset).toBeGreaterThan(0);
    expect(state.fromCar, tier + ' effect rides the car instead of staying at the item 8 m ahead').toBeLessThan(3);
    await test.info().attach('pickup-collect-' + tier + '.png', {
      body: await page.screenshot(), contentType: 'image/png',
    });
    await expect.poll(() => running(page, tier), { timeout: ciTimeout(6000) }).toBeNull(); // let it end before the next tier
  }
});

test('reduced-motion collection stays restrained without the rare beam or particle storm', async ({ gameplayPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startRace(page);
  await take(page, 'overcharge');
  let state = null;
  await expect.poll(async () => (state = await running(page, 'overcharge')) !== null, { timeout: ciTimeout(4000) }).toBe(true);
  expect(state.shards).toBe(0);
  expect(state.beam).toBe(false);
  expect(state.contact).toBe(false);
  expect(state.bodySweep).toBe(false);
  expect(state.shockwaves).toBe(1);
});
