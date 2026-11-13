import { test, glbRoots, programs, modelInstances as instances } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';

// Task 4b `?model=roadster`: the one roadster2 GLB dresses the player's car on the Home showcase and in every race
// (src/garage-model.ts). The procedural car still owns the pose, collisions, road contact, camera and VFX ports.
const GLB = /\/models\/roadster2\/roadster2(-low)?\.glb$/;
const LIFT_PORTS = [[-0.79, -1.3], [-0.79, 1.45], [0.79, -1.3], [0.79, 1.45]]; // src/effects.js
const REAR_PORT_X = [-0.62, -0.22, 0.22, 0.62]; // src/aero-vfx.js REAR_PORTS (y .64, z 2.39)

async function prepare(page, url, quality = 'high') {
  await page.addInitScript(q => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true, comfortable: false }));
  }, quality);
  const requests = [], errors = [];
  page.on('request', request => { if (GLB.test(new URL(request.url()).pathname)) requests.push(new URL(request.url()).pathname); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  return { requests, errors };
}

const world = page => page.locator('#world');
const modelReady = page => expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
const fans = page => page.evaluate(() => {
  const car = window.gameScene.player;
  return { glb: car.getObjectByName('lift_fans')?.visible ?? null, jets: car.userData.jets.visible, altitude: car.userData.altitude };
});
const attach = async (page, name) => {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path });
};
const startRace = async page => {
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
};

test('Home showcase wears the GLB without the Garage; AIRFLOW ON grounded, OFF hovering with the GLB lift fans', async ({ gameplayPage: page, gameplayURL }) => {
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await modelReady(page);
  await expect.poll(() => instances(page)).toEqual({ home: expect.any(String) });
  expect(await glbRoots(page)).toBe(1); // settled: instances polled above
  expect(requests).toEqual(['/models/roadster2/roadster2.glb']);

  await expect.poll(() => fans(page)).toEqual(expect.objectContaining({ glb: true, jets: true })); // AIRFLOW OFF (default): hovering
  expect((await fans(page)).altitude).toBeGreaterThan(0.5); // settled: pose polled above
  await attach(page, 'home-airflow-off-hover');

  await page.locator('#airflow-toggle').click();
  await expect.poll(() => fans(page)).toEqual({ glb: false, jets: false, altitude: 0 }); // AIRFLOW ON: on the road, no jets
  await attach(page, 'home-airflow-on-grounded');
  expect(errors).toEqual([]);
});

