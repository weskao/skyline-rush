import { test, captureHooks, glbRoots, programs, modelInstances as instances, dressedAs as dressed } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { PAINTS } from '../src/appearance.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';
import { parseGlb } from '../scripts/assets/check-glb.mjs';
import { fitToRoadsterSize } from '../src/car-display-size.ts';

// Task 7: Crimson GT is the second player car. The Garage car picker equips it with no URL flag; its GLB then dresses
// the Garage, the Home showcase and the race car, wears every paint and skin, and the choice is saved locally.
const GLB = /\/models\/(crimson-gt|roadster2)\/[\w-]+\.glb$/;
const FACTORY_RED = '9a1424';
const REAR_PORT_X = [-0.62, -0.22, 0.22, 0.62]; // src/aero-vfx.js REAR_PORTS (y .64, z 2.39)
const NOZZLE = [0.31, 1.975]; // the GT's nozzles: one rigid offset (0, -.33, -.415) from the contract ports
/** The GT instance's display scale, measured from the shipped GLB the way src/car-display-size.ts does in the game. */
let gtScale = null;
const scaleOf = async () => {
  if (!gtScale) {
    const { scene } = await parseGlb(readFileSync(new URL('../public/models/crimson-gt/crimson-gt.glb', import.meta.url)));
    fitToRoadsterSize(scene);
    gtScale = scene.scale.toArray();
  }
  return gtScale;
};
/** A GLB point in car space: the GT instance is shown scaled to the Roadster's size. */
const shown = async point => { const scale = await scaleOf(); return point.map((v, axis) => Math.round(v * scale[axis] * 1e3) / 1e3 + 0); };

async function prepare(page, url, { quality = 'high', storage = {} } = {}) {
  await page.addInitScript(([q, extra]) => {
    for (const [key, value] of [['guide-seen', '1'], ['whats-new-seen-v1', '999.0.0'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true, comfortable: false }));
    for (const [key, value] of Object.entries(extra)) if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value)); // seed once: a reload keeps what the game saved
  }, [quality, storage]);
  const requests = [], errors = [];
  page.on('request', request => { if (GLB.test(new URL(request.url()).pathname)) requests.push(new URL(request.url()).pathname); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect.poll(() => page.evaluate(() => !!window.gameScene)).toBe(true);
  return { requests, errors };
}

const GT = { 'skyline-rush-car': 'crimson-gt' };
const world = page => page.locator('#world');
const modelReady = page => expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
const carButton = (page, id) => page.locator(`#garage-screen [data-car="${id}"]`);
const saved = (page, key) => page.evaluate(k => JSON.parse(localStorage.getItem(k)), key);
const airflowBounds = page => page.evaluate(() => {
  const flow = window.gameScene.player.getObjectByName('Airflow showcase').children[0];
  flow.geometry.computeBoundingBox();
  const { min, max } = flow.geometry.boundingBox;
  return [...min.toArray(), ...max.toArray()];
});
/** Body colour of the GLB (null while the car is procedural) and of the procedural car it mirrors. */
const paintHex = page => page.evaluate(() => {
  const car = window.gameScene.player;
  const body = car.getObjectByName('body');
  return { model: body?.parent?.userData.garageModel ?? body?.parent?.parent?.userData.garageModel ?? null, glb: body?.material.color.getHexString() ?? null, proc: car.userData.body.material.color.getHexString() };
});
const attach = async (page, name) => {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path });
  if (process.env.CRIMSON_GT_SHOTS) { mkdirSync(process.env.CRIMSON_GT_SHOTS, { recursive: true }); copyFileSync(path, join(process.env.CRIMSON_GT_SHOTS, `${name}.png`)); }
};

