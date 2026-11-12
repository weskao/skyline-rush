import { test, captureHooks, glbRoots, programs, modelInstances as instances } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { copyFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAINTS } from '../src/appearance.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';

// Task 7: Crimson GT is the second player car. The Garage car picker equips it with no URL flag; its GLB then dresses
// the Garage, the Home showcase and the race car, wears every paint and skin, and the choice is saved locally.
const GLB = /\/models\/(crimson-gt|roadster2)\/[\w-]+\.glb$/;
const FACTORY_RED = '9a1424';
const REAR_PORT_X = [-0.62, -0.22, 0.22, 0.62]; // src/aero-vfx.js REAR_PORTS (y .64, z 2.39)
const NOZZLE = [0.31, 1.975]; // the GT's nozzles: one rigid offset (0, -.33, -.415) from the contract ports

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

  await carButton(page, 'crimson-gt').click();
  await expect(carButton(page, 'crimson-gt')).toHaveAttribute('aria-pressed', 'true');
  await modelReady(page);
  expect(requests).toEqual(['/models/crimson-gt/crimson-gt.glb']); // settled: model state polled above
  await expect(page.locator('#garage-screen [data-paint]')).toHaveCount(7);
  await expect(page.locator('#garage-screen [data-paint]').first()).toHaveAttribute('data-paint', 'factory');
  await expect(page.locator('[data-paint="factory"]')).toHaveAttribute('data-state', 'equipped');
  await expect.poll(() => paintHex(page)).toEqual({ model: 'crimson-gt', glb: FACTORY_RED, proc: FACTORY_RED });
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
  const dressedAs = () => page.evaluate(() => window.gameScene.player.children.find(part => part.userData.garageModel)?.userData.garageModel ?? null);
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
  const nozzles = await page.evaluate(() => {
    const car = window.gameScene.player;
    return [1, 2, 3, 4].map(i => car.worldToLocal(car.getObjectByName(`nozzle_rear_0${i}`).getWorldPosition(car.position.clone())).toArray().map(v => Math.round(v * 1e3) / 1e3));
  });
  expect(nozzles).toEqual(REAR_PORT_X.map(x => [x, ...NOZZLE]));
  const ports = await page.evaluate(() => window.gameScene.player.getObjectByName('Rear ports').position.toArray().map(v => Math.round(v * 1e3) / 1e3 + 0)); // + 0: a rounded -0 is 0
  expect(ports, 'the rear-port VFX moved onto the nozzles').toEqual([0, -0.33, -0.415]);
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

test('every Garage skin previews on the Crimson GT', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(120000));
  const { errors } = await prepare(page, gameplayURL, { storage: GT });
  await page.locator('#garage-button').click();
  await modelReady(page);
  expect(GARAGE_SKINS).toHaveLength(22);
  for (const { id, category } of GARAGE_SKINS) {
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect(page.locator('#garage-preview'), id).toHaveAttribute(`data-skin-preview-${category}`, id);
  }
  expect(await glbRoots(page)).toBe(1); // still the GT under the last skin
  await attach(page, 'gt-garage-skins');
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
