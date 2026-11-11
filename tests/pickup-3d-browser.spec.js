import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

test.use({ guideSeen: false });

test('3d=1 previews the same four physical collectibles used by the shared in-race renderer', async ({ gameplayPage: page }) => {
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.locator('[data-guide-device="items"]').click();
  test.skip(process.env.VITE_PICKUP_3D !== '1', 'Run with: make verify 3d=1');
  const stages = page.locator('#guide-items-panel .pickup-animation-stage');
  await expect(stages).toHaveCount(4);
  const tiers = await stages.evaluateAll(nodes => nodes.map(node => node.dataset.tier));
  expect(tiers).toEqual(['cell', 'can', 'tank', 'overcharge']);
  for (const stage of await stages.all()) {
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-motion', 'running');
    const tier = await stage.getAttribute('data-tier');
    const sprite = stage.locator('img.pickup-animation');
    await expect(sprite).toHaveAttribute('src', new RegExp('/animated/' + tier + '\\.webp$'));
    await expect(sprite).toHaveClass(/is-ready/, { timeout: ciTimeout(8000) });
    expect(await sprite.evaluate(img => img.complete && img.naturalWidth === 192 && img.naturalHeight === 192))
      .toBe(true);
    await expect(stage.locator('.pickup-3d-canvas')).toHaveCount(0);
  }
  await test.info().attach('real-3d-pickups-guide.png', {
    body: await page.locator('#guide-items-panel .collectibles-section').nth(1).screenshot(),
    contentType: 'image/png',
  });
  await page.locator('#guide-close').click();
  await page.locator('#start-button').click();
  const tutorial = page.locator('#tutorial-exit');
  if (await tutorial.isVisible()) await tutorial.click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const sceneModels = await page.evaluate(() => {
    const pool = window.gameScene?.scene?.getObjectByName('Nitro pickups');
    return pool?.children.map(mesh => ({
      tier: mesh.name,
      physical: mesh.material.isMeshPhysicalMaterial === true,
      uniqueGeometry: mesh.geometry.uuid,
      instanced: mesh.isInstancedMesh === true,
    }));
  });
  expect(sceneModels?.map(x => x.tier)).toEqual(tiers);
  expect(new Set(sceneModels.map(x => x.uniqueGeometry)).size).toBe(4);
  expect(sceneModels.every(x => x.physical && x.instanced)).toBe(true);
  await test.info().attach('real-3d-pickups-race.png', {
    body: await page.screenshot(), contentType: 'image/png',
  });
});

test('the 3D guide respects reduced motion when 3d=1 is active', async ({ gameplayPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.locator('[data-guide-device="items"]').click();
  test.skip(process.env.VITE_PICKUP_3D !== '1', 'Requires 3d=1');
  const stage = page.locator('.pickup-animation-stage').first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-motion', 'paused');
  const sprite = stage.locator('.pickup-animation');
  await expect(sprite).toHaveAttribute('src', /-poster\.webp$/);
  await expect(sprite).toHaveClass(/is-ready/, { timeout: ciTimeout(8000) });
  expect(await sprite.evaluate(img => img.complete && img.naturalWidth === 192 && img.naturalHeight === 192))
    .toBe(true);
});