test('Garage picker: Roadster by default, Crimson GT in factory red, six paints, per-car paint and reload persistence', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  const { requests, errors } = await prepare(page, gameplayURL, { storage: { 'skyline-rush-stars': { coast: 3 } } }); // 3 stars: Aurora is owned
  await page.locator('#garage-button').click();
  await expect(carButton(page, 'roadster')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#garage-screen [data-paint]')).toHaveCount(6);
  expect(requests).toEqual([]); // the Roadster stays procedural: no GLB
  expect((await paintHex(page)).glb).toBeNull();
  const roadsterAirflow = await airflowBounds(page);

  await carButton(page, 'crimson-gt').click();
  await expect(carButton(page, 'crimson-gt')).toHaveAttribute('aria-pressed', 'true');
  await modelReady(page);
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt.glb']); // settled: model state polled above
  await expect(page.locator('#garage-screen [data-paint]')).toHaveCount(7);
  await expect(page.locator('#garage-screen [data-paint]').first()).toHaveAttribute('data-paint', 'factory');
  await expect(page.locator('[data-paint="factory"]')).toHaveAttribute('data-state', 'equipped');
  await expect.poll(() => paintHex(page)).toEqual({ model: 'crimson-gt', glb: FACTORY_RED, proc: FACTORY_RED });
  await expect.poll(() => airflowBounds(page)).not.toEqual(roadsterAirflow);
  await attach(page, 'gt-garage-factory');

  for (const [id, paint] of Object.entries(PAINTS)) { // every paint previews on the GT, owned or not
    await page.locator(`[data-paint="${id}"]`).click();
    await expect.poll(async () => (await paintHex(page)).glb, { message: id }).toBe(paint.paint.slice(1));
  }
  await page.locator('[data-paint="aurora"]').click();
  await page.locator('#garage-equip').click();
  await expect(page.locator('[data-paint="aurora"]')).toHaveAttribute('data-state', 'equipped');
  expect(await saved(page, 'skyline-rush-car')).toBe('crimson-gt');
  expect(await saved(page, 'skyline-rush-car-paints')).toEqual({ 'crimson-gt': 'aurora' });
  expect(await saved(page, 'skyline-rush-paint')).toBeNull(); // the Roadster's own save is untouched
  await attach(page, 'gt-garage-aurora');

  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await modelReady(page); // Home, Garage closed, no URL flag
  await expect.poll(() => instances(page)).toEqual({ home: expect.any(String) });
  await expect.poll(() => paintHex(page)).toEqual({ model: 'crimson-gt', glb: PAINTS.aurora.paint.slice(1), proc: PAINTS.aurora.paint.slice(1) });

  await page.locator('#garage-button').click();
  await expect(carButton(page, 'crimson-gt')).toHaveAttribute('aria-pressed', 'true');
  await carButton(page, 'roadster').focus(); // keyboard: the picker is native buttons
  await page.keyboard.press('Enter');
  await expect(carButton(page, 'roadster')).toHaveAttribute('aria-pressed', 'true');
  await expect(world(page)).toHaveAttribute('data-garage-model', 'off');
  await expect.poll(() => glbRoots(page)).toBe(0);
  await expect.poll(() => airflowBounds(page)).toEqual(roadsterAirflow);
  await expect.poll(async () => (await paintHex(page)).proc).toBe(PAINTS.pearl.paint.slice(1)); // the Roadster kept its own paint
  await expect(page.locator('#garage-screen [data-paint]')).toHaveCount(6);
  await carButton(page, 'crimson-gt').click();
  await modelReady(page);
  await expect.poll(async () => (await paintHex(page)).glb).toBe(PAINTS.aurora.paint.slice(1)); // and the GT remembers Aurora
  await page.locator('#garage-studio-open').click();
  await page.locator('#garage-restore-default').click();
  await expect.poll(async () => (await paintHex(page)).proc).toBe(FACTORY_RED);
  expect(await saved(page, 'skyline-rush-car-paints')).toEqual({ 'crimson-gt': 'factory' });
  expect(errors).toEqual([]);
});

test('a save from before cars existed loads as the Roadster with its paint', async ({ gameplayPage: page, gameplayURL }) => {
  const { requests, errors } = await prepare(page, gameplayURL, { storage: { 'skyline-rush-stars': { coast: 3 }, 'skyline-rush-paint': 'aurora' } });
  await page.locator('#garage-button').click();
  await expect(carButton(page, 'roadster')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('[data-paint="aurora"]')).toHaveAttribute('data-state', 'equipped');
  await expect.poll(async () => (await paintHex(page)).proc).toBe(PAINTS.aurora.paint.slice(1));
  expect(requests).toEqual([]);
  expect(await saved(page, 'skyline-rush-car')).toBeNull();
  expect(errors).toEqual([]);
});

