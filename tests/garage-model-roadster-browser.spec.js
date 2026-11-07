import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';

// Task 4 `?model=roadster`: the authored Roadster GLB replaces the procedural car in the Garage and follows its
// wheels, active wing, flight pose and paint (src/garage-model-rig.ts). Production (no query) is unchanged.
const GLB = /\/models\/roadster2\/roadster2(-low)?\.glb$/;

async function prepare(page, url, viewportName = 'desktop', quality = 'high') {
  await page.addInitScript(q => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true, comfortable: false }));
  }, quality);
  const requests = [], errors = [];
  page.on('request', request => { if (GLB.test(new URL(request.url()).pathname)) requests.push(request.url()); });
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  return { requests, errors, viewportName };
}

const world = page => page.locator('#world');
/** Local TRS of a GLB node vs its procedural partner on the Home showcase car. */
const pair = (page, glbName, procedural) => page.evaluate(([name, path]) => {
  const car = window.gameScene.player;
  const glb = car.getObjectByName(name);
  const wing = car.userData.wing;
  const source = { wing, blade: wing.userData.blade, wheel: car.userData.wheels[0] }[path];
  const round = a => a.map(v => Math.round(v * 1e4) / 1e4);
  return glb && { glb: round([...glb.position.toArray(), ...glb.quaternion.toArray()]), proc: round([...source.position.toArray(), ...source.quaternion.toArray()]) };
}, [glbName, procedural]);
const paintHex = page => page.evaluate(() => {
  const car = window.gameScene.player;
  return { glb: car.getObjectByName('body').material.color.getHexString(), proc: car.userData.body.material.color.getHexString() };
});
const attach = async (page, name) => {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path });
};

test('Garage Home shows the Roadster GLB; wheels, wing, flight and paint follow the procedural car', async ({ gameplayPage: page, gameplayURL }) => {
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  expect(requests).toHaveLength(1); // settled: model state polled above
  await expect.poll(() => pair(page, 'wheel_fl', 'wheel')).toEqual(expect.objectContaining({ glb: expect.any(Array) }));
  await attach(page, 'roadster-home-ground');

  await page.locator('#garage-wing').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-wing', 'true');
  await expect.poll(async () => { const p = await pair(page, 'wing_blade', 'blade'); return p.glb[3] !== 0 && JSON.stringify(p.glb) === JSON.stringify(p.proc); },
    { timeout: ciTimeout(10000) }).toBe(true);
  await attach(page, 'roadster-home-wing');

  await page.locator('button[data-garage-mode="flight"]').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
  await expect.poll(async () => { const p = await pair(page, 'wheel_fl', 'wheel'); return JSON.stringify(p.glb) === JSON.stringify(p.proc); }).toBe(true);
  await attach(page, 'roadster-home-flight');

  const before = (await paintHex(page)).glb;
  await page.locator('[data-paint]:not([data-paint="pearl"])').first().click();
  await expect.poll(async () => { const p = await paintHex(page); return p.glb === p.proc && p.glb !== before; }).toBe(true);
  expect(errors).toEqual([]);
});

test('Preview Studio front/side/rear/orbit show the GLB in frame', async ({ gameplayPage: page, gameplayURL }) => {
  await prepare(page, `${gameplayURL}?model=roadster`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  await page.locator('#garage-studio-open').click();
  await expect.poll(async () => JSON.parse((await world(page).getAttribute('data-garage-model-instances')) ?? '{}').studio ?? null).not.toBeNull();
  for (const angle of ['front', 'side', 'rear', 'cinematic']) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    await attach(page, `roadster-studio-${angle}`);
  }
});

test('low quality tier loads only the low LOD and still dresses the Garage car', async ({ gameplayPage: page, gameplayURL }) => {
  const { requests, errors } = await prepare(page, `${gameplayURL}?model=roadster`, 'desktop', 'low');
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(15000) });
  expect(requests.map(u => new URL(u).pathname)).toEqual(['/models/roadster2/roadster2-low.glb']); // settled: model state polled above
  await expect.poll(() => page.evaluate(() => ['body', 'wheel_fl_spin', 'wing_blade', 'thruster_04'].every(n => window.gameScene.player.getObjectByName(n)))).toBe(true);
  await attach(page, 'roadster-low-lod-garage');
  expect(errors).toEqual([]);
});

test('missing roadster GLB falls back to the procedural Roadster without a page error', async ({ gameplayPage: page, gameplayURL }) => {
  await page.route(GLB, route => route.fulfill({ status: 404, body: '' }));
  const { errors } = await prepare(page, `${gameplayURL}?model=roadster`);
  await page.locator('#garage-button').click();
  await expect(world(page)).toHaveAttribute('data-garage-model', 'fallback:missing', { timeout: ciTimeout(15000) });
  await expect.poll(() => page.evaluate(() => window.gameScene.player.getObjectByName('wheel_fl') ?? null)).toBeNull();
  expect(errors).toEqual([]);
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Roadster GLB in Garage Home and Studio on a phone', async ({ gameplayPage: page, gameplayURL }) => {
    await prepare(page, `${gameplayURL}?model=roadster`);
    await page.locator('#garage-button').click();
    await expect(world(page)).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
    await attach(page, 'roadster-phone-home');
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    await attach(page, 'roadster-phone-studio');
  });
});
