import { test, expect } from './helpers/test.js';

test('previewing a skin is visibly distinct from equipping it', async ({ page }) => {
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const basic = page.locator('[data-skin="thruster-basic"]');
  const ion = page.locator('[data-skin="thruster-ion"]');
  await expect(basic).toHaveAttribute('data-state', 'equipped');
  await ion.locator('.garage-skin-preview-hitarea').click();
  await expect(ion).toHaveAttribute('data-preview-only', 'true');
  await expect(ion.locator('.garage-skin-preview-label')).toHaveText('Previewing');
  await expect(basic).toHaveAttribute('data-state', 'equipped');
  await expect(ion).toHaveAttribute('data-owned', 'false');
  await expect(page.locator('#garage-equip')).toBeDisabled();
  await basic.locator('.garage-skin-preview-hitarea').click();
  await expect(ion).toHaveAttribute('data-preview-only', 'false');
});

test('preview glow respects reduced motion without changing ownership', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('[data-skin="thruster-ion"]');
  await ion.locator('.garage-skin-preview-hitarea').click();
  const name = await ion.locator('.garage-vfx-art').evaluate(el => getComputedStyle(el, '::after').animationName);
  expect(name).toBe('none');
  await expect(ion).toHaveAttribute('data-state', 'trial');
});