test('?model=roadster&look=3d (any dev server started with 3d=1) keeps the equipped Crimson GT; the flag dresses only the Roadster', async ({ gameplayPage: page, gameplayURL }) => {
  const dressedAs = () => dressed(page);
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster&look=3d`, { storage: GT });
  await modelReady(page);
  await expect.poll(dressedAs).toBe('crimson-gt');
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt.glb']); // settled: the dressed model was polled above
  await page.locator('#garage-button').click();
  await carButton(page, 'roadster').click();
  await expect.poll(dressedAs).toBe('roadster2');
  await carButton(page, 'crimson-gt').click();
  await expect.poll(dressedAs).toBe('crimson-gt');
  expect(errors).toEqual([]);
});

test('Preview Studio frames the Crimson GT from the front, side and rear', async ({ gameplayPage: page, gameplayURL }) => {
  await prepare(page, gameplayURL, { storage: GT });
  await page.locator('#garage-button').click();
  await modelReady(page);
  await page.locator('#garage-studio-open').click();
  await expect.poll(async () => (await instances(page)).studio ?? null).not.toBeNull();
  for (const angle of ['front', 'side', 'rear', 'cinematic']) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    await attach(page, `gt-studio-${angle}`);
  }
});

test('race: the equipped GT dresses Home and carries into the race with the rear-port VFX on its nozzles', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  const { requests, errors } = await prepare(page, gameplayURL, { storage: GT });
  await modelReady(page);
  await expect.poll(() => instances(page)).toEqual({ home: expect.any(String) });
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt.glb']);
  await attach(page, 'gt-home');
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  expect(await glbRoots(page)).toBe(1);
  const raceScale = await page.evaluate(() => window.gameScene.player.children.find(c => c.userData.garageModel).scale.toArray());
  expect(raceScale.map(v => v.toFixed(4)), 'the race GT is measured to the Roadster size').toEqual((await scaleOf()).map(v => v.toFixed(4)));
  const nozzles = await page.evaluate(() => {
    const car = window.gameScene.player;
    return [1, 2, 3, 4].map(i => car.worldToLocal(car.getObjectByName(`nozzle_rear_0${i}`).getWorldPosition(car.position.clone())).toArray().map(v => Math.round(v * 1e3) / 1e3));
  });
  expect(nozzles).toEqual(await Promise.all(REAR_PORT_X.map(x => shown([x, ...NOZZLE]))));
  const ports = await page.evaluate(() => window.gameScene.player.getObjectByName('Rear ports').position.toArray().map(v => Math.round(v * 1e3) / 1e3 + 0)); // + 0: a rounded -0 is 0
  const port = [REAR_PORT_X[0], 0.64, 2.39], nozzle = [REAR_PORT_X[0], ...NOZZLE];
  expect(ports, 'the rear-port VFX moved onto the nozzles').toEqual(nozzle.map((v, axis) => Math.round((v * gtScale[axis] - port[axis]) * 1e3) / 1e3 + 0));
  const before = await programs(page);
  const wheel = () => page.evaluate(() => window.gameScene.player.getObjectByName('wheel_fl_spin').quaternion.toArray().join());
  const parked = await wheel();
  await expect.poll(wheel, { message: 'the rig spins the GT wheels' }).not.toBe(parked);
  await page.waitForTimeout(ciTimeout(1500)); // a moment of driving for the capture
  await attach(page, 'gt-race');
  expect(await programs(page), 'no shader compiled while driving').toBe(before);
  expect((await paintHex(page)).glb).toBe(FACTORY_RED);
  expect(errors).toEqual([]);
});

/** Car root, chase camera and tyre contact height on the Coast grid, held in the countdown: no input, no speed, the same for every run. */
async function gridPose(page, url, storage = {}) {
  const { errors } = await prepare(page, url, { storage });
  if (storage['skyline-rush-car']) await modelReady(page);
  await page.locator('#start-button').click();
  // Hold the countdown: the world keeps easing the car and the camera onto the grid, and GO never comes.
  await expect.poll(() => page.evaluate(() => { const { race } = window.gameplay; if (race.phase === 'countdown') race.countdown = 1e6; return race.phase === 'countdown' && race.countdown > 1e5 && race.elapsed === 0; })).toBe(true);
  const read = () => page.evaluate(() => {
    const { player, camera } = window.gameScene, round = v => Math.round(v * 1e3) / 1e3 + 0;
    const lowest = root => { // lowest point of a wheel in the car's own space
      let y = Infinity;
      player.updateWorldMatrix(true, true);
      root.traverse(mesh => {
        if (!mesh.isMesh) return;
        mesh.geometry.computeBoundingBox();
        const { min, max } = mesh.geometry.boundingBox;
        for (const x of [min.x, max.x]) for (const h of [min.y, max.y]) for (const z of [min.z, max.z]) y = Math.min(y, player.worldToLocal(mesh.localToWorld(min.clone().set(x, h, z))).y);
      });
      return round(y);
    };
    const glb = ["fl", "fr", "rl", "rr"].map(w => player.getObjectByName(`wheel_${w}_axle`)).filter(Boolean); // the tyre hangs on the axle, the rim on `_spin`
    return {
      car: [...player.position.toArray(), ...player.quaternion.toArray()].map(round),
      camera: [...camera.position.toArray(), ...camera.quaternion.toArray(), camera.fov].map(round),
      tyres: player.userData.wheels.map(lowest), glbTyres: glb.map(lowest),
    };
  });
  let last = ''; // the car pitch and the chase camera ease onto the grid: wait until two reads half a second apart agree
  await expect.poll(async () => { const now = JSON.stringify(await read()), settled = now === last; last = now; return settled; }, { intervals: [500], timeout: ciTimeout(20000) }).toBe(true);
  expect(errors).toEqual([]);
  return JSON.parse(last);
}

test('the GT stands on the road and under the chase camera exactly like the Roadster', async ({ gameplayPage: page, gameplayURL, browser }) => {
  test.setTimeout(ciTimeout(120000));
  const gt = await gridPose(page, gameplayURL, GT);
  const other = await browser.newPage();
  await captureHooks(other);
  const roadster = await gridPose(other, gameplayURL);
  await other.close();
  expect(roadster.glbTyres, 'the Roadster is procedural').toEqual([]);
  expect(gt.car, 'car root: the collision box and the road frame hang on it').toEqual(roadster.car);
  expect(gt.camera, 'chase camera position, aim and lens').toEqual(roadster.camera);
  expect(gt.tyres, 'the procedural wheels under the GLB').toEqual(roadster.tyres);
  expect(gt.glbTyres).toHaveLength(4);
  gt.glbTyres.forEach((y, i) => expect(y, `GT tyre ${i} touches the road where the Roadster's does`).toBeCloseTo(roadster.tyres[i], 2));
  await attach(page, 'gt-grid');
});

