import { test, expect } from './helpers/test.js';
import { writeFileSync } from 'node:fs';
import { parsePerformanceEvidence } from '../src/performance-evidence.ts';

import { ciTimeout } from './helpers/ci.js';

const TRACKS = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
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
    await expect(page.locator('#target-fps')).toHaveValue('30');
    await page.screenshot({path:info.outputPath(`phase4-${track}-showcase-${viewport.width}x${viewport.height}.png`),animations:'disabled'});
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const live = page.locator('#race-route-map svg.route-overview');
    await expect(live).toHaveCount(1);
    await expect(live.locator('[data-racer]')).toHaveCount(4);
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
    await expect(perf).toContainText('FRAME p50');
    await page.waitForTimeout(1700); // Allow at least one full sampling second.
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
