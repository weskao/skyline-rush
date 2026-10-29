import { test } from './helpers/gameplay-browser.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

// 13C C5: ?perf frame time, draw calls and triangles for the new content against Classic, with `make perf`'s
// viewport and CPU throttle. Runs only through `make perf-modes` (PERF_MODES=1), never in the browser gate.
// Served by the dev server so themed hazards can be loaded in-page (no menu toggle yet), so compare scenarios
// with each other, not with `make perf`'s production numbers. Endless is teleported to 20 km: this measures
// drawing at that distance, not resources accumulated over a real 20 km drive.
const RATE = +(process.env.RATE ?? 6), ROUNDS = +(process.env.ROUNDS ?? 3), SECONDS = +(process.env.RACE_SECONDS ?? 24);
const SCENARIOS = [
  { name: 'classic-coast', mode: 'classic' },
  { name: 'custom-coast-themes-extreme', mode: 'custom', hazards: 'extreme', themes: true },
  { name: 'obstacle-run-mixed', mode: 'gauntlet', layout: 'mixed' },
  { name: 'endless-20km', mode: 'endless', teleport: 20000 },
];
const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];

test.skip(!process.env.PERF_MODES, 'run with `make perf-modes`');
test.use({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

test('new content frame time, draw calls and triangles against Classic', async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout((SECONDS + 40) * 1000 * SCENARIOS.length * ROUNDS);
  const errors = [], runs = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await page.context().newCDPSession(page);
  for (let round = 1; round <= ROUNDS; round++) for (const s of SCENARIOS) {
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.evaluate(() => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off'], ['unlocked', '["coast"]']]) localStorage.setItem(`skyline-rush-${key}`, value);
    });
    await page.goto(`${gameplayURL}?perf`);
    for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator(`button[data-race-mode="${s.mode}"]`).click(); // <body> mirrors the selected mode in the same attribute
    if (s.hazards) await page.locator('[data-race-rule="hazards"]').selectOption(s.hazards);
    if (s.layout) await page.locator('#gauntlet-layout').selectOption(s.layout);
    await page.locator('[data-track="coast"]').click();
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: 30000 });
    const setup = await page.evaluate(async ({ themes, teleport }) => {
      const race = window.gameplay.race;
      if (themes) {
        const { themedHazards, withThemedHazards } = await import('/src/track-themes.ts');
        race.hazards = withThemedHazards(race.hazards, themedHazards(race.trackId));
      }
      if (teleport) race.player.distance = teleport;
      return { mode: race.mode, layout: race.config.layout ?? null, hazards: race.hazards.length, endless: !!race.endless };
    }, s);
    await page.keyboard.down('KeyW');
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: RATE });
    await page.waitForTimeout(SECONDS * 1000);
    const overlay = page.locator('#perf-overlay');
    const [text, drawCalls, triangles] = await Promise.all([overlay.textContent(), overlay.getAttribute('data-draw-calls'), overlay.getAttribute('data-triangles')]);
    const distance = await page.evaluate(() => Math.round(window.gameplay.race.player.distance));
    await page.keyboard.up('KeyW');
    const [p50, p95, fps] = (text.match(/p50 ([\d.]+) ms · p95 ([\d.]+) ms · ([\d.]+) fps/) ?? []).slice(1).map(Number);
    runs.push({ round, scenario: s.name, p50, p95, fps, drawCalls: +drawCalls, triangles: +triangles, distance, ...setup });
    console.log(`round ${round}  ${s.name.padEnd(30)} ${text} · ${drawCalls} calls · ${triangles} tris · ${distance} m · ${setup.hazards} hazards`);
  }
  const summary = SCENARIOS.map(({ name }) => {
    const own = runs.filter(run => run.scenario === name);
    return { scenario: name, ...Object.fromEntries(['p50', 'p95', 'fps', 'drawCalls', 'triangles'].map(key => [key, median(own.map(run => run[key]))])) };
  });
  const base = summary[0];
  for (const row of summary) {
    row.p95VsClassic = +((row.p95 / base.p95 - 1) * 100).toFixed(1);
    row.flag = row.p95VsClassic > 15 ? 'p95 > +15% vs Classic' : null;
  }
  console.table(summary);
  const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  fs.mkdirSync('artifacts/perf-modes', { recursive: true });
  fs.writeFileSync(`artifacts/perf-modes/${sha}-rate${RATE}.json`, JSON.stringify({ sha, rate: RATE, rounds: ROUNDS, seconds: SECONDS, server: 'vite dev', summary, runs, errors }, null, 2));
  expect(errors).toEqual([]);
  for (const run of runs) expect(run.p95, `${run.scenario} round ${run.round} produced a reading`).toBeGreaterThan(0);
});
