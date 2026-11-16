import { test, expect, openGarage } from './helpers/test.js';

// The home showcase camera dock is reused (one id) on the Garage page to inspect the body from every angle.
// The chosen view is showcase-only: AIRFLOW just toggles the effect and a race keeps the chase camera.
for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Garage page hosts the camera dock and hands it back ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect(page.locator('#start-button')).toBeVisible();
    await expect(page.locator('#showcase-camera-dock')).toHaveCount(1);
    await openGarage(page);
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

test.describe('Garage landscape touch controls', () => {
  test.use({ hasTouch: true, isMobile: true, locale: 'zh-TW' });

  for (const [width, height] of [[667, 375], [743, 340], [756, 265], [844, 390]]) {
    test(`pose and camera controls stay tappable at ${width}x${height}`, async ({ page }) => {
      await page.setViewportSize({ width, height });
      // Use the same preview workload at every size so geometry checks don't depend on the test GPU.
      await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' })));
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/');
      await openGarage(page);

      const preview = page.locator('#garage-preview');
      const dock = page.locator('#garage-screen #showcase-camera-dock');
      const controls = page.locator('#garage-screen .garage-mode-controls');
      const [car, camera, poses] = await Promise.all([preview.boundingBox(), dock.boundingBox(), controls.boundingBox()]);
      expect(poses.y).toBeGreaterThanOrEqual(car.y + car.height - 1);
      expect(camera.y).toBeGreaterThanOrEqual(car.y + car.height - 1);
      const overlapX = Math.min(camera.x + camera.width, poses.x + poses.width) - Math.max(camera.x, poses.x);
      const overlapY = Math.min(camera.y + camera.height, poses.y + poses.height) - Math.max(camera.y, poses.y);
      expect(Math.min(overlapX, overlapY), 'camera dock overlaps the pose and lighting controls').toBeLessThanOrEqual(1);

      const flight = controls.locator('[data-garage-mode="flight"]');
      const ground = controls.locator('[data-garage-mode="ground"]');
      const wing = controls.locator('#garage-wing');
      const lighting = controls.locator('#garage-lighting');
      const previous = dock.locator('#showcase-camera-prev');
      const next = dock.locator('#showcase-camera-next');
      const targets = await Promise.all([ground, flight, wing, lighting, previous, next].map(control =>
        control.evaluate(button => {
          const { x, y, width, height } = button.getBoundingClientRect();
          const hit = button.contains(document.elementFromPoint(x + width / 2, y + height / 2));
          return { x, y, width, height, hit, name: button.id || button.getAttribute('aria-label') };
        })));
      for (const bounds of targets) {
        expect(bounds.width).toBeGreaterThanOrEqual(44);
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.x).toBeGreaterThanOrEqual(car.x - 1);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(car.x + car.width + 1);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(height);
        expect(bounds.hit, `${bounds.name} receives pointer hits`).toBe(true);
      }
      await expect(ground).toHaveAccessibleName('平地');
      await expect(flight).toHaveAccessibleName('起飛');
      for (const pose of [ground, flight]) {
        await expect(pose).toHaveText('');
        await expect(pose.locator('img')).toHaveJSProperty('naturalWidth', 120);
      }

      await flight.tap();
      await expect(ground).toHaveAttribute('aria-pressed', 'false');
      await expect(flight).toHaveAttribute('aria-pressed', 'true');
      await expect(preview).toHaveAttribute('data-garage-mode', 'flight');
      await wing.tap();
      await expect(wing).toHaveRole('switch');
      await expect(wing).toHaveAttribute('aria-checked', 'true');
      await expect(preview).toHaveAttribute('data-garage-wing', 'true');
      await lighting.tap();
      await expect(lighting).toHaveAttribute('data-lighting', 'dim');
      await next.tap();
      await expect(dock).toHaveAttribute('data-view', 'front');
    });
  }
});

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
