import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expect } from '@playwright/test';
import fs from 'node:fs';

// Workstream 20 soak (docs/performance/frame-lifecycle.md): Coast Free race, alternating one minute racing and one
// minute paused, sampling per minute the delivered rAF rate, composer draws and CDP main-thread busy time.
// Runs only with SOAK=1, never in the gate:
//   SOAK=1 LABEL=<x> [MINUTES=5] npx playwright test tests/frame-lifecycle-soak-browser.spec.js --workers=1
// Output stays in the gitignored audits/ dir (machine-specific timings).
const LABEL = process.env.LABEL ?? 'soak', MINUTES = Number(process.env.MINUTES ?? 5);
const OUT = 'docs/designs/3d-pipeline/audits/frame-lifecycle';

test.skip(!process.env.SOAK, 'run with SOAK=1');
test.use({ viewport: { width: 1280, height: 800 } });

test(`${LABEL}: ${MINUTES}-minute racing/paused soak`, async ({ gameplayPage: page, gameplayURL }) => {
  test.setTimeout(ciTimeout((MINUTES + 3) * 60000));
  fs.mkdirSync(OUT, { recursive: true });
  const errors = [], rows = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(() => {
    for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off']]) localStorage.setItem(`skyline-rush-${key}`, value);
  });
  await page.goto(gameplayURL);
  await expect(page.locator('#world')).not.toHaveAttribute('data-frame-loading', /.*/);
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await page.evaluate(() => {
    const { composer } = window.gameScene, render = composer.render.bind(composer);
    window.renderCount = 0;
    composer.render = (...args) => { window.renderCount++; return render(...args); };
  });
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
  await page.evaluate(() => {
    const race = window.gameplay.race;
    race.mode = 'free';
    setInterval(() => { const car = window.gameplay.race.player; if (car.distance > 0.85 * window.gameplay.race.length) car.distance = 300; }, 500);
  });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Performance.enable');
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  await page.keyboard.down('KeyW');
  for (let minute = 0; minute < MINUTES; minute++) {
    const paused = minute % 2 === 1;
    if (paused) { await page.keyboard.up('KeyW'); await page.locator('#pause-button').click(); }
    else if (minute > 0) {
      await page.locator('#resume-button').click();
      await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: ciTimeout(30000) });
      await page.keyboard.down('KeyW');
    }
    const t0 = Date.now(), m0 = await metrics(), d0 = await page.evaluate(() => window.renderCount);
    // Sample the last 10 s of the minute, after the paused camera has settled.
    await page.waitForTimeout(Math.max(0, t0 + 50000 - Date.now()));
    const sample = await page.evaluate(() => new Promise(resolve => {
      let frames = 0; const t = performance.now(), draws = window.renderCount;
      const tick = now => (now - t < 10000 ? (frames++, requestAnimationFrame(tick))
        : resolve({ rafFps: +(frames * 1000 / (now - t)).toFixed(1), drawsPerSecond: +((window.renderCount - draws) * 1000 / (now - t)).toFixed(1) }));
      requestAnimationFrame(tick);
    }));
    const m1 = await metrics(), d1 = await page.evaluate(() => window.renderCount), seconds = (Date.now() - t0) / 1000;
    rows.push({
      minute, phase: paused ? 'paused' : 'racing', ...sample, drawsInMinute: d1 - d0,
      taskBusyPct: +(100 * (m1.TaskDuration - m0.TaskDuration) / seconds).toFixed(1),
      scriptBusyPct: +(100 * (m1.ScriptDuration - m0.ScriptDuration) / seconds).toFixed(1),
      heapMB: +(m1.JSHeapUsedSize / 1048576).toFixed(1),
    });
  }
  await page.keyboard.up('KeyW');
  console.table(rows);
  fs.writeFileSync(`${OUT}/${LABEL}-${MINUTES}min.json`, JSON.stringify({ label: LABEL, minutes: MINUTES, rows, errors }, null, 2));
  expect(errors).toEqual([]);
});
