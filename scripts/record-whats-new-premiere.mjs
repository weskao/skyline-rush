// Records the v0.33.0 What's New hero clip `gt-premiere` from the real game (never a mock-up): the Vantaire GT car premiere
// a Coast win unlocks at 18 Career stars, then a tap on the reveal's apply button (a car's reads "Drive this car", then
// "Car selected"; "Equip now" is for gear). Desktop + phone, en + zh-TW.
//   node scripts/record-whats-new-premiere.mjs [--scale 2] [--shapes desktop,mobile] [--locales en,zh-TW] [--keep-frames <dir>]
// Writes public/whats-new/gt-premiere/gt-premiere.{desktop,mobile}.{en,zh-TW}.{mp4,jpg}: the clip starts when the premiere's
// first shot plays (the race lead-in is cut) and ends on "Car selected"; the poster is the settled title frame before the tap.
// Real flow: 15 stars are seeded (every track but Coast at 3), a Coast race starts through the lobby, the player is moved
// 10 m before the line with a winning score (as record-whats-new-stills.mjs results-cloud does) and crosses it first, so
// the game itself earns the 3rd Coast star, the 18th, and presents the GT through presentAcquisition. Nothing else is set.
// Frames are lossless PNG screenshots at --scale x the CSS size, one per 1/30 s step of a paused virtual clock, never
// Playwright recordVideo; CSS animations are slowed to that pace like record-whats-new-clip.mjs. CRF 20, capped at 4 MB.
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const { values: opts } = parseArgs({ options: {
  scale: { type: 'string', default: '2' }, shapes: { type: 'string', default: 'desktop,mobile' }, locales: { type: 'string', default: 'en,zh-TW' }, 'keep-frames': { type: 'string', default: '' },
} });
const scale = Number(opts.scale), FPS = 30, SLUG = 'gt-premiere', MAX_BYTES = 4 * 1024 * 1024;
const PREMIERE_S = 6.4, HOVER_S = 0.5, PRESS_S = 0.25, EQUIPPED_S = 1.4; // the cinematic runs 5.8 s, then the title frame holds
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${SLUG}/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']].filter(([locale]) => opts.locales.split(',').includes(locale));
const ALL_SHAPES = { desktop: { width: 960, height: 600, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const SHAPES = Object.fromEntries(opts.shapes.split(',').map(name => [name, ALL_SHAPES[name] ?? (() => { throw new Error(`Unknown shape "${name}"`); })()]));
const STARS = { neon: 3, canyon: 3, aurora: 3, spiral: 3, taipei: 3 }; // 15 of the 18 stars the GT needs; Coast's 3 come from the race

// Players get the `coming-soon` Garage build; the dev server defaults to `trial`.
process.env.GARAGE_VFX_RELEASE_MODE = 'coming-soon';
const server = await createServer({ root, optimizeDeps: { entries: ['index.html'] }, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function record(locale, system, shape, { width, height, mobile }) {
  const context = await browser.newContext({ locale: system, viewport: { width, height }, deviceScaleFactor: scale, hasTouch: mobile, isMobile: mobile });
  await context.addInitScript(stars => {
    for (const [key, value] of [['guide-seen', '1'], ['whats-new-seen-v1', '999.0.0'], ['tutorial-completed', '1'], ['last-track', 'coast'], ['stars', JSON.stringify(stars)],
      ['unlocked', JSON.stringify(['coast', ...Object.keys(stars)])]]) // every track open, so the reveal holds the car, not a track unlock
      localStorage.setItem(`skyline-rush-${key}`, value);
  }, STARS);
  const page = await context.newPage();
  await page.route('**/src/main.js', async route => { // the read-only race handle the gameplay specs inject
    const response = await route.fetch(), anchor = 'let race = createRace();', source = await response.text();
    if (!source.includes(anchor)) throw new Error('Missing race anchor in main.js');
    await route.fulfill({ response, body: source.replace(anchor, `${anchor} window.gameplay = { get race() { return race; } };`) });
  });
  await page.clock.install({ time: 0 });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#startup-enter').click();
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700); // the music prompt appears after 600 ms where autoplay is blocked
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const card = page.locator('[data-track="coast"]');
  if (await card.getAttribute('aria-pressed') !== 'true') await card.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // models finish loading in real time, before the clock stops
  if (await page.evaluate(() => window.gameplay.race.trackId) !== 'coast') throw new Error('Expected the Coast race');
  await page.clock.pauseAt(await page.evaluate(() => Math.ceil((Date.now() + 100) / 1000) * 1000));

  const dir = await mkdtemp(join(tmpdir(), 'whats-new-')), cdp = await context.newCDPSession(page);
  const base = `${outDir}${SLUG}.${shape}.${locale}`;
  let realMs = 150, last = Date.now(), frames = 0, poster = 0;
  // One 1/FPS step of the virtual clock; CSS animations run on real time, so they are matched to it from the measured real time per step.
  const step = async () => {
    realMs = 0.8 * realMs + 0.2 * (Date.now() - last); last = Date.now();
    await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.max(0.05, 1000 / FPS / realMs) });
    await page.clock.runFor(1000 / FPS);
  };
  const shoot = async () => { await page.screenshot({ path: `${dir}/${String(frames++).padStart(5, '0')}.png`, animations: 'allow', caret: 'initial' }); await step(); };
  const until = async (ready, what, limit = 900) => { for (let i = 0; !await ready(); i++) { if (i > limit) throw new Error(`Timed out waiting for ${what}`); await step(); } };

  await page.locator('#start-button').click();
  await until(() => page.locator('#countdown').isHidden(), 'the countdown');
  await page.evaluate(() => { // 10 m before the line, ahead of every rival, with a 3-star score: the race itself finishes and settles
    const { player, length } = window.gameplay.race;
    window.gameplay.race.elapsed = 80;
    Object.assign(player, { distance: length - 10, speed: 60, score: length });
  });
  const reveal = page.locator('#acquisition-reveal');
  await until(() => reveal.evaluate(dialog => dialog.open).catch(() => false), 'the acquisition reveal');
  const result = await page.evaluate(() => window.gameplay.race.result);
  if (result.position !== 1 || result.stars !== 3) throw new Error(`Expected a 3-star win, got ${JSON.stringify(result)}`);
  // The GT is an asset fetched in real time; the cinematic's clock starts at its first drawn frame.
  for (let i = 0; await page.locator('.acquisition-car-cinematic').getAttribute('data-cinematic') === 'loading'; i++) {
    if (i > 400) throw new Error('The premiere never started');
    await step();
    await page.waitForTimeout(50);
  }
  const title = await page.locator('#acquisition-name').innerText();
  if (!/^(vantaire|夜鋒) gt$/i.test(title)) throw new Error(`Expected the GT premiere, got "${title}"`);

  for (let i = 0; i < PREMIERE_S * FPS; i++) { if (i === Math.round(PREMIERE_S * FPS) - 1) poster = frames; await shoot(); }
  const equip = reveal.locator('.acquisition-apply');
  if (!await equip.count()) throw new Error('No apply button on the reveal: ' + (await reveal.innerHTML()).slice(0, 1500));
  if (await equip.getAttribute('data-action') !== 'drive') throw new Error('The GT reveal has no "Drive this car" button'); // a car's reveal action is `drive` (Equip is for gear)
  const { x, y, width: w, height: h } = await equip.boundingBox();
  await page.mouse.move(x + w / 2, y + h / 2, { steps: 4 });
  for (let i = 0; i < HOVER_S * FPS; i++) await shoot();
  await page.mouse.down();
  for (let i = 0; i < PRESS_S * FPS; i++) await shoot();
  await page.mouse.up();
  await page.waitForFunction(() => document.querySelector('.acquisition-apply')?.hasAttribute('data-applied'));
  for (let i = 0; i < EQUIPPED_S * FPS; i++) await shoot();
  if (await page.evaluate(() => localStorage.getItem('skyline-rush-car')) === null) throw new Error('The tap did not save the car');

  // Balanced quality, never coarsened to fit: CRF 20 with a 4 MB cap; shorten the clip instead.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', `${FPS}`, '-i', `${dir}/%05d.png`, '-an', '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264',
    '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/${String(poster).padStart(5, '0')}.png`, '-frames:v', '1', '-q:v', '2', `${base}.jpg`]);
  if (opts['keep-frames']) execFileSync('cp', ['-R', dir, `${opts['keep-frames']}/${shape}.${locale}`]);
  await rm(dir, { recursive: true, force: true });
  await context.close();
  const bytes = (await stat(`${base}.mp4`)).size;
  console.log(`${base}.mp4 ${Math.round(width * scale)}x${Math.round(height * scale)} ${(bytes / 1024).toFixed(0)} KB, ${(frames / FPS).toFixed(1)} s at ${FPS} fps`);
  if (bytes > MAX_BYTES) throw new Error(`${base}.mp4 is ${bytes} bytes; keep clips under 4 MB (shorter clip)`);
}

try {
  await mkdir(outDir, { recursive: true });
  for (const [locale, system] of LOCALES) for (const [shape, spec] of Object.entries(SHAPES)) await record(locale, system, shape, spec);
} finally {
  await browser.close();
  await server.close();
}
