import { test, expect } from './helpers/test.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`actual WebGL garage Ground/Flight 3D framing ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const preview = page.locator('#garage-preview');
    for (const mode of ['ground', 'flight']) {
      await page.locator(`button[data-garage-mode="${mode}"]`).click();
      await expect(page.locator(`button[data-garage-mode="${mode}"]`)).toHaveAttribute('aria-pressed', 'true');
      await expect(preview).toHaveAttribute('data-garage-mode', mode);
      for (const angle of ['side', 'front', 'rear', 'top', 'cinematic']) {
        await page.locator(`[data-garage-angle="${angle}"]`).click();
        await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
        if (angle === 'side') {
          const frame = await page.screenshot();
          await test.info().attach(`garage-inspection-${mode}-${viewport.width}x${viewport.height}.png`, {
            body: frame, contentType: 'image/png',
          });
        }
      }
    }
    await page.locator('button[data-garage-mode="ground"]').click();
    await expect(preview).toHaveAttribute('data-garage-mode', 'ground');
  });
}
