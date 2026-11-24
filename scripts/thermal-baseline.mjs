// Opt-in actual WebGL scene probe. Fixed simulation ticks, input and camera time, not app rAF pacing.
// Usage: node scripts/thermal-baseline.mjs [track-id ...]
// THERMAL_FRAMES=180 THERMAL_VIEWPORT=390x844 THERMAL_DPR=3
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const tracks = process.argv.slice(2);
const frames = Number(process.env.THERMAL_FRAMES ?? 180);
const [width, height] = (process.env.THERMAL_VIEWPORT ?? '390x844').split('x').map(Number);
const dpr = Number(process.env.THERMAL_DPR ?? 3);
if (!Number.isInteger(frames) || frames < 2 || ![width,height,dpr].every(n => Number.isFinite(n) && n > 0)) throw Error('Invalid probe settings');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
const records = [];
const sha = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ viewport: { width,height }, deviceScaleFactor: dpr });
  const page = await context.newPage();
  const url = server.resolvedUrls.local[0] + 'tests/fixtures/thermal-baseline.html?perf=deep&seed=12345';
  await page.goto(url); await page.waitForFunction(() => !!window.thermalScenarios);
  const matrix = await page.evaluate(() => window.thermalScenarios);
  for (const id of tracks) if (!matrix.some(s => s.id === id)) throw Error('Unknown track: ' + id);
  for (const scenario of matrix.filter(s => !tracks.length || tracks.includes(s.id))) {
    // Fresh renderer and page per scenario; no leaking accumulated resources between tracks.
    await page.goto(url); await page.waitForFunction(() => !!window.thermalRun);
    try {
      const record = await page.evaluate(options => window.thermalRun(options), { ...scenario, frames });
      records.push(record);
      console.log(scenario.id, scenario.phase, record.drawnCount, 'draws', record.endDistance, 'm');
    } catch (error) {
      records.push({ ...scenario, status: 'UNVERIFIED', reason: 'scene probe failed; inspect local console' });
      console.error(scenario.id, scenario.phase, error);
      process.exitCode = 1;
    }
  }
} finally {
  await browser?.close(); await server.close();
  mkdirSync('docs/performance/local', { recursive: true });
  writeFileSync('docs/performance/local/' + sha + '-' + width + 'x' + height + '-' + Date.now() + '.json',
    JSON.stringify({ sha, source: 'unclassified-browser-webgl', harness: 'fixed-step-scene-probe', frames, width, height, dpr, records }, null, 2));
}
