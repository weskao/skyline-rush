import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// Task 5 Coast look evidence: home showcase, day and rain race frames, NITRO, with renderer stats and ?perf frame
// times per quality tier. Runs only with COAST_CAPTURE=1, never in the gate:
//   COAST_CAPTURE=1 LABEL=<x> VIEWPORT=desktop|phone QUALITY=low|medium|high|ultra [MODEL=roadster] npx playwright test tests/coast-look-capture-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings and screenshots).
const LABEL = process.env.LABEL ?? 'task5', VIEW = process.env.VIEWPORT ?? 'desktop', QUALITY = process.env.QUALITY ?? 'high';
const SECONDS = +(process.env.RACE_SECONDS ?? 5);
const MODEL = process.env.MODEL ? `model=${encodeURIComponent(process.env.MODEL)}` : ''; // e.g. the gated GLB Roadster
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
  await page.goto(`${gameplayURL}?look=3d&perf${MODEL && `&${MODEL}`}`);
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
  // Held for the whole window so ?perf times the plume and the (Ultra-only) stronger blur, not a fade-out.
  await page.evaluate(seconds => { const { player } = window.gameplay.race; player.nitroTime = seconds + 2; player.speed = 90; }, SECONDS);
  await page.waitForTimeout(SECONDS * 1000);
  await shot('race-day-nitro');
  rows.push({ scenario: 'race-day-nitro', ...await perf(), ...await stats() });
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

// §8.1 parity frames: the five Coast board panels per coast-look-brief.md (preset, pose, NITRO/FLY), one race.
test(`${LABEL} ${VIEW} ${QUALITY}: §8.1 Coast panels`, async ({ gameplayPage: page, gameplayURL }) => {
  test.skip(!process.env.COAST_PANELS, 'run with COAST_CAPTURE=1 COAST_PANELS=1');
  test.setTimeout(ciTimeout(240000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const vfx = QUALITY === 'ultra' ? { quality: 'high', ultra: true } : { quality: QUALITY };
  await page.evaluate(settings => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
  }, vfx);
  await page.goto(`${gameplayURL}?look=3d${MODEL && `&${MODEL}`}`);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  if (QUALITY !== 'low') await expect.poll(() => page.locator('#world').getAttribute('data-coast-scenery'), { timeout: ciTimeout(60000) }).toBe('attached');
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
  await page.keyboard.down('KeyW');
  const preset = name => page.evaluate(p => { const race = window.gameplay.race; race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: p } }; }, name);
  const panel = async (name, wait) => { await page.waitForTimeout(wait); await page.screenshot({ path: `${OUT}/${name}.png` }); };
  await preset('dusk'); await panel('panel-1-grounded-dusk', 3000);
  await page.evaluate(() => { window.gameplay.race.player.nitroTime = 4; }); await panel('panel-2-boost-dusk', 1500);
  await page.evaluate(() => { window.gameplay.race.player.nitroTime = 0; });
  await preset('day'); await panel('panel-4-day', 3000);
  await page.keyboard.down('Space'); await panel('panel-3-flight-day', 1500); await page.keyboard.up('Space');
  await preset('rain'); await panel('panel-5-rain-sunset', 4000);
  await page.keyboard.up('KeyW');
  expect(errors).toEqual([]);
});
