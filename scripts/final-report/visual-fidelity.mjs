// Visual fidelity gate: renders the same scene, simulation time and animation phase on a baseline checkout and on this
// branch through scripts/final-report/visual-fidelity.html (real world.js + post-processing, fixed clocks, seeded RNG),
// reads the WebGL canvas back and diffs it pixel by pixel. The candidate also renders twice to give the determinism
// floor. Writes metrics JSON plus one WebP composite per scene (baseline | candidate | amplified difference).
// Canvas only: DOM overlays (menus, HUD, results text) are not part of the comparison.
// Usage: node scripts/final-report/visual-fidelity.mjs <out-dir> <base=checkout> <candidate=checkout> [scene-filter]
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [outArg, ...rest] = process.argv.slice(2);
const builds = rest.filter(a => a.includes('=')).map(p => { const [label, dir] = p.split('='); return { label, root: resolve(dir) }; });
const filter = rest.find(a => !a.includes('='));
if (!outArg || builds.length !== 2) throw Error('Usage: visual-fidelity.mjs <out-dir> base=dir candidate=dir [filter]');
const out = resolve(outArg);
mkdirSync(out, { recursive: true });

const MOBILE = { width: 390, height: 844, deviceScaleFactor: 3 }, DESKTOP = { width: 1440, height: 900, deviceScaleFactor: 1 };
const scene = (id, viewport, run) => ({ id, viewport, run });
const SCENES = [
  scene('m-home-coast', MOBILE, { track: 'coast', phase: 'home' }),
  scene('m-home-tokyo', MOBILE, { track: 'tokyo', phase: 'home' }),
  scene('m-showcase-volcanic-crown', MOBILE, { track: 'volcanic-crown', phase: 'showcase' }),
  scene('m-showcase-frostbite-canyon', MOBILE, { track: 'frostbite-canyon', phase: 'showcase' }),
  scene('m-garage-high', MOBILE, { track: 'coast', phase: 'garage' }),
  scene('m-garage-ultra', MOBILE, { track: 'coast', phase: 'garage', quality: 'ultra' }),
  scene('m-race-coast-high', MOBILE, { track: 'coast', phase: 'racing' }),
  scene('m-race-tokyo-high', MOBILE, { track: 'tokyo', phase: 'racing' }),
  scene('m-race-taipei-high', MOBILE, { track: 'taipei', phase: 'racing' }),
  scene('m-race-neon-ultra', MOBILE, { track: 'neon', phase: 'racing', quality: 'ultra' }),
  scene('m-race-volcanic-crown-ultra', MOBILE, { track: 'volcanic-crown', phase: 'racing', quality: 'ultra' }),
  scene('m-photo-tokyo', MOBILE, { track: 'tokyo', phase: 'photo' }),
  scene('m-results-coast', MOBILE, { track: 'coast', phase: 'results' }),
  scene('d-home-coast', DESKTOP, { track: 'coast', phase: 'home' }),
  scene('d-showcase-frostbite-canyon', DESKTOP, { track: 'frostbite-canyon', phase: 'showcase' }),
  scene('d-garage-ultra', DESKTOP, { track: 'coast', phase: 'garage', quality: 'ultra' }),
  scene('d-race-tokyo-high', DESKTOP, { track: 'tokyo', phase: 'racing' }),
  scene('d-race-volcanic-crown-ultra', DESKTOP, { track: 'volcanic-crown', phase: 'racing', quality: 'ultra' }),
  scene('d-photo-tokyo', DESKTOP, { track: 'tokyo', phase: 'photo' }),
  scene('d-results-coast', DESKTOP, { track: 'coast', phase: 'results' }),
].filter(s => !filter || s.id.includes(filter));

/** Per-pixel comparison of two RGBA buffers (alpha ignored: the canvas is opaque). */
export function diff(a, b) {
  if (a.length !== b.length) return { comparable: false };
  let maxDelta = 0, changed = 0, over1 = 0, over8 = 0, sumAbs = 0, sumSq = 0;
  const pixels = a.length / 4;
  for (let i = 0; i < a.length; i += 4) {
    let m = 0;
    for (let c = 0; c < 3; c++) { const d = Math.abs(a[i + c] - b[i + c]); sumAbs += d; sumSq += d * d; if (d > m) m = d; }
    if (m > maxDelta) maxDelta = m;
    if (m) changed++; if (m > 1) over1++; if (m > 8) over8++;
  }
  const mse = sumSq / (pixels * 3);
  return { comparable: true, pixels, maxDelta, changed, over1, over8, over8Pct: (100 * over8) / pixels,
    mae: sumAbs / (pixels * 3), psnr: mse ? 10 * Math.log10((255 * 255) / mse) : null };
}
{ // self-check
  const z = new Uint8Array([0, 0, 0, 255, 10, 10, 10, 255]), y = new Uint8Array([0, 0, 0, 255, 10, 30, 10, 255]);
  const d = diff(z, y);
  if (d.maxDelta !== 20 || d.changed !== 1 || d.over8 !== 1 || diff(z, z).psnr !== null) throw Error('diff self-check failed');
}

