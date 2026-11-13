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
      await expect(item).toHaveAttribute('data-available', 'false');
      await expect(item.locator('strong')).toHaveText('—');
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
    expect(metrics.width).toBeLessThanOrEqual(290);
    expect(new Set(metrics.rows).size).toBe(1);
    expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.locator('#garage-button').click();
    await expect(page.locator('#garage-screen [data-wave3-wallet], #garage-screen .garage-demo-balance')).toHaveCount(0);
  }
});

test('compact home wallet localizes accessible resource names without creating paid balances', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  const wallet = page.locator('#intro [data-wave3-wallet]');
  await expect(wallet).toHaveAttribute('aria-label', '玩家資源');
  for (const [id,name] of [['demo-points','試玩點數'],['coins','金幣'],['diamonds','鑽石']]) {
    await expect(wallet.locator('[data-currency="' + id + '"]')).toHaveAttribute('aria-label',new RegExp(name));
  }
  await expect(wallet.locator('[data-currency="coins"] strong')).toHaveText('—');
  await expect(wallet.locator('[data-currency="diamonds"]')).toHaveAttribute('title', /尚未開放/);
  await expect(wallet.locator('.wallet-label, .wallet-quantity small')).toHaveCount(0);
});

test('compact artwork retains fallback text with reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/wallet-diamond@3x.webp', route => route.abort());
  await page.goto('/');
  const wallet=page.locator('#intro [data-wave3-wallet]');
  const diamond=wallet.locator('[data-currency="diamonds"]');
  await expect(diamond.locator('.artwork-fallback')).toBeVisible();
  await expect(diamond).toHaveAttribute('aria-label', /Diamonds.*Coming soon/);
  await expect(diamond.locator('strong')).toHaveText('—');
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
