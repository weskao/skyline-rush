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

test('deep diagnostics separate home, race and pause with explicit GPU availability', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-target-fps-v1', '30'));
  await page.goto('/?perf=deep&seed=12345');
  const meter = page.locator('#perf-overlay');
  const snapshot = () => meter.evaluate(el => JSON.parse(el.dataset.deep || '{}'));
  await expect.poll(async () => (await snapshot()).reports?.['home/coast']?.load?.drawCalls ?? 0).toBeGreaterThan(0);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await expect.poll(async () => (await snapshot()).reports?.['racing/coast']?.metrics?.frameIntervalMs?.count ?? 0).toBeGreaterThan(1);
  const current = await snapshot(), race = current.reports['racing/coast'];
  expect(race.metrics.cpuSimulationMs.count).toBeGreaterThan(0);
  expect(race.metrics.cpuRenderSubmissionMs.count).toBeGreaterThan(0);
  expect(race.metrics.frameIntervalMs.p99).toBeGreaterThanOrEqual(race.metrics.frameIntervalMs.p95);
  expect(race.config.targetWidth).toBeGreaterThan(0);
  expect(race.config.msaa).toBeGreaterThan(0);
  expect(race.config.targetFps).toBe(30);
  expect(race.config.renderScale).toBe(1);
  expect(['available','unsupported','disjoint','context-lost']).toContain(current.gpuStatus);
  await page.locator('#pause-button').click();
  await expect.poll(async () => (await snapshot()).current).toBe('paused/coast');
  expect((await snapshot()).reports['racing/coast']).toBeDefined();
});
