import { test, expect } from './helpers/test.js';
import { chooseGarageAngle } from './helpers/garage-angle.js';

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`actual WebGL garage Ground/Flight 3D framing ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const preview = page.locator('#garage-preview');
    for (const mode of ['ground', 'flight']) {
      if (await preview.getAttribute('data-garage-mode') !== mode) await page.locator('#garage-pose-action').click();
      await expect(preview).toHaveAttribute('data-garage-mode', mode);
      for (const angle of ['side', 'front', 'rear', 'top', 'cinematic']) {
        await chooseGarageAngle(page, angle);
        await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
        if (angle === 'side') {
          const frame = await page.screenshot();
          await test.info().attach(`garage-inspection-${mode}-${viewport.width}x${viewport.height}.png`, {
            body: frame, contentType: 'image/png',
          });
        }
      }
    }
    await page.locator('#garage-pose-action').click();
    await expect(preview).toHaveAttribute('data-garage-mode', 'ground');
  });
}

for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
  test(`actual WebGL Studio wing toggle keeps the car framed ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await page.locator('#garage-studio-open').click();
    const preview = page.locator('#garage-preview');
    const wing = page.locator('#garage-wing');
    await expect(wing).toHaveAttribute('aria-checked', 'false');
    for (const mode of ['ground', 'flight']) {
      if (await preview.getAttribute('data-garage-mode') !== mode) await page.locator('#garage-pose-action').click();
      await expect(preview).toHaveAttribute('data-garage-mode', mode);
      await wing.click();
      await expect(wing).toHaveAttribute('aria-checked', 'true');
      await expect(preview).toHaveAttribute('data-garage-wing', 'true');
      for (const angle of ['side', 'rear', 'cinematic']) {
        await chooseGarageAngle(page, angle);
        await expect(preview, 'an angle preset keeps the wing choice').toHaveAttribute('data-garage-wing', 'true');
        await expect(preview).toHaveAttribute('data-car-in-frame', 'true');
      }
      await page.waitForTimeout(700); // let the wing finish opening before the evidence shot
      await test.info().attach(`garage-wing-open-${mode}-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot(), contentType: 'image/png',
      });
      await wing.click();
      await expect(wing).toHaveAttribute('aria-checked', 'false');
      await expect(preview).toHaveAttribute('data-garage-wing', 'false');
    }
    await wing.click();
    await page.locator('#garage-reset').click();
    await expect(wing).toHaveAttribute('aria-checked', 'true');
    await expect(preview).toHaveAttribute('data-garage-mode', 'flight');
  });
}
