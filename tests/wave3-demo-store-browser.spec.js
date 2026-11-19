import { test, expect } from '@playwright/test';
import { createServer } from 'vite';
import vue from '@vitejs/plugin-vue';

async function continueAfterUnlock(page) {
  const reveal = page.locator('#acquisition-reveal');
  await reveal.getByRole('button', { name: 'Continue', exact: true }).click();
  await expect(reveal).toBeHidden();
}

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

  test('equipment unlock has a large unobstructed stage and a reachable Continue button', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await page.evaluate(() => window.__wave3DemoFixture.grantRace());
    const store = page.locator('[data-wave3-demo-store]');
    await store.locator('[data-demo-offer="thruster-ion"] .demo-item-redeem').click();
    await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
    const reveal = page.locator('#acquisition-reveal');
    const art = reveal.locator('.acquisition-art');
    const heading = reveal.getByRole('heading', { name: 'Ion thruster' });
    await expect(heading).toBeVisible();
    await expect(art).toHaveJSProperty('naturalWidth', 288);
    for (const [width, height, minArt] of [[1440, 900, 260], [820, 1180, 260], [390, 844, 205], [320, 568, 176], [667, 320, 155]]) {
      await test.step(`${width}×${height}`, async () => {
        await page.setViewportSize({ width, height });
        await expect.poll(async () => (await art.boundingBox()).width).toBeGreaterThanOrEqual(minArt);
        await expect.poll(async () => {
          const product = await art.boundingBox();
          const title = await heading.boundingBox();
          return Math.min(product.x + product.width - title.x, product.y + product.height - title.y);
        }).toBeLessThanOrEqual(1);
        await expect(reveal.getByRole('button', { name: 'Continue' })).toBeInViewport({ ratio: 1 });
      });
    }
  });

  test('desktop category rail preserves card width when switching filters', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    const category = page.getByRole('navigation', { name: 'Filter cosmetic categories' });
    const offer = page.locator('[data-demo-offer="nitro-trail-cyan"]');
    const cardWidth = (await offer.boundingBox()).width;
    await category.getByRole('button', { name: 'NITRO trails' }).click();
    await expect(category.getByRole('button', { name: 'NITRO trails' })).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => {
      const card = await offer.boundingBox();
      const rail = await category.boundingBox();
      return [rail.x + rail.width < card.x, Math.abs(card.width - cardWidth) < 1];
    }).toEqual([true, true]);
  });

  test('narrow portrait category controls fit at touch size', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto(url);
    const category = page.getByRole('navigation', { name: 'Filter cosmetic categories' });
    await expect(category.getByRole('button')).toHaveCount(6);
    await expect.poll(() => category.evaluate(nav => {
      const bounds = nav.getBoundingClientRect();
      return [...nav.querySelectorAll('button')].every(button => {
        const rect = button.getBoundingClientRect();
        return rect.x >= bounds.x && rect.right <= bounds.right + 1 && rect.height >= 44;
      });
    })).toBe(true);
  });

  test('wide preview aligns the primary action above the paired secondary actions', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(url);
    const preview = page.getByRole('region', { name: 'Cosmetic preview' });
    const primary = preview.getByRole('button', { name: 'Demo redeem', exact: true });
    const inspect = preview.getByRole('button', { name: 'Inspect preview' });
    const collection = preview.getByRole('button', { name: 'Demo Collection' });
    await expect.poll(async () => {
      const redeem = await primary.boundingBox();
      const inspectBox = await inspect.boundingBox();
      const collectionBox = await collection.boundingBox();
      return Math.abs(inspectBox.y - collectionBox.y) < 1 &&
        redeem.y + redeem.height < inspectBox.y &&
        Math.abs(redeem.x - inspectBox.x) < 1 &&
        Math.abs(redeem.x + redeem.width - collectionBox.x - collectionBox.width) < 1;
    }).toBe(true);
  });

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
      const detailRedeem = store.getByRole('button', { name: 'Demo redeem', exact: true });
      await expect(detailRedeem).toBeDisabled();
      await expect(detailRedeem).toHaveAccessibleDescription(/Need 5 Demo points more.*Finish a race/);
      await expect(store.locator('.demo-wallet strong')).toHaveText('20');

      await page.evaluate(() => window.__wave3DemoFixture.grantRace());
      await expect(store.locator('.demo-wallet strong')).toHaveText('40');
      await page.context().setOffline(true); // No Go/Auth/Firestore needed after first paint.
      await store.getByRole('button', { name: 'Demo redeem' }).click();
      await expect(store.getByRole('button', { name: 'Confirm demo redeem' })).toBeFocused();
      await store.getByRole('button', { name: 'Confirm demo redeem' }).click();
      await expect(store.locator('.demo-wallet strong')).toHaveText('15');
      await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'demo-unlocked');
      await continueAfterUnlock(page);
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
    await continueAfterUnlock(page);
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
    const reveal = page.locator('#acquisition-reveal');
    await expect(redeem).toBeDisabled();
    await redeem.evaluate(button => button.click());
    expect(await cues()).toEqual([]);

    await page.evaluate(() => window.__wave3DemoFixture.grantRace());
    expect(await cues()).toEqual([]);
    await redeem.click();
    await expect(confirm).toBeFocused();
    expect(await cues()).toEqual(['redeem-review']);
    await confirm.press('Escape');
    await expect(confirm).toHaveCount(0);
    await expect(reveal).toBeHidden();
    expect(await cues()).toEqual(['redeem-review', 'redeem-cancelled']);

    await redeem.click();
    await store.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect((await cues()).slice(-2)).toEqual(['redeem-review', 'redeem-cancelled']);
    await expect(store.locator('.demo-wallet strong')).toHaveText('40');

    await page.evaluate(() => window.__wave3DemoFixture.setRedemptionUnavailable(true));
    await redeem.click();
    await confirm.click();
    await expect(store.getByRole('status').last()).toContainText('Demo redemption is unavailable');
    expect((await cues()).slice(-2)).toEqual(['redeem-review', 'action-unavailable']);
    await expect(reveal).toBeHidden();
    await expect(store.locator('.demo-wallet strong')).toHaveText('40');

    await page.evaluate(() => window.__wave3DemoFixture.setRedemptionUnavailable(false));
    await redeem.click();
    await confirm.click();
    await expect(store.locator('.demo-wallet strong')).toHaveText('15');
    await expect(reveal.getByRole('heading', { name: 'Ion thruster' })).toBeVisible();
    await expect(reveal.locator('.acquisition-hero')).toHaveAttribute('data-kind', 'equipment');
    await expect.poll(cues).toEqual([
      'redeem-review', 'redeem-cancelled', 'redeem-review', 'redeem-cancelled',
      'redeem-review', 'action-unavailable', 'redeem-review', 'acquisition-equipment-thruster',
    ]);
    await continueAfterUnlock(page);
  });

  test('pending redemption retains the quote, submits once and unlocks after the receipt', async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => {
      window.__wave3DemoFixture.grantRace();
      window.__wave3DemoFixture.deferRedemption();
    });
    const store = page.locator('[data-wave3-demo-store]');
    const card = store.locator('[data-demo-offer="thruster-ion"]');
    await card.getByRole('button', { name: /^Redeem / }).click();
    const quote = store.getByRole('group', { name: 'Confirm demo redemption' });
    const confirm = quote.getByRole('button', { name: 'Confirm demo redeem' });
    await confirm.click();
    await expect(quote).toHaveAttribute('aria-busy', 'true');
    await expect(quote).toContainText('25 Demo points');
    await expect(quote).toContainText('Redeeming');
    await expect(confirm).toBeDisabled();
    await expect(store.locator('[data-demo-offer="nitro-trail-cyan"] .demo-item-redeem')).toBeDisabled();
    await page.keyboard.press('Enter');
    await expect.poll(() => page.evaluate(() => window.__wave3DemoFixture.redemptionCalls())).toBe(1);
    await expect(store.locator('[data-demo-balance="points"] strong')).toHaveText('40');
    await expect(page.locator('#acquisition-reveal')).toBeHidden();
    await page.evaluate(() => window.__wave3DemoFixture.releaseRedemption());
    await expect(store.locator('[data-demo-balance="points"] strong')).toHaveText('15');
    await continueAfterUnlock(page);
    await expect(card.getByRole('button', { name: /View in collection/i })).toBeFocused();
    await card.getByRole('button', { name: /View in collection/i }).click();
    const collection = page.locator('[data-wave3-demo-collection]');
    await expect(collection.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(collection.getByRole('button', { name: 'Equip demo preview' })).toBeEnabled();
  });

  test('a delayed failure is retryable and an old account receipt stays out of the new wallet', async ({ page }) => {
    await page.goto(url);
    await page.evaluate(() => {
      window.__wave3DemoFixture.grantRace();
      window.__wave3DemoFixture.setRedemptionUnavailable(true);
      window.__wave3DemoFixture.deferRedemption();
    });
    const store = page.locator('[data-wave3-demo-store]');
    await store.getByRole('button', { name: 'Demo redeem', exact: true }).click();
    const quote = store.getByRole('group', { name: 'Confirm demo redemption' });
    await quote.getByRole('button', { name: 'Confirm demo redeem' }).click();
    await expect(quote).toHaveAttribute('aria-busy', 'true');
    await page.evaluate(() => window.__wave3DemoFixture.releaseRedemption());
    await expect(quote).toContainText('Demo redemption is unavailable');
    await expect(store.locator('[data-demo-balance="points"] strong')).toHaveText('40');
    await expect(page.locator('#acquisition-reveal')).toBeHidden();
    await page.evaluate(() => {
      window.__wave3DemoFixture.setRedemptionUnavailable(false);
      window.__wave3DemoFixture.deferRedemption(true);
    });
    await quote.getByRole('button', { name: 'Retry redemption' }).click();
    await expect(quote).toHaveAttribute('aria-busy', 'true');
    await page.evaluate(() => {
      window.__wave3DemoFixture.setAccount('other');
      window.__wave3DemoFixture.releaseRedemption();
    });
    await expect.poll(() => page.evaluate(() => window.__wave3DemoFixture.deliveredRedemptionStatus())).toBe('completed');
    await expect(quote).toHaveCount(0);
    await expect(store.locator('[data-demo-balance="points"] strong')).toHaveText('20');
    await expect(page.locator('#acquisition-reveal')).toBeHidden();
    await expect.poll(() => page.evaluate(() => window.__wave3DemoFixture.redemptionCalls())).toBe(2);
  });

  test('card shows current shortfall and earning path inline', async ({ page }) => {
    await page.goto(url);
    const card = page.locator('[data-demo-offer="nitro-trail-cyan"]');
    const gap = card.locator('[data-demo-shortfall]');
    const action = card.getByRole('button', { name: /^Redeem / });
    await expect(action).toBeDisabled();
    await expect(action).toHaveAccessibleDescription(/Need 150 Demo coins more.*daily race mission/);
    await expect(action).toHaveCSS('cursor', 'not-allowed');
    const unavailableColour = await action.evaluate(button => getComputedStyle(button).color);
    await expect(gap).toContainText('Need 150 Demo coins more');
    await expect(gap).toContainText('daily race mission');
    await page.evaluate(() => {
      window.__wave3DemoFixture.grantRace(1);
      window.__wave3DemoFixture.grantRace(2);
    });
    await expect(gap).toContainText('Need 40 Demo coins more');
    await page.evaluate(() => window.__wave3DemoFixture.grantRace(3));
    await expect(gap).toHaveCount(0);
    await expect(action).toBeEnabled();
    await expect(action).not.toHaveCSS('color', unavailableColour);
    await expect(action).toHaveCSS('min-height', '44px');
    await page.evaluate(() => window.__wave3DemoFixture.setLocale('zh-TW'));
    await expect(card.getByRole('button', { name: '兌換 青色尾跡' })).toBeEnabled();
  });

  test('mobile card redeems the displayed item directly without a separate selection step', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    const store = page.locator('[data-wave3-demo-store]');
    const offer = store.locator('[data-demo-offer="nitro-trail-cyan"]');
    const redeem = offer.getByRole('button', { name: /^Redeem / });
    await expect(redeem).toBeDisabled();
    await expect(redeem).toHaveAccessibleDescription(/Need 150 Demo coins more/);
    await redeem.evaluate(button => button.click());
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
    await expect(page.locator('#acquisition-reveal').getByRole('heading')).toHaveText(/cyan/i);
    await continueAfterUnlock(page);
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
    await continueAfterUnlock(page);
    expect(await page.evaluate(() => window.__wave3DemoFixture.duplicateRedeem())).toBe('duplicate');
    await expect(page.locator('#acquisition-reveal')).toBeHidden();
    await expect(store.locator('.demo-wallet strong')).toHaveText('15');
    await page.evaluate(() => window.__wave3DemoFixture.setAccount('driver_B'));
    await expect(store.locator('.demo-wallet strong')).toHaveText('20');
    await expect(store.locator('[data-demo-id="thruster-ion"]')).toHaveAttribute('data-demo-status', 'locked');
    await store.getByRole('button', { name: 'Demo Collection' }).click();
    await expect(page.locator('.collection-empty').first()).toContainText('empty');
    expect(await page.evaluate(() => window.__wave3DemoFixture.snapshot().equippedPreview)).toBe(null);
  });
});
