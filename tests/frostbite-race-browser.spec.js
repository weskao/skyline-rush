import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL Frostbite Canyon RACE on the `make dev-unlocked` module alias (release builds keep the card Coming Soon).
// Set FROSTBITE_CAPTURE_DIR to keep the evidence frames.
const captureDir = process.env.FROSTBITE_CAPTURE_DIR;
const capture = async (page, name) => {
  if (!captureDir) return;
  mkdirSync(captureDir, { recursive: true });
  await page.screenshot({ path: join(captureDir, `${name}.png`) });
};
// Stops along the route: basin landmark, first hairpin, glacier ridge, riverbed ice hairpin, Rift ice bridge, climb, aurora span, finish run-in.
const STOPS = [['sentinels', 900], ['hairpin-1', 1750], ['glacier-deck', 3300], ['hairpin-2', 5100], ['rift-deck', 6400], ['climb', 7600], ['aurora-span', 9000], ['outlet', 13300]];

test.use({ unlockedAccess: true });
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Frostbite race ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('the Coming Soon card enters a real 13.8 km race that renders the course, finishes once and saves topology-keyed results', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.locator('[data-upcoming-track="frostbite-canyon"]').click();
    await expect(page.locator('#start-button')).toBeEnabled();
    await expect(page.locator('#track-length')).toHaveText('13.8 KM SPRINT');
    await expect(page.locator('.route-heading')).toHaveText('FROSTBITE CANYON');
    await expect(page.locator('#upcoming-scene')).toBeHidden();
    await page.waitForTimeout(1200);
    const ready = await page.evaluate(() => {
      const course = window.gameScene.scene.getObjectByName('Frostbite Canyon race');
      return { trackId: window.gameplay.race.trackId, visible: course.visible, sentinels: !!course.getObjectByName('crystal-sentinels') };
    });
    expect(ready).toEqual({ trackId: 'frostbite-canyon', visible: true, sentinels: true });
    await capture(page, `${name}-ready`);

    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
    const programs = await page.evaluate(() => window.gameScene.renderer.info.programs.length);
    for (const [stop, distance] of STOPS) {
      await page.evaluate(d => { Object.assign(window.gameplay.race.player, { distance: d, x: 0, speed: 60 }); }, distance);
      await page.waitForTimeout(700);
      // The player is drawn on the road frame (camera-relative origin at the car), not left at a classic centreline.
      const pose = await page.evaluate(() => window.gameScene.player.position.toArray());
      expect(Math.hypot(pose[0], pose[2]), `${stop} player near origin`).toBeLessThan(3);
      await capture(page, `${name}-${stop}`);
    }
    // Rift span: a car flying the corridor is drawn on the graph's ice bridge high over the lower canyon; sinking
    // out of it mid-span is a failed jump back to the corridor start on the lower road (camera cuts, no swoop).
    const span = await page.evaluate(() => window.gameplay.race.sections.find(s => s.span));
    await page.keyboard.down('Space');
    await page.evaluate(s => Object.assign(window.gameplay.race.player, { distance: (s.from + s.to) / 2 - 60, x: s.x, altitude: s.altitude, verticalSpeed: 0, speed: 60, span: true }), span);
    await page.waitForTimeout(700);
    const flying = await page.evaluate(() => ({ span: window.gameplay.race.player.span, falls: window.gameplay.race.player.falls, lift: window.gameScene.player.position.y }));
    expect(flying.span && flying.falls === 0, 'on the span').toBe(true);
    expect(flying.lift, 'drawn high over the lower road').toBeGreaterThan(15);
    await capture(page, `${name}-rift-span`);
    await page.keyboard.up('Space');
    await expect.poll(() => page.evaluate(() => window.gameplay.race.player.falls), { timeout: ciTimeout(8_000) }).toBe(1);
    expect(await page.evaluate(() => window.gameplay.race.player.fall.distance), 'never ahead').toBe(span.from);
    await page.waitForTimeout(500);
    expect(await page.evaluate(() => Math.abs(window.gameScene.player.position.y)), 'back on the lower road').toBeLessThan(3);
    await capture(page, `${name}-rift-recovered`);
    expect(await page.evaluate(() => window.gameScene.renderer.info.programs.length), 'no shader compiles mid-race').toBe(programs);

    await page.evaluate(() => { const race = window.gameplay.race; Object.assign(race.player, { distance: race.length - 5, speed: 60 }); });
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'finished', { timeout: ciTimeout(15_000) });
    await expect(page.locator('#race-overlay')).toBeVisible({ timeout: ciTimeout(15_000) });
    await expect(page.locator('#next-button')).toBeHidden(); // a gated runtime unlocks nothing
    await capture(page, `${name}-finished`);
    // Results persist under the topology-keyed id; campaign progress (stars, unlocks) is untouched.
    const saved = await page.evaluate(() => ({ history: JSON.parse(localStorage.getItem('skyline-rush-history') ?? '[]').map(r => r.track),
      bests: Object.keys(JSON.parse(localStorage.getItem('skyline-rush-best-tracks') ?? '{}')), stars: localStorage.getItem('skyline-rush-stars') }));
    expect(saved).toEqual({ history: ['frostbite-canyon'], bests: ['frostbite-canyon@t1l1'], stars: null });
    await page.locator('#again-button').click(); // a real click on the results screen restarts the same course
    await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
    expect(await page.evaluate(() => [window.gameplay.race.trackId, window.gameplay.race.player.distance < 50])).toEqual(['frostbite-canyon', true]);
    expect(errors).toEqual([]);
  });
});

