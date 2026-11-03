import { test, expect } from './helpers/test.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

// Real WebGL Stage 2 showroom, served by the dev server (the only build where the gate is compiled in;
// see playwright.world-tour.config.js). Set FROSTBITE_CAPTURE_DIR to keep the evidence frames.
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }];
const captureDir = process.env.FROSTBITE_CAPTURE_DIR;

async function openPreview(page, shot, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast']));
    localStorage.setItem('skyline-rush-locale', 'en');
  });
  await page.goto(`/?stage2-preview=frostbite-canyon&shot=${shot}`);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
}
const frame = page => page.locator('#world').screenshot({ animations: 'disabled' });
/** Share of pixels that changed between two PNG frames (decoded in the page; no image dependency). */
const changedShare = (page, a, b) => page.evaluate(async ([a, b]) => {
  const load = async src => {
    const img = new Image(); img.src = 'data:image/png;base64,' + src; await img.decode();
    const c = new OffscreenCanvas(img.width, img.height).getContext('2d'); c.drawImage(img, 0, 0);
    return c.getImageData(0, 0, img.width, img.height).data;
  };
  const [x, y] = await Promise.all([load(a), load(b)]);
  let changed = 0;
  for (let i = 0; i < x.length; i += 4) if (Math.abs(x[i] - y[i]) + Math.abs(x[i + 1] - y[i + 1]) + Math.abs(x[i + 2] - y[i + 2]) > 6) changed++;
  return changed / (x.length / 4);
}, [a.toString('base64'), b.toString('base64')]);

for (const shot of ['p01', 'p02']) for (const viewport of VIEWPORTS) {
  test(`Frostbite ${shot} is live animated WebGL with Start disabled at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await openPreview(page, shot, viewport);
    await expect(page.locator('#start-button')).toBeDisabled();
    await expect(page.locator('#start-button span')).toHaveText('COMING SOON');
    await expect(page.locator('#track-length')).toContainText('13.8');
    await expect(page.locator('#upcoming-scene')).toBeHidden(); // live 3D, not the cover image
    await expect(page.locator('[data-upcoming-track="frostbite-canyon"]')).toHaveCount(0);
    await page.keyboard.press('Enter');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
    await page.waitForTimeout(1500);
    const first = await frame(page);
    await page.waitForTimeout(1200);
    const second = await frame(page);
    expect(await changedShare(page, first, second), 'aurora/snow move between time-separated frames').toBeGreaterThan(0.002);
    if (captureDir) {
      mkdirSync(captureDir, { recursive: true });
      await page.screenshot({ path: join(captureDir, `${shot}-${viewport.width}x${viewport.height}.png`) });
    }
  });
}

test('Reduced Motion holds the Frostbite showroom still', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openPreview(page, 'p01', VIEWPORTS[0]);
  await page.waitForTimeout(1500);
  const first = await frame(page);
  await page.waitForTimeout(1200);
  // Only the shared car exhaust (aero-vfx, identical on Stage 1 scenes) may still shimmer; scenery holds still.
  expect(await changedShare(page, first, await frame(page)), 'no ambient scenery motion').toBeLessThan(0.002);
  if (captureDir) await page.screenshot({ path: join(captureDir, 'p01-reduced-motion-1440x900.png') });
});
