import { clickLobbyOption } from './helpers/home-lobby.js';
import { openGarageSection } from './helpers/garage-browser.js';
import { test, programs, modelInstances as instances, landed } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import { PAINTS } from '../src/appearance.ts';
import { defaultPaint } from '../src/car-catalog.ts';
import { GARAGE_SKINS, SKIN_CATEGORIES } from '../src/garage-skin-catalog.ts';

// Task 4c Roadster GLB: every Garage paint and skin (read from the catalogs, so a new one joins automatically) shows
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

/** Garage Home on the GLB car with its GPU baseline, taken once the showroom has drawn (and so compiled) every skin's hidden parts. */
async function openGarageHome(page, url) {
  const errors = await prepare(page, url);
  await page.locator('#garage-button').click();
  await modelReady(page);
  await expect.poll(() => audit(page)).not.toBeNull();
  await page.waitForTimeout(ciTimeout(500));
  return { errors, home: await gpu(page) };
}

async function previewSkins(page, category) {
  for (const { id } of GARAGE_SKINS.filter(skin => skin.category === category)) { // motion: the looping launch flare is judged after the sweep
    await openGarageSection(page, 'effects');
    await page.locator(`[data-skin="${id}"] .garage-skin-preview-hitarea`).click();
    await expect(page.locator('#garage-preview')).toHaveAttribute(`data-skin-preview-${category}`, id);
    await expect.poll(async () => (await audit(page)).hidden, { message: id }).toEqual([]);
  }
  // The drift-trail preview draws a procedural car in its own renderer; leaving it once disposed the game's shared
  // nozzle and fascia materials, releasing a program (140 -> 139). Ending on the premium flare leaves it explicitly.
  await page.locator(`[data-skin="${PREMIUM_FLARE}"] .garage-skin-preview-hitarea`).click();
  await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(10000) }).toBe(true); // the showroom loops the flare
}

test('Garage Home: every paint on the GLB car, without new programs or geometry', async ({ gameplayPage: page, gameplayURL }) => {
  const { errors, home } = await openGarageHome(page, gameplayURL);
  for (const [id, paint] of Object.entries(PAINTS)) {
    await openGarageSection(page, 'paints');
    await page.locator(`[data-paint="${id}"]`).click();
    await expect.poll(async () => { const a = await audit(page); return [a.paint, a.proc]; }).toEqual([paint.paint.slice(1), paint.paint.slice(1)]);
  }
  expect(await gpu(page)).toEqual(home); // settled: last paint polled above
  expect(errors).toEqual([]);
});

// One category per test: the whole catalog, Home then Studio, used 360 s of one 540 s CI budget (run 44736477255).
for (const category of SKIN_CATEGORIES) test(`Garage Home and Preview Studio: every ${category} skin on the GLB car, without new programs or geometry`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(120000));
  const { errors, home } = await openGarageHome(page, gameplayURL);
  await previewSkins(page, category);
  expect(await gpu(page)).toEqual(home); // settled: flare polled above
  expect((await audit(page)).sweep).toBe(false);
  await attach(page, `garage-home-${category}`);

  await page.locator('#garage-studio-open').click();
  await expect.poll(async () => Object.keys(await instances(page))).toContain('studio');
  await expect.poll(async () => (await audit(page))?.sweep).toBe(true); // the Studio paint sweep rides on the GLB paint
  await page.waitForTimeout(ciTimeout(500));
  const studio = await gpu(page);
  await previewSkins(page, category);
  expect(await gpu(page)).toEqual(studio); // settled: flare polled above
  await attach(page, `garage-studio-${category}`);
  for (const { id } of GARAGE_SKINS.filter(s => s.category === category && !s.default)) await expect(page.locator(`[data-skin="${id}"]`)).toHaveAttribute('data-owned', 'false'); // preview grants nothing
  expect(errors).toEqual([]);
});

