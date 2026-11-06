import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { saveArtifact } from './helpers/artifact.js';
import { ciTimeout } from './helpers/ci.js';

// 11B visual check: each kind of hazard a theme places, plus its launch ramps and hoops, is drawn in the real WebGL scene where the simulation places them. Themes have no menu toggle yet (10A),
// so the test loads the same themedHazards()/themedExtras() a `themes: true` race would get.
// The pools are per effect, not per track, so one case per pool proves the draw contract; each track's
// placements are proven by tests/track-themes.test.js (valid, routed to ramps/hoops, behaviour).
const name = 'desktop';
test.describe(`themed hazards ${name}`, () => {
  test.use({ viewport: { width: 1440, height: 900 }, hasTouch: false });
  test('each draw pool (barriers, gusts, surfaces, markers, ramps, rings) draws a themed placement on the road ahead', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(480_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    // One target per draw pool: the first themed placement that lands in it, in course order.
    const cases = await page.evaluate(async () => {
      const m = await import('/src/track-themes.ts'), { OBJECT_CATALOG } = await import('/src/object-catalog.ts');
      const poolOf = type => type === 'ramp' ? 'launch-ramps' : type === 'ring' ? 'Race rings' : type === 'branch-marker' ? 'hazard-markers'
        : { block: 'gauntlet-barriers', push: 'hazard-gusts', slow: 'hazard-surfaces' }[OBJECT_CATALOG[type].effect];
      const seen = new Set();
      return m.THEMED_TRACKS.flatMap(track => m.themedPlacements(track).map(p => ({ track, type: p.type, id: p.id, mesh: poolOf(p.type) })))
        .filter(c => !seen.has(c.mesh) && seen.add(c.mesh));
    });
    expect(cases.map(c => c.mesh).sort(), 'every pool has a themed placement').toEqual(
      ['Race rings', 'gauntlet-barriers', 'hazard-gusts', 'hazard-markers', 'hazard-surfaces', 'launch-ramps']);
    const tracks = [...new Set(cases.map(c => c.track))];
    await page.evaluate(list => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(list)), tracks);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    for (const c of cases) {
      await page.locator(`[data-track="${c.track}"]`).click();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(15_000) });
      await expect(page.locator('#countdown')).toBeHidden({ timeout: ciTimeout(10_000) });
      await page.evaluate(async ({ track, id, type }) => {
        const { themedHazards, themedExtras } = await import('/src/track-themes.ts');
        const { hazardPose } = await import('/src/hazard-race.ts');
        const race = window.gameplay.race;
        race.traffic = []; race.pickups = []; race.rings = []; race.hazards = []; race.ramps = [];
        const extras = themedExtras(track, { themes: true }, { rings: true, ringScore: 0, nearScore: 0, passScore: 0 });
        let target, time = race.elapsed;
        // Ramps and hoops keep course order, so [0] is the first placement of that type.
        if (type === 'ramp') race.ramps = [target = extras.ramps[0]];
        else if (type === 'ring') race.rings = [target = extras.hoops[0]];
        else {
          race.hazards = [target = themedHazards(track).find(h => h.id === id)];
          // A pulsing barrier is drawn only while solid: pin a time inside its on-phase.
          for (let t = 0; t < 8; t += 0.25) if (hazardPose(target, t).active) { time = t; break; }
        }
        const free = [-7.5, -2.5, 2.5, 7.5].find(lane => Math.abs(lane - target.x) > 5);
        // Hold the car 45 m short with race time pinned so the frame shows the target ahead.
        cancelAnimationFrame(window.themePin);
        const pin = () => { if (race.phase === 'racing') { Object.assign(race.player, { distance: target.distance - 45, x: free, speed: 0, altitude: 0 }); race.elapsed = time; } window.themePin = requestAnimationFrame(pin); };
        pin();
      }, c);
      const mesh = c.mesh;
      const drawn = () => page.evaluate(meshName => {
        const found = window.gameScene.scene.getObjectByName(meshName);
        if (!found?.visible) return 0;
        return found.isInstancedMesh ? found.count : found.children.filter(child => child.visible).length; // rings are a pooled Group

      }, mesh);
      await expect.poll(drawn, { message: `${c.track} ${c.id} (${c.type}) drawn by ${mesh}` }).toBeGreaterThan(0);
      await saveArtifact(page, { path: `artifacts/track-themes/${name}-${c.track}-${c.type}.jpeg`, quality: 70 });
      // Just reload: a forced 'finished' phase without the race.result every real finish sets crashes the result screen.
      await page.evaluate(() => cancelAnimationFrame(window.themePin));
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    }
    expect(errors).toEqual([]);
  });
});
