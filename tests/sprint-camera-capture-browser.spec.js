import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// NITRO/BOOST camera evidence (.claude/rules/race-camera.md): real WebGL frames and the chase car's projected size
// (the 2 x 1.2 x 4.8 m box under the player's world matrix, through the live camera) at cruise, BOOST and its ignition,
// NITRO top speed and first person, plus rAF frame times. Runs only with SPRINT_CAMERA_CAPTURE=1, never in the gate:
//   SPRINT_CAMERA_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|portrait|landscape [HERO_CAR=crimson-gt] npx playwright test tests/sprint-camera-capture-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings and screenshots).
const LABEL = process.env.LABEL ?? 'capture', VIEW = process.env.VIEWPORT ?? 'desktop';
const OUT = `docs/designs/3d-pipeline/audits/sprint-camera/${LABEL}-${VIEW}${process.env.HERO_CAR ? `-${process.env.HERO_CAR}` : ''}`;
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

test.skip(!process.env.SPRINT_CAMERA_CAPTURE, 'run with SPRINT_CAMERA_CAPTURE=1');
test.use(VIEWPORTS[VIEW]);

for (const track of ['coast', 'spiral']) test(`${LABEL} ${VIEW}: ${track} cruise, BOOST, NITRO, first person`, async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(180000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = {};
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral'])));
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator(`[data-track="${track}"]`).click();
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(20000) });
  await page.evaluate(() => {
    window.carOnScreen = () => {
      const { player, camera } = window.gameScene, V = player.position.constructor;
      player.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, bumper = 0;
      for (const x of [-1, 1]) for (const y of [0, 1.2]) for (const z of [-2.4, 2.4]) {
        const p = new V(x, y, z).applyMatrix4(player.matrixWorld).project(camera);
        x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y);
        if (z > 0 && y === 0) bumper = Math.max(bumper, (1 - p.y) / 2);
      }
      return { width: (x1 - x0) / 2, height: (y1 - y0) / 2, bumper, fov: camera.fov, eye: camera.position.distanceTo(player.position) };
    };
    // Per-frame samples over `seconds` of race time: the smallest and largest car and the frame times.
    window.sampleCar = async seconds => {
      const race = window.gameplay.race, until = race.elapsed + seconds, cars = [], frames = [];
      let last = performance.now();
      while (race.elapsed < until) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(); frames.push(now - last); last = now; cars.push(window.carOnScreen());
      }
      frames.sort((a, b) => a - b);
      const pick = key => ({ min: Math.min(...cars.map(c => c[key])), max: Math.max(...cars.map(c => c[key])) });
      return { width: pick('width'), height: pick('height'), bumper: pick('bumper'), fov: pick('fov'),
        frameP50: frames[Math.floor(frames.length / 2)], frameP95: frames[Math.floor(frames.length * 0.95)] };
    };
  });
  const hold = (fields, seconds) => page.evaluate(async ([fields, seconds]) => {
    const player = window.gameplay.race.player, until = window.gameplay.race.elapsed + seconds;
    while (window.gameplay.race.elapsed < until) { Object.assign(player, { x: 0 }, fields); player.effects.ghost = 5; await new Promise(requestAnimationFrame); }
  }, [fields, seconds]);
  const shot = name => page.screenshot({ path: `${OUT}/${track}-${name}.png` });
  // Centre lane, ghosted through traffic: a knock yaws the car and widens its box, which is not the rig.
  await page.evaluate(() => { window.gameplay.race.player.effects.ghost = 120; });
  await page.keyboard.down('w');
  await hold({ speed: 88 }, 2.5);
  rows.cruise = await page.evaluate(() => window.carOnScreen());
  rows.cruiseFrames = await page.evaluate(() => window.sampleCar(2));
  await shot('cruise');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 88, miniBoost: 3 }));
  await page.waitForTimeout(110); await shot('boost-ignition');
  rows.boostIgnition = await page.evaluate(() => window.sampleCar(0.9));
  rows.boost = await page.evaluate(() => window.carOnScreen()); await shot('boost');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { miniBoost: 0, boosting: false }));
  await hold({ speed: 88 }, 2);
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 118, nitroTime: 30 }));
  await page.waitForTimeout(110); await shot('nitro-ignition');
  rows.nitroIgnition = await page.evaluate(() => window.sampleCar(0.9));
  await hold({ speed: 118, nitroTime: 30 }, 1.5);
  rows.nitroTop = await page.evaluate(() => window.carOnScreen());
  rows.nitroFrames = await page.evaluate(() => window.sampleCar(2));
  await shot('nitro-top');
  await page.keyboard.press('c');
  await hold({ speed: 118, nitroTime: 30 }, 1.2);
  rows.first = await page.evaluate(() => window.carOnScreen()); await shot('first-person-nitro');
  await page.keyboard.press('c');
  fs.writeFileSync(`${OUT}/${track}.json`, JSON.stringify({ label: LABEL, view: VIEW, car: process.env.HERO_CAR ?? 'roadster', track, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