test('race: the Home instance carries on; VFX ports, programs and flight fans follow the procedural car', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await modelReady(page);
  const { home } = await instances(page);
  await startRace(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  expect(await instances(page)).toEqual({ home }); // settled: RACING polled above; same instance, no second copy
  expect(await glbRoots(page)).toBe(1);
  await attach(page, 'race-ground');

  // Ports: the GLB thruster/rear-nozzle pivots sit exactly on the VFX ports, in world space. The GLB shows at the
  // Roadster's measured size (car-display-size.ts), so the lift jets scale their ports by it (effects.js) and the
  // rear-port group moves onto the nozzles (garage-model.ts).
  const offsets = await page.evaluate(([lift, rear]) => {
    const car = window.gameScene.player, V = car.position.constructor;
    car.updateMatrixWorld(true);
    const at = name => car.getObjectByName(name).getWorldPosition(new V());
    const root = car.children.find(c => c.userData.garageModel), shown = car.userData.displayScale;
    const ports = car.getObjectByName('Rear ports');
    return {
      lift: lift.map(([x, z], i) => at(`thruster_0${i + 1}`).distanceTo(car.localToWorld(new V(x, 0.3, z).multiply(shown)))),
      rear: rear.map((x, i) => at(`nozzle_rear_0${i + 1}`).distanceTo(ports.localToWorld(new V(x, 0.64, 2.39)))),
      root: [...root.position.toArray(), ...root.quaternion.toArray()],
      scale: root.scale.toArray(), shown: shown.toArray(),
    };
  }, [LIFT_PORTS, REAR_PORT_X]);
  for (const gap of [...offsets.lift, ...offsets.rear]) expect(gap).toBeLessThan(1e-4);
  expect(offsets.root).toEqual([0, 0, 0, 0, 0, 0, 1]);
  expect(offsets.shown).toEqual(offsets.scale);
  expect(offsets.scale[1]).toBe(offsets.scale[2]); // wheels stay round

  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(ciTimeout(600));
  await attach(page, 'race-boost');
  await page.keyboard.up('ShiftLeft');
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(600));
  await attach(page, 'race-nitro');

  await page.keyboard.down('Space');
  await expect.poll(() => fans(page), { timeout: ciTimeout(10000) }).toEqual(expect.objectContaining({ glb: true, jets: true }));
  await page.waitForTimeout(ciTimeout(500));
  await attach(page, 'race-fly');
  await page.keyboard.up('Space');
  await expect.poll(async () => (await fans(page)).altitude, { timeout: ciTimeout(15000) }).toBe(0);
  expect((await fans(page)).glb).toBe(false); // settled: landed (altitude 0) polled above; thrust ends before touchdown
  await attach(page, 'race-landing');

  expect(await programs(page)).toBe(before);
  expect(requests).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('restart, track switch and End race keep one GLB instance and return GPU memory to its baseline', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(150000));
  await page.addInitScript(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon'])));
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await modelReady(page);
  const memory = () => page.evaluate(() => { const { geometries, textures } = window.gameScene.renderer.info.memory; return { geometries, textures }; });
  const stable = async () => {
    let last = null;
    await expect.poll(async () => { const now = JSON.stringify(await memory()); const same = now === last; last = now; return same; },
      { intervals: [ciTimeout(500)], timeout: ciTimeout(20000) }).toBe(true);
    return JSON.parse(last);
  };
  const [original, other] = ['coast', 'neon'];
  const endRace = async () => {
    await page.locator('.brand').click();
    await page.locator('#leave-end').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  };
  const pick = async id => {
    await page.locator(`[data-track="${id}"]`).click();
    await expect(page.locator(`[data-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  };
  const cycle = async () => {
    await startRace(page);
    await page.locator('#restart-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
    await endRace();
    await pick(other);
    await startRace(page);
    await endRace();
    await pick(original);
  };
  const { home } = await instances(page);
  await cycle(); // warm every lazily built race resource once
  const baseline = await stable();
  await cycle();
  expect(await stable()).toEqual(baseline);
  expect(await instances(page)).toEqual({ home }); // settled: memory polled stable above
  expect(await glbRoots(page)).toBe(1);
  expect(requests).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('Coming Soon showcase: the one instance moves to the card car and back to the Home car', async ({ gameplayPage: page, gameplayURL }) => {
  const { errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await modelReady(page);
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['showcase']);
  const first = (await instances(page)).showcase;
  expect(await glbRoots(page)).toBe(0); // settled: instances polled above; the Home car gave its copy up
  await attach(page, 'coming-soon-dune');
  await page.locator('[data-upcoming-track="monsoon-ruins"]').click();
  await expect.poll(async () => (await instances(page)).showcase ?? first).not.toBe(first);
  expect(Object.keys(await instances(page))).toEqual(['showcase']); // settled: polled above
  const classic = page.locator('[data-track]').first();
  await classic.click();
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['home']);
  expect(await glbRoots(page)).toBe(1); // settled: polled above
  expect(errors).toEqual([]);
});

test('missing GLB: Home and race keep the procedural Roadster without a page error', async ({ gameplayPage: page, gameplayURL }) => {
  await page.route(GLB, route => route.fulfill({ status: 404, body: '' }));
  const { errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await expect(world(page)).toHaveAttribute('data-garage-model', 'fallback:missing', { timeout: ciTimeout(15000) });
  await startRace(page);
  await page.waitForTimeout(ciTimeout(500));
  expect(await glbRoots(page)).toBe(0);
  expect(await page.evaluate(() => window.gameScene.player.userData.body.layers.test(window.gameScene.camera.layers))).toBe(true);
  await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(5);
  expect(errors).toEqual([]);
});

test('low quality tier loads only the low LOD for the Home showcase and the race', async ({ gameplayPage: page, gameplayURL }) => {
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`, 'low');
  await modelReady(page);
  await startRace(page);
  await expect.poll(() => glbRoots(page)).toBe(1);
  expect(requests).toEqual(['/models/roadster2/roadster2-low.glb']); // settled: polled above
  await attach(page, 'race-low-lod');
  expect(errors).toEqual([]);
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('GLB Roadster on the Home showcase and in the race on a phone', async ({ gameplayPage: page, gameplayURL }) => {
    const { errors } = await prepare(page, `${gameplayURL}?model=roadster`);
    await modelReady(page);
    await attach(page, 'phone-home');
    await startRace(page);
    await expect.poll(() => glbRoots(page)).toBe(1);
    await attach(page, 'phone-race');
    expect(errors).toEqual([]);
  });
});