/** GLB rig nodes next to the procedural parts they follow, in the Garage (src/garage-model-rig.ts). */
const wingRig = page => page.evaluate(() => {
  const car = window.gameScene.player, wing = car.userData.wing, glb = name => car.getObjectByName(name);
  const trs = o => [...o.position.toArray(), ...o.quaternion.toArray()].map(v => Math.round(v * 1e4) / 1e4 + 0);
  const blade = glb('wing_blade'), q = blade.getWorldQuaternion(blade.quaternion.clone());
  let folded = 0; // meshes that turn away from the blade (the Roadster's tips fold 60 degrees; the GT's endplates must not)
  blade.traverse(o => { if (o.isMesh && o.getWorldQuaternion(q.clone()).angleTo(q) > 1e-3) folded++; });
  return {
    wing: [trs(glb('wing')), trs(wing)], blade: [trs(blade), trs(wing.userData.blade)], folded,
    fans: glb('lift_fans').visible, jets: car.userData.jets.visible,
    hinge: car.worldToLocal(blade.getWorldPosition(car.position.clone())).toArray().map(v => Math.round(v * 1e3) / 1e3 + 0),
    rear: Math.round(car.worldToLocal(blade.localToWorld(car.position.clone().set(0, -0.03, 0.36))).y * 1e3) / 1e3, // trailing edge height
  };
});

