import { test, expect } from './helpers/test.js';
import { writeFileSync } from 'node:fs';
import { parsePerformanceEvidence } from '../src/performance-evidence.ts';

import { ciTimeout } from './helpers/ci.js';

const TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
// Only Sky Spiral adds decorative upper-loop and heading overlays; any other line would be an extra route such as a shortcut.
const EXTRA = 'polyline:not(.route-overview-line):not(.route-spiral-upper):not(.route-spiral-direction)';
// A legible, complete main route: the drawn line's own box (SVG user units) and the rendered SVG box.
const routeShape = line => line.evaluate(el => {
  const b = el.getBBox(), r = el.closest('svg').getBoundingClientRect();
  return { width: b.width, height: b.height, mapWidth: r.width, mapHeight: r.height };
});
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
];

// All five share the same stored road paths and SVG controller, even after
// switching render targets. Software WebGL in CI is not physical-device profiling.
for (const track of TRACKS) for (const viewport of VIEWPORTS) {
  test(`Phase 4 ${track} map, preview and race ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    test.setTimeout(ciTimeout(240000));
    await page.setViewportSize(viewport);
    await page.addInitScript(ids => {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
      localStorage.setItem('skyline-rush-music', 'off');
      localStorage.setItem('skyline-rush-target-fps-v1', '30');
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'medium', preset: 'cinematic', enabled: true }));
    }, TRACKS);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?perf');
    await page.locator(`[data-track="${track}"]`).click();
    const button = page.locator(`[data-track="${track}"]`);
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    const overview = button.locator('.track-route-map svg.route-overview');
    await expect(overview).toHaveCount(1);
    await expect(overview.locator('.route-overview-line')).toHaveCount(1);
    await expect(overview.locator('.route-start')).toHaveCount(1);
    await expect(overview.locator('.route-finish')).toHaveCount(1);
    await expect(overview.locator('.route-spiral-upper')).toHaveCount(track === 'spiral' ? 1 : 0);
    await expect(overview.locator('.route-spiral-direction')).toHaveCount(track === 'spiral' ? 1 : 0);
    await expect(overview.locator(EXTRA)).toHaveCount(0);
    await expect(overview.locator('polyline')).toHaveCount(track === 'spiral' ? 3 : 1);
    await expect(overview.locator('.route-overview-line')).toHaveAttribute('points', /^\d/);
    const card = await routeShape(overview.locator('.route-overview-line'));
    expect(card.width, `${track} must show legible turns`).toBeGreaterThan(48);
    expect(card.height, `${track} must show full main route`).toBeGreaterThan(23);
    if (viewport.width >= 1280) { // the landscape phone card is deliberately 22 px tall; the old check ran at desktop size only
      expect(card.mapWidth, `${track} SVG must have a visible width`).toBeGreaterThan(35);
      expect(card.mapHeight, `${track} SVG must have a visible height`).toBeGreaterThan(22);
    }
    await expect(page.locator('#target-fps')).toHaveValue('30');
    await page.screenshot({path:info.outputPath(`phase4-${track}-showcase-${viewport.width}x${viewport.height}.png`),animations:'disabled'});
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const live = page.locator('#race-route-map svg.route-overview');
    await expect(live).toHaveCount(1);
    await expect(live.locator('[data-racer]')).toHaveCount(8);
    await expect(page.locator('#race-route-map')).toHaveAttribute('data-theme', track);
    await expect(live.locator(EXTRA)).toHaveCount(0);
    await expect(live.locator('polyline')).toHaveCount(track === 'spiral' ? 3 : 1);
    const race = await routeShape(live.locator('.route-overview-line'));
    expect(race.width).toBeGreaterThan(48);
    expect(race.height).toBeGreaterThan(23);
    const box = await page.locator('#race-route-map').boundingBox();
    expect(box, 'the live minimap is laid out').not.toBeNull();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
    await expect(live.locator('.route-spiral-upper')).toHaveCount(track === 'spiral' ? 1 : 0);
    await expect(live.locator('.route-spiral-direction')).toHaveCount(track === 'spiral' ? 1 : 0);
    const before = await live.evaluate(el => {
      window.__phase4MapNode = el;
      return el.querySelectorAll('*').length;
    });
    await page.waitForTimeout(450);
    expect(await live.evaluate(el => el === window.__phase4MapNode)).toBe(true);
    expect(await live.evaluate(el => el.querySelectorAll('*').length)).toBe(before, 'update markers without rebuilding SVG');
    const perf = page.locator('#perf-overlay');
    // At least one full sampled second with its load: a CPU-only runner's frames can exceed the overlay's 250 ms stall
    // cut-off for a while, so a fixed sleep could read an empty strip or a window that rounds to "0 s".
    await expect.poll(() => perf.evaluate(el => /· [1-9]\d* s$/.test(el.textContent) && Number.isInteger(Number(el.dataset.drawCalls))),
      { timeout: ciTimeout(30000) }).toBe(true);
    const metrics = await perf.evaluate(el => ({
      line: el.textContent, calls: Number(el.dataset.drawCalls),
      triangles: Number(el.dataset.triangles),
    }));
    const evidence = parsePerformanceEvidence({
      track, quality: 'medium', width: viewport.width, height: viewport.height,
      pixelRatio: await page.evaluate(() => devicePixelRatio),
      browser: process.env.CI ? 'chromium-software-webgl' : 'chromium-local-webgl',
      commit: process.env.GITHUB_SHA || 'local', drawCalls: metrics.calls,
      triangles: metrics.triangles, line: metrics.line || '',
    });
    writeFileSync(info.outputPath(`render-performance-${track}-${viewport.width}x${viewport.height}.json`),
      JSON.stringify(evidence, null, 2));
    console.log(`Classic software WebGL ${track} ${viewport.width}x${viewport.height}: ${metrics.line}; drawCalls=${metrics.calls}; triangles=${metrics.triangles}`);
    await page.screenshot({path:info.outputPath(`phase4-${track}-racing-${viewport.width}x${viewport.height}.png`),animations:'disabled'});
    expect(errors).toEqual([]);
  });
}
