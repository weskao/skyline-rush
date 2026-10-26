import { test, expect } from './helpers/test.js';

const race = async (page, url) => {
  await page.goto(url);
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
};

test('?perf shows racing frame times for device checks', async ({ page }) => {
  await race(page, '/?perf');
  await expect(page.locator('#perf-overlay')).toHaveText(/^FRAME p50 \d+\.\d ms · p95 \d+\.\d ms · \d+(\.\d)? fps · \d+ s$/);
  const box = await page.locator('#perf-overlay').boundingBox();
  expect(box.y).toBeLessThan(40); // a thin strip at the top edge, not over the race view
});

test('without ?perf there is no overlay', async ({ page }) => {
  await race(page, '/');
  await page.waitForTimeout(800);
  await expect(page.locator('#perf-overlay')).toHaveCount(0);
});


// CI's software-WebGL measurements are repeatable benchmarks, not physical-device
// or before/after hardware measurements. Never set a brittle FPS threshold here.
for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
  test(`optimized racing frame p50/p95 is observable at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await race(page, '/?perf');
    const meter = page.locator('#perf-overlay');
    await expect(meter).toContainText('FRAME p50');
    await page.waitForTimeout(2200);
    const displayed = await meter.textContent();
    const match = /^FRAME p50 (\d+\.\d) ms · p95 (\d+\.\d) ms · (\d+(?:\.\d)?) fps · (\d+) s$/.exec(displayed ?? '');
    expect(match, 'frame metrics available in both viewport sizes').not.toBeNull();
    const [, p50, p95, fps, seconds] = match;
    expect(Number(p50)).toBeGreaterThan(0);
    expect(Number(p95)).toBeGreaterThanOrEqual(Number(p50));
    expect(Number(fps)).toBeGreaterThan(0);
    console.log(`Optimized CI software-WebGL ${viewport.width}x${viewport.height}: p50=${p50}ms p95=${p95}ms fps=${fps} window=${seconds}s (not physical device or before/after)`);
  });
}
