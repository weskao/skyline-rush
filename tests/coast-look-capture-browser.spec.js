import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// Task 5 Coast look evidence: home showcase, day and rain race frames, NITRO, with renderer stats and ?perf frame
// times per quality tier. Runs only with COAST_CAPTURE=1, never in the gate:
//   COAST_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|phone QUALITY=low|medium|high|ultra npx playwright test tests/coast-look-capture-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings and screenshots).
const LABEL = process.env.LABEL ?? 'task5', VIEW = process.env.VIEWPORT ?? 'desktop', QUALITY = process.env.QUALITY ?? 'high';
const SECONDS = +(process.env.RACE_SECONDS ?? 5);
const OUT = `docs/designs/3d-pipeline/audits/task5/${LABEL}-${VIEW}-${QUALITY}`;

test.skip(!process.env.COAST_CAPTURE, 'run with COAST_CAPTURE=1');
test.use(VIEW === 'desktop' ? { viewport: { width: 1440, height: 900 } }
  : { viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

test(`${LABEL} ${VIEW} ${QUALITY}: Coast day and rain`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(240000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const stats = () => page.evaluate(() => {
    const { renderer } = window.gameScene, { render, memory, programs } = renderer.info;
    return { drawCalls: render.calls, triangles: render.triangles, textures: memory.textures, geometries: memory.geometries, programs: programs.length,
      coastScenery: document.querySelector('#world')?.dataset.coastScenery ?? null };
  });
  const perf = async () => {
    const text = await page.locator('#perf-overlay').textContent();
    const [p50, p95, fps] = (text.match(/p50 ([\d.]+) ms · p95 ([\d.]+) ms · ([\d.]+) fps/) ?? []).slice(1).map(Number);
    return { p50, p95, fps };
  };
  const shot = name => page.screenshot({ path: `${OUT}/${name}.png` });
  const vfx = QUALITY === 'ultra' ? { quality: 'high', ultra: true } : { quality: QUALITY };
  await page.evaluate(settings => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
  }, vfx);
  await page.goto(`${gameplayURL}?perf`);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (QUALITY !== 'low') await expect.poll(() => page.locator('#world').getAttribute('data-coast-scenery'), { timeout: ciTimeout(60000) }).toBe('attached');
  await page.waitForTimeout(2500); // HDRI + idle camera settle
  await shot('home-day');
  rows.push({ scenario: 'home-day', ...await stats() });

  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
  await page.keyboard.down('KeyW');
  await page.waitForTimeout(SECONDS * 1000);
  await shot('race-day');
  rows.push({ scenario: 'race-day', ...await perf(), ...await stats() });
  await page.evaluate(() => { const { player } = window.gameplay.race; player.nitroTime = 4; player.speed = 90; });
  await page.waitForTimeout(800);
  await shot('race-day-nitro');
  rows.push({ scenario: 'race-day-nitro', ...await stats() });
  // Capture only: world.js shows a session preset in custom/free races; flip this race to rain in place.
  await page.evaluate(() => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: 'rain' } }; });
  await page.waitForTimeout(SECONDS * 1000);
  await shot('race-rain');
  rows.push({ scenario: 'race-rain', ...await perf(), ...await stats() });
  await page.keyboard.up('KeyW');
  console.table(rows);
  fs.writeFileSync(`${OUT}/stats.json`, JSON.stringify({ label: LABEL, view: VIEW, quality: QUALITY, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
