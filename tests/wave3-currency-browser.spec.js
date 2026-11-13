import { ciTimeout } from './helpers/ci.js';
import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('home displays three compact resource icons with genuine demo points', async ({ page }) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const wallet = page.locator('#intro [data-wave3-wallet]');
    await expect(wallet).toBeVisible();
    await expect(wallet).toHaveAttribute('data-compact', 'true');
    await expect(wallet.locator('[data-currency]')).toHaveCount(3);
    await expect(wallet).toHaveAttribute('data-wallet-authority', 'local-demo');
    await expect(wallet.locator('[data-currency="demo-points"] strong')).toHaveText('20');
    await expect(wallet.locator('[data-currency="demo-points"] img'))
      .toHaveAttribute('src', /demo-points@3x\.webp$/);
    for (const [currency, asset] of [['coins', 'coin'], ['diamonds', 'diamond']]) {
      const item = wallet.locator('[data-currency="' + currency + '"]');
      await expect(item).toHaveAttribute('data-available', 'true');
      await expect(item.locator('strong')).toHaveText('0');
      const art = item.locator('.wallet-artwork img');
      await expect(art).toHaveAttribute('src', new RegExp('wallet-' + asset + '@3x\\.webp$'));
      await expect(art).toHaveJSProperty('naturalWidth', 144);
      await expect(art).toHaveJSProperty('naturalHeight', 144);
      await expect(item.locator('.wallet-orbit, .wallet-facet')).toHaveCount(0);
    }
    const metrics = await wallet.evaluate(el => {
      const r = el.getBoundingClientRect();
      return { width: r.width, height: r.height, rows: [...el.children].map(ch => Math.round(ch.getBoundingClientRect().top)) };
    });
    expect(metrics.height).toBeLessThanOrEqual(36);
    if (viewport.width >= 1001) {
      const homeRowHeight = await page.locator('.home-intro-topbar').evaluate(el => el.getBoundingClientRect().height);
      expect(homeRowHeight).toBeLessThanOrEqual(42);
    }
    expect(metrics.width).toBeLessThanOrEqual(290);
    expect(new Set(metrics.rows).size).toBe(1);
    expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen [data-wave3-wallet], #garage-screen .garage-demo-balance')).toHaveCount(0);
  }
});

for (const viewport of [{ width: 568, height: 320 }, { width: 756, height: 265 }]) {
  test(`the compact Home wallet fits above the mode picker at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const wallet = page.locator('#intro [data-wave3-wallet]');
    await expect(wallet).toBeVisible();
    await expect(wallet.locator('img')).toHaveCount(3);
    const [resources, modes] = await Promise.all([
      wallet.boundingBox(), page.locator('#race-mode-picker').boundingBox(),
    ]);
    expect(resources.height, 'short landscape wallet keeps the track-card height budget').toBeLessThanOrEqual(22);
    expect(resources.y + resources.height).toBeLessThanOrEqual(modes.y);
  });
}

test('compact home wallet localizes accessible resource names without creating paid balances', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  const wallet = page.locator('#intro [data-wave3-wallet]');
  await expect(wallet).toHaveAttribute('aria-label', '玩家資源');
  for (const [id,name] of [['demo-points','試玩點數'],['coins','金幣'],['diamonds','鑽石']]) {
    await expect(wallet.locator('[data-currency="' + id + '"]')).toHaveAttribute('aria-label',new RegExp(name));
  }
  await expect(wallet.locator('[data-currency="coins"] strong')).toHaveText('0');
  await wallet.getByRole('button', { name: /鑽石/ }).hover();
  await expect(page.getByRole('region', { name: '試玩鑽石' })).toContainText('本機試玩');
  await expect(wallet.locator('.wallet-label, .wallet-quantity small')).toHaveCount(0);
});

test('compact artwork retains fallback text with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/wallet-diamond@3x.webp', route => route.abort());
  await page.goto('/');
  const wallet=page.locator('#intro [data-wave3-wallet]');
  const diamond=wallet.locator('[data-currency="diamonds"]');
  await expect(diamond.locator('.artwork-fallback')).toBeVisible();
  await expect(diamond).toHaveAttribute('aria-label', /Demo diamonds.*Local demo/i);
  await expect(diamond.locator('strong')).toHaveText('0');
});

test('home wallet never obstructs Garage VFX touch previews', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#garage-button').click();
  await expect(page.locator('#garage-screen [data-wave3-wallet]')).toHaveCount(0);
  await page.locator('#garage-studio-open').click();
  const ion = page.locator('#garage-vfx-catalog [data-skin="thruster-ion"] .garage-skin-preview-hitarea');
  await ion.click({ timeout: ciTimeout(15000) });
  await expect(page.locator('#garage-preview')).toHaveAttribute('data-skin-preview-thruster', 'thruster-ion');
});


test('desktop wallet shows an inspectable card on hover and supports keyboard dismissal', async ({ page }) => {
  await page.goto('/');
  const wallet = page.locator('#intro [data-wave3-wallet]');
  const points = wallet.getByRole('button', { name: /Demo points/ });
  const card = page.getByRole('region', { name: 'Demo points' });
  await expect(card).toBeHidden();
  await points.hover();
  await expect(card).toContainText('Earn demo points by racing or claiming missions');
  await expect(points).toHaveAttribute('aria-expanded', 'true');
  await card.hover();
  await expect(card).toBeVisible();
  await page.mouse.move(8, 8);
  await expect(card).toBeHidden();

  await page.locator('#medal-chip').focus();
  await page.keyboard.press('Tab');
  await expect(points).toBeFocused();
  await expect(card).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(card).toBeHidden();
  await expect(points).toBeFocused();
});

test.describe('wallet on touch screens', () => {
  test.use({ hasTouch: true, isMobile: true });
  for (const viewport of [{ width: 320, height: 568 }, { width: 756, height: 265 }]) {
    test(`touch opens one card at a time and dismisses it at ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      const wallet = page.locator('#intro [data-wave3-wallet]');
      const coins = wallet.getByRole('button', { name: /Demo coins/i });
      const diamonds = wallet.getByRole('button', { name: /Demo diamonds/i });
      const coinCard = page.getByRole('region', { name: 'Demo coins' });
      const diamondCard = page.getByRole('region', { name: 'Demo diamonds' });

      await expect(coinCard).toBeHidden();
      await coins.tap();
      await expect(coinCard).toContainText('Local demo');
      await expect(coinCard).toContainText('0');
      await diamonds.tap();
      await expect(coinCard).toBeHidden();
      await expect(diamondCard).toBeVisible();
      const bounds = await diamondCard.boundingBox();
      expect(bounds.x).toBeGreaterThanOrEqual(0);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
      await diamonds.tap();
      await expect(diamondCard).toBeHidden();
      await coins.tap();
      await expect(coinCard).toBeVisible();
      await page.touchscreen.tap(8, 8);
      await expect(coinCard).toBeHidden();
    });
  }
});