const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
try {
  for (const build of builds) {
    build.server = await createServer({ root: build.root, configFile: join(build.root, 'vite.config.js'), logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
    await build.server.listen();
    build.url = build.server.resolvedUrls.local[0] + 'scripts/final-report/visual-fidelity.html';
  }
  const render = async (build, s) => { // A fresh page per render, so fake clocks and RNG start identical.
    const context = await browser.newContext({ viewport: { width: s.viewport.width, height: s.viewport.height }, deviceScaleFactor: s.viewport.deviceScaleFactor });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      await page.goto(build.url);
      await page.waitForFunction(() => window.visualReady, null, { timeout: 120000 });
      const r = await page.evaluate(run => window.visualRun(run), s.run);
      return { ...r, pixels: Buffer.from(r.image.data, 'base64'), errors };
    } finally { await context.close(); }
  };
  const composer = await (await browser.newContext()).newPage();
  for (const s of SCENES) {
    const [base, cand] = builds;
    let a, b, b2;
    try { a = await render(base, s); b = await render(cand, s); b2 = await render(cand, s); }
    catch (error) { results.push({ id: s.id, ...s.run, error: String(error.message ?? error).split('\n')[0] }); console.log(s.id, 'ERROR', error.message); continue; }
    const row = { id: s.id, ...s.run, viewport: `${s.viewport.width}x${s.viewport.height}@${s.viewport.deviceScaleFactor}`,
      canvas: [a.image.w, a.image.h], gpu: a.gpu, distance: [a.distance, b.distance], simPhase: [a.phase, b.phase],
      [`${base.label}vs${cand.label}`]: diff(a.pixels, b.pixels), [`${cand.label}vs${cand.label}`]: diff(b.pixels, b2.pixels),
      errors: [...a.errors, ...b.errors], webp: `${s.id}.webp` };
    // Composite in the browser: readPixels rows are bottom-up; difference amplified x8 so 1-step noise stays near black.
    const webp = await composer.evaluate(({ w, h, a, b }) => {
      const dec = s => Uint8ClampedArray.from(atob(s), ch => ch.charCodeAt(0));
      const pa = dec(a), pb = dec(b), scale = Math.min(1, 1200 / (3 * w));
      const sw = Math.round(w * scale), sh = Math.round(h * scale), gap = 8;
      const full = document.createElement('canvas'); full.width = w; full.height = h;
      const fctx = full.getContext('2d'), out = document.createElement('canvas');
      out.width = 3 * sw + 2 * gap; out.height = sh;
      const octx = out.getContext('2d'); octx.fillStyle = '#ffffff'; octx.fillRect(0, 0, out.width, out.height);
      const place = (px, slot) => {
        const img = new ImageData(w, h);
        for (let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
        fctx.putImageData(img, 0, 0);
        octx.drawImage(full, slot * (sw + gap), 0, sw, sh);
      };
      const d = new Uint8ClampedArray(pa.length);
      for (let i = 0; i < pa.length; i += 4) {
        const m = Math.max(Math.abs(pa[i] - pb[i]), Math.abs(pa[i + 1] - pb[i + 1]), Math.abs(pa[i + 2] - pb[i + 2])) * 8;
        d[i] = m; d[i + 1] = m > 255 ? 64 : m * 0.25; d[i + 2] = 0; d[i + 3] = 255;
      }
      place(pa, 0); place(pb, 1); place(d, 2);
      return out.toDataURL('image/webp', 0.82).split(',')[1];
    }, { w: a.image.w, h: a.image.h, a: a.image.data, b: b.image.data });
    writeFileSync(join(out, row.webp), Buffer.from(webp, 'base64'));
    results.push(row);
    const ab = row[`${base.label}vs${cand.label}`], bb = row[`${cand.label}vs${cand.label}`];
    console.log(s.id, 'max', ab.maxDelta, '>8', ab.over8, `(${ab.over8Pct?.toFixed(3)}%)`, 'psnr', ab.psnr?.toFixed(1), '| repeat max', bb.maxDelta, '>8', bb.over8, row.errors.length ? 'ERRORS ' + row.errors.join(' | ') : '');
  }
} finally {
  await browser.close();
  await Promise.all(builds.map(b => b.server?.close()));
  writeFileSync(join(out, 'visual-fidelity.json'), JSON.stringify({ environment: 'LOCAL-CHROME', harness: 'scripts/final-report/visual-fidelity.html',
    base: builds[0].label, candidate: builds[1].label, composite: 'base | candidate | |difference| x8', scenes: results }, null, 2) + '\n');
}
