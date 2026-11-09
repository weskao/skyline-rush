import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';

// Task 5 per-tier cost on Coast: GPU-synced frame time (helpers/frame-cost.js) for Low, Medium, High and Ultra in day
// and rain, plus rain with the thruster glow discs off (their own delta). Every tier held vsync on a Mac, so only
// this method resolves the differences. Runs only with TIER_BENCH=1, never in the gate:
//   TIER_BENCH=1 LABEL=<x> npx playwright test tests/tier-cost-benchmark-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific timings).
const LABEL = process.env.LABEL ?? 'bench';
const OUT = 'docs/designs/3d-pipeline/audits/task5/tier-cost';
const TIERS = { low: { quality: 'low' }, medium: { quality: 'medium' }, high: { quality: 'high' }, ultra: { quality: 'high', ultra: true } };
const SCENARIOS = ['day', 'rain', 'rain-no-glow', 'day'];

test.skip(!process.env.TIER_BENCH, 'run with TIER_BENCH=1');
test.use({ viewport: { width: 1440, height: 900 }, launchOptions: { args: ['--disable-gpu-vsync', '--disable-frame-rate-limit'] } });

test(`${LABEL}: Coast frame cost per quality tier`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(600000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const [tier, vfx] of Object.entries(TIERS)) {
    await page.evaluate(settings => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
    }, vfx);
    await page.goto(`${gameplayURL}?look=3d`);
    for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(ciTimeout(400)); }
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    if (tier !== 'low') await expect.poll(() => page.locator('#world').getAttribute('data-coast-road'), { timeout: ciTimeout(60000) }).not.toBe('procedural');
    await page.locator('#start-button').click();
    await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
    await page.keyboard.down('KeyW');
    for (const scenario of SCENARIOS) {
      await page.evaluate(scenario => {
        const race = window.gameplay.race;
        race.mode = 'free'; race.session = { ...race.session, presentation: { visualPreset: scenario === 'day' ? 'day' : 'rain' } };
        // Layer 31 is never rendered: hides the discs without fighting aero-vfx, which sets `visible` every frame.
        window.gameScene.scene.traverse(o => { if (o.name.startsWith('Thruster glow')) o.layers.set(scenario === 'rain-no-glow' ? 31 : 0); });
      }, scenario);
      await page.waitForTimeout(ciTimeout(1500)); // settle the preset swap and its environment map
      rows.push({ tier, scenario, ...await sampleFrameCost(page, 4000) });
    }
    await page.keyboard.up('KeyW');
  }
  const gpu = await gpuName(page);
  console.table(rows);
  fs.writeFileSync(`${OUT}/${LABEL}.json`, JSON.stringify({ label: LABEL, gpu, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
