// Real production-build probe, commit-independent: the same init script wraps WebGL2 draw and upload calls in every
// build, so A/B/C need no source change. Measures load, Home idle, a held-throttle race and a paused race per build,
// rotating the build order each round. Environment LOCAL-CHROME (Playwright, Google Chrome channel); the GL wrappers
// add the same overhead to every build. Not GPU time, not power, not thermals.
// Usage: node scripts/final-report/app-probe.mjs <out.json> <rounds> <label=checkout-with-dist>...
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const [out, roundsArg, ...pairs] = process.argv.slice(2);
const builds = pairs.map(p => { const [label, dir] = p.split('='); return { label, root: resolve(dir) }; });
if (!out || !(+roundsArg > 0) || !builds.length) throw Error('Usage: app-probe.mjs <out.json> <rounds> A=dir ...');
const WINDOWS = { home: 8000, racing: 15000, paused: 8000 }, SETTLE = 3000;

function instrument() {
  sessionStorage.setItem('skyline-rush-startup-skip', '1');
  for (const [key, value] of [['guide-seen', '1'], ['tutorial-completed', '1'], ['music', 'off'], ['sound', 'off'],
    ['vfx', '{"quality":"high"}'], ['target-fps-v1', '60']]) localStorage.setItem(`skyline-rush-${key}`, value);
  let seed = 12345; // Same Math.random stream in every build (object-count changes still shift it).
  Math.random = () => ((seed = (seed + 0x6d2b79f5) | 0), (((seed ^ (seed >>> 15)) * (1 | seed)) >>> 0) / 2 ** 32);
  const total = { draws: 0, subBytes: 0, dataBytes: 0, texBytes: 0 };
  const P = WebGL2RenderingContext.prototype;
  for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced', 'drawRangeElements']) {
    const original = P[name];
    P[name] = function (...args) { total.draws++; return original.apply(this, args); };
  }
  const size = v => (v && typeof v === 'object' && 'byteLength' in v ? v.byteLength : 0);
  const sub = P.bufferSubData; // (target, offset, src, srcOffset?, length?) — length is in elements of src.
  P.bufferSubData = function (t, o, src, srcOffset = 0, length = 0) {
    total.subBytes += length ? length * (src.BYTES_PER_ELEMENT ?? 1) : size(src) - srcOffset * (src?.BYTES_PER_ELEMENT ?? 1);
    return sub.apply(this, arguments);
  };
  const data = P.bufferData;
  P.bufferData = function (t, src) { total.dataBytes += typeof src === 'number' ? src : size(src); return data.apply(this, arguments); };
  for (const name of ['texImage2D', 'texSubImage2D', 'texImage3D', 'texSubImage3D']) {
    const original = P[name];
    P[name] = function (...args) { total.texBytes += args.reduce((n, a) => n + size(a), 0); return original.apply(this, args); };
  }
  const frames = [];
  let last = { ...total }, previous = null;
  const tick = now => {
    frames.push({ t: now, dt: previous === null ? 0 : now - previous, draws: total.draws - last.draws,
      subBytes: total.subBytes - last.subBytes, dataBytes: total.dataBytes - last.dataBytes, texBytes: total.texBytes - last.texBytes });
    if (frames.length > 20000) frames.splice(0, 10000);
    last = { ...total }; previous = now;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  window.__probe = { frames, total, firstDraw: () => frames.find(f => f.draws > 0)?.t ?? null };
}

