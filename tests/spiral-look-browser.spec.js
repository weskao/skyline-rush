import { clickLobbyOption } from './helpers/home-lobby.js';
import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expectClean, watch } from './helpers/black-frames.js';

// Task 8c: what must hold on Sky Spiral on Medium and above, and that Low keeps the procedural scene. The same caps
// as Coast and Neon (owner decision 2026-11-19).
const racing = page => expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
const DRAW_CALL_CAP = { home: 540, race: 380 };

async function spiral(page, quality) {
  await page.addInitScript(() => performance.setResourceTimingBufferSize(20000));
  await page.evaluate(tier => {
    for (const key of ['guide-seen', 'tutorial-completed']) localStorage.setItem(`skyline-rush-${key}`, '1');
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral']));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: tier, preset: 'cinematic', enabled: true }));
  }, quality);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await clickLobbyOption(page, '[data-track="spiral"]');
  await expect(page.locator('[data-track="spiral"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#world')).toHaveAttribute('aria-label', /Sky Spiral/);
}

/** What the course draws: the GLB kit or the procedural tower, the day dome or its own backdrop, which road. */
const look = page => page.evaluate(() => {
  const { scene } = window.gameScene, course = scene.getObjectByName('Sky Spiral 3D course');
  const kit = scene.getObjectByName('Sky Spiral kit'), tower = scene.getObjectByName('Sky Spiral tower');
  const drawn = group => group?.visible ? group.children.filter(o => o.isInstancedMesh && o.visible && o.count > 0).length : 0;
  const dome = course.children.find(o => o.renderOrder === -1 && o.material?.map);
  let procedural = false, ktx2 = false;
  course.traverse(o => {
    if (o.geometry?.type === 'CylinderGeometry' && o.material?.visible && o.visible) procedural = true; // the tower shell
    if (o.material?.name === 'spiral_asphalt') ktx2 = !!o.material.map?.isCompressedTexture;
  });
  const backdrop = scene.getObjectByName('Sky Spiral backdrop');
  return { kit: drawn(kit) > 0, tower: drawn(tower), procedural, dome: !!dome?.visible, backdrop: backdrop.visible,
    daylight: backdrop.material.uniforms.daylight?.value === 1, ktx2 };
});
const status = page => page.evaluate(() => { const { spiralLandmarks, spiralRoad, coastSky } = document.querySelector('#world').dataset; return { spiralLandmarks, spiralRoad, coastSky }; });
const DETAILED = { kit: true, tower: 1, procedural: false, dome: true, backdrop: false, daylight: true, ktx2: true };
const PROCEDURAL = { kit: false, tower: 0, procedural: true, dome: false, backdrop: true, daylight: true, ktx2: false };
const ready = page => expect.poll(() => status(page), { timeout: ciTimeout(60000) }).toEqual({ spiralLandmarks: 'attached', spiralRoad: 'high', coastSky: 'day:4096' });
/** This document's fetches of the look's own files: the kit, a KTX2 set, an HDRI. */
const lookAssets = page => page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => /\.ktx2|environments\/.*\.hdr|models\/spiral-/.test(n)));
const calls = page => page.evaluate(() => window.gameScene.renderer.info.render.calls);
const seek = (page, metres) => page.evaluate(at => { window.gameplay.race.player.distance = at; }, metres);

test('Sky Spiral High draws the kit, the day sky and the KTX2 road in place of the procedural scene, with no NaN pixel', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(150000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await spiral(page, 'high');
  await ready(page);
  await expect.poll(() => look(page)).toEqual(DETAILED);
  await watch(page);
  await expectClean(page, 'home showcase');
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(() => look(page)).toEqual(DETAILED);
  await expectClean(page, 'countdown and first racing frames');
  await seek(page, 2550);
  await page.waitForTimeout(ciTimeout(1000));
  await expectClean(page, 'mid-helix, under the tower lamps');
  expect(errors).toEqual([]);
});

