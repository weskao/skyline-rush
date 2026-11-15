import { openStudioAngles } from './helpers/garage-browser.js';
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
      return {
        screen: rect('#garage-screen'),
        preview: rect('#garage-preview'),
        header: rect('.garage-heading'),
        entry: rect('#garage-studio-open'),
        collection: rect('#garage-screen .garage-collection'),
        collectionScrollable: getComputedStyle(document.querySelector('#garage-catalog-scroll')).overflowY,
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
    expect(studio.collectionScrollable).toBe('auto');
    await expect(page.locator('button[data-garage-mode="ground"]')).toBeVisible();
    await expect(page.locator('button[data-garage-mode="flight"]')).toBeVisible();
    await page.locator('button[data-garage-mode="flight"]').click();
    await openStudioAngles(page);
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

for (const size of sizes) {
  test(`Garage category and paint controls stay available while the catalog scrolls at ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const preview = page.locator('#garage-preview');
    const cars = page.getByRole('button', { name: 'Cars', exact: true });
    const paints = page.getByRole('button', { name: 'Paints', exact: true });
    const effects = page.getByRole('button', { name: 'Effects', exact: true });
    await expect(cars).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('[data-paint="pearl"]')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Missions', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: 'Demo Store', exact: true })).toBeInViewport();
    const original = await preview.boundingBox();
    expect(original.height).toBeGreaterThan(size.height * .4);
    if (size.width > size.height) {
      const navigation = await paints.boundingBox();
      expect(navigation.x).toBeGreaterThan(original.x + original.width);
    }
    await paints.click();
    await expect(page.locator('[data-car="roadster"]')).toBeHidden();
    await page.locator('[data-paint="obsidian"]').click();
    await expect(page.locator('#garage-status')).toContainText(/unlocks at \d+ stars/);
    await expect(page.locator('#garage-equip')).toBeInViewport({ ratio: .99 });
    await expect(page.locator('#garage-equip')).toBeDisabled();
    await expect(preview).toBeInViewport({ ratio: .99 });
    await effects.click();
    await expect(page.locator('[data-paint="obsidian"]')).toBeHidden();
    await expect(page.locator('#garage-vfx-catalog')).toBeVisible();
  });
}
