import { test, expect } from './helpers/test.js';
import { mkdir } from 'node:fs/promises';

for (const quality of ['low', 'medium', 'high']) {
  test(`Garage paint collection has large true-color car previews at ${quality}`, async ({ page }) => {
    await page.setViewportSize({width: 390, height: 844});
    await page.addInitScript(q => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: q, enabled: true })), quality);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const options = page.locator('.garage-collection .paint-options button');
    await expect(options).toHaveCount(7);
    await expect(page.locator('body')).toHaveAttribute('data-vfx-quality', quality);
    const paints = ['pearl', 'crimson', 'aurora', 'glacier', 'coral', 'cobalt', 'obsidian'];
    for (const id of paints) {
      const button = page.locator(`[data-paint="${id}"]`);
      const preview = button.locator('.garage-paint-preview');
      await expect(preview).toHaveAttribute('data-finish', id);
      const box = await preview.boundingBox();
      expect(box?.height).toBeGreaterThanOrEqual(70);
      await expect(preview.locator('img.garage-paint-image')).toBeVisible();
      await expect(preview.locator('img.garage-paint-image')).toHaveAttribute('src', new RegExp(id + '@3x\\.webp'));
      expect(await preview.locator('img.garage-paint-image').evaluate(img => img.naturalWidth)).toBe(960);
      expect(await preview.locator('img.garage-paint-image').evaluate(img => img.naturalHeight)).toBe(510);
    }
    const sweep = await page.locator('[data-paint="pearl"] .garage-paint-sheen').evaluate(node => getComputedStyle(node).animationName);
    expect(sweep === 'none').toBe(quality === 'low');
    await page.locator('[data-paint="obsidian"]').click();
    await expect(page.locator('#garage-equip')).toBeDisabled();
    await expect(page.locator('[data-paint="obsidian"]')).toHaveAttribute('aria-pressed', 'true');
    // The existing foldable screenshot upload step preserves real responsive browser evidence.
    await mkdir('test-results/garage', { recursive: true });
    const shot = await page.locator('#garage-screen').screenshot({ path: `test-results/garage/foldable-garage-paints-${quality}.png` });
    await test.info().attach(`garage-paints-${quality}-390x844.png`, {body: shot, contentType: 'image/png'});
  });
}

test('Garage paint respects Reduced Motion even on High', async ({page}) => {
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality:'high', enabled:true })));
  await page.goto('/');
  await page.locator('#garage-button').click();
  const animation = await page.locator('[data-paint="pearl"] .garage-paint-sheen').evaluate(node => getComputedStyle(node).animationName);
  expect(animation).toBe('none');
});

test('Garage selection confirms vehicle and paint presses and keeps previews separate from equipped paint', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low', enabled: true })));
  await page.goto('/');
  await page.locator('#garage-button').click();
  const car = page.locator('[data-car="roadster"]');
  const paint = page.locator('[data-paint="crimson"]');
  const pearl = page.locator('[data-paint="pearl"]');
  // Observe the animation at the moment the click bubbles. A later query can miss a short effect on software WebGL.
  await page.locator('#garage-screen').evaluate(garage => {
    garage.addEventListener('click', event => {
      const card = event.target.closest('[data-car], [data-paint]');
      if (card) card.dataset.animated = String(Boolean(card.querySelector('.garage-selection-flash')?.getAnimations().length));
    });
  });

  await car.click();
  await expect(car).toHaveAttribute('data-animated', 'true');
  await car.evaluate(node => { delete node.dataset.animated; });
  await car.focus();
  await page.keyboard.press('Enter');
  await expect(car).toHaveAttribute('data-animated', 'true');

  await paint.click();
  await expect(paint).toHaveAttribute('data-animated', 'true');
  await expect(paint).toHaveAttribute('aria-pressed', 'true');
  await expect(paint.getByText('Previewing')).toBeVisible();
  await expect(pearl).toHaveAttribute('data-state', 'equipped');
  expect(await page.evaluate(() => localStorage.getItem('skyline-rush-paint'))).toBeNull();

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await paint.click();
  await expect(paint).toHaveAttribute('data-animated', 'false');
  await expect(paint.getByText('Previewing')).toBeVisible();
  await page.locator('#garage-equip').click();
  await expect(paint).toHaveAttribute('data-state', 'equipped');
  await expect(paint.getByText('Previewing')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('skyline-rush-paint')))).toBe('crimson');
});
