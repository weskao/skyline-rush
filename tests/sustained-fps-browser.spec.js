import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';

// Task 5 thermal / sustained-FPS note: Coast rain (the heaviest scene) driven for MINUTES at one tier with vsync on,
// sampling delivered FPS and GPU-synced frame cost once a minute, so throttling shows as a late drop. macOS thermal
// state (`pmset -g therm`) is logged before and after. Runs only with SUSTAINED=1, never in the gate:
//   SUSTAINED=1 LABEL=<x> [MINUTES=10] [QUALITY=low|medium|high|ultra] npx playwright test tests/sustained-fps-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings).
const LABEL = process.env.LABEL ?? 'sustained', MINUTES = Number(process.env.MINUTES ?? 10), QUALITY = process.env.QUALITY ?? 'high';
const OUT = 'docs/designs/3d-pipeline/audits/task5/sustained';
const therm = () => { try { return execFileSync('pmset', ['-g', 'therm'], { encoding: 'utf8' }).trim(); } catch { return 'unavailable'; } };

test.skip(!process.env.SUSTAINED, 'run with SUSTAINED=1');
test.use({ viewport: { width: 1440, height: 900 } });

test(`${LABEL}: sustained Coast rain FPS on ${QUALITY}`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout((MINUTES + 3) * 60000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [], before = therm();
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(quality => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: quality === 'ultra' ? 'high' : quality, ultra: quality === 'ultra', preset: 'cinematic', enabled: true }));
  }, QUALITY);
  await page.goto(`${gameplayURL}?look=3d`);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(ciTimeout(400)); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; // no finish line
    // Past the course end the scenery thins out (draw calls fell from ~530 to ~220 after two minutes): wrap the car
    // back so every minute loads the full Coast scene.
    setInterval(() => { const car = window.gameplay.race.player; if (car.distance > 0.85 * window.gameplay.race.length) car.distance = 300; }, 500);
  });
  await page.keyboard.down('KeyW');
  const start = Date.now();
  for (let minute = 0; minute <= MINUTES; minute++) {
    await page.waitForTimeout(Math.max(0, start + minute * 60000 - Date.now()));
    const fps = await page.evaluate(() => new Promise(resolve => {
      let frames = 0; const t0 = performance.now();
      const tick = now => (now - t0 < 5000 ? (frames++, requestAnimationFrame(tick)) : resolve(+(frames * 1000 / (now - t0)).toFixed(1)));
      requestAnimationFrame(tick);
    }));
    rows.push({ minute, fps, ...await sampleFrameCost(page, 3000) });
  }
  await page.keyboard.up('KeyW');
  const gpu = await gpuName(page);
  console.table(rows);
  fs.writeFileSync(`${OUT}/${LABEL}-${QUALITY}.json`, JSON.stringify({ label: LABEL, quality: QUALITY, gpu, before, after: therm(), rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
