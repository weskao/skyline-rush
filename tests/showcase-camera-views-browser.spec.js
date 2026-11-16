import { test, expect } from '@playwright/test';
import { PORTRAIT_CAR_TOP } from './showcase-car-zone.js';
import { RACE_TRACKS } from '../src/game.js';
import { resizeTo } from './helpers/viewport.js';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL camera placement for the six ready-screen views: the dock label alone
// (showcase-camera-browser.spec.js) cannot catch a camera that ends up somewhere else.
// Every map, current and future: a new track joins these checks by being added to RACE_TRACKS.
// CI: one page boot per map (about 11 s each on software WebGL). The viewport x AIRFLOW matrix of a map runs inside one test
// (test.step per combination, same assertions as before; resizeTo resizes the live page), and the race-camera check runs every map
// in one page. Camera values read by the old fresh-boot tests match the folded ones to < 1e-5 on every combination, except
// 390x844 AIRFLOW on of taipei and tokyo (portrait + AIRFLOW after an earlier combination moves their car by ~0.05 NDC): those
// keep a fresh boot (FRESH_BOOT below). Pure pose maths lives in tests/showcase-camera.test.js.
const TRACKS = [...Object.keys(RACE_TRACKS), 'harbor-circuit'];
// neon, canyon and aurora run the same camera path as coast (no road frame, landmark or occluders: world.js showcaseOccluders).
const CAMERA_TRACKS = TRACKS.filter(id => !['neon', 'canyon', 'aurora'].includes(id));
const FIXED = { rear: 0, right: 90, front: 180, left: -90 };
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 1777, height: 863 }, { width: 390, height: 844 }];
// A full orbit renders ~1,250 frames; CPU-only WebGL on CI needs several minutes for it, so those tests outrun the 180 s default.
const HEAVY_TIMEOUT = 900_000;
const gap = (a, b) =>Math.abs(((a - b + 540) % 360) - 180);

async function openProbe(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/tests/fixtures/showcase-camera-probe.html');
  await page.waitForFunction(() => window.showcaseCameraReady === true);
}
// Whole model in frame (wheels, nose, tail, wing) and at least 75% of its body unblocked by scenery.
function expectWholeCar(result, label) {
  const { minX, maxX, minY, maxY } = result.carBounds;
  expect.soft(Math.max(-minX, maxX, -minY, maxY), `${label} car inside the frame`).toBeLessThan(1);
  expect.soft(result.clear, `${label} car body unblocked`).toBeGreaterThanOrEqual(0.75);
  expect.soft(maxX - minX, `${label} car has a usable width`).toBeGreaterThan(0.035);
}
// The top band of a portrait phone is left to the AIRFLOW telemetry card (showcase-camera-browser.spec.js).
function expectBelowCardBand(result, label) {
  expect.soft((1 - result.carBounds.maxY) / 2, `${label} car top, as a share of the screen height`).toBeGreaterThanOrEqual(PORTRAIT_CAR_TOP);
}

const sizeLabel = (viewport, airflow) => `${viewport.width}x${viewport.height} AIRFLOW ${airflow ? 'on' : 'off'}`;
// Combinations whose values differ after an earlier combination ran in the same page (see the note at the top): fresh boot each.
const FRESH_BOOT = { taipei: [[VIEWPORTS[2], true]], tokyo: [[VIEWPORTS[2], true]] };
const isFresh = (id, viewport, airflow) => (FRESH_BOOT[id] ?? []).some(([v, a]) => v === viewport && a === airflow);
// Runs `check(viewport, airflow)` for every combination of the map in one page; freshBoot picks the fresh-boot combinations instead.
async function runCombos(page, id, viewports, check, freshBoot) {
  let first = true;
  for (const viewport of viewports) for (const airflow of [false, true]) {
    if (isFresh(id, viewport, airflow) !== freshBoot) continue;
    if (first) await openProbe(page, viewport); else await resizeTo(page, viewport.width, viewport.height);
    first = false;
    await test.step(sizeLabel(viewport, airflow), () => check(viewport, airflow));
  }
}
async function checkFixedViews(page, id, viewport, airflow) {
  for (const [view, expected] of Object.entries(FIXED)) {
    const result = await page.evaluate(([id, view, airflow]) => window.showcaseCameraProbe(id, view, { airflow }), [id, view, airflow]);
    const label = `${id}/${view} ${sizeLabel(viewport, airflow)}`;
    expect.soft(gap(result.bearing, expected), `${label} bearing ${result.bearing.toFixed(1)}°`).toBeLessThan(25);
    expectWholeCar(result, label);
    if (airflow && viewport.width < viewport.height) expectBelowCardBand(result, label);
    // Landscape home panel covers the left half (NDC x < .04), as in the drive shot; AIRFLOW hides it, so the car centres.
    if (airflow) expect.soft(Math.abs(result.x), `${label} car centred with the home panel hidden`).toBeLessThan(0.15);
    else if (viewport.width > viewport.height) expect.soft(result.carBounds.minX, `${label} car clear of the home panel`).toBeGreaterThan(0.04);
  }
}

