import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('actual Garage mission cards and source icons preserve native 3x alpha on mobile and desktop', async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const board = page.locator('.garage-mission-board');
    await expect(board).toBeVisible();
    await expect(board).toHaveAttribute('data-mission-state', 'local-demo');
    await expect(board.locator('.garage-mission-card')).toHaveCount(4);
    await expect(board).toContainText('Demo progress and trophies are local');
    await expect(board).not.toContainText(/claim reward|reward received|領取獎勵|已領取/);
    for (const img of await board.locator('img').all()) {
      await img.scrollIntoViewIfNeeded();
      await expect(img).toHaveAttribute('width', '96');
      await expect(img).toHaveAttribute('height', '96');
      await expect(img).toHaveJSProperty('naturalWidth', 288);
      await expect(img).toHaveJSProperty('naturalHeight', 288);
      // Alpha margins (>= 20 px) are asserted on the PNG files in tests/rewards-visual-contract.test.js.
    }
  }
});

test('Garage Missions stay truthful in Traditional Chinese and fall back on missing artwork', async ({ page }) => {
  await page.route('**/mission-race@3x.png', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const board = page.locator('.garage-mission-board');
  await expect(board).toContainText('任務中心');
  await expect(board).toContainText('試玩進度與獎盃僅儲存在本機');
  await expect(board.locator('.garage-period-card progress').first()).toHaveAttribute('aria-label', '競速挑戰 每日: 0 / 1');
  await expect(board.locator('[data-mission-id="mission-race"] .artwork-fallback')).toBeVisible();
  await expect(board.locator('[data-mission-id="mission-race"]')).toContainText('競速挑戰');
  await expect(board).not.toContainText(/領取|已完成|已獲得/);
});

test('Garage shows all eight PNGs in the actual interface without opening the concept gallery', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  const board = page.locator('.garage-mission-board');
  await expect(board.locator('[data-mission-id] img')).toHaveCount(4);
  await expect(board.locator('[data-trophy-id] img')).toHaveCount(4);
  for (const trophy of await board.locator('[data-trophy-id]').all()) {
    const img = trophy.locator('img');
    await img.scrollIntoViewIfNeeded();
    await expect(img).toHaveAttribute('width', '96');
    await expect(img).toHaveJSProperty('naturalWidth', 288);
    await expect(trophy).toContainText('Display only');
  }
  await expect(page.locator('#garage-art-source-garage-rewards-and-missions')).not.toHaveAttribute('open', '');
  await expect(board).not.toContainText(/Claim|Redeem|Earned|立即領取|已獲得/);
});

test('Garage trophy display preserves Traditional Chinese and missing-image fallback', async ({ page }) => {
  await page.route('**/trophy-gold@3x.png', route => route.abort());
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const trophy = page.locator('.garage-mission-board [data-trophy-id="trophy-gold"]');
  await expect(trophy).toContainText('金級獎盃');
  await expect(trophy).toContainText('僅供展示');
  // The image is lazy-loaded: scroll it into view so the aborted request fires.
  await trophy.scrollIntoViewIfNeeded();
  await expect(trophy.locator('.artwork-fallback')).toBeVisible();
});
