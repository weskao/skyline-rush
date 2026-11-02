// Records a What's New clip from the real game (never a mock-up): one race window, desktop + phone, en + zh-TW.
//   node scripts/record-whats-new-clip.mjs <theme-slug> [--track coast] [--from 3] [--seconds 6]
// Writes public/whats-new/<theme-slug>/<theme-slug>.{desktop,mobile}.{en,zh-TW}.{mp4,jpg}: the clip starts when the
// race clock reaches --from (holding throttle from the green light) and the poster is its middle frame.
// Scenes that need more than driving straight are recorded by hand; docs/release-announcements.md has the specs.
import { execFileSync } from 'node:child_process';
import { mkdir, rm, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const { values: opts, positionals: [slug] } = parseArgs({ allowPositionals: true, options: {
  track: { type: 'string', default: 'coast' }, from: { type: 'string', default: '3' }, seconds: { type: 'string', default: '6' },
} });
if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('Usage: record-whats-new-clip.mjs <theme-slug> [--track id] [--from s] [--seconds s]');
const from = Number(opts.from), seconds = Number(opts.seconds);
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${slug}/`, rawDir = `${root}artifacts/whats-new-raw/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const SHAPES = { desktop: { width: 960, height: 600, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const MAX_BYTES = 1024 * 1024;

const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

async function record(locale, system, shape, { width, height, mobile }) {
  const size = { width, height };
  const context = await browser.newContext({ locale: system, viewport: size, hasTouch: mobile, isMobile: mobile, recordVideo: { dir: rawDir, size } });
  const opened = Date.now();
  await context.addInitScript(track => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
    localStorage.setItem('skyline-rush-last-track', track);
  }, opts.track);
  const page = await context.newPage();
  // Same read-only race handle the gameplay browser specs inject; the shipped app has none.
  await page.route('**/src/main.js', async route => {
    const response = await route.fetch(), anchor = 'let race = createRace();', source = await response.text();
    if (!source.includes(anchor)) throw new Error('Missing race anchor in main.js');
    await route.fulfill({ response, body: source.replace(anchor, `${anchor} window.gameplay = { get race() { return race; } };`) });
  });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700); // the music prompt appears after 600 ms where autoplay is blocked
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const track = await page.evaluate(() => window.gameplay.race.trackId);
  if (track !== opts.track) throw new Error(`Expected track ${opts.track}, the game chose ${track}`);
  await page.locator('#start-button').click();
  await page.locator('#countdown').waitFor({ state: 'hidden', timeout: 20000 });
  await page.keyboard.down('ArrowUp');
  const at = async t => page.waitForFunction(t => window.gameplay.race.elapsed >= t, t, { timeout: 60000, polling: 50 });
  await at(from);
  const start = (Date.now() - opened) / 1000;
  await at(from + seconds);
  const length = (Date.now() - opened) / 1000 - start;
  await context.close();
  const raw = await page.video().path(), base = `${outDir}${slug}.${shape}.${locale}`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', `${start}`, '-t', `${length}`, '-i', raw, '-an', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', `${length / 2}`, '-i', `${base}.mp4`, '-frames:v', '1', '-q:v', '4', `${base}.jpg`]);
  const bytes = (await stat(`${base}.mp4`)).size;
  if (bytes > MAX_BYTES) throw new Error(`${base}.mp4 is ${bytes} bytes; keep clips under 1 MB (shorter --seconds)`);
  console.log(`${base}.mp4 ${(bytes / 1024).toFixed(0)} KB, ${length.toFixed(1)} s`);
}

try {
  await mkdir(outDir, { recursive: true });
  for (const [locale, system] of LOCALES) for (const [shape, spec] of Object.entries(SHAPES)) await record(locale, system, shape, spec);
} finally {
  await browser.close();
  await server.close();
  await rm(rawDir, { recursive: true, force: true });
}
