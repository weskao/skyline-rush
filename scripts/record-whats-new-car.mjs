// Records a car-look What's New clip + angle sheet from the real Garage Studio (never a mock-up).
//   node scripts/record-whats-new-car.mjs <theme-slug>
// Writes public/whats-new/<slug>/<slug>.{desktop,mobile}.{en,zh-TW}.{mp4,jpg}: wing opens, then one full orbit
// (the Studio's own drag-to-orbit, so no extra hook in the game), `<slug>-angles.jpg` (six stills of the car) and `<slug>-racers.{en,zh-TW}.jpg` (a race frame).
import { execFileSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const slug = process.argv[2];
if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('Usage: record-whats-new-car.mjs <theme-slug>');
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${slug}/`, rawDir = `${root}artifacts/whats-new-raw/`, stillDir = `${rawDir}stills/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const SHAPES = { desktop: { width: 960, height: 600, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const MAX_BYTES = 4 * 1024 * 1024, ORBIT_MS = 7000, ORBIT_RAD = 2 * Math.PI, RAD_PER_PX = .008;

const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

async function studio(locale, system, { width, height, mobile }, extra = {}) {
  const context = await browser.newContext({ locale: system, viewport: { width, height }, hasTouch: mobile, isMobile: mobile, ...extra(width, height) });
  await context.addInitScript(() => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
  });
  const page = await context.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#garage-button').click();
  await page.locator('#garage-studio-open').click();
  await page.locator('#garage-preview').waitFor();
  await page.locator('[data-garage-angle="cinematic"]').click(); // also stops the slow auto-orbit
  await page.waitForTimeout(1200);
  return { context, page };
}

async function orbit(page) {
  const box = await page.locator('#garage-preview').boundingBox();
  const y = box.y + box.height / 2, span = box.width * .7, lap = ORBIT_RAD / RAD_PER_PX, drags = Math.ceil(lap / span);
  const stepMs = ORBIT_MS / (lap / 3); // 3 px per mouse step
  for (let d = 0; d < drags; d++) {
    await page.mouse.move(box.x + box.width * .15, y);
    await page.mouse.down();
    for (let px = 3; px <= Math.min(span, lap - d * span); px += 3) { await page.mouse.move(box.x + box.width * .15 + px, y); await page.waitForTimeout(stepMs); }
    await page.mouse.up();
  }
}

async function record(locale, system, shape, spec) {
  const opened = Date.now(); // the raw video starts when its context does, so the clip starts once the Studio is up
  const { context, page } = await studio(locale, system, spec, (width, height) => ({ recordVideo: { dir: rawDir, size: { width, height } } }));
  const start = (Date.now() - opened) / 1000;
  await page.locator('#garage-wing').click();
  await page.waitForTimeout(900);
  await orbit(page);
  await page.waitForTimeout(500);
  const length = (Date.now() - opened) / 1000 - start;
  await context.close();
  const raw = await page.video().path(), base = `${outDir}${slug}.${shape}.${locale}`;
  // Balanced quality, never coarsened to fit: CRF 20 with a 4 MB cap; shorten the orbit instead.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', `${start}`, '-t', `${length}`, '-i', raw, '-an', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', `${length / 2}`, '-i', `${base}.mp4`, '-frames:v', '1', '-q:v', '2', `${base}.jpg`]);
  const bytes = (await stat(`${base}.mp4`)).size;
  if (bytes > MAX_BYTES) throw new Error(`${base}.mp4 is ${bytes} bytes; keep clips under 4 MB (shorter orbit)`);
  console.log(`${base}.mp4 ${(bytes / 1024).toFixed(0)} KB, ${length.toFixed(1)} s`);
}

async function angles() {
  const { context, page } = await studio('en', 'en-US', { width: 1440, height: 900, mobile: false }, () => ({}));
  const shots = [['cinematic', false], ['front', false], ['side', false], ['rear', false], ['rear', true], ['top', false]];
  await page.addStyleTag({ content: '.garage-hint { display: none !important; }' }); // English-only caption, the sheet is shared
  const wing = page.locator('#garage-wing');
  for (const [i, [angle, open]] of shots.entries()) {
    await page.locator(`[data-garage-angle="${angle}"]`).click();
    if ((await wing.getAttribute('aria-pressed') === 'true') !== open) await wing.click();
    await page.waitForTimeout(1100);
    await page.locator('#garage-preview').screenshot({ path: `${stillDir}${i}.png` });
  }
  await context.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${stillDir}%d.png`, '-frames:v', '1',
    '-vf', 'scale=640:-2,tile=3x2', '-q:v', '2', `${outDir}${slug}-angles.jpg`]);
  console.log(`${outDir}${slug}-angles.jpg`);
}

// A real race frame just after the green light: the rival and traffic cars ahead. One still per language.
async function racers(locale, system) {
  const { width, height } = SHAPES.desktop;
  const context = await browser.newContext({ locale: system, viewport: { width, height } });
  await context.addInitScript(() => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
  });
  const page = await context.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#start-button').click();
  await page.locator('#countdown').waitFor({ state: 'hidden', timeout: 20000 });
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(6500); // the big 3-2-1 outlasts the #countdown panel
  await page.screenshot({ path: `${stillDir}race.png` });
  await context.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${stillDir}race.png`, '-q:v', '2', `${outDir}${slug}-racers.${locale}.jpg`]);
}

try {
  await mkdir(outDir, { recursive: true });
  await mkdir(stillDir, { recursive: true });
  await angles();
  for (const [locale, system] of LOCALES) await racers(locale, system);
  for (const [locale, system] of LOCALES) for (const [shape, spec] of Object.entries(SHAPES)) await record(locale, system, shape, spec);
} finally {
  await browser.close();
  await server.close();
  await rm(rawDir, { recursive: true, force: true });
}
