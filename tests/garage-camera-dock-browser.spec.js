import { test, expect } from './helpers/test.js';

// The home showcase camera dock is reused (one id) on the Garage page to inspect the body from every angle.
// The chosen view is showcase-only: AIRFLOW just toggles the effect and a race keeps the chase camera.
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Garage page hosts the camera dock and hands it back ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#start-button')).toBeVisible();
    await expect(page.locator('#showcase-camera-dock')).toHaveCount(1);
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');

    const dock = page.locator('#garage-screen #showcase-camera-dock');
    await expect(dock).toBeVisible();
    await expect(page.locator('#showcase-camera-dock')).toHaveCount(1);
    // It sits under the showroom, never over the car.
    const [dockBox, previewBox] = await Promise.all([dock.boundingBox(), page.locator('#garage-preview').boundingBox()]);
    expect(dockBox.y).toBeGreaterThanOrEqual(previewBox.y + previewBox.height - 1);
    const screenBox = await page.locator('#garage-screen').boundingBox();
    expect(dockBox.y + dockBox.height).toBeLessThanOrEqual(screenBox.y + screenBox.height + 1);

    const name = page.locator('#showcase-camera-name');
    const before = await name.textContent();
    await page.locator('#showcase-camera-next').click();
    await expect(name).not.toHaveText(before);

    await page.locator('#garage-studio-open').click();
    await expect(dock).toBeHidden();
    await page.locator('#garage-studio-back').click();
    await expect(dock).toBeVisible();

    await page.locator('#garage-close').click();
    await expect(page.locator('#app > #showcase-camera-dock, #app #showcase-camera-dock')).toHaveCount(1);
    await expect(page.locator('#garage-screen #showcase-camera-dock')).toHaveCount(0);
  });
}

test('AIRFLOW toggle only switches the effect: it neither stores nor applies a showcase camera in the race', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('#start-button')).toBeVisible();
  for (let i = 0; i < 2; i++) await page.locator('#showcase-camera-next').click(); // drive -> front -> rear
  await page.locator('#airflow-toggle').click();
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'true');
  await page.locator('#airflow-toggle').click();
  await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'false');
  // The dock keeps its own selection for the showcase; the toggle did not reset or consume it.
  await expect(page.locator('#showcase-camera-dock')).not.toHaveAttribute('data-view', 'drive');
});
