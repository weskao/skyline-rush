import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 9J: Endless Highway stays bounded after lengthy play and survives pause, backgrounding and context loss.
const frames = (page, count = 2) => page.evaluate(count => new Promise(resolve => {
  const tick = left => left ? requestAnimationFrame(() => tick(left - 1)) : resolve();
  tick(count);
}), count);
const elapsed = page => page.evaluate(() => window.gameplay.race.elapsed);
const phase = page => page.evaluate(() => window.gameplay.race.phase);
async function startEndless(page) {
  await page.locator('button[data-race-mode="endless"]').click();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
}
// Deterministic resource counters, never wall-clock time.
const resources = page => page.evaluate(() => {
  const { scene, renderer } = window.gameScene, race = window.gameplay.race;
  let objects = 0;
  scene.traverse(() => { objects++; });
  return { objects, ...renderer.info.memory, programs: renderer.info.programs.length,
    traffic: race.traffic.length, pickups: race.pickups.length, rings: race.rings.length,
    groups: Object.keys(race.player.groupHits).length };
});

test.describe('endless bounds desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('a 50 km run keeps scene objects, GPU buffers, shaders and encounter arrays flat', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(180000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await startEndless(page);
    const samples = {};
    for (let km = 0.5; km <= 50; km += 0.5) {
      // Ghost keeps the car out of the five-collision finish while it hops 500 m per step.
      await page.evaluate(distance => {
        const car = window.gameplay.race.player;
        car.effects.ghost = 10;
        Object.assign(car, { distance, x: 0, altitude: 0, speed: 70, cooldown: 1 });
      }, km * 1000);
      await frames(page, 3);
      if (km === 25 || km === 50) samples[km] = await resources(page);
    }
    expect(await phase(page)).toBe('racing');
    // Traffic deliberately ramps until 20 km (endlessTrafficCount), so compare 25 km with 50 km, after the ramp.
    const [early, late] = [samples[25], samples[50]];
    for (const key of Object.keys(early)) expect(late[key], `${key} at 50 km vs 25 km`).toBeLessThanOrEqual(early[key]);
    expect(late.traffic, 'fixed traffic budget').toBeLessThanOrEqual(40);
    expect(errors).toEqual([]);
  });

  test('a 1.5 s stalled frame resumes without a runaway time step', async ({ gameplayPage: page }) => {
    await startEndless(page);
    await frames(page, 10);
    // A blocked main thread is a real frame gap (headless CDP "frozen" keeps animation frames running).
    const before = await page.evaluate(() => {
      const start = window.gameplay.race.elapsed, until = performance.now() + 1500;
      while (performance.now() < until) { /* stall like a suspended device */ }
      return start;
    });
    await frames(page, 1);
    // One clamped 0.05 s frame plus one fixed step of slack; never the 1.5 s that passed while frozen.
    expect(await elapsed(page) - before).toBeLessThan(0.12);
  });

  test('a hidden tab pauses the run and suspends audio; coming back stays paused until resumed', async ({ gameplayPage: page }) => {
    // Sound is on by default and opens its context at load, so record contexts from the first script on.
    await page.addInitScript(() => {
      window.audioContexts = [];
      const Native = window.AudioContext;
      window.AudioContext = class extends Native { constructor(...args) { super(...args); window.audioContexts.push(this); } };
    });
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await startEndless(page); // the Start click is the gesture that resumes it
    await expect.poll(() => page.evaluate(() => window.audioContexts.map(context => context.state))).toContain('running');
    const setHidden = hidden => page.evaluate(hidden => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => hidden ? 'hidden' : 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    }, hidden);
    await setHidden(true);
    expect(await phase(page)).toBe('paused');
    await expect.poll(() => page.evaluate(() => window.audioContexts.map(context => context.state))).not.toContain('running');
    const paused = await elapsed(page);
    await frames(page, 10);
    expect(await elapsed(page)).toBe(paused);
    await setHidden(false);
    await frames(page, 5);
    expect([await phase(page), await elapsed(page)]).toEqual(['paused', paused]);
    await page.keyboard.press('KeyP');
    await expect.poll(() => phase(page)).toBe('racing');
  });

  test('losing and restoring the graphics context pauses, warns and resumes the same run', async ({ gameplayPage: page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await startEndless(page);
    await page.evaluate(() => { window.gameplay.race.player.distance = 12000; });
    await frames(page, 5);
    const before = await resources(page);
    await page.evaluate(() => {
      window.lostContext = document.querySelector('#world').getContext('webgl2').getExtension('WEBGL_lose_context');
      window.lostContext.loseContext();
    });
    await expect(page.locator('#error-message')).toBeVisible();
    expect(await phase(page)).toBe('paused');
    await page.evaluate(() => window.lostContext.restoreContext());
    await expect(page.locator('#error-message')).toBeHidden();
    await page.keyboard.press('KeyP');
    await expect.poll(() => phase(page)).toBe('racing');
    const distance = await page.evaluate(() => window.gameplay.race.player.distance);
    await frames(page, 20);
    expect(await page.evaluate(() => window.gameplay.race.player.distance)).toBeGreaterThan(distance);
    const after = await resources(page);
    for (const key of ['geometries', 'textures', 'objects']) expect(after[key], key).toBeLessThanOrEqual(before[key]);
    expect(errors).toEqual([]);
  });
});

test.describe('endless bounds phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('touch pause freezes the run and touch resume continues it', async ({ gameplayPage: page }) => {
    await startEndless(page);
    await page.locator('#pause-button').tap();
    expect(await phase(page)).toBe('paused');
    const paused = await elapsed(page);
    await frames(page, 10);
    expect(await elapsed(page)).toBe(paused);
    await page.locator('#resume-button').tap();
    await expect.poll(() => phase(page)).toBe('racing');
    await frames(page, 10);
    expect(await elapsed(page)).toBeGreaterThan(paused);
  });
});
