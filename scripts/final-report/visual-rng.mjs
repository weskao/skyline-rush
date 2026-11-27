// RNG isolation for the visual fidelity gate: renders the racing and Photo scenes of visual-fidelity.mjs through
// visual-rng.html (per-call-site Math.random streams, all restarted at GO) on a baseline and a candidate checkout,
// interleaved per scene, and diffs the canvas. It also compares how many random numbers each call site drew while
// racing. Same census + a pixel difference no larger than the candidate's own repeat = the earlier difference was the
// shared random stream only. `hide` re-renders with parts of the scene hidden to attribute a residual difference.
// Usage: node scripts/final-report/visual-rng.mjs <out-dir> base=dir candidate=dir [filter] [hide=particles,nitro]
// The page must exist in both checkouts (copy visual-rng.html into the baseline's scripts/final-report/).
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outArg, ...rest] = process.argv.slice(2);
const builds = rest.filter(a => a.includes('=') && !a.startsWith('hide=')).map(p => { const [label, dir] = p.split('='); return { label, root: resolve(dir) }; });
const hide = rest.find(a => a.startsWith('hide='))?.slice(5).split(',') ?? [];
const filter = rest.find(a => !a.includes('='));
if (!outArg || builds.length !== 2) throw Error('Usage: visual-rng.mjs <out-dir> base=dir candidate=dir [filter] [hide=a,b]');
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3 }, DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const scene = (id, viewport, run) => ({ id, viewport, run });
const SCENES = [ // the scenes visual-fidelity.mjs found different
  scene('m-race-coast-high', MOBILE, { track: 'coast', phase: 'racing' }),
  scene('m-race-tokyo-high', MOBILE, { track: 'tokyo', phase: 'racing' }),
  scene('m-race-taipei-high', MOBILE, { track: 'taipei', phase: 'racing' }),
  scene('m-race-neon-ultra', MOBILE, { track: 'neon', phase: 'racing', quality: 'ultra' }),
  scene('m-race-volcanic-crown-ultra', MOBILE, { track: 'volcanic-crown', phase: 'racing', quality: 'ultra' }),
  scene('m-photo-tokyo', MOBILE, { track: 'tokyo', phase: 'photo' }),
  scene('d-race-tokyo-high', DESKTOP, { track: 'tokyo', phase: 'racing' }),
  scene('d-race-volcanic-crown-ultra', DESKTOP, { track: 'volcanic-crown', phase: 'racing', quality: 'ultra' }),
  scene('d-photo-tokyo', DESKTOP, { track: 'tokyo', phase: 'photo' }),
].filter(s => !filter || s.id.includes(filter)).map(s => ({ ...s, run: { ...s.run, hide } }));

/** Per-pixel comparison of two RGBA buffers (alpha ignored), plus the bounding box of pixels over 8. */
export function diff(a, b, w) {
  if (a.length !== b.length) return { comparable: false };
  let maxDelta = 0, over1 = 0, over8 = 0, sumSq = 0, box = null, litA = 0, litB = 0;
  for (let i = 0; i < a.length; i += 4) {
    let m = 0;
    for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); sumSq += d * d; if (d > m) m = d; }
    if (m > maxDelta) maxDelta = m;
    if (m > 1) over1++;
    if (m > 8) {
      over8++; litA += a[i] + a[i + 1] + a[i + 2]; litB += b[i] + b[i + 1] + b[i + 2];
      const x = (i / 4) % w, y = Math.floor(i / 4 / w); // readPixels rows are bottom-up
      box = box ? [Math.min(box[0], x), Math.min(box[1], y), Math.max(box[2], x), Math.max(box[3], y)] : [x, y, x, y];
    }
  }
  const mse = sumSq / (a.length / 4 * 3);
  return { comparable: true, maxDelta, over1, over8, psnr: mse ? 10 * Math.log10((255 * 255) / mse) : null, box,
    meanRgb: over8 ? [litA / over8 / 3, litB / over8 / 3] : null }; // mean brightness of the differing pixels, base vs candidate
}
{ // self-check
  const z = new Uint8Array([0, 0, 0, 255, 10, 10, 10, 255]), y = new Uint8Array([0, 0, 0, 255, 10, 30, 10, 255]);
  const d = diff(z, y, 2);
  if (d.maxDelta !== 20 || d.over8 !== 1 || d.box.join() !== '1,0,1,0' || diff(z, z, 2).psnr !== null) throw Error('diff self-check failed');
}
const censusDiff = (a, b) => Object.fromEntries([...new Set([...Object.keys(a ?? {}), ...Object.keys(b ?? {})])]
  .filter(k => a?.[k] !== b?.[k]).map(k => [k, [a?.[k] ?? 0, b?.[k] ?? 0]]));

