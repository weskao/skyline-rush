import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Phase 5 real WebGL screenshot/interaction evidence. This is not an AI render
// and software WebGL snapshots are not physical-device/thermal benchmarks.
const TOURS = ['tokyo', 'alpine', 'taipei', 'coastal', 'cosmic'];
const ALL = ['coast', 'neon', 'canyon', 'aurora', 'spiral', ...TOURS];
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 740 },
  { width: 844, height: 390 },
];

for (const id of TOURS) for (const viewport of VIEWPORTS) {
  test(`Phase 5 ${id} renders a live map, race and showroom at ${viewport.width}x${viewport.height}`, async ({ page }, info) => {
    test.setTimeout(ciTimeout(240000));
    await page.setViewportSize(viewport);
    await page.addInitScript(ids => {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
      localStorage.setItem('skyline-rush-music', 'off');
      localStorage.setItem('skyline-rush-target-fps-v1', '30');
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'medium', preset: 'cinematic', enabled: true }));
    }, ALL);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/?perf');
    // Include both supported locales without multiplying the 20 WebGL runs.
    if (viewport.width === 320) await selectLocale(page, 'zh-TW');
    await page.locator(`[data-track="${id}"]`).click();
    const choice = page.locator(`[data-track="${id}"]`);
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect(choice.locator('.track-route-map svg.route-overview')).toHaveCount(1);
    await expect(choice.locator('.route-overview-line')).toHaveCount(1);
    await expect(choice.locator('.route-start')).toHaveCount(1);
    await expect(choice.locator('.route-finish')).toHaveCount(1);
    await page.screenshot({ path: info.outputPath(`world-tour-phase5-${id}-showcase-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });

    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
    const route = page.locator('#race-route-map svg.route-overview');
    await expect(route).toHaveCount(1);
    await expect(route.locator('[data-racer]')).toHaveCount(4);
    const before = await route.evaluate(el => { window.__phase5Route = el; return el.querySelectorAll('*').length; });
    await page.waitForTimeout(700);
    expect(await route.evaluate(el => el === window.__phase5Route)).toBe(true);
    expect(await route.evaluate(el => el.querySelectorAll('*').length)).toBe(before, 'cached route SVG is reused');
    await expect(route).toHaveAttribute('role', 'img');
    await expect(route).toHaveAttribute('aria-label', /.+/);
    const perf = page.locator('#perf-overlay');
    await expect(perf).toContainText('FRAME p50');
    const metrics = await perf.evaluate(el => ({
      line: el.textContent,
      calls: Number(el.dataset.drawCalls),
      triangles: Number(el.dataset.triangles),
    }));
    expect(metrics.calls).toBeGreaterThanOrEqual(0);
    expect(metrics.triangles).toBeGreaterThanOrEqual(0);
    console.log(`Phase5 software WebGL ${id} ${viewport.width}x${viewport.height}: ${metrics.line}; drawCalls=${metrics.calls}; triangles=${metrics.triangles} (not same-device before/after)`);
    // The passive minimap must never cover an active touch control.
    const overlapped = await page.evaluate(() => {
      const map = document.querySelector('#race-route-map')?.getBoundingClientRect();
      if (!map) return ['missing route'];
      return [...document.querySelectorAll('#touch-controls [data-control]')]
        .filter(button => {
          const r = button.getBoundingClientRect();
          return r.width > 0 && r.height > 0
            && getComputedStyle(button).visibility !== 'hidden'
            && r.left < map.right && r.right > map.left && r.top < map.bottom && r.bottom > map.top;
        }).map(button => button.getAttribute('data-control'));
    });
    expect(overlapped, `${id}: minimap must not overlap playable touch buttons`).toEqual([]);
    await page.screenshot({ path: info.outputPath(`world-tour-phase5-${id}-race-${viewport.width}x${viewport.height}.png`), animations: 'disabled' });
    expect(errors).toEqual([]);
  });
}

// Quality/reduced-motion checks use the same active WebGL renderer, not CSS-only previews.
for (const quality of ['low', 'medium', 'high']) {
  test(`Phase 5 World Tour ${quality} graphics respect reduced motion`, async ({ page }, info) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.addInitScript(([ids, quality]) => {
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
      localStorage.setItem('skyline-rush-music', 'off');
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality, preset: 'realistic', enabled: true }));
    }, [ALL, quality]);
    const errors = [];
    page.on('pageerror', err => errors.push(err.message));
    test.setTimeout(ciTimeout(240000));
    await page.goto('/');
    for (const id of TOURS) {
      await page.locator(`[data-track="${id}"]`).click();
      await expect(page.locator('#world')).toBeVisible();
      await page.screenshot({ path: info.outputPath(`world-tour-phase5-${id}-${quality}-reduced-motion.png`) });
    }
    expect(errors).toEqual([]);
  });
}
