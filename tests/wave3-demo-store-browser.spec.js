import { test, expect } from '@playwright/test';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';

test.describe('isolated Wave 3 demo store and collection (not mounted in Garage yet)', () => {
  test.describe.configure({ mode: 'default' });
  let server;
  let url;
  test.beforeAll(async () => {
    server = await createServer({
      configFile: false, root: process.cwd(), base: '/', plugins: [vue()],
      // Browser shards also start the gameplay Vite server. Sharing its cache
      // invalidates already-loaded Vue imports mid-test during re-optimization.
      cacheDir: 'node_modules/.vite-wave3-store-fixture',
      // Scan only the isolated fixture: the main app imports a production-only Vite alias.
      optimizeDeps: { entries: ['tests/fixtures/wave3-demo-store.html'] },
      server: { host: '127.0.0.1', port: 0 },
    });
    await server.listen();
    const address = server.httpServer?.address();
    if (!address || typeof address === 'string') throw new Error('Isolated Vite harness did not bind');
    url = `http://127.0.0.1:${address.port}/tests/fixtures/wave3-demo-store.html`;
  });
  test.afterAll(async () => { await server?.close(); });

  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 844, height: 390 }]) {
    test(`offline guest demo redeem to collection and equip on ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto(url);
      const store = page.locator('[data-wave3-demo-store]');
      await expect(store).toBeVisible();
      await expect(store).toContainText('Demo points');
      await expect(store.locator('.demo-wallet strong')).toHaveText('20');
      await store.locator('[data-demo-id="thruster-ion"]').click();
      await store.getByRole('button', { name: 'Demo redeem' }).click();
      await expect(store.getByRole('status').last()).toContainText('Not enough demo points');
      await expect(store.locator('.demo-wallet strong')).toHaveText('20');

      await page.evaluate(() => window.__wave3DemoFixture.grantRace());
      await expect(store.locator('.demo-wallet strong')).toHaveText('40');
      await page.context().setOffline(true); // No Go/Auth/Firestore needed after first paint.
      await store.getByRole('button', { name: 'Demo redeem' }).click();
      await expect(store.getByRole('button', { name: 'Confirm demo redeem' })).toBeFocused();
      await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
      await expect(store.locator('.demo-wallet strong')).toHaveText('15');
      await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
      await store.getByRole('button', { name: 'Demo Collection' }).click();
      const collection = page.locator('[data-wave3-demo-collection]');
      await expect(collection).toBeVisible();
      await collection.locator('[data-demo-id="thruster-ion"]').click();
      await collection.getByRole('button', { name: 'Equip demo preview' }).click();
      await expect(collection.locator('[data-demo-id="thruster-ion"]')).toContainText('Demo equipped');
      expect(await page.evaluate(() => window.__wave3DemoFixture.lastEquipped())).toBe('thruster-ion');
      expect(await page.evaluate(() => window.__wave3DemoFixture.snapshot().equippedPreview)).toBe('thruster-ion');
      await collection.getByRole('button', { name: 'Return to racing' }).click();
      await expect(page.locator('[data-race-handoff]')).toBeVisible();
      await page.context().setOffline(false);
      await test.info().attach(`wave3-isolated-${viewport.width}x${viewport.height}.png`,
        { body: await page.screenshot(), contentType: 'image/png' });
    });
  }

  test('trial expiry, bilingual copy and missing image fallback work without granting', async ({ page }) => {
    await page.route('**/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', route => route.abort());
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'preview-only');
    await page.evaluate(() => window.__wave3DemoFixture.enableTrial());
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'trial');
    await page.evaluate(() => window.__wave3DemoFixture.expireTrial());
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'preview-only');
    await expect(store.locator('[data-demo-id="thruster-ion"] img[src$="/thruster.svg"]')).toBeVisible();
    await page.evaluate(() => window.__wave3DemoFixture.setLocale('zh-TW'));
    await expect(store).toContainText('試玩商城');
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toContainText('未解鎖');
    expect(await page.evaluate(() => window.__wave3DemoFixture.snapshot().demoInventory)).toEqual([]);
  });

  test('duplicate redemption and account switching cannot leak demo grants', async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => window.__wave3DemoFixture.grantRace());
    const store = page.locator('[data-wave3-demo-store]');
    await store.locator('[data-demo-id="thruster-ion"]').click();
    await store.getByRole('button', { name: 'Demo redeem' }).click();
    await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
    expect(await page.evaluate(() => window.__wave3DemoFixture.duplicateRedeem())).toBe('duplicate');
    await expect(store.locator('.demo-wallet strong')).toHaveText('15');
    await page.evaluate(() => window.__wave3DemoFixture.setAccount('driver_B'));
    await expect(store.locator('.demo-wallet strong')).toHaveText('20');
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'locked');
    await store.getByRole('button', { name: 'Demo Collection' }).click();
    await expect(page.locator('.collection-empty').first()).toContainText('empty');
    expect(await page.evaluate(() => window.__wave3DemoFixture.snapshot().equippedPreview)).toBe(null);
  });
});
