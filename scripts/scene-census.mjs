// Real-WebGL scene-graph census per track: scene objects, meshes, materials, geometries, main-pass
// drawn meshes after frustum culling and repeated geometry+material pairs (instancing candidates).
// Same fixed-step fixture inputs as scripts/thermal-baseline.mjs. Counts, not timings.
// Usage: node scripts/scene-census.mjs [track-id ...]   (SCENE_CENSUS_TICKS=240)
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const tracks = process.argv.slice(2);
const ticks = Number(process.env.SCENE_CENSUS_TICKS ?? 240);
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
  const url = server.resolvedUrls.local[0] + 'tests/fixtures/scene-census.html';
  await page.goto(url); await page.waitForFunction(() => !!window.thermalScenarios);
  const matrix = (await page.evaluate(() => window.thermalScenarios)).filter(s => s.phase !== 'home');
  for (const scenario of matrix.filter(s => !tracks.length || tracks.includes(s.id))) {
    await page.goto(url); await page.waitForFunction(() => !!window.sceneCensus);
    try {
      console.log(JSON.stringify(await page.evaluate(options => window.sceneCensus(options), { ...scenario, ticks })));
    } catch (error) {
      console.error(scenario.id, scenario.phase, error.message);
      process.exitCode = 1;
    }
  }
} finally {
  await browser?.close(); await server.close();
}
