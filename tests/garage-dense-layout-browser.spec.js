import { test, expect } from './helpers/test.js';

const sizes = [
  { width: 1440, height: 900 }, { width: 390, height: 844 },
  { width: 320, height: 740 }, { width: 844, height: 390 },
];
for (const size of sizes) {
  test(`Garage Home and Studio reclaim viewport ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await page.locator('#garage-button').click();

    const measure = () => page.evaluate(() => {
      const rect = sel => {
        const { x, y, width, height, right, bottom } = document.querySelector(sel).getBoundingClientRect();
        return { x, y, width, height, right, bottom };
      };
      const controls = document.querySelector('.garage-camera-controls');
      return {
        screen: rect('#garage-screen'),
        preview: rect('#garage-preview'),
        header: rect('.garage-heading'),
        entry: rect('#garage-studio-open'),
        collection: rect('#garage-screen .garage-collection'),
        navWrap: getComputedStyle(controls).flexWrap,
        collectionScrollable: getComputedStyle(document.querySelector('#garage-screen .garage-collection')).overflowY,
      };
    });

    const home = await measure();
    expect(home.screen.width).toBeGreaterThanOrEqual(size.width - 2);
    expect(home.preview.width).toBeGreaterThan(size.width * .63);
    expect(home.preview.height).toBeGreaterThan(size.height * .4);
    expect(home.entry.bottom).toBeLessThanOrEqual(home.header.bottom + 2);
    const homeImage = test.info().outputPath(`garage-dense-home-${size.width}x${size.height}.png`);
    await page.screenshot({ path: homeImage });
    await test.info().attach('actual-Garage-Home-WebGL', { path: homeImage });

    await page.locator('#garage-studio-open').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    const studio = await measure();
    expect(studio.preview.width).toBeGreaterThan(size.width * .63);
    expect(studio.preview.height).toBeGreaterThan(size.height * .31);
    expect(studio.navWrap).toBe('nowrap');
    expect(studio.collectionScrollable).toBe('auto');
    await expect(page.locator('button[data-garage-mode="ground"]')).toBeVisible();
    await expect(page.locator('button[data-garage-mode="flight"]')).toBeVisible();
    await page.locator('button[data-garage-mode="flight"]').click();
    await page.locator('[data-garage-angle="side"]').click();
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-car-in-frame', 'true');
    const flightImage = test.info().outputPath(`garage-dense-flight-${size.width}x${size.height}.png`);
    await page.screenshot({ path: flightImage });
    await test.info().attach('actual-Garage-Studio-Flight-WebGL', { path: flightImage });
    const viewport = await page.locator('#garage-preview').boundingBox();
    expect(viewport.x).toBeGreaterThanOrEqual(-1);
    expect(viewport.right ?? viewport.x + viewport.width).toBeLessThanOrEqual(size.width + 1);
  });
}
