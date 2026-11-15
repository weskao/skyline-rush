import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';

// Task 5 wet-road decision: env-map reflections plus the lights-only mirror (production) against env-only and a
// full three.js planar Reflector on Coast rain.
// Chrome runs without vsync or its frame cap; helpers/frame-cost.js times each frame GPU-synced. Runs only with
// WET_BENCH=1, never in the gate:
//   WET_BENCH=1 LABEL=<x> QUALITY=high|ultra npx playwright test tests/wet-road-benchmark-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings).
const LABEL = process.env.LABEL ?? 'bench', QUALITY = process.env.QUALITY ?? 'high';
const OUT = 'docs/designs/3d-pipeline/audits/task5/wet-bench';
// Each variant runs more than once, interleaved, so clock or thermal drift shows as a spread rather than a bias.
// 'lights-mirror' is production High (wet-reflection.ts); 'env-only' skips its pass (the Medium path); 'planar-*' add
// a full-scene three.js Reflector on top of env-only.
const ORDER = ['env-only', 'lights-mirror', 'planar-half', 'env-only', 'lights-mirror', 'planar-full', 'planar-half', 'lights-mirror', 'env-only'];

test.skip(!process.env.WET_BENCH, 'run with WET_BENCH=1');
test.use({ viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] } });

test(`${LABEL} ${QUALITY}: wet road env-map vs planar Reflector`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(300000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const vfx = QUALITY === 'ultra' ? { quality: 'high', ultra: true } : { quality: QUALITY };
  await page.evaluate(settings => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
  }, vfx);
  await page.goto(gameplayURL);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(60000) }).not.toBe('procedural');
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
  await page.keyboard.down('KeyW');
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; });
  await page.waitForTimeout(3000);

  // The Reflector comes from the dev server's three addons, so it shares the app's three instance; it never ships.
  await page.evaluate(async () => {
    const addon = '/node_modules/three/examples/jsm/objects/Reflector.js';
    const { Reflector } = await import(addon);
    // Import three through the exact URL vite rewrote the addon's `from 'three'` to: one module instance.
    const THREE = await import((await (await fetch(addon)).text()).match(/from\s*["']([^"']*three[^"']*)["']/)[1]);
    const { scene, renderer } = window.gameScene;
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    const plane = scale => {
      const mirror = new Reflector(new THREE.PlaneGeometry(40, 600), { textureWidth: size.x * scale, textureHeight: size.y * scale, multisample: 0, color: 0x777777 });
      mirror.rotation.x = -Math.PI / 2; mirror.position.set(0, 0.01, -280); mirror.visible = false;
      scene.add(mirror);
      return mirror;
    };
    let road = null;
    scene.traverse(o => { if (o.material?.name === 'coast_asphalt') road = o; });
    window.wetBench = { mirrors: { 'planar-half': plane(0.5), 'planar-full': plane(1) }, road, pass: road.onBeforeRender };
  });
  const gpu = await gpuName(page);

  const rows = [];
  for (const variant of ORDER) {
    await page.evaluate(variant => {
      const bench = window.wetBench;
      for (const [name, mirror] of Object.entries(bench.mirrors)) mirror.visible = name === variant;
      bench.road.onBeforeRender = variant === 'lights-mirror' ? bench.pass : () => {};
    }, variant);
    await page.waitForTimeout(800); // settle: first frames compile the mirror shader
    const sample = { variant, ...await sampleFrameCost(page, 4000) };
    rows.push(sample);
  }
  await page.keyboard.up('KeyW');
  console.table(rows);
  fs.writeFileSync(`${OUT}/${LABEL}-${QUALITY}.json`, JSON.stringify({ label: LABEL, quality: QUALITY, gpu, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
