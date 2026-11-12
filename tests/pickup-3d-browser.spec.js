import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

test.use({ guideSeen: false });

const TIERS = ['cell', 'can', 'tank', 'overcharge'];
// Share of a card canvas that the live model actually painted.
const paintedShare = canvas => {
  const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
  let painted = 0;
  for (let i = 3; i < data.length; i += 4) if (data[i] > 40) painted++;
  return painted / (data.length / 4);
};
async function openItemsGuide(page) {
  await page.locator('#controls-button').click();
  await page.locator('#guide-open').click();
  await page.locator('[data-guide-device="items"]').click();
}

test('the guide previews the same four authored models that the race draws, with no flag', async ({ gameplayPage: page }) => {
  await openItemsGuide(page);
  const stages = page.locator('#guide-items-panel .pickup-animation-stage');
  await expect(stages).toHaveCount(4);
  expect(await stages.evaluateAll(nodes => nodes.map(node => node.dataset.tier))).toEqual(TIERS); // settled: static markup
  for (const stage of await stages.all()) {
    await stage.scrollIntoViewIfNeeded();
    await expect(stage).toHaveAttribute('data-live', 'true', { timeout: ciTimeout(8000) });
    await expect(stage).toHaveAttribute('data-motion', 'running');
    await expect(stage.locator('img.pickup-animation'), 'the sprite is only the loading fallback').toHaveCount(0);
    await expect.poll(() => stage.locator('.pickup-3d-canvas').evaluate(paintedShare), { timeout: ciTimeout(8000) })
      .toBeGreaterThan(.08);
  }
  await test.info().attach('real-3d-pickups-guide.png', {
    body: await page.locator('#guide-items-panel .collectibles-section').nth(1).screenshot(),
    contentType: 'image/png',
  });
  await page.locator('#guide-close').click();
  // The authored GLBs replace the procedural stand-ins before the race starts (never mid-race).
  const sceneModels = () => page.evaluate(() => window.gameScene?.scene?.getObjectByName('Nitro pickups')?.children.map(mesh => ({
    tier: mesh.name,
    textured: !!mesh.material.map && !!mesh.material.emissiveMap && !!mesh.material.envMap,
    geometry: mesh.geometry.uuid,
    instanced: mesh.isInstancedMesh === true,
  })) ?? []);
  await expect.poll(async () => (await sceneModels()).filter(model => model.textured).length, { timeout: ciTimeout(15000) }).toBe(4);
  await page.locator('#start-button').click();
  const tutorial = page.locator('#tutorial-exit');
  if (await tutorial.isVisible()) await tutorial.click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  const models = await sceneModels();
  expect(models.map(model => model.tier)).toEqual(TIERS);
  expect(new Set(models.map(model => model.geometry)).size).toBe(4);
  expect(models.every(model => model.textured && model.instanced)).toBe(true);
  expect(await page.evaluate(() => !!window.gameScene.scene.getObjectByName('Pickup aura')?.isInstancedMesh)).toBe(true);
  await test.info().attach('real-3d-pickups-race.png', {
    body: await page.screenshot(), contentType: 'image/png',
  });
});

test('the live guide preview holds still under reduced motion', async ({ gameplayPage: page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await openItemsGuide(page);
  const stage = page.locator('.pickup-animation-stage').first();
  await stage.scrollIntoViewIfNeeded();
  await expect(stage).toHaveAttribute('data-live', 'true', { timeout: ciTimeout(8000) });
  await expect(stage).toHaveAttribute('data-motion', 'paused');
  const canvas = stage.locator('.pickup-3d-canvas');
  await expect.poll(() => canvas.evaluate(paintedShare), { timeout: ciTimeout(8000) }).toBeGreaterThan(.08);
  // Two frames apart: a still model paints the same pixels.
  const snapshot = () => canvas.evaluate(async node => {
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return node.toDataURL();
  });
  await expect.poll(async () => await snapshot() === await snapshot(), { timeout: ciTimeout(8000) }).toBe(true);
});

test('where the preview cannot get WebGL the animated sprite stays as the fallback', async ({ page, gameplayURL }) => {
  // Only the preview stage renders into a canvas that is not in the page; the game's own canvas is untouched.
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
      return !this.isConnected && /webgl/.test(type) ? null : getContext.call(this, type, ...rest);
    };
  });
  await page.goto(gameplayURL);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await openItemsGuide(page);
  for (const tier of TIERS) {
    const stage = page.locator(`.pickup-animation-stage[data-tier="${tier}"]`);
    await stage.scrollIntoViewIfNeeded();
    const sprite = stage.locator('img.pickup-animation');
    await expect(sprite).toHaveAttribute('src', new RegExp('/animated/' + tier + '\\.webp$'));
    await expect.poll(() => sprite.evaluate(img => img.complete && img.naturalWidth === 192 && img.naturalHeight === 192),
      { timeout: ciTimeout(8000) }).toBe(true);
    await expect(stage).toHaveAttribute('data-live', 'false');
  }
});
