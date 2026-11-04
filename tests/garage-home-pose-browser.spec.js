import { test, expect } from './helpers/test.js';

// The Garage home page carries the Studio's ground / flight / wing pose buttons, and the showroom keeps
// as much of the screen as possible: pose buttons and camera dock share one row beneath it.
for (const size of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
  test(`Garage home shows the three pose buttons under the showroom ${size.width}x${size.height}`, async ({ page }) => {
    await page.setViewportSize(size);
    await page.goto('/');
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen')).toHaveAttribute('data-page', 'home');

    const ground = page.locator('button[data-garage-mode="ground"]');
    const flight = page.locator('button[data-garage-mode="flight"]');
    const wing = page.locator('#garage-wing');
    for (const button of [ground, flight, wing]) await expect(button).toBeVisible();
    await expect(ground).toHaveAttribute('aria-pressed', 'true');

    const box = async locator => locator.boundingBox();
    const preview = await box(page.locator('#garage-preview'));
    for (const button of [ground, flight, wing, page.locator('#showcase-camera-next')]) {
      const b = await box(button);
      expect(b.y).toBeGreaterThanOrEqual(preview.y + preview.height - 1); // never over the car
      expect(b.x).toBeGreaterThanOrEqual(0);
      expect(b.x + b.width).toBeLessThanOrEqual(size.width + 1);
      expect(b.y + b.height).toBeLessThanOrEqual(size.height + 1);
    }
    // Controls and dock stay clear of each other.
    const [g, w, n] = await Promise.all([box(ground), box(wing), box(page.locator('#showcase-camera-next'))]);
    expect(w.x + w.width <= n.x + 1 || n.x + n.width <= g.x + 1 || n.y >= w.y + w.height - 1).toBe(true);

    await flight.click();
    await expect(flight).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-mode', 'flight');
    await wing.click();
    await expect(wing).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#garage-preview')).toHaveAttribute('data-garage-wing', 'true');
    await page.waitForTimeout(900); // wing travel + hover wheels fold
    // The showroom dollies in: the car fills most of the canvas (NDC span 2 = full width/height) and stays inside it.
    const preview$ = page.locator('#garage-preview');
    await expect(preview$).toHaveAttribute('data-car-in-frame', 'true');
    const fill = JSON.parse(await preview$.getAttribute('data-car-bounds'));
    // Regression guard: before the dolly-in the home car spanned ~26% of the showroom.
    expect(Math.max((fill.maxX - fill.minX) / 2, (fill.maxY - fill.minY) / 2)).toBeGreaterThan(.45);
    const shot = test.info().outputPath(`garage-home-pose-${size.width}x${size.height}.png`);
    await page.screenshot({ path: shot });
    await test.info().attach('actual-Garage-Home-Pose-WebGL', { path: shot });

    // The same pose carries into the Studio and back.
    await page.locator('#garage-studio-open').click();
    await expect(page.locator('button[data-garage-mode="flight"]')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#garage-studio-back').click();
    await expect(flight).toBeVisible();
    await expect(flight).toHaveAttribute('aria-pressed', 'true');
  });
}
