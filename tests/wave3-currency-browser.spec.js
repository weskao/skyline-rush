import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';

test('Garage resources show genuine local credits and native gold/diamond artwork', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await page.locator('#garage-button').click();
    const wallet = page.locator('#garage-screen [data-wave3-wallet]');
    await expect(wallet).toBeVisible();
    await expect(wallet).toHaveAttribute('data-wallet-authority', 'local-demo');
    await expect(wallet.locator('[data-currency="demo-points"] strong')).toHaveText('20');
    await expect(wallet.locator('[data-currency="demo-points"] [data-wave3-demo-art="demo-points"] img'))
      .toHaveAttribute('src', /demo-points@3x\.webp$/);
    for (const [currency, asset] of [['coins', 'coin'], ['diamonds', 'diamond']]) {
      const item = wallet.locator('[data-currency="' + currency + '"]');
      await expect(item).toHaveAttribute('data-available', 'false');
      await expect(item.locator('strong')).toHaveText('—');
      await expect(item).toContainText('Coming soon');
      const art = item.locator('.wallet-artwork img');
      await expect(art).toHaveAttribute('src', new RegExp('wallet-' + asset + '@3x\\.png$'));
      await expect(art).toHaveJSProperty('naturalWidth', 144);
      await expect(art).toHaveJSProperty('naturalHeight', 144);
      await expect(item.locator('.wallet-shimmer')).toHaveCSS('background-image', /wallet-sparkle-strip\.png/);
    }
    expect(await wallet.evaluate(el => el.scrollWidth > el.clientWidth + 1)).toBe(false);
  }
});

test('Garage player wallet is localized without exposing nonexistent paid balances', async ({ page }) => {
  await page.goto('/');
  await selectLocale(page, 'zh-TW');
  await page.locator('#garage-button').click();
  const wallet = page.locator('#garage-screen [data-wave3-wallet]');
  await expect(wallet).toHaveAttribute('aria-label', '玩家資源');
  await expect(wallet).toContainText('試玩點數');
  await expect(wallet).toContainText('金幣');
  await expect(wallet).toContainText('鑽石');
  await expect(wallet.locator('[data-currency="coins"]')).toContainText('尚未開放');
  await expect(wallet.locator('[data-currency="diamonds"] strong')).toHaveText('—');
});

test('image frame animation honors accessibility and broken PNGs keep real labels', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/wallet-diamond@3x.png', route => route.abort());
  await page.goto('/');
  await page.locator('#garage-button').click();
  const wallet = page.locator('#garage-screen [data-wave3-wallet]');
  const diamond = wallet.locator('[data-currency="diamonds"]');
  const sprite = diamond.locator('.wallet-shimmer');
  await expect(sprite).toHaveCSS('animation-name', 'none');
  await expect(diamond.locator('.artwork-fallback')).toBeVisible();
  await expect(diamond).toContainText('Diamonds');
  await expect(diamond.locator('strong')).toHaveText('—');
  await page.evaluate(() => { document.body.dataset.vfxEnabled = 'false'; });
  await expect(sprite).toHaveCSS('display', 'none');
});
