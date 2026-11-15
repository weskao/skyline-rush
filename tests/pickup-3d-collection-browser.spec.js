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
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(10000) });
}
// A pickup the player has just taken: the renderer starts that tier's collection effect on its next frame.
const take = (page, ...tiers) => page.evaluate(names => {
  const race = window.gameplay.race;
  race.pickups = names.map((tier, i) => ({ tier, x: race.player.x, altitude: 0, distance: race.player.distance + 8 + i * 5,
    taken: true, downUntil: race.elapsed + 2.5 }));
}, tiers);
// The running effect of one tier, read in one evaluate so a short effect cannot end between two reads.
const running = (page, tier, waitForFlash = false) => page.evaluate(async ({ name, waitForFlash }) => {
  const { scene, player } = window.gameScene;
  const { race } = window.gameplay, end = race.elapsed + .8;
  const root = scene.getObjectByName('Pickup collect VFX');
  const findStage = () => root?.children.find(group => group.userData.tier === name && group.visible);
  let stage = findStage();
  while (waitForFlash && race.phase === 'racing' && race.elapsed < end &&
      !(stage?.getObjectByName('energy flash').material.opacity > .25)) {
    await new Promise(requestAnimationFrame);
    stage = findStage();
  }
  if (!stage) return null;
  const shards = stage.getObjectByName('energy shards');
  const shell = player.getObjectByName('Pickup body sweep');
  const streaks = stage.getObjectByName('Pickup body streaks');
  return {
    streaks: streaks?.visible === true,
    shockwaves: stage.children.filter(mesh => mesh.name.includes('energy shockwave') && mesh.visible).length,
    shards: shards.visible ? shards.count : 0,
    beam: stage.getObjectByName('energy beam').visible,
    contact: stage.getObjectByName('Pickup contact pulse').visible,
    bodySweep: shell.visible,
    bodyMesh: shell.parent.name,
    flash: stage.getObjectByName('energy flash').material.opacity,
    fromCar: stage.position.distanceTo(player.getWorldPosition(stage.position.clone())),
  };
}, { name: tier, waitForFlash });

test('each tier plays its own collection effect on the car and its WebGL frame is captured', async ({ gameplayPage: page }) => {
  if (expectedModel) await expect.poll(() => dressedAs(page), { timeout: ciTimeout(15000) }).toBe(expectedModel);
  await startRace(page);
  for (const tier of TIERS) {
    await take(page, tier);
    let state = null;
    await expect.poll(async () => {
      state = await running(page, tier, tier === 'can');
      if (!state) return false;
      if (tier === 'cell') return state.streaks;
      if (tier === 'can') return state.flash > .25;
      return state.shockwaves > 0;
    }, { timeout: ciTimeout(4000) }).toBe(true);
    if (tier === 'cell') expect(state.streaks).toBe(true);
    else if (tier === 'can') expect(state).toMatchObject({ streaks: false, contact: false, shockwaves: 0 });
    else expect(state.shockwaves).toBeGreaterThanOrEqual(1);
    expect(state.shards).toBeGreaterThan(0);
    expect(state.bodySweep).toBe(true);
    if (expectedModel) expect(state.bodyMesh).toBe('body');
    expect(state.fromCar, tier + ' effect rides the car instead of staying at the item 8 m ahead').toBeLessThan(3);
    await test.info().attach('pickup-collect-' + tier + '.png', {
      body: await page.screenshot(), contentType: 'image/png',
    });
    await expect.poll(() => running(page, tier), { timeout: ciTimeout(6000) }).toBeNull(); // let it end before the next tier
  }
});

test('two can pickups each flash in a mixed collection without orange streaks', async ({ gameplayPage: page }) => {
  await startRace(page);
  const state = await page.evaluate(async () => {
    const { race } = window.gameplay, { scene } = window.gameScene;
    const stages = scene.getObjectByName('Pickup collect VFX').children;
    const nextFrame = () => new Promise(requestAnimationFrame);
    const seed = (tier, lead) => race.pickups.push({ tier, x: race.player.x, altitude: 0,
      distance: race.player.distance + lead, taken: true, downUntil: race.elapsed + 2.5 });
    race.pickups = [];
    const started = race.elapsed;
    seed('can', 8);
    let second = false, streaks = false, tankHoops = 0;
    const flashes = new Set();
    while (race.phase === 'racing' && race.elapsed - started < .8) {
      if (!second && race.elapsed - started >= .10) {
        seed('can', 10); seed('tank', 15); second = true;
      }
      await nextFrame();
      for (const stage of stages.filter(mesh => mesh.visible)) {
        if (stage.userData.tier === 'can') {
          if (stage.getObjectByName('energy flash').material.opacity > .25) flashes.add(stage.name);
          streaks ||= stage.getObjectByName('Pickup body streaks')?.visible === true;
        } else if (stage.userData.tier === 'tank') {
          tankHoops = Math.max(tankHoops, stage.children.filter(mesh => mesh.name.startsWith('energy shockwave') && mesh.visible).length);
        }
      }
    }
    return { flashes: flashes.size, streaks, tankHoops };
  });
  expect(state).toEqual({ flashes: 2, streaks: false, tankHoops: 2 });
});

test('reduced-motion collection stays restrained without the rare beam or particle storm', async ({ gameplayPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await startRace(page);
  await take(page, 'can', 'overcharge');
  await expect.poll(() => running(page, 'can'), { timeout: ciTimeout(4000) })
    .toMatchObject({ shards: 0, streaks: false, beam: false, contact: false, bodySweep: false, shockwaves: 1 });
  await expect.poll(() => running(page, 'overcharge'), { timeout: ciTimeout(4000) })
    .toMatchObject({ shards: 0, streaks: false, beam: false, contact: false, bodySweep: false, shockwaves: 1 });
});
