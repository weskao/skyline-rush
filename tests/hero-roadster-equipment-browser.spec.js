import { test, programs, modelInstances as instances } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { PAINTS } from '../src/appearance.ts';
import { defaultPaint } from '../src/car-catalog.ts';
import { GARAGE_SKINS } from '../src/garage-skin-catalog.ts';

// Task 4c `?model=roadster`: every Garage paint and skin (read from the catalogs, so a new one joins automatically) shows
// on the GLB car in Garage Home, Preview Studio, the Home showcase and the race, as uniforms on the existing VFX ports.
async function prepare(page, url) {
  await page.addInitScript(() => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'high', enabled: true, comfortable: false }));
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  // A cold dev server reloads the page once it first bundles the lazy GLTFLoader: act only on the settled page.
  await expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
  await expect.poll(() => page.evaluate(() => !!window.gameScene)).toBe(true);
  return errors;
}

/** The dressed car in the scene being drawn (main scene, Studio stage or Coming Soon stage). */
const audit = page => page.evaluate(() => {
  const { composer, camera, renderer } = window.gameScene;
  let car = null;
  composer.passes[0].scene.traverse(o => { if (!car && o.children.some(c => c.userData.garageModel)) car = o; });
  if (!car) return null;
  const body = car.children.find(c => c.userData.garageModel).getObjectByName('body');
  const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
  const hidden = []; // VFX the player should see but the GLB dressing put on the hidden layer
  const shell = /^Rear LED/; // the procedural tail light: part of the car shell the GLB's own tail_light replaces
  car.traverse(o => { if (o.material?.isShaderMaterial && shown(o) && !o.layers.test(camera.layers) && !shell.test(o.name)) hidden.push(o.name); });
  const glow = car.getObjectByName('Launch flare body glow');
  return {
    paint: body.material.color.getHexString(), proc: car.userData.body.material.color.getHexString(), opacity: body.material.opacity,
    sweep: Object.hasOwn(body.material, 'onBeforeCompile'), hidden,
    glow: glow && { onGlb: glow.parent === body, drawn: glow.layers.test(camera.layers), shown: shown(glow) },
    gpu: { programs: renderer.info.programs.length, geometries: renderer.info.memory.geometries },
  };
});
const gpu = async page => (await audit(page)).gpu;
const glowOnGlb = async page => { const { glow } = await audit(page); return glow.onGlb && glow.drawn && glow.shown; };
const attach = async (page, name) => {
  const path = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path });
  await test.info().attach(name, { path });
};
const modelReady = page => expect(page.locator('#world')).toHaveAttribute('data-garage-model', 'model', { timeout: ciTimeout(20000) });
const PREMIUM_FLARE = 'launch-flare-white';
const HEAVIEST = ['thruster-void', 'airflow-prism', 'nitro-trail-purple', PREMIUM_FLARE]; // one per category

async function previewEverything(page) {
  for (const [id, paint] of Object.entries(PAINTS)) {
    await page.locator(`[data-paint="${id}"]`).click();
    await expect.poll(async () => { const a = await audit(page); return [a.paint, a.proc]; }).toEqual([paint.paint.slice(1), paint.paint.slice(1)]);
  }
  for (const { id, category } of GARAGE_SKINS) {
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-preview-${category}`, id);
    await expect.poll(async () => (await audit(page)).hidden, { message: id }).toEqual([]);
  }
  await page.locator(`[data-skin="${PREMIUM_FLARE}"] .garage-skin-preview-hitarea`).click();
  await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(10000) }).toBe(true); // the showroom loops the flare
}

test('Garage Home and Preview Studio: every paint and skin on the GLB car, without new programs or geometry', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(180000));
  const errors = await prepare(page, `${gameplayURL}?model=roadster`);
  await page.locator('#garage-button').click();
  await modelReady(page);
  await expect.poll(() => audit(page)).not.toBeNull();
  await page.waitForTimeout(ciTimeout(500)); // the showroom draws (and so compiles) every skin's hidden parts first
  const home = await gpu(page);
  await previewEverything(page);
  expect(await gpu(page)).toEqual(home); // settled: last preview polled above
  expect((await audit(page)).sweep).toBe(false);
  await attach(page, 'garage-home-flare');

  await page.locator('#garage-studio-open').click();
  await expect.poll(async () => Object.keys(await instances(page))).toContain('studio');
  await expect.poll(async () => (await audit(page))?.sweep).toBe(true); // the Studio paint sweep rides on the GLB paint
  await page.waitForTimeout(ciTimeout(500));
  const studio = await gpu(page);
  for (const { id, category } of GARAGE_SKINS) {
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-preview-${category}`, id);
    await expect.poll(async () => (await audit(page)).hidden, { message: id }).toEqual([]);
  }
  await page.locator(`[data-skin="${PREMIUM_FLARE}"] .garage-skin-preview-hitarea`).click();
  await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(10000) }).toBe(true);
  expect(await gpu(page)).toEqual(studio); // settled: polled above
  await attach(page, 'garage-studio-flare');
  for (const { id } of GARAGE_SKINS.filter(s => !s.default)) await expect(page.locator(`[data-skin="${id}"]`)).toHaveAttribute('data-owned', 'false'); // preview grants nothing
  expect(errors).toEqual([]);
});