test('the GT wing rests stowed, tilts and raises with the procedural wing, and the lift fans follow the jets', async ({ gameplayPage: page, gameplayURL }) => {
  const { errors } = await prepare(page, gameplayURL, { storage: GT });
  await page.locator('#garage-button').click();
  await modelReady(page);
  const follows = rig => JSON.stringify(rig.wing[0]) === JSON.stringify(rig.wing[1]) && JSON.stringify(rig.blade[0]) === JSON.stringify(rig.blade[1]);
  // The wing eases down as the Garage opens: wait for the rest height, not only for the GLB to follow.
  await expect.poll(async () => { const rig = await wingRig(page); return rig.wing[0][1] === 1.08 && follows(rig); }, { timeout: ciTimeout(10000) }).toBe(true);
  const rest = await wingRig(page); // settled: polled above
  expect(rest.wing[0].slice(0, 3), 'the contract pivot').toEqual([0, 1.08, 2.25]);
  expect(rest.hinge, 'stowed: the leading edge lies just above the tail deck').toEqual(await shown([0, 0.86, 1.63]));
  expect(rest.rear, 'stowed: the blade lies flat').toBeCloseTo((await shown([0, 0.83, 0]))[1], 2);
  expect([rest.fans, rest.jets]).toEqual([false, false]);
  await attach(page, 'gt-wing-stowed');

  await page.locator('#garage-wing').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-wing', 'true');
  await expect.poll(async () => { const rig = await wingRig(page); return rig.blade[0][3] !== 0 && follows(rig); }, { timeout: ciTimeout(10000) }).toBe(true);
  const tilted = await wingRig(page); // settled: polled above
  expect(tilted.folded, 'endplates stay on the tilted blade').toBe(0);
  expect(tilted.hinge, 'tilt: the leading edge stays on the deck').toEqual(rest.hinge);
  expect(tilted.rear, 'tilt: the trailing edge swings up, clear of the tail').toBeGreaterThan(rest.rear + 0.15);
  await attach(page, 'gt-wing-tilted');

  await page.locator('button[data-garage-mode="flight"]').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
  await expect.poll(async () => { const rig = await wingRig(page); return rig.wing[0][1] === 1.24 && follows(rig) && rig.fans && rig.jets; }, { timeout: ciTimeout(10000) }).toBe(true);
  const raised = await wingRig(page); // settled: polled above
  expect(raised.hinge, 'raised: one raise travel (.16) above the stowed hinge').toEqual(await shown([0, 1.02, 1.63]));
  expect(raised.folded, 'endplates stay on the raised blade').toBe(0);
  await attach(page, 'gt-wing-raised');
  expect(errors).toEqual([]);
});

test('every Garage skin previews on the Crimson GT', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(120000));
  const { errors } = await prepare(page, gameplayURL, { storage: GT });
  await page.locator('#garage-button').click();
  await modelReady(page);
  expect(GARAGE_SKINS).toHaveLength(22);
  for (const { id, category } of GARAGE_SKINS) {
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect(page.locator('#garage-preview'), id).toHaveAttribute(`data-skin-preview-${category}`, id);
    if (process.env.CRIMSON_GT_SHOTS) await attach(page, `gt-skin-${id}`); // local review sheet: all 22 on the GT
  }
  expect(await glbRoots(page)).toBe(1); // still the GT under the last skin
  await attach(page, 'gt-garage-skins');
  expect(errors).toEqual([]);
});

