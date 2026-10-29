import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { mkdir } from 'node:fs/promises';
import { ciTimeout } from './helpers/ci.js';

const ALL = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const dir = 'artifacts/event-lab/launch';

for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Shared launch rule ${name}`, () => {
  test.use({ viewport, hasTouch });
  test.beforeEach(async ({ gameplayPage: page }) => {
    await page.evaluate(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), ALL);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await mkdir(dir, { recursive: true });
  });

  const fly = async (page, label) => {
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(.5);
    await page.screenshot({ path: `${dir}/${name}-${label}-airborne.png` });
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude), { timeout: ciTimeout(15000) }).toBe(0);
    await page.screenshot({ path: `${dir}/${name}-${label}-landed.png` });
    const car = await page.evaluate(() => {
      const { player } = window.gameScene;
      return [player.position.x, player.position.y, player.position.z, ...player.quaternion.toArray()];
    });
    expect(car.every(Number.isFinite)).toBe(true);
  };

  test('Sky Spiral helix, joins and launch ramps still fly and land', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-track="spiral"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    for (const [distance, x] of [[1100, 0], [1650, -7], [1650, 7], [2200, 0]]) {
      await page.evaluate(([d, lateral]) => Object.assign(window.gameplay.race.player, { distance: d, x: lateral, speed: 0, altitude: 0 }), [distance, x]);
      await page.waitForTimeout(250);
      await page.screenshot({ path: `${dir}/${name}-spiral-${distance}-${x}.png` });
    }
    await page.evaluate(() => {
      const race = window.gameplay.race, section = race.sections.find(s => s.type === 'launch');
      Object.assign(race.player, { distance: section.to - 30, x: 0, speed: 55, altitude: 0, verticalSpeed: 0 });
    });
    await fly(page, 'spiral-launch');
    expect(errors).toEqual([]);
  });

  // First valid ramp spot per track (optionally inside [from, to]); grade = |forward.y| of the road there.
  const rampSpots = (page, ids, from = 400, to = 1e5) => page.evaluate(async ([ids, all, from, to]) => {
    const lab = await import('/src/event-lab.ts'), { createRace, RACE_TRACKS } = await import('/src/game.js');
    const { trackFrame } = await import('/src/track-paths.ts');
    return ids.map(trackId => {
      const props = createRace(trackId, { mode: 'custom', rivals: 0, traffic: 'off' }).props;
      for (let d = from; d < Math.min(to, RACE_TRACKS[trackId].length - 400); d += 50) try {
        const json = lab.exportCourse(lab.validateCourse({ version: 1, label: 'Ramp check', trackId, seed: 3, modifier: 'standard',
          objects: [{ kind: 'ramp', distance: d, lane: 1 }] }, new Set(all), props));
        const landing = trackFrame(trackId, d + 60);
        return { trackId, json, distance: d, grade: Math.abs(landing.forward[1]), bank: Math.abs(landing.right[1]) };
      } catch {}
      return { trackId, json: null };
    });
  }, [ids, ALL, from, to]);

  // At the first rendered grounded frame after a landing, cast from above each tire's lowest point
  // along the car's up axis onto the visible road meshes: the gap is float (+) or sink (−) in metres.
  const landingWheelGaps = page => page.evaluate(async () => {
    const THREE = await import('/node_modules/three/build/three.module.js');
    const frame = () => new Promise(requestAnimationFrame);
    let airborne = false;
    for (let i = 0; i < 1200; i++) {
      await frame();
      const altitude = window.gameplay.race.player.altitude;
      if (altitude > .5) airborne = true;
      if (airborne && altitude === 0) break;
    }
    await frame(); await frame(); // let the grounded pose render
    const { player, scene } = window.gameScene;
    scene.updateMatrixWorld(true);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(player.getWorldQuaternion(new THREE.Quaternion())).normalize();
    const surfaces = [];
    scene.traverse(o => { if (o.isMesh && !o.isInstancedMesh && o.visible && !o.isSprite) surfaces.push(o); });
    const own = new Set(); player.traverse(o => own.add(o));
    const ray = new THREE.Raycaster(), point = new THREE.Vector3();
    return { airborne, gaps: player.userData.wheels.map(wheel => {
      const tire = wheel.children[0], position = tire.geometry.attributes.position;
      let lowest = null, depth = Infinity;
      for (let i = 0; i < position.count; i++) {
        point.fromBufferAttribute(position, i).applyMatrix4(tire.matrixWorld);
        if (point.dot(up) < depth) { depth = point.dot(up); lowest = point.clone(); }
      }
      ray.set(lowest.clone().addScaledVector(up, 1), up.clone().negate());
      const hit = ray.intersectObjects(surfaces.filter(o => !own.has(o)), false)[0];
      return hit ? +(hit.distance - 1).toFixed(3) : null;
    }) };
  });

  const raceRamp = async (page, spot) => {
    await page.locator(`[data-track="${spot.trackId}"]`).click();
    await page.locator('[data-race-mode="eventlab"]').click();
    await page.locator('.lab-share > summary').click();
    await page.locator('#lab-json').fill(spot.json);
    await page.locator('#lab-import').click();
    await expect(page.locator('#lab-error')).toBeEmpty();
    await page.locator('#lab-use').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    await page.evaluate(() => {
      const race = window.gameplay.race, ramp = race.ramps[0];
      Object.assign(race.player, { distance: ramp.distance - 40, x: ramp.x, speed: 55, altitude: 0, verticalSpeed: 0 });
    });
    await expect.poll(() => page.evaluate(() => window.gameScene.scene.getObjectByName('launch-ramps').count)).toBeGreaterThan(0);
  };

  for (const kind of ['spiral-helix', 'tour-flattest', 'tour-steepest']) test(`Event Lab ramp landing keeps every wheel on the road: ${kind}`, async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const spots = kind === 'spiral-helix' ? await rampSpots(page, ['spiral'], 1100, 2140)
      : (await rampSpots(page, ['taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'])).filter(spot => spot.json).sort((a, b) => a.grade - b.grade);
    const spot = kind === 'tour-steepest' ? spots.at(-1) : spots[0];
    expect(spot?.json, `${kind} has a valid ramp spot`).toBeTruthy();
    await raceRamp(page, spot);
    const { airborne, gaps } = await landingWheelGaps(page);
    await page.screenshot({ path: `${dir}/${name}-${kind}-${spot.trackId}-landed.png` });
    console.log(`${name} ${kind} ${spot.trackId} @${spot.distance} m grade ${spot.grade.toFixed(3)} bank ${spot.bank.toFixed(3)} wheel gaps ${gaps}`);
    expect(airborne).toBe(true);
    for (const gap of gaps) {
      expect(gap, 'each tire finds the rendered road under it').not.toBeNull();
      expect(Math.abs(gap), `tire float/sink ${gap} m on ${spot.trackId}`).toBeLessThanOrEqual(.12);
    }
    expect(errors).toEqual([]);
  });
});