const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const build of builds) {
    build.server = await createServer({ root: build.root, configFile: join(build.root, 'vite.config.js'), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
    await build.server.listen();
    build.url = build.server.resolvedUrls.local[0] + 'scripts/final-report/visual-rng.html';
  }
  const render = async (build, s) => { // A fresh page per render, so fake clocks and RNG start identical.
    const context = await browser.newContext({ viewport: { width: s.viewport.width, height: s.viewport.height }, deviceScaleFactor: s.viewport.deviceScaleFactor });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(build.url);
      await page.waitForFunction(() => window.visualReady, null, { timeout: 180000 });
      const r = await page.evaluate(run => window.visualRun(run), s.run);
      return { ...r, pixels: Buffer.from(r.image.data, 'base64'), errors };
    } finally { await context.close(); }
  };
  for (const s of SCENES) {
    const [base, cand] = builds;
    let a, b, b2;
    try { a = await render(base, s); b = await render(cand, s); b2 = await render(cand, s); }
    catch (error) { results.push({ id: s.id, ...s.run, error: String(error.message ?? error).split('\n')[0] }); console.log(s.id, 'ERROR', error.message); continue; }
    const w = a.image.w;
    const row = { id: s.id, ...s.run, canvas: [w, a.image.h], distance: [a.distance, b.distance],
      [`${base.label}vs${cand.label}`]: diff(a.pixels, b.pixels, w), [`${cand.label}vs${cand.label}`]: diff(b.pixels, b2.pixels, w),
      censusDraws: [a.census, b.census].map(c => Object.values(c ?? {}).reduce((t, n) => t + n, 0)),
      censusDiff: censusDiff(a.census, b.census), census: b.census, lens: [a.lens, b.lens], ribbon: [a.ribbon, b.ribbon], order: [a.order, b.order], watched: [a.watched, b.watched], elapsed: [a.elapsed, b.elapsed], hidden: [a.hidden, b.hidden],
      errors: [...a.errors, ...b.errors] };
    results.push(row);
    const ab = row[`${base.label}vs${cand.label}`], bb = row[`${cand.label}vs${cand.label}`];
    console.log(s.id, 'max', ab.maxDelta, '>8', ab.over8, 'box', ab.box?.join(','), '| repeat max', bb.maxDelta, '>8', bb.over8,
      '| draws', row.censusDraws.join('/'), 'census diff', JSON.stringify(row.censusDiff), row.errors.length ? 'ERRORS ' + row.errors.join(' | ') : '');
  }
} finally {
  await browser.close();
  await Promise.all(builds.map(b => b.server?.close()));
  writeFileSync(join(out, `visual-rng${hide.length ? '-hide-' + hide.join('-') : ''}${filter ? '-' + filter : ''}.json`), JSON.stringify({
    environment: 'LOCAL-CHROME', harness: 'scripts/final-report/visual-rng.html', base: builds[0].label, candidate: builds[1].label,
    rng: 'per-call-site mulberry32 streams, restarted at GO', hide, scenes: results }, null, 2) + '\n');
}
