import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { upcomingReadiness } from '../src/upcoming-tracks.ts';
const dir = process.env.MONSOON_CAPTURE_DIR;
const shot = async (page, name) => {
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  await page.screenshot({ path: join(dir, name + '.png') });
};
// The Monsoon race runtime has not reached this branch (readiness in src/upcoming-tracks.ts); runs once it is promoted.
test.skip(upcomingReadiness('monsoon-ruins') !== 'playable', 'Monsoon Ruins is not playable yet');
test.use({ unlockedAccess: true });
for (const [device, viewport, touch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe('Monsoon Ruins ' + device, () => {
  test.use({ viewport, hasTouch: touch });
  test('START, all three fork corridors, FINISH, and topology-keyed best', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.locator('[data-upcoming-track="monsoon-ruins"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await expect(page.locator('#upcoming-scene')).toBeHidden();
    const stats = await page.evaluate(() => ({
      id: window.gameplay.race.trackId,
      forks: window.gameplay.race.sections.filter(s => s.type === 'shortcut').length,
    }));
    expect(stats.id).toBe('monsoon-ruins');
    expect(stats.forks).toBe(3);
    await shot(page, device + '-ready');
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase','racing',{ timeout: ciTimeout(15000) });
    // The home preview renders in a separate scene; the heavy race chunks mount on the first racing frame.
    await expect.poll(() => page.evaluate(() =>
      window.gameScene.scene.getObjectByName('Monsoon Ruins race')?.children.length
    ), { timeout: ciTimeout(15000) }).toBeGreaterThan(20);
    for (const f of [0.12, 0.4, 0.78]) {
      await page.evaluate(frac => { const r = window.gameplay.race; Object.assign(r.player,{distance:r.length*frac,x:0,altitude:0,speed:60}); }, f);
      await page.waitForTimeout(400);
      const xyz = await page.evaluate(() => window.gameScene.player.position.toArray());
      expect(Math.hypot(xyz[0],xyz[2])).toBeLessThan(3);
      await shot(page, device + '-road-' + f);
    }
    const forks = await page.evaluate(() => window.gameplay.race.sections.filter(s => s.type === 'shortcut'));
    for (const [i, s] of forks.entries()) {
      await page.evaluate(v => Object.assign(window.gameplay.race.player,{distance:(v.from+v.to)/2,x:v.x,altitude:v.altitude,verticalSpeed:0,speed:60,fuel:100}),s);
      await page.waitForTimeout(400);
      await shot(page,device+'-fork-'+i);
    }
    await page.evaluate(() => { const r=window.gameplay.race; Object.assign(r.player,{distance:r.length-3,x:0,altitude:0,speed:60}); });
    await expect(page.locator('body')).toHaveAttribute('data-phase','finished',{ timeout: ciTimeout(15000) });
    await expect(page.locator('#next-button')).toBeHidden();
    await shot(page,device+'-finished');
    const best = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('skyline-rush-best-tracks') ?? '{}')));
    expect(best).toContain('monsoon-ruins@t1l1');
    expect(errors).toEqual([]);
  });
});
