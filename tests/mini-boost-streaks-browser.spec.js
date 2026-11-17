import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { ciTimeout } from './helpers/ci.js';

// Real WebGL: the mini-boost start cue (.claude/rules/mini-boost-streaks.md) in a boost tunnel and after a chain
// landing, with no shader compiled mid-race. Screenshots go to the test output for the visual gate.
const VIEWPORTS = [
  ['desktop', { width: 1280, height: 720 }, false],
  ['phone portrait', { width: 390, height: 844 }, true],
  ['phone landscape', { width: 844, height: 390 }, true],
];
const streaks = page => page.evaluate(() => {
  const mesh = window.gameScene.scene.getObjectByName('Mini boost streaks');
  return { visible: mesh.visible, lines: mesh.geometry.drawRange.count / (32 * 6), programs: window.gameScene.renderer.info.programs.length };
});
// Race seconds, not wall clock: a CPU-rendered CI runner steps the game several times slower.
const raceTime = page => page.evaluate(() => window.gameplay.race.elapsed);
const untilRace = (page, time) => page.waitForFunction(t => window.gameplay.race.elapsed >= t, time, { timeout: ciTimeout(20_000) });
const shown = page => page.waitForFunction(() => window.gameScene.scene.getObjectByName('Mini boost streaks').visible, null, { timeout: ciTimeout(10_000) });

for (const [name, viewport, hasTouch] of VIEWPORTS) test.describe(`mini-boost streaks ${name}`, () => {
  test.use({ viewport, hasTouch, lowGraphics: false }); // Low hides the streaks (src/mini-boost-streaks.js)
  test('a boost tunnel and a chain landing each play the rear streaks once', async ({ gameplayPage: page }, info) => {
    test.setTimeout(ciTimeout(120_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['taipei'])));
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('[data-track="taipei"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15_000) });
    await page.keyboard.down('w');
    await untilRace(page, 1.5);
    const idle = await streaks(page);
    expect(idle.visible).toBe(false);

    await page.evaluate(async () => {
      const { RACE_TRACKS } = await import('/src/game.js');
      const race = window.gameplay.race, tunnel = RACE_TRACKS.taipei.sections.find(s => s.type === 'boost-tunnel');
      race.traffic = []; race.rivals.forEach(rival => { rival.distance = 0; });
      Object.assign(race.player, { distance: tunnel.from + 5, speed: 62, altitude: 0, miniBoost: 0 });
    });
    await shown(page);
    await untilRace(page, await raceTime(page) + 0.22);
    const tunnel = await streaks(page);
    await page.screenshot({ path: info.outputPath('mini-boost-tunnel.png') });
    expect(tunnel.lines).toBe(8);
    expect(await page.evaluate(() => !!window.gameplay.race.player.boostTunnelEvent)).toBe(true); // settled: the streaks only show after the claim
    await untilRace(page, await raceTime(page) + 0.8);
    expect((await streaks(page)).visible, 'one 0.8 s play, not the whole 3.5 s boost').toBe(false);

    await page.evaluate(() => Object.assign(window.gameplay.race.player, {
      miniBoost: 0, altitude: 0.6, verticalSpeed: -9, poweredFlightTime: 0.6, flightBoosted: true, speed: 62,
    }));
    await shown(page);
    expect(await page.evaluate(() => window.gameplay.race.player.landing?.chain)).toBe(true); // settled: shown follows the landing
    await untilRace(page, await raceTime(page) + 0.22);
    const chain = await streaks(page);
    await page.screenshot({ path: info.outputPath('mini-boost-chain-landing.png') });
    expect(chain.programs, 'the streak program was warmed before GO').toBe(idle.programs);
    expect(errors).toEqual([]);
  });
});
