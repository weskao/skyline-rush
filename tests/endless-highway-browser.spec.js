import { test } from './helpers/gameplay-browser.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from './helpers/test.js';

for (const [label, viewport, locale, touch] of [
  ['desktop-en', { width: 1440, height: 900 }, 'en', false],
  ['phone-zh', { width: 390, height: 844 }, 'zh-TW', true],
]) {
  test.describe(label, () => {
    test.use({ viewport, hasTouch: touch, isMobile: touch, locale });
    test('Endless start, long distance, lifecycle, terminal result and real controls', async ({ gameplayPage: page, context }) => {
      test.setTimeout(ciTimeout(90000));
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.waitForTimeout(750);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('[data-race-mode="endless"]').click();
      await expect(page.locator('body')).toHaveAttribute('data-race-mode', 'endless');
      await expect(page.locator('[data-track="neon"]')).toBeDisabled();
      await expect(page.locator('#mode-description')).toContainText(locale === 'en' ? 'Coast only' : '僅限海岸');
      await page.screenshot({ path: `artifacts/endless/${label}-ready.png` });
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
      await expect(page.locator('#speed')).not.toHaveText('0');
      await expect(page.locator('#race-route-map')).toBeHidden();
      await expect(page.locator('.progress-track')).toBeHidden();
      await page.evaluate(() => {
        const race = window.gameplay.race;
        Object.assign(race.player, { distance: 15000, speed: 75, x: 0, cooldown: 2 });
      });
      await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(15001);
      await page.screenshot({ path: `artifacts/endless/${label}-15km.png` });
      const before = await page.evaluate(() => ({ programs: window.gameScene.renderer.info.programs.length,
        geometries: window.gameScene.renderer.info.memory.geometries, textures: window.gameScene.renderer.info.memory.textures,
        scene: window.gameScene.scene.children.length }));
      // Sweep the same live renderer, not thousands of synthetic fresh worlds.
      for (const distance of [20000, 120000, 2_000_000, 1_000_000_000]) {
        await page.evaluate(distance => Object.assign(window.gameplay.race.player, { distance, speed: 70, x: 0, cooldown: 2 }), distance);
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(distance);
      }
      const after = await page.evaluate(() => {
        const scene = window.gameScene, race = window.gameplay.race, local = [];
        scene.scene.traverse(object => {
          if (object.isInstancedMesh && ['Coast shoreline rocks', 'Coast wind-shaped trees', 'Coast tree trunks'].includes(object.name))
            for (let i = 0; i < object.count; i++) local.push(object.instanceMatrix.array[i * 16 + 14]);
        });
        return { phase: race.phase, traffic: race.traffic.length, pickups: race.pickups.length, rings: race.rings.length,
          programs: scene.renderer.info.programs.length, geometries: scene.renderer.info.memory.geometries,
          textures: scene.renderer.info.memory.textures, scene: scene.scene.children.length, local };
      });
      expect(after.phase).toBe('racing'); expect(after.traffic).toBeLessThanOrEqual(40);
      expect(after.pickups).toBeLessThanOrEqual(20); expect(after.rings).toBeLessThanOrEqual(15);
      expect(after.local.every(z => Math.abs(z) < 3000)).toBeTruthy();
      expect({ programs: after.programs, geometries: after.geometries, textures: after.textures, scene: after.scene }).toEqual(before);
      await page.screenshot({ path: `artifacts/endless/${label}-billion.png` });
      await page.keyboard.press('Escape');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
      const paused = await page.evaluate(() => ({ distance: window.gameplay.race.player.distance, elapsed: window.gameplay.race.elapsed,
        collisions: window.gameplay.race.player.collisions, chunk: window.gameplay.race.endless.chunk }));
      await page.waitForTimeout(200);
      expect(await page.evaluate(() => ({ distance: window.gameplay.race.player.distance, elapsed: window.gameplay.race.elapsed,
        collisions: window.gameplay.race.player.collisions, chunk: window.gameplay.race.endless.chunk }))).toEqual(paused);
      await page.keyboard.press('Escape');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      // Real context loss/restore exercises Three.js and re-warms the same renderer.
      await page.evaluate(() => window.gameScene.renderer.forceContextLoss());
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'paused');
      const preserved = await page.evaluate(() => window.gameplay.race.player.distance);
      await page.evaluate(() => window.gameScene.renderer.forceContextRestore());
      await expect(page.locator('#error-message')).toBeHidden();
      expect(await page.evaluate(() => window.gameplay.race.player.distance)).toBe(preserved);
      await page.keyboard.press('Escape');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      if (touch) {
        const session = await context.newCDPSession(page), box = await page.locator('[data-control="fly"]').boundingBox();
        await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height / 2 }] });
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(.5);
        await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.keyboard.down('Space');
        await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(.5);
        await page.keyboard.up('Space');
      }
      await page.evaluate(() => Object.assign(window.gameplay.race.player, { collisions: 4, cooldown: 0,
        x: 10.1, railContactSide: 0, steering: 1, altitude: 0, verticalSpeed: 0, speed: 80 }));
      await page.keyboard.down('ArrowRight');
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished');
      await page.keyboard.up('ArrowRight');
      await expect(page.locator('#overlay-title')).toHaveText(locale === 'en' ? 'SURVIVAL RUN COMPLETE' : '生存挑戰完成');
      await expect(page.locator('#result-stats')).toContainText('1000000.');
      await page.screenshot({ path: `artifacts/endless/${label}-results.png` });
      const saved = await page.evaluate(() => ({ mode: JSON.parse(localStorage.getItem('skyline-rush-mode-history-v1')),
        career: localStorage.getItem('skyline-rush-history'), ghosts: localStorage.getItem('skyline-rush-ghosts') }));
      expect(saved.mode).toHaveLength(1); expect(saved.mode[0].distance).toBeGreaterThan(1_000_000_000);
      expect(saved.career).toBeNull(); expect(saved.ghosts).toBeNull();
      await selectLocale(page, locale === 'en' ? 'zh-TW' : 'en');
      await expect(page.locator('#overlay-title')).toHaveText(locale === 'en' ? '生存挑戰完成' : 'SURVIVAL RUN COMPLETE');
      await page.locator('#restart-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
      expect(await page.evaluate(() => window.gameplay.race.player.distance)).toBeLessThan(100);
      expect(await page.evaluate(() => window.gameplay.race.player.collisions)).toBe(0);
      expect(errors).toEqual([]);
    });
  });
}
