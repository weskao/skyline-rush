import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { installPlumeProbes } from './helpers/plume-probe.js';
import { QUALITY_STORAGE_KEY, initialDeviceVisuals } from '../src/device-quality.ts';

// NITRO/BOOST camera evidence (.claude/rules/race-camera.md): real WebGL frames and the chase car's projected size
// (the 2 x 1.2 x 4.8 m box under the player's world matrix, through the live camera) at cruise, BOOST and its ignition,
// NITRO top speed and first person, plus rAF frame times. Runs only with SPRINT_CAMERA_CAPTURE=1, never in the gate:
//   SPRINT_CAMERA_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|portrait|landscape [CORES=2|4] [HERO_CAR=crimson-gt] npx playwright test tests/sprint-camera-capture-browser.spec.js
// Exhaust evidence (.claude/rules/sprint-plume.md): `plume` is where the nozzles and the first 2 m behind them land on
// screen; `contrast` reads the WebGL pixels on the four jet axes against the road beside them and against the same
// pixels with the exhaust hidden (a page screenshot would also read the HUD and the touch buttons), and `area`, the
// share of the frame the exhaust changes. A LABEL starting with `after` asserts the acceptance numbers, with CORES=2
// against the `before` run of the same view. Frostbite's observatory climb is the sloped course (classic `uphill`
// sections are flat road marks), so the dev server runs all-unlocked.
// CORES=2|4 races on the settings a phone picks for itself (src/device-quality.ts: 2 cores get Low + Realistic, 4 get
// Medium); unset keeps this browser's own High, which is not what a phone shows.
// Output stays in the gitignored audits/ dir (machine-specific timings and screenshots).
const LABEL = process.env.LABEL ?? 'capture', VIEW = process.env.VIEWPORT ?? 'desktop', CORES = Number(process.env.CORES) || 0;
const AUTO = CORES ? initialDeviceVisuals({ device: { cores: CORES, width: 390, height: 844, pixelRatio: 3 } }).settings : null;
const dir = label => `docs/designs/3d-pipeline/audits/sprint-camera/${label}-${VIEW}${CORES ? `-cores${CORES}` : ''}${process.env.HERO_CAR ? `-${process.env.HERO_CAR}` : ''}`, OUT = dir(LABEL);
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
  await installPlumeProbes(page);
  // Rivals stay 80 m back: a rival between the chase camera and the car hid the whole plume (area 0, Sky Spiral BOOST).
  await page.evaluate(() => { window.clearRivals = () => { const { player, rivals } = window.gameplay.race; for (const rival of rivals) rival.distance = Math.min(rival.distance, player.distance - 80); }; });
  const clear = () => page.evaluate(() => window.clearRivals());
  const hold = (fields, seconds) => page.evaluate(async ([fields, seconds]) => {
    const player = window.gameplay.race.player, until = window.gameplay.race.elapsed + seconds;
    while (window.gameplay.race.elapsed < until) { Object.assign(player, { x: 0 }, fields); player.effects.ghost = 5; window.clearRivals(); await new Promise(requestAnimationFrame); }
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
  await clear();
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
  // Today's exhaust already clears that contrast floor; on the phone tier it was small: 1 to 3% of the frame.
  const before = `${dir('before')}/${track}.json`;
  if (CORES === 2 && fs.existsSync(before)) for (const key of ['boost', 'nitroTop']) {
    const was = JSON.parse(fs.readFileSync(before, 'utf8')).rows[key].contrast.area;
    expect(rows[key].contrast.area, `${key}: the exhaust covers at least twice the ${was}% of the frame it did`).toBeGreaterThanOrEqual(2 * was);
  }
});
