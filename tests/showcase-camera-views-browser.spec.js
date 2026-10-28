import { test, expect } from '@playwright/test';
import { PORTRAIT_CAR_TOP } from './showcase-car-zone.js';
import { RACE_TRACKS } from '../src/game.js';

// Real WebGL camera placement for the six ready-screen views: the dock label alone
// (showcase-camera-browser.spec.js) cannot catch a camera that ends up somewhere else.
// Every map, current and future: a new track joins these checks by being added to RACE_TRACKS.
const TRACKS = Object.keys(RACE_TRACKS);
const FIXED = { rear: 0, right: 90, front: 180, left: -90 };
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 1777, height: 863 }, { width: 390, height: 844 }];
const gap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

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
}
// The top band of a portrait phone is left to the AIRFLOW telemetry card (showcase-camera-browser.spec.js).
function expectBelowCardBand(result, label) {
  expect.soft((1 - result.carBounds.maxY) / 2, `${label} car top, as a share of the screen height`).toBeGreaterThanOrEqual(PORTRAIT_CAR_TOP);
}

for (const viewport of VIEWPORTS) {
  for (const airflow of [false, true]) {
    test(`fixed views face the car from their own side at ${viewport.width}x${viewport.height}, AIRFLOW ${airflow ? 'on' : 'off'}`, async ({ page }) => {
      await openProbe(page, viewport);
      for (const id of TRACKS) {
        for (const [view, expected] of Object.entries(FIXED)) {
          const result = await page.evaluate(([id, view, airflow]) => window.showcaseCameraProbe(id, view, { airflow }), [id, view, airflow]);
          const label = `${id}/${view}`;
          expect.soft(gap(result.bearing, expected), `${label} bearing ${result.bearing.toFixed(1)}°`).toBeLessThan(25);
          expectWholeCar(result, label);
          if (airflow && viewport.width < viewport.height) expectBelowCardBand(result, label);
          // Landscape home panel covers the left half (NDC x < .04), as in the drive shot; AIRFLOW hides it, so the car centres.
          if (airflow) expect.soft(Math.abs(result.x), `${label} car centred with the home panel hidden`).toBeLessThan(0.15);
          else if (viewport.width > viewport.height) expect.soft(result.carBounds.minX, `${label} car clear of the home panel`).toBeGreaterThan(0.04);
        }
      }
    });
  }
}

test('every map is covered', () => {
  expect(TRACKS.length, TRACKS.join(',')).toBeGreaterThanOrEqual(10);
});

for (const viewport of VIEWPORTS) {
  for (const airflow of [false, true]) {
    test(`drive view frames the whole car at ${viewport.width}x${viewport.height}, AIRFLOW ${airflow ? 'on' : 'off'}`, async ({ page }) => {
      await openProbe(page, viewport);
      for (const id of TRACKS) {
        const result = await page.evaluate(([id, airflow]) => window.showcaseCameraProbe(id, 'drive', { airflow }), [id, airflow]);
        expectWholeCar(result, `${id}/drive`);
        // Drive is the curated three-quarter chase shot: the camera stays behind the car.
        expect.soft(Math.abs(result.bearing), `${id}/drive bearing ${result.bearing.toFixed(1)}°`).toBeLessThan(90);
      }
    });
  }
}

test('AIRFLOW race camera keeps the chosen angle in the road frame on curved and elevated roads', async ({ page }) => {
  await openProbe(page, VIEWPORTS[0]);
  for (const id of TRACKS) {
    for (const [view, expected] of Object.entries(FIXED)) {
      const { bearing } = await page.evaluate(([id, view]) => window.showcaseCameraProbe(id, view, { airflow: true, racing: true, seconds: 0 }), [id, view]);
      expect.soft(gap(bearing, expected), `${id}/${view} race bearing ${bearing.toFixed(1)}°`).toBeLessThan(10);
    }
  }
});

const spread = values => Math.max(...values) - Math.min(...values);
for (const viewport of VIEWPORTS) {
  for (const airflow of [false, true]) {
    test(`orbit circles the car smoothly a full 360° at ${viewport.width}x${viewport.height}, AIRFLOW ${airflow ? 'on' : 'off'}`, async ({ page }) => {
      await openProbe(page, viewport);
      for (const id of TRACKS) {
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
      }
    });
  }
}

// Low detail (above) draws the fewest roadside props; High draws them all, the hardest case for a clear view of the car.
for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`every view keeps the whole car in frame and unblocked at High detail at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openProbe(page, viewport);
    for (const id of TRACKS) {
      for (const airflow of [false, true]) {
        for (const view of ['drive', ...Object.keys(FIXED), 'orbit']) {
          const orbit = view === 'orbit';
          const result = await page.evaluate(([id, view, airflow, orbit]) => window.showcaseCameraProbe(id, view,
            { airflow, quality: 'high', seconds: orbit ? 41.5 : 2, every: orbit ? 0.5 : 0 }), [id, view, airflow, orbit]);
          for (const [i, s] of (orbit ? result.samples.slice(3) : [result]).entries())
            expectWholeCar(s, `${id}/${view}${orbit ? ` sample ${i}` : ''} AIRFLOW ${airflow ? 'on' : 'off'}`);
        }
      }
    }
  });
}