const rank = (values, p) => { const s = [...values].sort((a, b) => a - b); return s.length ? s[Math.ceil(p * s.length) - 1] : null; };
const median = values => rank(values, 0.5);
function summarize(frames, ms) {
  const drawn = frames.filter(f => f.draws > 0), dts = frames.map(f => f.dt).filter(dt => dt > 0);
  const seconds = ms / 1000;
  return { callbacks: frames.length, renderedPerSecond: drawn.length / seconds,
    intervalP50: rank(dts, 0.5), intervalP95: rank(dts, 0.95), intervalP99: rank(dts, 0.99),
    fps: dts.length ? 1000 / (dts.reduce((a, b) => a + b, 0) / dts.length) : null,
    longFrames33: dts.filter(dt => dt > 33.4).length, longFrames50: dts.filter(dt => dt > 50).length,
    drawsPerRenderedFrame: median(drawn.map(f => f.draws)),
    subBytesPerRenderedFrame: median(drawn.map(f => f.subBytes)), subBytesPerSecond: drawn.reduce((n, f) => n + f.subBytes, 0) / seconds,
    dataBytesPerSecond: frames.reduce((n, f) => n + f.dataBytes, 0) / seconds,
    texBytesPerSecond: frames.reduce((n, f) => n + f.texBytes, 0) / seconds };
}

async function measure(page, cdp, name) {
  const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
  const before = await metrics(), from = await page.evaluate(() => window.__probe.frames.length);
  await page.waitForTimeout(WINDOWS[name]);
  const after = await metrics();
  const frames = await page.evaluate(n => window.__probe.frames.slice(n), from);
  const wall = (after.Timestamp - before.Timestamp) * 1000;
  return { ...summarize(frames, wall),
    mainThreadBusy: (after.TaskDuration - before.TaskDuration) * 1000 / wall,
    scriptBusy: (after.ScriptDuration - before.ScriptDuration) * 1000 / wall,
    heapUsedMB: after.JSHeapUsedSize / 2 ** 20, heapDeltaMB: (after.JSHeapUsedSize - before.JSHeapUsedSize) / 2 ** 20 };
}

async function probe(browser, build) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await context.addInitScript(instrument);
  const page = await context.newPage(), errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  await cdp.send('Performance.enable');
  const started = Date.now();
  await page.goto(build.url);
  await page.locator('#start-button:not([disabled])').waitFor({ timeout: 60000 });
  const startReadyMs = Date.now() - started;
  await page.waitForFunction(() => window.__probe.firstDraw() !== null, null, { timeout: 60000 });
  const firstDrawMs = await page.evaluate(() => window.__probe.firstDraw()); // page clock, from navigation start
  for (let i = 0; i < 3 && await page.locator('dialog[open]').count(); i++) { await page.keyboard.press('Escape'); await page.waitForTimeout(400); }
  await page.waitForTimeout(SETTLE);
  const result = { label: build.label, startReadyMs, firstDrawMs, home: await measure(page, cdp, 'home') };
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', null, { timeout: 60000 });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(SETTLE);
  result.racing = await measure(page, cdp, 'racing');
  await page.keyboard.up('ArrowUp');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => document.body.dataset.phase === 'paused', null, { timeout: 10000 });
  await page.waitForTimeout(SETTLE);
  result.paused = await measure(page, cdp, 'paused');
  result.errors = errors;
  await context.close();
  return result;
}

const browser = await chromium.launch({ channel: 'chrome' });
const runs = [];
try {
  for (const build of builds) {
    build.server = await preview({ configFile: false, root: build.root, logLevel: 'silent', preview: { host: '127.0.0.1', port: 0 } });
    build.url = `http://127.0.0.1:${build.server.httpServer.address().port}/`;
  }
  for (let round = 1; round <= +roundsArg; round++) {
    for (const build of builds.map((_, i) => builds[(i + round - 1) % builds.length])) {
      const result = { round, ...await probe(browser, build) };
      runs.push(result);
      console.log(`r${round} ${build.label} ready ${result.startReadyMs} ms · race ${result.racing.fps?.toFixed(1)} fps p95 ${result.racing.intervalP95?.toFixed(1)} · draws ${result.racing.drawsPerRenderedFrame} · paused ${result.paused.renderedPerSecond.toFixed(1)}/s${result.errors.length ? ' ERRORS ' + result.errors.join(' | ') : ''}`);
    }
  }
} finally {
  await browser.close();
  await Promise.all(builds.map(b => b.server?.close()));
  writeFileSync(out, JSON.stringify({ environment: 'LOCAL-CHROME', harness: 'app-probe', viewport: '390x844@3', windows: WINDOWS, runs }, null, 2));
}
