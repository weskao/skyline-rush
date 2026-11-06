import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL Stormline Megacity RACE on the `make dev-unlocked` module alias (release builds keep the card Coming Soon).
// Set STORMLINE_CAPTURE_DIR to keep the evidence frames.
const captureDir = process.env.STORMLINE_CAPTURE_DIR;
const capture = async (page, name) => {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, `${name}.png`) });
};
// Ground-route stops between the three forks (flood street, surface loop, ground detour), then the finish run-in.
const STOPS = [['downtown', 900], ['flood-street', 4500], ['surface-loop', 9000], ['outlet', 14000]];

test.use({ unlockedAccess: true });
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Stormline race ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('the Coming Soon card enters a real 14.5 km race over every fork, finishes once and saves topology-keyed results', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-upcoming-track="stormline-megacity"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await expect(page.locator('#track-length')).toHaveText('14.5 KM SPRINT');
    await expect(page.locator('.route-heading')).toHaveText('STORMLINE MEGACITY');
    await expect(page.locator('#upcoming-scene')).toBeHidden();
    await page.waitForTimeout(1200);
    const ready = await page.evaluate(() => {
      const course = window.gameScene.scene.getObjectByName('Stormline Megacity race');
      let decks = 0; course.traverse(o => { if (o.name === 'shortcut-deck') decks++; });
      return { trackId: window.gameplay.race.trackId, visible: course.visible, decks, pylons: !!course.getObjectByName('shortcut-pylons') };
    });
    expect(ready).toEqual({ trackId: 'stormline-megacity', visible: true, decks: 2, pylons: true });
    await capture(page, `${name}-ready`);

    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
    const programs = await page.evaluate(() => window.gameScene.renderer.info.programs.length);
    for (const [stop, distance] of STOPS) {
      await page.evaluate(d => { Object.assign(window.gameplay.race.player, { distance: d, x: 0, altitude: 0, speed: 60 }); }, distance);
      await page.waitForTimeout(700);
      // The player is drawn on the CourseGraph road frame (camera-relative origin at the car).
      const pose = await page.evaluate(() => window.gameScene.player.position.toArray());
      expect(Math.hypot(pose[0], pose[2]), `${stop} player near origin`).toBeLessThan(3);
      await capture(page, `${name}-${stop}`);
    }
    // Every fork (skyway cut, tunnel cut, rooftop flight) is a shortcut corridor over its safe edge: a car inside it
    // is drawn up at the corridor, still racing, with no shader compiles.
    const shortcuts = await page.evaluate(() => window.gameplay.race.sections.filter(s => s.type === 'shortcut'));
    expect(shortcuts.length).toBe(3);
    await page.keyboard.down('Space');
    for (const [i, s] of shortcuts.entries()) {
      await page.evaluate(c => Object.assign(window.gameplay.race.player, { distance: (c.from + c.to) / 2, x: c.x, altitude: c.altitude, verticalSpeed: 0, speed: 60, fuel: 100 }), s);
      await page.waitForTimeout(500);
      const lift = await page.evaluate(() => { const p = window.gameplay.race.player;
        return [window.gameScene.player.position.y, document.body.dataset.phase, JSON.stringify({ d: p.distance, x: p.x, alt: p.altitude, fuel: p.fuel, falls: p.falls })]; });
      expect(lift[0], `fork ${i} drawn at the corridor ${lift[2]}`).toBeGreaterThan(2);
      expect(lift[1]).toBe('racing');
      await capture(page, `${name}-fork-${i + 1}`);
    }
    await page.keyboard.up('Space');
    expect(await page.evaluate(() => window.gameScene.renderer.info.programs.length), 'no shader compiles mid-race').toBe(programs);

    await page.evaluate(() => { const race = window.gameplay.race; Object.assign(race.player, { distance: race.length - 5, x: 0, altitude: 0, speed: 60 }); });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished', { timeout: ciTimeout(15_000) });
    await expect(page.locator('#race-overlay')).toBeVisible({ timeout: ciTimeout(15_000) });
    await expect(page.locator('#next-button')).toBeHidden(); // a gated runtime unlocks nothing
    await capture(page, `${name}-finished`);
    const saved = await page.evaluate(() => ({ history: JSON.parse(localStorage.getItem('skyline-rush-history') ?? '[]').map(r => r.track),
      bests: Object.keys(JSON.parse(localStorage.getItem('skyline-rush-best-tracks') ?? '{}')), stars: localStorage.getItem('skyline-rush-stars') }));
    expect(saved).toEqual({ history: ['stormline-megacity'], bests: ['stormline-megacity@t1l1'], stars: null });
    await page.locator('#again-button').click(); // a real click on the results screen restarts the same course
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => [window.gameplay.race.trackId, window.gameplay.race.player.distance < 50])).toEqual(['stormline-megacity', true]);
    expect(errors).toEqual([]);
  });
});