test('race with the heaviest skin of each category: launch flare wraps the GLB, no program compiles after GO', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(150000));
  const errors = await prepare(page, `${gameplayURL}?model=roadster`);
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  for (const id of HEAVIEST) {
    const card = page.locator(`#garage-vfx-catalog [data-skin="${id}"]`);
    await card.locator('.garage-skin-preview-hitarea').click();
    await card.getByRole('button', { name: /try|試用/i }).click();
    await expect(card).toHaveAttribute('data-state', 'equipped');
    await expect(card).toHaveAttribute('data-owned', 'false');
  }
  await page.locator('#garage-close').click();
  await modelReady(page);
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['home']);

  await page.locator('#start-button').click();
  await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(15000) }).toBe(true); // 3-2-1 holds the flare
  await attach(page, 'race-countdown-flare');
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { window.gameplay.race.player.cooldown = 1.5; }); // a hit's post-hit grace (grace-fade.ts)
  await expect.poll(async () => (await audit(page)).opacity, { timeout: ciTimeout(5000) }).toBeLessThan(0.75); // the GLB pulses too
  await page.keyboard.down('ShiftLeft');
  await page.waitForTimeout(ciTimeout(600));
  await page.keyboard.up('ShiftLeft');
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await expect.poll(() => page.evaluate(() => window.gameScene.player.getObjectByName('NITRO trail streaks').visible)).toBe(true);
  expect((await audit(page)).hidden).toEqual([]); // settled: NITRO polled above
  await attach(page, 'race-nitro-purple');
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(10000) }).toBeGreaterThan(0.5);
  expect((await audit(page)).hidden).toEqual([]); // settled: altitude polled above
  await attach(page, 'race-fly-void');
  await page.keyboard.up('Space');
  await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(15000) }).toBe(0);
  expect(await programs(page)).toBe(before); // settled: landing polled above
  expect(errors).toEqual([]);
});

test('Home and Coming Soon showcases wear the selected paint on the GLB', async ({ gameplayPage: page, gameplayURL }) => {
  const errors = await prepare(page, `${gameplayURL}?model=roadster`);
  // A locked paint previewed in the Garage reverts on close, so a one-shot read raced it (make verify, 2026-11-08):
  // judge the equipped paint (a fresh profile wears its car's default: the 0-star paint, or the GT's factory red
  // under HERO_CAR=crimson-gt), polled, on both cars.
  const car = process.env.HERO_CAR ?? 'roadster';
  const equipped = PAINTS[defaultPaint(car)].paint.slice(1);
  const hex = async () => { const a = await audit(page); return a && [a.paint, a.proc]; };
  const shown = [equipped, equipped];
  await expect.poll(hex).toEqual(shown);
  await page.locator('[data-upcoming-track="dune-tempest"]').click();
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['showcase']);
  await expect.poll(hex).toEqual(shown);
  await attach(page, 'coming-soon-paint');
  expect(errors).toEqual([]);
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Garage Home flare and Studio sweep on the GLB car on a phone', async ({ gameplayPage: page, gameplayURL }) => {
    const errors = await prepare(page, `${gameplayURL}?model=roadster`);
    await page.locator('#garage-button').click();
    await modelReady(page);
    await page.locator(`[data-skin="${PREMIUM_FLARE}"] .garage-skin-preview-hitarea`).click();
    await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(10000) }).toBe(true);
    await attach(page, 'phone-garage-flare');
    await page.locator('#garage-studio-open').click();
    await expect.poll(async () => (await audit(page))?.sweep).toBe(true);
    await attach(page, 'phone-studio');
    expect(errors).toEqual([]);
  });
});
