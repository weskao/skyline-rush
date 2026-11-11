import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

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
    // The source PNG/WebP assets may be delivered separately: until installed the exact original
    // WebGL model is the fallback. Both choices must be real, visible content.
    await expect.poll(async () => stage.evaluate(el => {
      const sprite = el.querySelector('img.pickup-animation');
      const canvas = el.querySelector('canvas.pickup-3d-canvas');
      return !!((sprite?.complete && sprite.naturalWidth > 0) || (canvas?.width > 0 && canvas?.height > 0));
    })).toBe(true);
  }
  const fallbackCanvases = page.locator('#guide-items-panel .pickup-3d-canvas');
  if (await fallbackCanvases.count()) {
    await expect(fallbackCanvases).toHaveCount(4);
    await fallbackCanvases.first().scrollIntoViewIfNeeded();
    expect(await fallbackCanvases.first().evaluate(canvas => {
      const gl = canvas.getContext('webgl2');
      return !!gl && !gl.isContextLost() && canvas.width > 0 && canvas.height > 0;
    })).toBe(true);
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
  if (await sprite.count()) await expect(sprite).toHaveAttribute('src', /-poster\\.webp$/);
  else await expect(stage.locator('.pickup-3d-canvas')).toHaveAttribute('data-motion', 'paused');
});
