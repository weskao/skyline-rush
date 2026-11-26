// Real-WebGL draw-call attribution per pass and source, on the thermal-baseline fixture loop.
// Usage: node scripts/draw-attribution.mjs <track-id>:<home|racing> ... [--json]
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const json = process.argv.includes('--json');
const wanted = process.argv.slice(2).filter(a => !a.startsWith('--')).map(a => a.split(':'));
const server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
let browser;
const tally = (rows, key) => Object.entries(rows.reduce((m, r) => (m[key(r)] = (m[key(r)] ?? 0) + 1, m), {}))
  .sort((a, b) => b[1] - a[1]);
try {
  await server.listen();
  browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 })).newPage();
  const url = server.resolvedUrls.local[0] + 'tests/fixtures/draw-attribution.html?perf=deep&seed=12345';
  for (const [id, phase] of wanted) {
    await page.goto(url); await page.waitForFunction(() => !!window.drawAttribution);
    const result = await page.evaluate(o => window.drawAttribution(o), { id, phase });
    if (json) { console.log(JSON.stringify(result)); continue; }
    console.log(`\n## ${id} ${phase}: renderer.info ${result.drawCalls}, attributed ${result.calls.length}, programs ${result.programs}`);
    console.log('passes', JSON.stringify(tally(result.calls, r => r.pass)));
    for (const pass of ['shadow', 'scene', 'post']) {
      const rows = result.calls.filter(r => r.pass === pass);
      if (rows.length) console.log(pass, JSON.stringify(tally(rows, r => r.source).slice(0, 40)));
    }
  }
} finally {
  await browser?.close(); await server.close();
}
