import { expect } from '@playwright/test';
import fs from 'node:fs';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';
import { decodePngRgba } from './helpers/png-rgba.js';
import { CLASSIC_IDS, pausedRace, place } from './helpers/traffic-browser.js';

// Evidence for the instanced traffic (src/traffic-fleet.ts), never in the gate (machine-specific timings and captures stay in the gitignored audits dir):
//   TRAFFIC_BENCH=<label> npx playwright test tests/traffic-instancing-evidence-browser.spec.js
const LABEL = process.env.TRAFFIC_BENCH, OUT = 'docs/designs/3d-pipeline/audits/traffic-instancing';
const COURSES = ['frostbite-canyon', 'stormline-megacity', 'volcanic-crown', 'dune-tempest', 'monsoon-ruins', 'skyfall-archipelago'];
const VIEWPORTS = { desktop: { width: 1440, height: 900 }, portrait: { width: 390, height: 844 }, landscape: { width: 844, height: 390 } };

test.skip(!process.env.TRAFFIC_BENCH, 'run with TRAFFIC_BENCH=<label>');
test.use({ unlockedAccess: true, launchOptions: { args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] } });

for (const trackId of ['neon', 'coast']) test(`${trackId}: draw calls and frame cost over a driven race`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(180000));
  await pausedRace(page, gameplayURL, trackId);
  await page.locator('#pause-button').click();
  await page.keyboard.down('KeyW');
  const rows = [];
  for (let i = 0; i < 6; i++) rows.push(await sampleFrameCost(page, 5000));
  await page.keyboard.up('KeyW');
  const result = { label: LABEL, trackId, gpu: await gpuName(page), rows }; // traffic's own calls: tests/traffic-instancing-browser.spec.js
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(`${OUT}/${LABEL}-${trackId}.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
});

for (const [name, viewport] of Object.entries(VIEWPORTS)) test.describe(name, () => {
  test.use({ viewport });
  for (const trackId of [...CLASSIC_IDS, ...COURSES]) test(`${trackId}: paused traffic capture`, async ({ gameplayPage: page, gameplayURL }) => {
    test.setTimeout(ciTimeout(120000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await pausedRace(page, gameplayURL, trackId);
    await place(page, 14, 0);
    await page.evaluate(() => { document.querySelector('#race-overlay').style.visibility = 'hidden'; });
    fs.mkdirSync(OUT, { recursive: true });
    await page.locator('#world').screenshot({ path: `${OUT}/${LABEL}-${trackId}-${name}.png` });
    expect(errors).toEqual([]);
  });
});

// Share of pixels whose colour moved by more than 8/255 between two captures of the same frame.
function changed(a, b) {
  const [x, y] = [a, b].map(png => decodePngRgba(png, { allowRgb: true }).pixels);
  let count = 0;
  for (let i = 0; i < x.length; i += 4) if (Math.max(Math.abs(x[i] - y[i]), Math.abs(x[i + 1] - y[i + 1]), Math.abs(x[i + 2] - y[i + 2])) > 8) count++;
  return count / (x.length / 4);
}

// The same paused frame drawn twice: instanced, then with the fleet hidden and the old per-car makeCar() groups put
// at the same poses and paints. `noise` is what the paused scene changes on its own between two instanced captures.
for (const trackId of ['neon', 'coast', 'spiral', 'alpine', 'frostbite-canyon']) test(`${trackId}: instanced traffic against per-car models, same frame`, async ({ gameplayPage: page, gameplayURL }) => {
  test.skip(LABEL === 'before', 'needs the instanced fleet');
  test.setTimeout(ciTimeout(120000));
  await pausedRace(page, gameplayURL, trackId);
  await place(page, 14, 0);
  await page.evaluate(() => { document.querySelector('#race-overlay').style.visibility = 'hidden'; });
  const shot = name => page.locator('#world').screenshot(name ? { path: `${OUT}/same-frame-${trackId}-${name}.png` } : {});
  const swap = perCar => page.evaluate(async perCar => {
    const { scene } = window.gameScene, fleet = scene.getObjectByName('Traffic');
    for (const car of window.perCarTraffic ?? []) scene.remove(car);
    window.perCarTraffic = [];
    fleet.visible = !perCar;
    if (perCar) {
      const { makeCar, TRAFFIC_CAR_STYLES } = await import('/src/car-model.js');
      const { applyCarReflections } = await import('/src/car-reflections.ts');
      const envMap = fleet.children.find(mesh => mesh.material.envMap).material.envMap;
      TRAFFIC_CAR_STYLES.forEach((style, s) => {
        const paint = fleet.getObjectByName(`${s}:paint`), color = paint.material.color.clone();
        for (let slot = 0; paint.visible && slot < paint.count; slot++) {
          paint.getColorAt(slot, color);
          const car = makeCar(style, `#${color.getHexString()}`);
          applyCarReflections(car, envMap);
          car.matrixAutoUpdate = false;
          paint.getMatrixAt(slot, car.matrix);
          scene.add(car);
          window.perCarTraffic.push(car);
        }
      });
    }
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame); // the per-car materials compile on their first draw
    return window.perCarTraffic.length;
  }, perCar);
  fs.mkdirSync(OUT, { recursive: true });
  const instanced = await shot('instanced'), cars = await swap(true), perCar = await shot('per-car');
  await swap(false);
  const result = { trackId, cars, changed: changed(instanced, perCar), noise: changed(instanced, await shot()) };
  console.log(JSON.stringify(result));
  fs.writeFileSync(`${OUT}/same-frame-${trackId}.json`, JSON.stringify(result, null, 2));
  expect(cars).toBeGreaterThan(0);
});
