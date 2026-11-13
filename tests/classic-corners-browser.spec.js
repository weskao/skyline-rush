import { expect } from '@playwright/test';
import { captureHooks, test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

const TRACKS = ['coast', 'neon', 'canyon', 'aurora'];
const variants = [
  { name: 'desktop', track: 'neon', viewport: { width: 1280, height: 800 }, search: '' },
  { name: 'phone portrait 3D', track: 'coast', viewport: { width: 390, height: 844 }, search: '?model=roadster&look=3d', touch: true },
  { name: 'phone landscape 3D', track: 'aurora', viewport: { width: 844, height: 390 }, search: '?model=roadster&look=3d', touch: true },
];

for (const variant of variants) test.describe(variant.name, () => {
  test.use({ viewport: variant.viewport, hasTouch: !!variant.touch, isMobile: !!variant.touch });
  test('classic bends keep the live route, road ribbon and car aligned', async ({ page, gameplayURL }, info) => {
    test.setTimeout(ciTimeout(130000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await captureHooks(page);
    await page.addInitScript(ids => {
      if (location.protocol !== 'http:') return;
      localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'medium' }));
    }, TRACKS);
    await page.goto(gameplayURL + variant.search);
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();

    const id = variant.track;
    await page.locator('[data-track="' + id + '"]').click();
    const homeLine = page.locator('[data-track="' + id + '"] .route-overview-line');
    const sprint = await homeLine.getAttribute('points');
    expect(sprint.split(' ')).toHaveLength(128);

    if (id === 'coast') {
      await expect.poll(() => page.locator('#world').getAttribute('data-coast-scenery'), { timeout: ciTimeout(35000) }).toBe('attached');
    }
    await page.locator('button[data-race-mode="endless"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(40000) });

    const map = page.locator('#race-route-map');
    await expect(map).toBeVisible();
    await expect(map.locator('.route-finish')).toHaveCount(0);
    const line = map.locator('.route-overview-line');
    const near = await line.getAttribute('points');
    expect(near).not.toBe(sprint);

    const distance = { coast: 50290, neon: 52300, aurora: 50110 }[id];
    await page.evaluate(d => {
      const { player } = window.gameplay.race;
      player.effects.ghost = 10;
      Object.assign(player, { distance: d, speed: 70, x: 0, steering: 0, altitude: 0, cooldown: 2 });
    }, distance);
    await expect.poll(() => line.getAttribute('points')).not.toBe(near);
    await expect.poll(() => page.evaluate(() => {
      const { scene, player, camera } = window.gameScene;
      const road = scene.getObjectByName('classic-road'), pos = road.geometry.attributes.position;
      const rows = [];
      for (let i = 0; i < pos.count; i += 2) {
        rows.push([(pos.getX(i) + pos.getX(i + 1)) / 2 + road.position.x,
          (pos.getZ(i) + pos.getZ(i + 1)) / 2 + road.position.z]);
      }
      const nearby = rows.filter(([, z]) => z < -80 && z > -450);
      const bends = nearby.length > 5 && Math.max(...nearby.map(([x]) => x)) - Math.min(...nearby.map(([x]) => x)) > 40;
      const aligned = rows.some(([x, z]) => Math.hypot(x - player.position.x, z - player.position.z) < 9);
      return road.visible && bends && aligned && camera.quaternion.toArray().every(Number.isFinite);
    })).toBe(true);
    await page.screenshot({ path: info.outputPath(id + '-endless-corner.png') });
    const camera = page.locator('#camera-button');
    await camera.click();
    await expect(camera).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => page.evaluate(() => window.gameScene.camera.quaternion.toArray().every(Number.isFinite))).toBe(true);
    expect(errors).toEqual([]);
  });
});
