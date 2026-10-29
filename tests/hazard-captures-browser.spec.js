import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import { saveArtifact } from './helpers/artifact.js';
import { ciTimeout } from './helpers/ci.js';
import { selectLocale } from './helpers/locale-browser.js';

// ENV-05/06 visual evidence: each hazard effect is drawn by its own pool, in the real WebGL scene,
// exactly where the simulation resolves it. Themes have no menu toggle yet (10A), so each case loads
// the same themedHazards() a `themes: true` race gets, keeps only its target and pins race time.
const CASES = [
  { track: 'coast', id: 'coast-gust-1', mesh: 'hazard-gusts', times: [0] },
  { track: 'aurora', id: 'aurora-ice-1', mesh: 'hazard-surfaces', times: [0] },
  { track: 'canyon', id: 'canyon-rock-1', mesh: 'gauntlet-barriers', times: [1.6] }, // 20% into an 8 s fall: half-way down
  { track: 'neon', id: 'neon-gate-1', mesh: 'gauntlet-barriers', times: [1, 3] }, // the two ends of a 4 s sweep
  { track: 'tokyo', id: 'tokyo-signal-gate-1', mesh: 'gauntlet-barriers', times: [1, 3], hold: 25, lane: -7.5 }, // on, then off, in a 4 s pulse; closer, so Tokyo's curve keeps it in a portrait frame
];

for (const [name, viewport, hasTouch, locale] of [
  ['desktop-en', { width: 1440, height: 900 }, false, 'en'],
  ['desktop-zh', { width: 1440, height: 900 }, false, 'zh-TW'],
  ['phone-en', { width: 390, height: 844 }, true, 'en'],
  ['phone-zh', { width: 390, height: 844 }, true, 'zh-TW'],
]) test.describe(`hazard captures ${name}`, () => {
  test.use({ viewport, hasTouch });
  test('each hazard effect draws from its own pool at the simulated pose', async ({ gameplayPage: page }) => {
    test.setTimeout(ciTimeout(240_000));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluate(list => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(list)), CASES.map(c => c.track));
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await selectLocale(page, locale);
    for (const c of CASES) {
      await page.locator(`[data-track="${c.track}"]`).click();
      await page.locator('#start-button').click();
      await expect(page.locator('#race-status')).not.toHaveText('READY', { timeout: ciTimeout(15_000) });
      await expect(page.locator('#countdown')).toBeHidden({ timeout: ciTimeout(10_000) });
      const samples = [];
      for (const time of c.times) {
        await page.evaluate(async ({ track, id, time, hold, lane }) => {
          const { themedHazards } = await import('/src/track-themes.ts');
          const race = window.gameplay.race, target = themedHazards(track).find(h => h.id === id);
          race.traffic = []; race.pickups = []; race.rings = [];
          race.hazards = [target];
          const free = lane ?? [-7.5, -2.5, 2.5, 7.5].find(l => Math.abs(l - target.x) > 5);
          // Hold the car short (45 m unless the case says) with race time pinned, so the frame shows a known motion state.
          cancelAnimationFrame(window.hazardPin);
          const pin = () => { if (race.phase === 'racing') { Object.assign(race.player, { distance: target.distance - hold, x: free, speed: 0, altitude: 0 }); race.elapsed = time; } window.hazardPin = requestAnimationFrame(pin); };
          pin();
        }, { track: c.track, id: c.id, time, hold: c.hold ?? 45, lane: c.lane });
        const read = () => page.evaluate(async ({ meshName }) => {
          // Two frames: the pool already holds the previous time's pose until a frame renders the new pin.
          await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
          const { scene, camera } = window.gameScene, mesh = scene.getObjectByName(meshName);
          const { hazardPose } = await import('/src/hazard-race.ts');
          const race = window.gameplay.race, target = race.hazards[0];
          if (!mesh?.visible || mesh.count === 0) return { count: 0 };
          const m = mesh.matrix.clone(), position = camera.position.clone(), quaternion = camera.quaternion.clone(), scale = camera.scale.clone();
          mesh.getMatrixAt(0, m); m.decompose(position, quaternion, scale);
          const ndc = position.clone().project(camera), pose = hazardPose(target, race.elapsed);
          return { count: mesh.count, x: position.x, y: position.y, sy: scale.y, yaw: 2 * Math.atan2(quaternion.y, quaternion.w),
            inFrame: ndc.z < 1 && Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1, poseAltitude: pose.altitude, height: target.height };
        }, { meshName: c.mesh });
        const expectDrawn = !(c.track === 'tokyo' && time === 3);
        await expect.poll(async () => (await read()).count, { message: `${name} ${c.id} t=${time}` }).toBe(expectDrawn ? 1 : 0);
        const sample = await read();
        samples.push(sample);
        if (expectDrawn) expect(sample.inFrame, `${c.id} inside the camera frame`).toBe(true);
        await saveArtifact(page, { path: `artifacts/hazard-captures/${name}-${c.id}-t${time}.jpeg`, quality: 75 });
      }
      const [first, second] = samples;
      if (c.id === 'coast-gust-1') expect(Math.abs(Math.sin(first.yaw / 2))).toBeLessThan(0.01); // seed 1 shoves right: the arrow points +x
      if (c.id === 'aurora-ice-1') { expect(first.sy).toBeLessThan(0.1); expect(first.y).toBeLessThan(0.1); }
      if (c.id === 'canyon-rock-1') {
        expect(first.poseAltitude).toBeGreaterThan(0.5);
        expect(first.poseAltitude).toBeLessThan(9.5);
        expect(Math.abs(first.y - (first.poseAltitude + first.height / 2))).toBeLessThan(0.15);
      }
      if (c.id === 'neon-gate-1') expect(Math.abs(Math.abs(first.x - second.x) - 3.6)).toBeLessThan(0.1);
      // Just reload: forcing phase 'finished' without the race.result every real finish sets crashed the result screen.
      await page.evaluate(() => cancelAnimationFrame(window.hazardPin));
      await page.reload();
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    }
    expect(errors).toEqual([]);
  });
});
