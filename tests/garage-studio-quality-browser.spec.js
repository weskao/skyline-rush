import { test, expect } from './helpers/test.js';

// Real SwiftShader WebGL is rendered here. rAF cadence is an environment-dependent
// browser-frame proxy, NOT a mobile GPU timing or a thermal/battery benchmark.
for (const quality of ['low', 'medium', 'high']) {
  test(`Garage Studio ${quality} captures real WebGL, render load and frame timing evidence`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(q => {
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({
        quality: q, enabled: q !== 'low', comfortable: q === 'low',
      }));
    }, quality);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const preview = page.locator('#garage-preview');
    await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
    const screenshot = await page.locator('#garage-preview #world').screenshot();
    const evidence = await page.evaluate(async () => {
      const times = [];
      await new Promise(resolve => {
        const tick = t => {
          times.push(t);
          if (times.length < 25) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      const gaps = times.slice(1).map((t, i) => t - times[i]).sort((a, b) => a - b);
      const percentile = p => gaps[Math.floor((gaps.length - 1) * p)];
      const preview = document.querySelector('#garage-preview');
      return {
        browser: navigator.userAgent,
        viewport: { width: innerWidth, height: innerHeight },
        quality: JSON.parse(localStorage.getItem('skyline-rush-vfx'))?.quality,
        measured: 'rAF interval proxy (software-WebGL CI; not GPU frame time)',
        frameTimeP50Ms: percentile(0.50),
        frameTimeP95Ms: percentile(0.95),
        fpsApprox: 1000 / (gaps.reduce((sum, value) => sum + value, 0) / gaps.length),
        drawCalls: Number(preview.dataset.drawCalls),
        triangles: Number(preview.dataset.triangles),
        carBounds: JSON.parse(preview.dataset.carBounds ?? '{}'),
        inFrame: preview.dataset.carInFrame === 'true',
      };
    });
    expect(evidence.quality).toBe(quality);
    expect(evidence.inFrame).toBe(true);
    expect(evidence.drawCalls).toBeGreaterThan(0);
    expect(evidence.triangles).toBeGreaterThan(0);
    expect(Number.isFinite(evidence.frameTimeP95Ms)).toBe(true);
    await test.info().attach(`garage-${quality}-390x844-webgl.png`, {body: screenshot, contentType: 'image/png'});
    await test.info().attach(`garage-${quality}-390x844-metrics.json`, {
      body: Buffer.from(JSON.stringify(evidence, null, 2)), contentType: 'application/json',
    });
  });
}

test('Garage Studio Reduced Motion renders an intact studio with auto-rotate option still accessible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
  await expect(page.locator('#garage-auto-rotate')).toBeVisible();
});
