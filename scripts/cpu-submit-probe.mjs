// CPU render-submission probe (perf-thermal Wave 3 item 32): deterministic per-frame work counters and an optional
// Chrome CPU profile of the measured racing frames only. Evidence class LOCAL-CHROME.
// Usage: node scripts/cpu-submit-probe.mjs <track> [--frames=300] [--counters] [--profile] [--top=40] [--json=out.json]
//   --counters: patches Three.js / WebGL2 (timings are then inflated; use counts only).
//   --profile : samples at 100 us and prints top self / inclusive cost across the measured frames.
// Run it from the checkout under test; copy this script and tests/fixtures/cpu-submit-probe.html into an older checkout.
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';

const [track, ...flags] = process.argv.slice(2);
const flag = (name, fallback) => { const hit = flags.find(f => f === `--${name}` || f.startsWith(`--${name}=`)); return hit === undefined ? fallback : hit.split('=')[1] ?? true; };
if (!track) throw Error('Usage: cpu-submit-probe.mjs <track> [--frames=N] [--counters] [--profile]');
const frames = +flag('frames', 300), counters = flag('counters') !== undefined, profile = flag('profile') !== undefined;

const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome' });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  const page = await context.newPage();
  page.on('pageerror', error => console.error('page error:', error.message));
  const cdp = await context.newCDPSession(page);
  let cpuProfile = null;
  await page.exposeFunction('__profile', async action => {
    if (!profile) return;
    if (action === 'start') { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 100 }); await cdp.send('Profiler.start'); }
    else cpuProfile = (await cdp.send('Profiler.stop')).profile;
  });
  const url = server.resolvedUrls.local[0] + `tests/fixtures/cpu-submit-probe.html?seed=12345${counters ? '&counters=1' : ''}`;
  await page.goto(url); await page.waitForFunction(() => window.cpuProbeReady);
  const result = await page.evaluate(options => window.cpuProbeRun(options), { id: track, frames });
  const median = values => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
  console.log(`track ${track} frames ${frames} submission p50 ${median(result.submissions).toFixed(2)} ms (${counters ? 'counters on: inflated' : 'unpatched'})`);
  console.log('scene', JSON.stringify(result.scene), 'draw calls (last frame)', result.info.calls);
  if (counters) {
    const names = [...new Set(result.perFrame.flatMap(f => Object.keys(f)))].sort();
    for (const name of names) {
      const series = result.perFrame.map(f => f[name] ?? 0);
      console.log(`${name.padEnd(36)} median ${String(median(series)).padStart(8)}  min ${String(Math.min(...series)).padStart(8)}  max ${String(Math.max(...series)).padStart(8)}`);
    }
  }
  if (cpuProfile) {
    const nodes = new Map(cpuProfile.nodes.map(n => [n.id, n])), parent = new Map();
    for (const n of cpuProfile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
    const label = n => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').slice(-1)[0].replace(/\?.*/, '')}:${n.callFrame.lineNumber + 1}`;
    const self = new Map(), inclusive = new Map(); let total = 0;
    cpuProfile.samples.forEach((id, i) => {
      const ms = (cpuProfile.timeDeltas[i] ?? 0) / 1000;
      let inRender = false;
      for (let cur = id; cur; cur = parent.get(cur)) { const f = nodes.get(cur).callFrame; if (f.functionName === 'render' && f.url.includes('src/world.js')) { inRender = true; break; } }
      if (!inRender) return;
      total += ms; self.set(label(nodes.get(id)), (self.get(label(nodes.get(id))) ?? 0) + ms);
      const seen = new Set();
      for (let cur = id; cur; cur = parent.get(cur)) { const l = label(nodes.get(cur)); if (!seen.has(l)) { seen.add(l); inclusive.set(l, (inclusive.get(l) ?? 0) + ms); } }
    });
    const top = (m, n) => [...m].sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => `${(v / frames).toFixed(3).padStart(8)} ms/frame ${(100 * v / total).toFixed(1).padStart(5)}%  ${k}`).join('\n');
    const n = +flag('top', 40);
    console.log(`--- profile: ${(total / frames).toFixed(2)} ms/frame inside world.render\n--- top self\n${top(self, n)}\n--- top inclusive\n${top(inclusive, n)}`);
  }
  const out = flag('json');
  if (out) writeFileSync(out, JSON.stringify(result));
} finally { await browser.close(); await server.close(); }
