import { test, expect } from './helpers/test.js';

test('players can read bilingual release notes, dismiss and reopen them', async ({ page }) => {
  await page.goto('/');
  const opener = page.locator('#whats-new-open');
  await expect(opener).toBeVisible();
  await opener.click();
  const dialog = page.locator('#whats-new-screen');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#release-title')).toHaveText("What's new");
  await expect(dialog.locator('.release-entry')).not.toHaveCount(0);
  await page.locator('#locale-select').selectOption('zh-TW', { force: true });
  await expect(dialog.locator('#release-title')).toHaveText('新版本功能');
  await expect(dialog.locator('.release-entry').first().locator('strong')).toContainText(/[\u3400-\u9fff]/);
  await page.screenshot({path: test.info().outputPath('whats-new-zh-TW.png')});
  await page.locator('#release-continue').click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await expect(page.evaluate(() => localStorage.getItem('skyline-rush-whats-new-seen-v1'))).not.toBeNull();
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('release hero image uses bundled localized assets and notes do not leak racing shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  const hero = dialog.locator('#release-hero');
  await expect(hero).toBeVisible();
  await expect(hero).toHaveAttribute('src', /og-image\.en\.jpeg/);
  await page.locator('#locale-select').selectOption('zh-TW', { force: true });
  await expect(hero).toHaveAttribute('src', /og-image\.zh-TW\.jpeg/);
  await page.keyboard.press('Enter'); // dialog control, not race start
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});

for (const [width, height] of [[1440,900],[390,844],[320,740],[844,390]]) {
  test.describe(`release dialog ${width}x${height}`, () => {
    test.use({viewport:{width,height}});
    test('dialog fits safe viewport and primary controls are clickable', async ({page}) => {
      await page.goto('/');
      await page.locator('#whats-new-open').click();
      const d=page.locator('#whats-new-screen'), close=page.locator('#release-continue');
      await expect(d).toBeVisible();
      await page.screenshot({ path: test.info().outputPath('whats-new-' + width + 'x' + height + '.png') });
      const box=await d.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
      expect(box.y+box.height).toBeLessThanOrEqual(height+1);
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await close.click();
      await expect(d).toBeHidden();
    });
  });
}
