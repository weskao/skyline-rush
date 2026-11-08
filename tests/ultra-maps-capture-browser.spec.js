import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';
import { gpuName, sampleFrameCost } from './helpers/frame-cost.js';

// Task 5 Ultra acceptance: every selectable map in a real race on High and on Ultra, same pose and time, so each
// pair can be compared side by side ("every map renders on Ultra at least as High does"). Runs only with
// ULTRA_MAPS=1, never in the gate:
//   ULTRA_MAPS=1 LABEL=<x> VIEWPORT=desktop|phone npx playwright test tests/ultra-maps-capture-browser.spec.js
// Output stays in the gitignored audits/ dir (machine-specific).
const LABEL = process.env.LABEL ?? 'ultra-maps', VIEW = process.env.VIEWPORT ?? 'desktop';
const OUT = `docs/designs/3d-pipeline/audits/task5/${LABEL}-${VIEW}`;
const TIERS = { high: { quality: 'high' }, ultra: { quality: 'high', ultra: true } };

test.skip(!process.env.ULTRA_MAPS, 'run with ULTRA_MAPS=1');
test.use({ viewport: VIEW === 'phone' ? { width: 844, height: 390 } : { width: 1440, height: 900 } });

test(`${LABEL} ${VIEW}: every map on High and Ultra`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout(900000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(`${error.message}`));
  for (const [tier, vfx] of Object.entries(TIERS)) {
    await page.evaluate(settings => {
      for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
      localStorage.setItem('skyline-rush-vfx', JSON.stringify({ ...settings, preset: 'cinematic', enabled: true }));
    }, vfx);
    await page.goto(gameplayURL);
    await page.evaluate(() => localStorage.setItem('skyline-rush-unlocked', JSON.stringify([...document.querySelectorAll('[data-track]')].map(b => b.dataset.track))));
    await page.goto(gameplayURL);
    const ids = await page.evaluate(() => [...new Set([...document.querySelectorAll('[data-track]')].filter(b => !b.disabled).map(b => b.dataset.track))]);
    expect(ids.length).toBeGreaterThan(1);
    for (const id of ids) {
      await page.goto(gameplayURL);
      for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(ciTimeout(400)); }
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      const choice = page.locator(`[data-track="${id}"]`).first();
      await choice.evaluate(button => button.click()); // a capture tool: the carousel may hold it off screen (real taps: track-swipe specs)
      await expect(choice).toHaveAttribute('aria-pressed', 'true');
      await page.locator('#start-button').click();
      await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
      await page.keyboard.down('KeyW');
      await page.waitForTimeout(ciTimeout(4000));
      const cost = await sampleFrameCost(page, 3000); // per-map p50/p95 (by-device table), still driving
      await page.keyboard.up('KeyW');
      await page.locator('#pause-button').click({ timeout: ciTimeout(10000) }); // freeze the frame for the screenshot
      await page.screenshot({ path: `${OUT}/${id}-${tier}.png` });
      rows.push({ id, tier, p50: cost.p50, p95: cost.p95, frames: cost.frames, ...await page.evaluate(() => {
        const { renderer } = window.gameScene, race = window.gameplay.race;
        return { trackId: race.trackId, calls: renderer.info.render.calls, triangles: renderer.info.render.triangles, programs: renderer.info.programs.length };
      }) });
    }
  }
  const gpu = await gpuName(page);
  console.table(rows);
  fs.writeFileSync(`${OUT}/stats.json`, JSON.stringify({ label: LABEL, view: VIEW, gpu, rows, errors }, null, 2));
  expect(rows.every(r => r.trackId === r.id)).toBe(true);
  expect(errors).toEqual([]);
});