// One test per map: all maps in one test outran the 180 s CI timeout on software WebGL.
for (const id of CAMERA_TRACKS) {
  test(`${id}: fixed views face the car from their own side at every viewport, AIRFLOW on and off`, async ({ page }) => {
    test.setTimeout(ciTimeout(60_000));
    await runCombos(page, id, VIEWPORTS, (viewport, airflow) => checkFixedViews(page, id, viewport, airflow), false);
  });
  if (FRESH_BOOT[id]) test(`${id}: fixed views face the car from their own side at 390x844, AIRFLOW on (fresh boot)`, async ({ page }) => {
    test.setTimeout(ciTimeout(60_000));
    await runCombos(page, id, VIEWPORTS, (viewport, airflow) => checkFixedViews(page, id, viewport, airflow), true);
  });
}

test('the showcase angle never reaches the race camera on any map, AIRFLOW on or off', async ({ page }) => {
  test.setTimeout(ciTimeout(90_000));
  await openProbe(page, VIEWPORTS[0]);
  for (const id of TRACKS) {
    for (const airflow of [false, true]) {
      const { bearing: chase } = await page.evaluate(([id, airflow]) => window.showcaseCameraProbe(id, 'drive', { airflow, racing: true, seconds: 0 }), [id, airflow]);
      for (const view of [...Object.keys(FIXED), 'orbit']) {
        const { bearing } = await page.evaluate(([id, view, airflow]) => window.showcaseCameraProbe(id, view, { airflow, racing: true, seconds: 0 }), [id, view, airflow]);
        expect.soft(gap(bearing, chase), `${id}/${view} AIRFLOW ${airflow} race bearing ${bearing.toFixed(1)}° vs chase ${chase.toFixed(1)}°`).toBeLessThan(2);
      }
    }
  }
});

const spread = values => Math.max(...values) - Math.min(...values);
// Turn rate, 9 m radius and the 360 degree sweep are pure pose maths (tests/showcase-camera.test.js); the whole-car framing of every
// orbit sample is the High detail test below. These two keep the world-level checks: steady projected rate, radius and screen x.
const id = 'taipei';
for (const [viewport, airflow] of [[VIEWPORTS[0], false], [VIEWPORTS[2], true]]) {
  test(`${id}: orbit circles the car smoothly a full 360° at ${viewport.width}x${viewport.height}, AIRFLOW ${airflow ? 'on' : 'off'}`, async ({ page }) => {
    test.setTimeout(HEAVY_TIMEOUT);
    await openProbe(page, viewport);
    const { samples: all } = await page.evaluate(([id, airflow]) => window.showcaseCameraProbe(id, 'orbit', { airflow, seconds: 41.5, every: 0.25 }), [id, airflow]);
    const samples = all.slice(6); // skip the glide in from the previous view
    // Unwrap the sampled bearings: a real orbit turns one way at a steady rate, never lurches.
    const steps = samples.slice(1).map((s, i) => ((s.bearing - samples[i].bearing + 540) % 360) - 180);
    const turned = steps.reduce((a, b) => a + b, 0);
    expect.soft(Math.abs(turned), `${id} orbit turned ${turned.toFixed(0)}°`).toBeGreaterThanOrEqual(360);
    const mean = turned / steps.length;
    const worst = steps.reduce((w, s) => Math.max(w, Math.abs(s - mean)), 0);
    expect.soft(worst, `${id} orbit rate wobbles by ${worst.toFixed(2)}° per step around ${mean.toFixed(2)}°`).toBeLessThan(Math.abs(mean) * 0.25);
    // Centred on the car: the camera keeps one radius and the car keeps its place on screen.
    const ranges = samples.map(s => s.range), xs = samples.map(s => s.x);
    expect.soft(spread(ranges), `${id} orbit radius ${Math.min(...ranges).toFixed(1)}–${Math.max(...ranges).toFixed(1)} m`).toBeLessThan(1);
    expect.soft(spread(xs), `${id} car screen x drifts ${spread(xs).toFixed(2)}`).toBeLessThan(0.12);
    // AIRFLOW hides the home panel, so nothing pushes the car off the middle of the frame.
    if (airflow) expect.soft(Math.abs(xs.reduce((a, b) => a + b, 0) / xs.length), `${id} car off centre`).toBeLessThan(0.15);
    samples.forEach((s, i) => {
      expectWholeCar(s, `${id} orbit sample ${i} (${s.bearing.toFixed(0)}°)`);
      if (airflow && viewport.width < viewport.height) expectBelowCardBand(s, `${id} orbit sample ${i}`);
    });
  });
}

