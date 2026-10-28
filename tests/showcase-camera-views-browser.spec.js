import { test, expect } from '@playwright/test';

// Real WebGL camera placement for the six ready-screen views: the dock label alone
// (showcase-camera-browser.spec.js) cannot catch a camera that ends up somewhere else.
const TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic'];
const FIXED = { rear: 0, right: 90, front: 180, left: -90 };
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 1777, height: 863 }, { width: 390, height: 844 }];
const gap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

async function openProbe(page, viewport) {
  await page.setViewportSize(viewport);
  await page.goto('/tests/fixtures/showcase-camera-probe.html');
  await page.waitForFunction(() => window.showcaseCameraReady === true);
}
function expectWholeCar(result, label) {
  const { minX, maxX, minY, maxY } = result.carBounds;
  expect.soft(Math.max(-minX, maxX, -minY, maxY), `${label} car inside the frame`).toBeLessThan(1);
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
          // Landscape home panel covers the left half (NDC x < .04), as in the drive shot.
          if (viewport.width > viewport.height) expect.soft(result.carBounds.minX, `${label} car clear of the home panel`).toBeGreaterThan(0.04);
        }
      }
    });
  }
}

test('AIRFLOW race camera keeps the chosen angle in the road frame on curved and elevated roads', async ({ page }) => {
  await openProbe(page, VIEWPORTS[0]);
  for (const id of ['spiral', 'taipei', 'tokyo', 'alpine', 'coastal', 'cosmic']) {
    for (const [view, expected] of Object.entries(FIXED)) {
      const { bearing } = await page.evaluate(([id, view]) => window.showcaseCameraProbe(id, view, { airflow: true, racing: true, seconds: 0 }), [id, view]);
      expect.soft(gap(bearing, expected), `${id}/${view} race bearing ${bearing.toFixed(1)}°`).toBeLessThan(10);
    }
  }
});

for (const viewport of [VIEWPORTS[0], VIEWPORTS[2]]) {
  test(`orbit circles the car a full 360° at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openProbe(page, viewport);
    for (const id of TRACKS) {
      const { samples } = await page.evaluate(id => window.showcaseCameraProbe(id, 'orbit', { seconds: 40, every: 0.5 }), id);
      // Unwrap the sampled bearings: a real orbit turns steadily one way, never jumps back.
      let turned = 0;
      for (let i = 1; i < samples.length; i++) {
        const step = ((samples[i] - samples[i - 1] + 540) % 360) - 180;
        expect.soft(Math.abs(step), `${id} orbit jump at sample ${i}: ${samples[i - 1].toFixed(0)}° → ${samples[i].toFixed(0)}°`).toBeLessThan(20);
        turned += step;
      }
      expect.soft(Math.abs(turned), `${id} orbit turned ${turned.toFixed(0)}°`).toBeGreaterThanOrEqual(360);
    }
  });
}