test.describe('Frostbite Ghost', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('a saved topology-keyed Ghost replays, drawn on the Rift span while inside its corridor', async ({ gameplayPage: page }) => {
    // Synthetic Ghost: 60 s parked mid-span in the corridor (x 7.5, altitude 6), then straight on to FINISH.
    await page.evaluate(() => {
      const mid = 6480, length = 13799, samples = Array.from({ length: 3001 }, (_, i) => i < 600 ? [mid, 7.5, 6] : [mid + (length - mid) * (i - 600) / 2400, 0, 0]);
      localStorage.setItem('skyline-rush-ghosts', JSON.stringify({ 'frostbite-canyon@t1l1': { time: 300, samples } }));
    });
    await page.locator('[data-upcoming-track="frostbite-canyon"]').click();
    await expect(page.locator('#ghost-status')).toContainText('5:00');
    await page.locator('#controls-button').click(); // Ghost display is opt-in, in the Controls panel (real clicks)
    await page.locator('#ghost-enabled').check();
    await page.locator('#controls-button').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
    const span = await page.evaluate(() => window.gameplay.race.sections.find(s => s.span));
    expect(span.from < 6480 && span.to > 6480).toBe(true);
    await page.keyboard.down('Space');
    await page.evaluate(s => Object.assign(window.gameplay.race.player, { distance: 6420, x: s.x, altitude: s.altitude, speed: 60, span: true }), span);
    await page.waitForTimeout(700);
    const ghost = await page.evaluate(() => { const g = window.gameScene.scene.getObjectByName('ghost-car'), p = window.gameScene.player.position;
      return { visible: g.visible, lift: g.position.y, ahead: g.position.distanceTo(p) }; }); // origin = the lower road under the player
    await page.keyboard.up('Space');
    expect(ghost.visible).toBe(true);
    expect(await page.evaluate(() => window.gameplay.race.player.falls), 'player stayed on the span').toBe(0);
    expect(ghost.lift, 'ghost drawn on the span, high over the lower road').toBeGreaterThan(15);
    expect(ghost.ahead, 'ghost ~60 m ahead on the same deck').toBeLessThan(90);
    await capture(page, 'desktop-ghost-span');
  });
});