test('race with the heaviest skin of each category: launch flare wraps the GLB, no program compiles after GO', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(150000));
  const errors = await prepare(page, gameplayURL);
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  for (const id of HEAVIEST) {
    await openGarageSection(page, 'effects');
    const card = page.locator(`#garage-vfx-catalog [data-skin="${id}"]`);
    await card.locator('.garage-skin-preview-hitarea').click();
    await card.getByRole('button', { name: /try|試用/i }).click();
    await expect(card).toHaveAttribute('data-state', 'equipped');
    await expect(card).toHaveAttribute('data-owned', 'false');
  }
  await page.locator('#garage-close').click();
  await modelReady(page);
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['home']);

  // Record the actual countdown frames before Start: two short animated waves replace the old static charge.
  await page.evaluate(() => {
    window.launchFlareFrames = { animated: false, glb: false };
    const frame = () => {
      const race = window.gameplay?.race, scene = window.gameScene;
      if (race?.phase === 'countdown' && scene?.player) {
        const car = scene.player, pool = car.getObjectByName('Launch flare burst');
        const glow = car.getObjectByName('Launch flare body glow');
        const body = car.children.find(c => c.userData.garageModel)?.getObjectByName('body');
        if (pool?.visible && pool.material.uniforms.charging.value === 0) {
          window.launchFlareFrames.animated = true;
          if (glow?.visible && body && glow.parent === body && glow.layers.test(scene.camera.layers))
            window.launchFlareFrames.glb = true;
        }
      }
      if (race?.phase !== 'racing') requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  });
  await page.locator('#start-button').click();
  await expect.poll(() => page.evaluate(() => window.launchFlareFrames), { timeout: ciTimeout(15000) })
    .toEqual({ animated: true, glb: true });
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15000) });
  await expect.poll(() => page.evaluate(() => {
    const car = window.gameScene.player;
    return !!car.getObjectByName('Launch flare burst')?.visible || !!car.getObjectByName('Launch flare body glow')?.visible;
  })).toBe(false);
  await attach(page, 'race-after-launch-flare');
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => {
    const { player } = window.gameplay.race;
    player.cooldown = 1.5;
    player.effects.ghost = 2.5; // only Ghost Phase fades the body
  });
  await expect.poll(async () => (await audit(page)).opacity, { timeout: ciTimeout(5000) }).toBeLessThan(0.75);
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
  await landed(page);
  await expect.poll(() => page.evaluate(() => window.gameScene.player.userData.altitude), { timeout: ciTimeout(15000) }).toBe(0);
  expect(await programs(page)).toBe(before); // settled: landing polled above
  expect(errors).toEqual([]);
});

test('Home and Coming Soon showcases wear the selected paint on the GLB', async ({ gameplayPage: page, gameplayURL }) => {
  const errors = await prepare(page, gameplayURL);
  // A locked paint previewed in the Garage reverts on close, so a one-shot read raced it (make verify, 2026-11-08):
  // judge the equipped paint (a fresh profile wears its car's default: the 0-star paint, or the GT's factory red
  // under HERO_CAR=crimson-gt), polled, on both cars.
  const car = process.env.HERO_CAR ?? 'roadster';
  const equipped = PAINTS[defaultPaint(car)].paint.slice(1);
  const hex = async () => { const a = await audit(page); return a && [a.paint, a.proc]; };
  const shown = [equipped, equipped];
  await expect.poll(hex).toEqual(shown);
  await clickLobbyOption(page, '[data-upcoming-track="dune-tempest"]');
  await expect.poll(async () => Object.keys(await instances(page))).toEqual(['showcase']);
  await expect.poll(hex).toEqual(shown);
  await attach(page, 'coming-soon-paint');
  expect(errors).toEqual([]);
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  test('Garage Home flare and Studio sweep on the GLB car on a phone', async ({ gameplayPage: page, gameplayURL }) => {
    const errors = await prepare(page, gameplayURL);
    await page.locator('#garage-button').click();
    await modelReady(page);
    await openGarageSection(page, 'effects');
    await page.locator(`[data-skin="${PREMIUM_FLARE}"] .garage-skin-preview-hitarea`).click();
    await expect.poll(() => glowOnGlb(page), { timeout: ciTimeout(10000) }).toBe(true);
    await attach(page, 'phone-garage-flare');
    await page.locator('#garage-studio-open').click();
    await expect.poll(async () => (await audit(page))?.sweep).toBe(true);
    await attach(page, 'phone-studio');
    expect(errors).toEqual([]);
  });
});
