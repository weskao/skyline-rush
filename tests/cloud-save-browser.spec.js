import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('History exposes cloud recovery and sign-in on a narrow phone', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto('/');
  await page.locator('#intro [data-open-history=""]').click();
  const dialog = page.locator('#history-screen');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#cloud-title')).toHaveText('Cloud save');
  await expect(dialog.locator('#cloud-login')).toBeVisible();
  await expect(dialog.locator('#cloud-login')).toHaveAccessibleName('Sign in with Google');
  await expect(dialog.locator('#cloud-status')).toHaveText('Cloud backup is off. Sign in to protect your race results.');
  await expect.poll(() => dialog.locator('#cloud-login img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
  await expect(dialog.locator('#cloud-logout')).toBeHidden();
  await dialog.locator('#history-close').click();
  await selectLocale(page, 'zh-TW');
  await page.locator('#intro [data-open-history=""]').click();
  await expect(dialog.locator('#cloud-login')).toHaveAccessibleName('使用 Google 登入');
});

test('Cloud save buttons share one height and centre line on a desktop row', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.locator('#intro [data-open-history=""]').click();
  const dialog = page.locator('#history-screen');
  const boxes = await dialog.locator('#cloud-title ~ button:visible').evaluateAll(els => els.map(el => el.getBoundingClientRect().toJSON()));
  expect(boxes.length).toBeGreaterThan(1);
  for (const box of boxes) {
    expect(box.height).toBeCloseTo(boxes[0].height, 1);
    expect(box.height).toBeGreaterThanOrEqual(44);
  }
  const sameRow = boxes.filter(box => box.top < boxes[0].bottom && box.bottom > boxes[0].top);
  expect(sameRow.length).toBeGreaterThan(1);
  for (const box of sameRow) expect(box.top + box.height / 2).toBeCloseTo(boxes[0].top + boxes[0].height / 2, 1);
});