// The moments that first show a piece: the full tower takes over from its far node on the approach, the struts on
// the helix, the gap markers at a launch.
test('Sky Spiral High compiles nothing after GO, through the approach, the helix and a launch', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await spiral(page, 'high');
  await ready(page);
  await page.locator('#start-button').click();
  await racing(page);
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  for (const metres of [1650, 2550, 4600]) {
    await seek(page, metres);
    await page.waitForTimeout(ciTimeout(800));
    expect(await programs(page), `${metres} m`).toBe(before);
  }
  expect(errors).toEqual([]);
});

for (const [device, width, height, touch] of [
  ['desktop', 1440, 900, false], ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true],
]) {
  test.describe(`Sky Spiral Low on ${device}`, () => {
    test.use({ viewport: { width, height }, isMobile: touch, hasTouch: touch });
    test('draws the procedural daylight in the showcase and race without fetching detailed assets', async ({ gameplayPage: page }, info) => {
      test.setTimeout(ciTimeout(90000));
      const shaderErrors = [];
      page.on('console', message => {
        if (message.type() === 'error' && /WebGLProgram: Shader Error|VALIDATE_STATUS/.test(message.text())) shaderErrors.push(message.text());
      });
      await spiral(page, 'low');
      await expect.poll(() => look(page)).toEqual(PROCEDURAL);
      expect((await status(page)).spiralLandmarks).not.toBe('attached');
      expect(await lookAssets(page)).toEqual([]);
      await page.screenshot({ path: info.outputPath('showcase.png') });

      await page.locator('#start-button').click();
      await racing(page);
      await seek(page, 2550);
      await expect.poll(() => look(page)).toEqual(PROCEDURAL);
      await expect.poll(() => page.evaluate(() => {
        const course = window.gameScene.scene.getObjectByName('Sky Spiral 3D course');
        return course.children[0].position.length();
      })).toBeGreaterThan(500);
      await page.screenshot({ path: info.outputPath('helix.png') });
      expect(await lookAssets(page)).toEqual([]);
      expect(shaderErrors).toEqual([]);
    });
  });
}

test('Sky Spiral High keeps the procedural tower and starts the race when its kit cannot load', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(120000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/models/spiral-landmarks/**', route => route.abort());
  await spiral(page, 'high');
  await expect.poll(async () => (await status(page)).spiralLandmarks, { timeout: ciTimeout(60000) }).toMatch(/^fallback/);
  await expect.poll(async () => { const { kit, procedural, daylight } = await look(page); return { kit, procedural, daylight }; }).toEqual({ kit: false, procedural: true, daylight: true });
  await page.locator('#start-button').click();
  await racing(page);
  await expect.poll(async () => { const { kit, procedural, daylight } = await look(page); return { kit, procedural, daylight }; }).toEqual({ kit: false, procedural: true, daylight: true });
  expect(errors).toEqual([]);
});

test('Sky Spiral High with its kit stays under the draw-call cap on the home showcase', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  await spiral(page, 'high');
  await ready(page);
  await page.waitForTimeout(ciTimeout(1500));
  expect(await calls(page)).toBeLessThanOrEqual(DRAW_CALL_CAP.home);
});

// The grid, where every rival is in view, then the frames of the look brief: the approach, the helix entry, mid-helix
// and exit, each launch, the shortcut and the slalom deck.
const PROBES = { grid: null, approach: 1650, 'helix entry': 1850, 'mid-helix': 2550, 'helix exit': 3250, 'launch 1': 4650, 'launch 2': 5550, 'launch 3': 6350, shortcut: 7300, slalom: 8600 };
test('Sky Spiral High stays under the draw-call cap along a race', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(150000)); // 10 probes: Neon's 10-probe budget (120 s) with room to spare
  await spiral(page, 'high');
  await ready(page);
  await page.locator('#start-button').click();
  await racing(page);
  const peaks = {};
  for (const [frame, metres] of Object.entries(PROBES)) {
    if (metres !== null) await seek(page, metres);
    peaks[frame] = 0;
    for (let i = 0; i < 4; i++) { await page.waitForTimeout(ciTimeout(300)); peaks[frame] = Math.max(peaks[frame], await calls(page)); }
  }
  console.log('Sky Spiral race draw calls', JSON.stringify(peaks));
  for (const [frame, peak] of Object.entries(peaks)) expect(peak, frame).toBeLessThanOrEqual(DRAW_CALL_CAP.race);
});