// Low detail (above) draws the fewest roadside props; High draws them all, the hardest case for a clear view of the car.
async function checkHighDetail(page, id, viewport, airflow) {
  for (const view of ['drive', ...Object.keys(FIXED), 'orbit']) {
    const orbit = view === 'orbit';
    const result = await page.evaluate(([id, view, airflow, orbit]) => window.showcaseCameraProbe(id, view,
      { airflow, quality: 'high', seconds: orbit ? 41.5 : 2, every: orbit ? 0.5 : 0 }), [id, view, airflow, orbit]);
    const size = sizeLabel(viewport, airflow);
    for (const [i, s] of (orbit ? result.samples.slice(3) : [result]).entries())
      expectWholeCar(s, `${id}/${view}${orbit ? ` sample ${i}` : ''} ${size}`);
    if (view === 'drive') {
      // Drive is the curated three-quarter chase shot: the camera stays behind the car, inside the planner's edge margins.
      const { minX, maxX, minY, maxY } = result.carBounds, label = `${id}/drive ${size}`;
      expect.soft(Math.abs(result.bearing), `${label} bearing ${result.bearing.toFixed(1)}°`).toBeLessThan(90);
      expect.soft(minX, `${label} left edge`).toBeGreaterThan(-0.94);
      expect.soft(maxX, `${label} right edge`).toBeLessThan(0.94);
      expect.soft(minY, `${label} bottom edge`).toBeGreaterThan(-0.90);
      expect.soft(maxY, `${label} top edge`).toBeLessThan(0.90);
    }
  }
}
for (const id of CAMERA_TRACKS) {
  const viewports = [VIEWPORTS[0], VIEWPORTS[2]];
  test(`${id}: every view keeps the whole car in frame and unblocked at High detail at 1440x900 and 390x844, AIRFLOW on and off`, async ({ page }) => {
    test.setTimeout(HEAVY_TIMEOUT);
    await runCombos(page, id, viewports, (viewport, airflow) => checkHighDetail(page, id, viewport, airflow), false);
  });
  if (FRESH_BOOT[id]) test(`${id}: every view keeps the whole car in frame and unblocked at High detail at 390x844, AIRFLOW on (fresh boot)`, async ({ page }) => {
    test.setTimeout(HEAVY_TIMEOUT);
    await runCombos(page, id, viewports, (viewport, airflow) => checkHighDetail(page, id, viewport, airflow), true);
  });
}

// Garage uses the same course and camera dock: preserve the home shot's scene context.
for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`Garage retains home camera distance and a visible car at ${viewport.width}px`, async ({ page }) => {
    await openProbe(page, viewport);
    for (const id of TRACKS) for (const view of ['drive', ...Object.keys(FIXED), 'orbit']) {
      const [home, garage] = await page.evaluate(([id, view]) => [
        window.showcaseCameraProbe(id, view, { airflow: true }),
        window.showcaseCameraProbe(id, view, { airflow: true, garage: true }),
      ], [id, view]);
      expect.soft(garage.range, `${id}/${view}: retain scenery around the vehicle`).toBeGreaterThanOrEqual(home.range * .95);
      expectWholeCar(garage, `${id}/${view}/garage`);
    }
    await page.screenshot({ path: test.info().outputPath('garage-scene.png') });
  });
}
