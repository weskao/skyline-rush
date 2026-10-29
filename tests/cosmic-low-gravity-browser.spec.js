import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';

// 11B Cosmic Orbit visual evidence: the low-gravity sign and the aerial gate sequence are drawn in the
// real WebGL scene where the simulation puts them. Themes have no menu toggle yet (10A), so the race
// takes the sections and rings a `themes: true` Cosmic race gets.
for (const [name, viewport, hasTouch] of [
  ['desktop', { width: 1440, height: 900 }, false],
  ['phone', { width: 390, height: 844 }, true],
]) test.describe(`Cosmic low gravity ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('the low-gravity sector is signed and its aerial gates hang over the road', async ({ gameplayPage: page }, info) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['cosmic'])));
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('[data-track="cosmic"]').click();
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(10000) });
    const result = await page.evaluate(async () => {
      const { createRace } = await import('/src/game.js');
      const { trackLocalPosition } = await import('/src/track-paths.ts');
      const race = window.gameplay.race, themed = createRace('cosmic', { mode: 'custom', rivals: 0, traffic: 'off', themes: true });
      Object.assign(race, { sections: themed.sections, rings: themed.rings, traffic: [], pickups: [] });
      const sector = race.sections.find(s => s.type === 'low-gravity');
      const pin = () => { if (race.phase === 'racing') Object.assign(race.player, { distance: sector.from - 200, x: -7.5, speed: 0, altitude: 0 }); window.lowGravityPin = requestAnimationFrame(pin); };
      pin();
      for (let i = 0; i < 150; i++) await new Promise(requestAnimationFrame); // past the GO banner
      const { scene } = window.gameScene, d = race.player.distance;
      const gates = race.rings.filter(r => r.spin && r.distance > d && r.distance <= d + 900);
      const drawn = scene.getObjectByName('Race rings').children.filter(m => m.visible);
      const off = Math.max(...gates.map(g => Math.min(...drawn.map(m => {
        const [x, y, z] = trackLocalPosition('cosmic', g.distance, g.x, g.altitude, d);
        return Math.hypot(m.position.x - x, m.position.y - y, m.position.z - z);
      }))));
      return { gates: gates.length, off, from: sector.from };
    });
    expect(result.gates, 'the gate sequence is ahead').toBeGreaterThanOrEqual(3);
    expect(result.off, `gates drawn ${result.off} m from where they score`).toBeLessThan(0.05);
    await page.screenshot({ path: info.outputPath(`cosmic-low-gravity-${name}.png`) });
    // Glide into the sector: the live race floats the car at the reduced fall rate.
    const fall = await page.evaluate(async () => {
      cancelAnimationFrame(window.lowGravityPin);
      const race = window.gameplay.race, sector = race.sections.find(s => s.type === 'low-gravity');
      Object.assign(race.player, { distance: sector.from + 20, x: 7.5, speed: 0, altitude: 10, verticalSpeed: 0, fuel: 0 });
      const start = race.elapsed;
      await new Promise(requestAnimationFrame);
      return { section: race.player.section, rate: -race.player.verticalSpeed / Math.max(race.elapsed - start, 1e-6) };
    });
    expect(fall.section).toBe('low-gravity');
    expect(fall.rate).toBeLessThan(7 * 0.5);
    expect(errors).toEqual([]);
  });
});