test('keyboard: Tab walks the cars in catalog order, Enter equips the focused car, and the paints come after the picker', async ({ gameplayPage: page, gameplayURL }) => {
  const { errors } = await prepare(page, gameplayURL);
  await page.locator('#garage-button').click();
  await carButton(page, 'roadster').focus();
  await page.keyboard.press('Tab');
  await expect(carButton(page, 'crimson-gt')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(carButton(page, 'crimson-gt')).toHaveAttribute('aria-pressed', 'true');
  await modelReady(page);
  await expect(carButton(page, 'crimson-gt'), 'equipping keeps the focus on the picked car').toBeFocused();
  await page.keyboard.press('Tab');
  // The Store gallery sits between the picker and the paints: Tab leaves the cars forward, and the paints come later.
  await expect.poll(() => page.evaluate(() => {
    const after = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const gt = document.querySelector('#garage-screen [data-car="crimson-gt"]');
    return { leftCars: !document.activeElement.matches('[data-car]') && after(gt, document.activeElement), paintsFollow: after(gt, document.querySelector('#garage-screen [data-paint]')) };
  })).toEqual({ leftCars: true, paintsFollow: true });
  await page.keyboard.press('Shift+Tab');
  await expect(carButton(page, 'crimson-gt')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(carButton(page, 'roadster')).toBeFocused();
  expect(errors).toEqual([]);
});

test('low quality loads only the GT low LOD; a missing GLB falls back to the procedural car', async ({ gameplayPage: page, gameplayURL, browser }) => {
  const { requests, errors } = await prepare(page, gameplayURL, { quality: 'low', storage: GT });
  await modelReady(page);
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt-low.glb']);
  await expect.poll(() => page.evaluate(() => ['body', 'wheel_fl_spin', 'wing_blade', 'thruster_04'].every(n => window.gameScene.player.getObjectByName(n)))).toBe(true);
  expect(errors).toEqual([]);

  const other = await browser.newPage();
  await captureHooks(other);
  await other.route(GLB, route => route.fulfill({ status: 404, body: '' }));
  const second = await prepare(other, gameplayURL, { storage: GT });
  await expect(world(other)).toHaveAttribute('data-garage-model', 'fallback:missing', { timeout: ciTimeout(15000) });
  expect(await glbRoots(other)).toBe(0);
  expect(second.errors).toEqual([]);
  await other.close();
});

test('a race started before the GLB arrives stays on the procedural car and compiles nothing; the GT dresses the car once the race is left', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  let arrive;
  const held = new Promise(resolve => { arrive = resolve; });
  await page.route(GLB, async route => { await held; await route.continue(); });
  const { requests, errors } = await prepare(page, gameplayURL, { storage: GT });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt.glb']);
  const before = await programs(page);
  arrive();
  await modelReady(page); // loaded and compiled off-screen
  await page.waitForTimeout(ciTimeout(1500)); // a moment of driving after the GLB arrived
  expect(await glbRoots(page), 'the car never swaps during a race').toBe(0);
  expect(await programs(page), 'no shader compiled while driving').toBe(before);
  await page.locator('#pause-button').click();
  await page.locator('#restart-button').click();
  await expect.poll(() => glbRoots(page), { timeout: ciTimeout(15000), message: 'back on the grid, the GT is worn' }).toBe(1);
  expect(errors).toEqual([]);
});

for (const [name, viewport] of [['phone portrait', { width: 390, height: 844 }], ['phone landscape', { width: 844, height: 390 }]]) {
  test.describe(name, () => {
    test.use({ viewport, isMobile: true, hasTouch: true, locale: 'zh-TW' });
    test('the car picker is reachable by touch, in Traditional Chinese, and equips the GT', async ({ gameplayPage: page, gameplayURL }) => {
      const { errors } = await prepare(page, gameplayURL);
      await page.locator('#garage-button').tap();
      const gt = carButton(page, 'crimson-gt');
      await gt.scrollIntoViewIfNeeded();
      await expect(gt).toContainText('深紅跑車');
      await expect(carButton(page, 'roadster')).toContainText('使用中');
      const box = await gt.boundingBox();
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await gt.tap();
      await expect(gt).toHaveAttribute('aria-pressed', 'true');
      await modelReady(page);
      await expect(page.locator('[data-paint="factory"]')).toContainText('原廠深紅');
      await attach(page, `gt-garage-${name.replace(' ', '-')}`);
      expect(errors).toEqual([]);
    });
  });
}

// The factory finish has a card like the six paints: the GT's own master rendered in factory red
// (assets-src/crimson-gt/card/render_card.py), 960x510 for the 320x170 card, full-bleed like the others.
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test.describe(`factory card ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });
    test('the factory red card is the car in its own paint: native 3x, opaque, laid out like the paint cards, name below', async ({ gameplayPage: page, gameplayURL }) => {
      const { errors } = await prepare(page, gameplayURL, { storage: GT });
      await page.locator('#garage-button').click();
      const button = page.locator('#garage-screen [data-paint="factory"]');
      await button.scrollIntoViewIfNeeded();
      const image = button.locator('img.garage-paint-image');
      await expect(image).toBeVisible();
      await expect(image).toHaveAttribute('src', /paint-cards\/factory@3x\.webp$/);
      await expect(image).toHaveJSProperty('naturalWidth', 960);
      await expect(image).toHaveJSProperty('naturalHeight', 510);
      const facts = await page.evaluate(() => {
        const rect = selector => { const { left, top, right, bottom, width, height } = document.querySelector(selector).getBoundingClientRect(); return { left, top, right, bottom, width, height }; };
        const img = document.querySelector('[data-paint="factory"] img.garage-paint-image');
        const canvas = Object.assign(document.createElement('canvas'), { width: img.naturalWidth, height: img.naturalHeight });
        const context = canvas.getContext('2d');
        context.drawImage(img, 0, 0);
        const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
        let minAlpha = 255, red = 0;
        for (let i = 0; i < data.length; i += 4) {
          minAlpha = Math.min(minAlpha, data[i + 3]);
          if (data[i] > 90 && data[i] > 2.5 * data[i + 1] && data[i] > 2.5 * data[i + 2]) red++;
        }
        return {
          minAlpha, redShare: red / (data.length / 4),
          image: rect('[data-paint="factory"] img.garage-paint-image'), preview: rect('[data-paint="factory"] .garage-paint-preview'),
          button: rect('[data-paint="factory"]'), name: rect('[data-paint="factory"] .garage-paint-name'), pearl: rect('[data-paint="pearl"] .garage-paint-preview'),
        };
      });
      expect(facts.minAlpha, 'full-bleed card, no transparent edge').toBe(255);
      expect(facts.redShare, 'lit factory red, not a placeholder or another paint (measured .15; highlights and shadow do not count)').toBeGreaterThan(0.1);
      expect(Math.abs(facts.image.width - facts.preview.width)).toBeLessThan(1);
      expect(Math.abs(facts.image.height - facts.preview.height)).toBeLessThan(1);
      expect(Math.abs(facts.preview.width - facts.pearl.width), 'same frame as the paint cards').toBeLessThan(1);
      expect(Math.abs(facts.preview.height - facts.pearl.height)).toBeLessThan(1);
      expect(facts.preview.left).toBeGreaterThanOrEqual(facts.button.left);
      expect(facts.preview.right).toBeLessThanOrEqual(facts.button.right);
      expect(facts.name.top, 'the name sits below the artwork').toBeGreaterThanOrEqual(facts.image.bottom);
      expect(facts.button.left).toBeGreaterThanOrEqual(0);
      expect(facts.button.right).toBeLessThanOrEqual(viewport.width);
      await attach(page, `gt-factory-card-${viewport.width}x${viewport.height}`);
      expect(errors).toEqual([]);
    });
  });
}

test('Garage airflow previews and equipped styles follow Crimson GT onto Coming Soon tracks', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(90000));
  const { errors } = await prepare(page, gameplayURL, { storage: GT });
  await modelReady(page);
  await expect.poll(() => instances(page)).toEqual({ home: expect.any(String) });
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
  const style = () => page.evaluate(() => {
    const { composer } = window.gameScene;
    const flow = composer.passes.find(pass => pass.scene?.isScene)?.scene.getObjectByName('Airflow showcase')?.children[0];
    const model = flow?.parent.parent.children.find(part => part.userData.garageModel)?.userData.garageModel;
    return [model, flow?.material.uniforms.skinPattern.value];
  });
  await expect.poll(style, { timeout: ciTimeout(20000) }).toEqual(['crimson-gt', 0]);
  await page.locator('#garage-button').click();
  for (const [pattern, id] of ['airflow-basic', 'airflow-slipstream', 'airflow-vortex', 'airflow-prism'].entries()) {
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect.poll(style).toEqual(['crimson-gt', pattern]);
  }
  await page.locator('#garage-close').click();
  await expect.poll(style).toEqual(['crimson-gt', 0]);

  await page.locator('#garage-button').click();
  await page.locator('[data-skin="airflow-vortex"] .garage-skin-action').click();
  await page.locator('#garage-close').click();
  await expect.poll(style).toEqual(['crimson-gt', 2]);
  await page.locator('[data-upcoming-track="monsoon-ruins"]').click();
  await expect.poll(style, { timeout: ciTimeout(20000) }).toEqual(['crimson-gt', 2]);
  expect(errors).toEqual([]);
});
