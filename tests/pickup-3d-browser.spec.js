import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

test.use({ guideSeen: false });

test('3d=1 previews the same four physical collectibles used by the shared in-race renderer', async ({ gameplayPage: page }) => {
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.locator('[data-guide-device="items"]').click();
  const canvases = page.locator('#guide-items-panel .pickup-3d-canvas');
  test.skip(await canvases.count() === 0, 'Run with: make verify 3d=1 (or VITE_PICKUP_3D=1 npm run test:browser)');
  await expect(canvases).toHaveCount(4);
  const tiers = await canvases.evaluateAll(nodes => nodes.map(node => node.closest('[data-tier]')?.dataset.tier));
  expect(tiers).toEqual(['cell', 'can', 'tank', 'overcharge']);
  await canvases.first().scrollIntoViewIfNeeded();
  await expect(canvases.first()).toHaveAttribute('data-motion', 'running');
  expect(await canvases.first().evaluate(canvas => {
    const gl = canvas.getContext('webgl2');
    return !!gl && !gl.isContextLost() && canvas.width > 0 && canvas.height > 0;
  })).toBe(true);
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
});

test('the 3D guide respects reduced motion when 3d=1 is active', async ({ gameplayPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.locator('[data-guide-device="items"]').click();
  const canvas = page.locator('.pickup-3d-canvas').first();
  test.skip(await canvas.count() === 0, 'Requires 3d=1');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-motion', 'paused');
});
