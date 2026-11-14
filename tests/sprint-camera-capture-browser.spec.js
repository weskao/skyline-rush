import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { QUALITY_STORAGE_KEY, initialDeviceVisuals } from '../src/device-quality.ts';

// NITRO/BOOST camera evidence (.claude/rules/race-camera.md): real WebGL frames and the chase car's projected size
// (the 2 x 1.2 x 4.8 m box under the player's world matrix, through the live camera) at cruise, BOOST and its ignition,
// NITRO top speed and first person, plus rAF frame times. Runs only with SPRINT_CAMERA_CAPTURE=1, never in the gate:
//   SPRINT_CAMERA_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|portrait|landscape [CORES=2|4] [HERO_CAR=crimson-gt] npx playwright test tests/sprint-camera-capture-browser.spec.js
// Exhaust evidence (.claude/rules/sprint-plume.md): `plume` is where the nozzles and the first 2 m behind them land on
// screen; `contrast` reads the WebGL pixels on the four jet axes against the road beside them and against the same
// pixels with the exhaust hidden (a page screenshot would also read the HUD and the touch buttons). A LABEL starting
// with `after` asserts the acceptance numbers. Frostbite's observatory climb is the sloped course (classic `uphill`
// sections are flat road marks), so the dev server runs all-unlocked.
// CORES=2|4 races on the settings a phone picks for itself (src/device-quality.ts: 2 cores get Low + Realistic, 4 get
// Medium); unset keeps this browser's own High, which is not what a phone shows.
// Output stays in the gitignored audits/ dir (machine-specific timings and screenshots).
const LABEL = process.env.LABEL ?? 'capture', VIEW = process.env.VIEWPORT ?? 'desktop', CORES = Number(process.env.CORES) || 0;
const AUTO = CORES ? initialDeviceVisuals({ device: { cores: CORES, width: 390, height: 844, pixelRatio: 3 } }).settings : null;
const OUT = `docs/designs/3d-pipeline/audits/sprint-camera/${LABEL}-${VIEW}${CORES ? `-cores${CORES}` : ''}${process.env.HERO_CAR ? `-${process.env.HERO_CAR}` : ''}`;
const VIEWPORTS = {
  desktop: { viewport: { width: 1440, height: 900 } },
  portrait: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  landscape: { viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
};

test.skip(!process.env.SPRINT_CAMERA_CAPTURE, 'run with SPRINT_CAMERA_CAPTURE=1');
test.use({ ...VIEWPORTS[VIEW], unlockedAccess: true });
const CLIMB = 'frostbite-canyon';

for (const track of ['coast', 'neon', 'spiral', CLIMB]) test(`${LABEL} ${VIEW}: ${track} cruise, BOOST, NITRO, first person`, async ({ gameplayPage: page }) => {
  test.setTimeout(ciTimeout(180000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = {};
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(([key, auto]) => {
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'neon', 'canyon', 'aurora', 'spiral']));
    if (auto) localStorage.setItem(key, JSON.stringify(auto));
  }, [QUALITY_STORAGE_KEY, AUTO]);
  await page.reload();
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator(track === CLIMB ? `[data-upcoming-track="${track}"]` : `[data-track="${track}"]`).click();
  await expect(page.locator('#start-button')).toBeEnabled();
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(20000) });
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
      return { width: (x1 - x0) / 2, height: (y1 - y0) / 2, bumper, fov: camera.fov, eye: camera.position.distanceTo(player.position), inside: x0 >= -1 && x1 <= 1 && y0 >= -1 && y1 <= 1 };
    };
    // Screen position (0-1, top-left origin) of the point `d` m behind a rear port and `dx` m beside it.
    window.plumeProbe = () => {
      const { player, camera } = window.gameScene, V = player.position.constructor, rear = player.getObjectByName('Rear ports');
      player.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const ports = rear.children.filter(part => part.name.startsWith('Cold gas nozzle')).map(part => part.position);
      const at = (port, dx, d) => { const s = new V(port.x + dx, port.y, port.z + d).applyMatrix4(rear.matrixWorld).project(camera); return { x: (s.x + 1) / 2, y: (1 - s.y) / 2 }; };
      return { rear, ports, at };
    };
    window.plumeOnScreen = () => {
      const { ports, at } = window.plumeProbe(), spots = ports.flatMap(port => [0, 0.5, 1, 1.5, 2].map(d => at(port, 0, d)));
      const xs = spots.map(s => s.x), ys = spots.map(s => s.y);
      return { nozzleRow: ports.reduce((sum, port) => sum + at(port, 0, 0).y, 0) / ports.length, carInside: window.carOnScreen().inside,
        box: { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) } };
    };
    // One frame drawn twice, without and with the exhaust (`Rear ports`), so nothing else differs. `area`: % of the frame
    // the exhaust changes by more than 30 of 255. Mean RGB: `core` on the four jet axes (the first 1.8 m), `bare` the same
    // pixels without the exhaust, `road` the same rows beyond the car's width; distances on the 0-255 scale.
    window.plumeContrast = () => new Promise(resolve => {
      const { renderer, composer } = window.gameScene, gl = renderer.getContext(), render = composer.render;
      composer.render = function (...args) {
        composer.render = render;
        const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight, { rear, ports, at } = window.plumeProbe();
        const draw = shown => {
          rear.visible = shown; render.apply(this, args); renderer.setRenderTarget(null);
          const pixels = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return pixels;
        };
        const off = draw(false), on = draw(true), sums = { core: [0, 0, 0, 0], road: [0, 0, 0, 0], bare: [0, 0, 0, 0] };
        let changed = 0;
        for (let i = 0; i < on.length; i += 4) if (Math.hypot(on[i] - off[i], on[i + 1] - off[i + 1], on[i + 2] - off[i + 2]) > 30) changed++;
        const add = (key, pixels, s) => {
          if (!(s.x >= 0 && s.x < 1 && s.y >= 0 && s.y < 1)) return;
          const i = 4 * ((H - 1 - Math.floor(s.y * H)) * W + Math.floor(s.x * W));
          for (let c = 0; c < 3; c++) sums[key][c] += pixels[i + c];
          sums[key][3]++;
        };
        for (let d = 0.1; d < 1.85; d += 0.1) {
          for (const port of ports) { add('core', on, at(port, 0, d)); add('bare', off, at(port, 0, d)); }
          for (const dx of [1.2, 1.5, 1.8]) { add('road', on, at(ports[0], -dx, d)); add('road', on, at(ports.at(-1), dx, d)); }
        }
        const mean = key => sums[key].slice(0, 3).map(sum => Math.round(sum / Math.max(1, sums[key][3])));
        const core = mean('core'), road = mean('road'), bare = mean('bare'), apart = (a, b) => +Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]).toFixed(1);
        resolve({ area: +(100 * changed / (W * H)).toFixed(2), core, road, bare, vsRoad: apart(core, road), added: apart(core, bare), samples: sums.core[3] });
      };
    });
  });
  const hold = (fields, seconds) => page.evaluate(async ([fields, seconds]) => {
    const player = window.gameplay.race.player, until = window.gameplay.race.elapsed + seconds;
    while (window.gameplay.race.elapsed < until) { Object.assign(player, { x: 0 }, fields); player.effects.ghost = 5; await new Promise(requestAnimationFrame); }
  }, [fields, seconds]);
  const shot = name => page.screenshot({ path: `${OUT}/${track}-${name}.png` });
  const onScreen = () => page.evaluate(async () => ({ ...window.carOnScreen(), plume: window.plumeOnScreen(), contrast: await window.plumeContrast() }));
  // The sloped course is judged on its climb: seeded there for the cruise and again for the NITRO.
  const seed = () => page.evaluate(() => { const race = window.gameplay.race, climb = race.sections.find(s => s.type === 'uphill'); if (race.course && climb) Object.assign(race.player, { distance: climb.from + 20, x: 0 }); });
  // Centre lane, ghosted through traffic: a knock yaws the car and widens its box, which is not the rig.
  await page.evaluate(() => { window.gameplay.race.player.effects.ghost = 120; });
  await page.keyboard.down('w');
  await seed();
  await hold({ speed: 88 }, 2.5);
  rows.cruise = await onScreen();
  rows.cruiseFrames = await page.evaluate(() => window.sampleCar(2));
  await shot('cruise');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 88, miniBoost: 3 }));
  await page.waitForTimeout(110); await shot('boost-ignition');
  rows.boostIgnition = await page.evaluate(() => window.sampleCar(0.9));
  rows.boost = await onScreen(); await shot('boost');
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { miniBoost: 0, boosting: false }));
  await seed();
  await hold({ speed: 88 }, 2);
  await page.evaluate(() => Object.assign(window.gameplay.race.player, { speed: 118, nitroTime: 30 }));
  await page.waitForTimeout(110); await shot('nitro-ignition');
  rows.nitroIgnition = await page.evaluate(() => window.sampleCar(0.9));
  await hold({ speed: 118, nitroTime: 30 }, 1.5);
  rows.nitroTop = await onScreen();
  rows.nitroFrames = await page.evaluate(() => window.sampleCar(2));
  await shot('nitro-top');
  await page.keyboard.press('c');
  await hold({ speed: 118, nitroTime: 30 }, 1.2);
  rows.first = await page.evaluate(() => window.carOnScreen()); await shot('first-person-nitro');
  await page.keyboard.press('c');
  fs.writeFileSync(`${OUT}/${track}.json`, JSON.stringify({ label: LABEL, view: VIEW, car: process.env.HERO_CAR ?? 'roadster', vfx: AUTO && { quality: AUTO.quality, preset: AUTO.preset }, track, rows, errors }, null, 2));
  expect(errors).toEqual([]);
  if (!LABEL.startsWith('after')) return;
  expect(rows.nitroTop.plume.carInside, 'the car stays inside the frame at NITRO top speed').toBe(true);
  if (track === 'coast' || track === 'neon') expect(rows.nitroTop.contrast.vsRoad, 'the plume core stands off the road beside it').toBeGreaterThanOrEqual(40);
});
