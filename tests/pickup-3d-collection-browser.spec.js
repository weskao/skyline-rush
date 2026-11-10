import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';

test('3d=1 renders real in-race tiered collection shockwaves and captures their WebGL frames', async ({ gameplayPage: page }) => {
  test.skip(process.env.VITE_PICKUP_3D !== '1', 'This requires make verify 3d=1');
  await page.locator('#start-button').click();
  if (await page.locator('#tutorial-exit').isVisible()) await page.locator('#tutorial-exit').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  for (const tier of ['cell', 'can', 'tank', 'overcharge']) {
    await page.evaluate(name => {
      const race = window.gameplay.race;
      race.pickups = [{ tier: name, x: race.player.x, altitude: 0, distance: race.player.distance + 8,
        taken: true, downUntil: race.elapsed + 2.5 }];
    }, tier);
    await expect.poll(() => page.evaluate(name => {
      const group = window.gameScene.scene.getObjectByName('Pickup collect VFX');
      return group?.children.filter(stage => stage.visible).map(stage => stage.userData.tier) ?? [];
    }, tier), { timeout: 4000 }).toContain(tier);
    const state = await page.evaluate(name => {
      const group = window.gameScene.scene.getObjectByName('Pickup collect VFX');
      const stage = group.children.find(stage => stage.userData.tier === name && stage.visible);
      return {
        shockwaves: stage.children.filter(mesh => mesh.name.includes('energy shockwave') && mesh.visible).length,
        instanced: stage.children.some(mesh => mesh.isInstancedMesh),
      };
    }, tier);
    expect(state.instanced).toBe(true);
    expect(state.shockwaves).toBeGreaterThanOrEqual(1);
    await test.info().attach('pickup-collect-' + tier + '.png', {
      body: await page.screenshot(), contentType: 'image/png',
    });
  }
});

test('3d=1 reduced-motion collection stays restrained without the rare beam or particle storm', async ({ gameplayPage: page }) => {
  test.skip(process.env.VITE_PICKUP_3D !== '1', 'Requires 3d=1');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#start-button').click();
  if (await page.locator('#tutorial-exit').isVisible()) await page.locator('#tutorial-exit').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.pickups = [{ tier: 'overcharge', x: race.player.x, altitude: 0,
      distance: race.player.distance + 8, taken: true, downUntil: race.elapsed + 2.5 }];
  });
  await expect.poll(() => page.evaluate(() =>
    window.gameScene.scene.getObjectByName('Pickup collect VFX')?.children.some(stage => stage.visible) ?? false
  ), { timeout: 4000 }).toBe(true);
  const state = await page.evaluate(() => {
    const stage = window.gameScene.scene.getObjectByName('Pickup collect VFX').children.find(stage => stage.visible);
    return { shards: stage.children.find(mesh => mesh.isInstancedMesh).count,
      beam: stage.children.find(mesh => mesh.name === 'energy beam').visible };
  });
  expect(state.shards).toBe(0);
  expect(state.beam).toBe(false);
});
