import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// User, 2026-11-02: ring trains and a few full-width rows. In the real WebGL race every ring ahead is drawn where it
// scores (the pool is not exhausted), a car crossing a row anywhere on the road takes exactly one ring, and driving
// down a train takes all of it and a PERFECT LINE. User, 2026-11-03: trains are six rings down one lane; since the user's
// 2026-11-07 lane variety that lane may be any of the four.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Ring trains and rows ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('a full-width row pays one ring and a one-lane train pays all six', async ({ gameplayPage: page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    // Layouts re-roll every race and ~7% of Coast rolls have no full-width row: pin the track's own layout seed.
    await page.evaluate(async () => (await import('/src/game.js')).setLayoutSeed());
    await page.locator('[data-track="coast"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    const drawn = await page.evaluate(async () => {
      const race = window.gameplay.race;
      Object.assign(race, { traffic: [], pickups: [] });
      race.rivals.length = 0;
      const row = race.rings.find(r => r.row);
      window.ringRowAt = row.distance;
      for (const r of race.rings) if (!r.row && Math.abs(r.distance - row.distance) < 70) r.hit = true; // only the row on this stretch
      const pin = () => { if (race.phase === 'racing') Object.assign(race.player, { distance: row.distance - 60, x: -1, speed: 0, altitude: 0 }); window.ringRowPin = requestAnimationFrame(pin); };
      pin();
      for (let i = 0; i < 150; i++) await new Promise(requestAnimationFrame); // past the GO banner
      const { drawnMarkers } = await import('/src/marker-pool.js');
      const d = race.player.distance, ahead = race.rings.filter(r => !r.hit && !(r.downUntil > race.elapsed) && r.distance > d && r.distance <= d + 900);
      return { ahead: ahead.length, row: ahead.filter(r => r.row).length, drawn: drawnMarkers(window.gameScene.scene.getObjectByName('Race rings')).length };
    });
    expect(drawn.row, 'a full-width row is ahead').toBeGreaterThanOrEqual(4);
    expect(drawn.drawn, 'every ring ahead is drawn').toBe(drawn.ahead);
    await page.screenshot({ path: info.outputPath(`ring-row-${name}.png`) });
    const drive = async (x, altitude, to) => page.evaluate(async ([x, altitude, to]) => {
      cancelAnimationFrame(window.ringRowPin);
      const race = window.gameplay.race, before = race.player.rings, lines = race.player.perfectLines;
      race.player.speed = 50;
      for (let i = 0; i < 600 && race.player.distance < to; i++) {
        Object.assign(race.player, { x, altitude, verticalSpeed: 0 });
        await new Promise(requestAnimationFrame);
      }
      return { rings: race.player.rings - before, perfect: race.player.perfectLines - lines };
    }, [x, altitude, to]);
    expect((await drive(-1, 0, (await page.evaluate(() => window.ringRowAt)) + 5)).rings, 'one ring per row').toBe(1);
    const train = await page.evaluate(() => {
      const race = window.gameplay.race, first = race.rings.find(r => r.train === 0 && r.distance > 200); // layouts re-roll every race
      for (const r of race.rings) if (r.distance < first.distance + 135 && r !== first && !(r.train !== undefined && r.group === first.group)) r.hit = true;
      Object.assign(race.player, { distance: first.distance - 40, x: first.x, altitude: first.altitude, verticalSpeed: 0, speed: 0 }); // parked for the screenshot
      return { x: first.x, altitude: first.altitude, end: first.distance + 130 };
    });
    for (let i = 0; i < 20; i++) await page.evaluate(() => new Promise(requestAnimationFrame));
    await page.screenshot({ path: info.outputPath(`ring-train-${name}.png`) });
    expect([-7.5, -2.5, 2.5, 7.5], 'a train runs down a lane').toContain(train.x);
    expect(await drive(train.x, train.altitude, train.end)).toEqual({ rings: 6, perfect: 1 });
    expect(errors).toEqual([]);
  });
});
