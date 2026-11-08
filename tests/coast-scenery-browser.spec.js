import { expect } from '@playwright/test';
import { test, programs } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// Task 5: Coast Medium+ draws the coast-scenery.glb scans (cliffs, rocks, palms, sea arch, rails) instead of the
// procedural rocks/trees. The GLB attaches before GO and its programs are built by the warmup, never mid-race.
const status = page => page.locator('#world').getAttribute('data-coast-scenery');
const layer = page => page.evaluate(() => {
  const pieces = {};
  window.gameScene.scene.getObjectByName('Coast scenic details').traverse(o => { if (o.isInstancedMesh) pieces[o.name] = { visible: o.visible, count: o.count }; });
  return pieces;
});

async function withQuality(page, quality) {
  await page.evaluate(tier => localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: tier, preset: 'cinematic', enabled: true })), quality);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}

test('Coast High attaches the scenery GLB before GO and compiles nothing after it', async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(90000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await withQuality(page, 'high');
  await expect.poll(() => status(page), { timeout: ciTimeout(40000) }).toBe('attached');
  await expect.poll(async () => (await layer(page)).cliff_a?.visible || (await layer(page)).cliff_b?.visible).toBe(true);
  const pieces = await layer(page);
  expect(pieces['Coast shoreline rocks'].visible).toBe(false);
  expect(pieces.guard_rail.count).toBeGreaterThan(0);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.waitForTimeout(ciTimeout(300));
  const before = await programs(page);
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(ciTimeout(1500));
  expect(await programs(page)).toBe(before);
  expect(errors).toEqual([]);
});

test('Coast Low never fetches the scenery GLB and keeps the procedural rocks and trees', async ({ gameplayPage: page }) => {
  await withQuality(page, 'low');
  await page.waitForTimeout(ciTimeout(1500));
  expect(await status(page)).toBeNull(); // settled: Low never requests, so nothing can arrive later
  const pieces = await layer(page);
  expect(pieces['Coast shoreline rocks'].visible).toBe(true);
  expect(Object.keys(pieces).some(name => name.startsWith('cliff_'))).toBe(false);
  // This document's own fetches; the fixture's first (default-tier) page may have requested it before the reload.
  const requests = await page.evaluate(() => performance.getEntriesByType('resource').map(e => e.name).filter(n => n.includes('coast-scenery.glb')));
  expect(requests).toEqual([]);
});
