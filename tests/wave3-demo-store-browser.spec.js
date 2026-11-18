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

  test('all six Demo Store concept assets load native WebP without removed PNG', async ({ page }) => {
    const pngRequests = [];
    page.on('request', request => {
      if (/garage-store-readiness\/raster\/.*\.png(?:\?|$)/.test(request.url())) pngRequests.push(request.url());
    });
    await page.goto(url);
    const images = page.locator('[data-wave3-demo-store] .demo-concept-art img.artwork-img');
    await expect(images).toHaveCount(6);
    for (const image of await images.all()) {
      await image.evaluate(el => el.scrollIntoView({ block: 'nearest', inline: 'nearest' }));
      await expect(image).toHaveAttribute('src', /garage-store-readiness\/raster\/store-[a-z]+@3x\.webp$/);
      await expect(image).toHaveJSProperty('naturalWidth', 216);
    }
    expect(pngRequests).toEqual([]);
  });


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

  test('a coin offer discloses its cost and only debits on confirmation', async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => {
      for (let index = 1; index <= 3; index++) window.__wave3DemoFixture.grantRace(index);
    });
    const store = page.locator('[data-wave3-demo-store]');
    await store.locator('[data-demo-id="nitro-trail-cyan"]').click();
    await expect(store.locator('.demo-selected-balance')).toHaveText('Available 150 Demo coins');
    await store.getByRole('button', { name: 'Demo redeem' }).click();
    await expect(store.getByRole('group', { name: 'Confirm demo redemption' })).toContainText('150 Demo coins');
    await store.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(store.locator('.demo-selected-balance')).toHaveText('Available 150 Demo coins');
    await store.getByRole('button', { name: 'Demo redeem' }).click();
    await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
    await expect(store.locator('.demo-selected-balance')).toHaveText('Available 0 Demo coins');
    await expect(store.locator('.demo-wallet strong')).toHaveText('80');
    await store.getByRole('button', { name: 'Demo Collection' }).click();
    const collection = page.locator('[data-wave3-demo-collection]');
    await collection.locator('[data-demo-id="nitro-trail-cyan"]').click();
    await collection.getByRole('button', { name: 'Equip demo preview' }).click();
    await expect(collection.locator('[data-demo-id="nitro-trail-cyan"]')).toContainText('Demo equipped');
  });

  test('redemption audio distinguishes review, cancel, failure, and actual unlock', async ({ page }) => {
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    const redeem = store.getByRole('button', { name: 'Demo redeem', exact: true });
    const confirm = store.getByRole('button', { name: 'Confirm demo redeem', exact: true });
    const cues = () => page.evaluate(() => window.__wave3DemoFixture.cues());
    await redeem.click();
    expect(await cues()).toEqual(['action-unavailable']);

    await page.evaluate(() => window.__wave3DemoFixture.grantRace());
    expect(await cues()).toEqual(['action-unavailable']);
    await redeem.click();
    await expect(confirm).toBeFocused();
    expect(await cues()).toEqual(['action-unavailable', 'redeem-review']);
    await confirm.press('Escape');
    await expect(confirm).toHaveCount(0);
    expect(await cues()).toEqual(['action-unavailable', 'redeem-review', 'redeem-cancelled']);

    await redeem.click();
    await store.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await cues()).slice(-2)).toEqual(['redeem-review', 'redeem-cancelled']);
    await expect(store.locator('.demo-wallet strong')).toHaveText('40');

    await page.evaluate(() => window.__wave3DemoFixture.setRedemptionUnavailable(true));
    await redeem.click();
    await confirm.click();
    await expect(store.getByRole('status').last()).toContainText('Demo redemption is unavailable');
    expect((await cues()).slice(-2)).toEqual(['redeem-review', 'action-unavailable']);
    await expect(store.locator('.demo-wallet strong')).toHaveText('40');

    await page.evaluate(() => window.__wave3DemoFixture.setRedemptionUnavailable(false));
    await redeem.click();
    await confirm.click();
    await expect(store.locator('.demo-wallet strong')).toHaveText('15');
    expect(await cues()).toEqual([
      'action-unavailable', 'redeem-review', 'redeem-cancelled', 'redeem-review', 'redeem-cancelled',
      'redeem-review', 'action-unavailable', 'redeem-review', 'redeem-unlocked',
    ]);
  });

  test('mobile card redeems the displayed item directly without a separate selection step', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    const offer = store.locator('[data-demo-offer="nitro-trail-cyan"]');
    const redeem = offer.getByRole('button', { name: /^Redeem / });
    await expect(redeem).toBeVisible();
    await redeem.click();
    await expect(store.getByRole('status').last()).toContainText('Not enough demo coins');
    await expect(store.getByRole('group', { name: 'Confirm demo redemption' })).toHaveCount(0);

    await page.evaluate(() => {
      for (let index = 1; index <= 3; index++) window.__wave3DemoFixture.grantRace(index);
    });
    await redeem.click();
    const dialog = store.getByRole('group', { name: 'Confirm demo redemption' });
    await expect(dialog).toContainText('150 Demo coins');
    await expect(dialog).toContainText('Remaining 0 Demo coins');
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    await expect(redeem).toBeFocused();
    await expect(store.locator('[data-demo-balance="coins"] strong')).toHaveText('150');

    await redeem.click();
    await dialog.getByRole('button', { name: 'Confirm demo redeem' }).click();
    await expect(store.locator('[data-demo-balance="coins"] strong')).toHaveText('0');
    await expect(offer.locator('[data-demo-status]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
    await expect(redeem).toHaveCount(0);
  });

  test('store and collection reuse effect GIFs with a static reduced-motion fallback', async ({ page }) => {
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    const item = store.locator('[data-demo-id="thruster-ion"]');
    const art = item.locator('img.artwork-img');
    await art.scrollIntoViewIfNeeded();
    await expect(art).toHaveAttribute('src', /garage-animated\/thruster-ion@3x\.gif$/);
    await expect(art).toHaveJSProperty('naturalWidth', 288);
    await page.evaluate(() => { document.body.dataset.vfxQuality = 'low'; });
    await expect(art).toHaveAttribute('data-animation-active', 'false');
    await page.evaluate(() => { delete document.body.dataset.vfxQuality; });
    await expect(art).toHaveAttribute('data-animation-active', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(art).toHaveAttribute('src', /garage-vfx-skins\/raster\/thruster-ion@3x\.webp$/);
    const drift = store.locator('[data-demo-id="drift-trail-flame"]');
    await expect(drift.locator('img.artwork-img')).toHaveAttribute('src', /garage-vfx-skins\/raster\/drift-trail-flame@3x\.webp$/);
    await drift.click();
    await expect(store.locator('[data-drift-preview]')).toHaveCount(0);
    await store.getByRole('button', { name: 'Inspect preview' }).click();
    await expect(store.locator('[data-drift-preview="drift-trail-flame"]')).toBeVisible();
    await store.getByRole('button', { name: 'Demo Collection' }).click();
    const collectionArt = page.locator('[data-wave3-demo-collection] [data-demo-id="thruster-ion"] img');
    await expect(collectionArt).toHaveAttribute('data-animated-src', /garage-animated\/thruster-ion@3x\.gif$/);
    await expect(collectionArt).toHaveAttribute('data-animation-active', 'false');
  });

  test('trial expiry, bilingual copy and missing image fallback work without granting', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.route('**/feature-assets/garage-vfx-skins/raster/thruster-ion@3x.webp', route => route.abort());
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'locked');
    await page.evaluate(() => window.__wave3DemoFixture.enableTrial());
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'trial');
    await page.evaluate(() => window.__wave3DemoFixture.expireTrial());
    await expect(store.locator('[data-demo-id="airflow-vortex"]')).toHaveAttribute('data-demo-status', 'locked');
    await store.locator('[data-demo-id="thruster-ion"]').scrollIntoViewIfNeeded();
    await expect(store.locator('[data-demo-id="thruster-ion"] img[src$="/thruster.svg"]')).toBeVisible();
    await page.evaluate(() => window.__wave3DemoFixture.setLocale('zh-TW'));
    await expect(store).toContainText('試玩商城');
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toContainText('未解鎖');
    expect(await page.evaluate(() => window.__wave3DemoFixture.snapshot().demoInventory)).toEqual([]);
  });

  test('prices in cards, detail and confirmation share Home currency icons', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    const offer = id => store.locator(`[data-demo-id="${id}"]`);
    for (const [id, icon, label] of [
      ['thruster-ion', 'demo-points', '25 Demo points'],
      ['nitro-trail-cyan', 'wallet-coin', '150 Demo coins'],
      ['thruster-void', 'wallet-diamond', '15 Demo diamonds'],
    ]) {
      await expect(offer(id).locator('.demo-price img')).toHaveAttribute('src',
        '/feature-assets/wave3-demo/raster/' + icon + '@3x.webp');
      await expect(offer(id)).toHaveAccessibleName(new RegExp(label));
      await offer(id).click();
      await expect(store.locator('.demo-detail .demo-price img')).toHaveAttribute('src',
        '/feature-assets/wave3-demo/raster/' + icon + '@3x.webp');
    }
    await store.getByRole('button', { name: 'Drift trails' }).click();
    await expect(store.locator('[data-demo-id]')).toHaveCount(5);
    await expect(offer('drift-trail-flame')).toHaveAccessibleName(/260 Demo coins/);
    await store.getByRole('button', { name: 'Thrusters' }).click();
    await page.evaluate(() => window.__wave3DemoFixture.grantRace());
    await store.getByRole('button', { name: 'Demo redeem' }).click();
    const confirmation = store.getByRole('group', { name: 'Confirm demo redemption' });
    await expect(confirmation.locator('img[src$="/demo-points@3x.webp"]')).toHaveCount(3);
    await expect(confirmation).toContainText('Remaining 15 Demo points');
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
