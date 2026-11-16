// Records a What's New clip from the real game (never a mock-up): one race window, desktop + phone, en + zh-TW.
//   node scripts/record-whats-new-clip.mjs <theme-slug> [--track coast] [--from 3] [--seconds 6] [--scale 2]
//        [--seed 7] [--bot [--bot-until 12]] [--press "KeyE@4,KeyS@8:2.5,KeyD@8:2.5"] [--shapes desktop,mobile]
// Writes public/whats-new/<theme-slug>/<theme-slug>.{desktop,mobile}.{en,zh-TW}.{mp4,jpg}: the clip starts when the
// race clock reaches --from (holding throttle from the green light) and the poster is its middle frame.
// --seed fixes the ring and pickup layout (the app re-rolls it every race), so a --press script replays the same race.
// --bot steers with real A/D key presses toward the next NITRO reward and away from cars ahead, so the player earns
// charges by driving (nothing is set), and logs the clip window's NITRO chain and collisions to check it is clean.
// --bot-until hands the keys back to --press from that race second (a drift needs A/D held), releasing the bot's key.
// --press adds scripted input on top of the held throttle: KeyboardEvent.code@race-seconds[:hold-seconds] (hold
// defaults to 0.15), e.g. KeyE (NITRO, chains during a burn), KeyS + KeyA/KeyD together (drift), Space (fly).
// Frames are lossless PNG screenshots at --scale x the CSS size (default 2), taken one per 1/30 s step of a paused
// virtual clock, never Playwright recordVideo (a low-bitrate VP8 webm at device scale 1 that CRF 20 cannot recover).
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const USAGE = 'Usage: record-whats-new-clip.mjs <theme-slug> [--track id] [--from s] [--seconds s] [--scale n] [--seed n] [--bot] [--press "Key@s[:hold],..."] [--shapes desktop,mobile]';
const { values: opts, positionals: [slug] } = parseArgs({ allowPositionals: true, options: {
  track: { type: 'string', default: 'coast' }, from: { type: 'string', default: '3' }, seconds: { type: 'string', default: '6' },
  scale: { type: 'string', default: '2' }, seed: { type: 'string', default: '1' }, press: { type: 'string', default: '' }, bot: { type: 'boolean', default: false }, 'bot-until': { type: 'string', default: '1e9' }, shapes: { type: 'string', default: 'desktop,mobile' },
} });
const fail = message => { throw new Error(`${message}\n${USAGE}`); };
if (!/^[a-z0-9-]+$/.test(slug ?? '')) fail('Missing or bad theme slug.');
const from = Number(opts.from), seconds = Number(opts.seconds), scale = Number(opts.scale), FPS = 30;
// Sorted [race second, 'down' | 'up', code] steps from "KeyE@4,KeyS@8:2.5".
const steps = opts.press.split(',').filter(Boolean).flatMap(spec => {
  const [, code, at, hold = '0.15'] = spec.match(/^(\w+)@([\d.]+)(?::([\d.]+))?$/) ?? fail(`Bad --press "${spec}".`);
  return [[Number(at), 'down', code], [Number(at) + Number(hold), 'up', code]];
}).sort((a, b) => a[0] - b[0]);
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${slug}/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const ALL_SHAPES = { desktop: { width: 960, height: 600, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const SHAPES = Object.fromEntries(opts.shapes.split(',').map(name => [name, ALL_SHAPES[name] ?? fail(`Unknown shape "${name}".`)]));
const MAX_BYTES = 4 * 1024 * 1024;

// The dev server defaults to the Garage `trial` build; players get `coming-soon`, so shoot that one.
process.env.GARAGE_VFX_RELEASE_MODE = 'coming-soon';
const server = await createServer({ root, optimizeDeps: { entries: ['index.html'] }, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
// Metal-backed GPU (the dev machine's real renderer), so the game runs at its real frame rate.
const browser = await chromium.launch({ channel: 'chrome', args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });

async function record(locale, system, shape, { width, height, mobile }) {
  const context = await browser.newContext({ locale: system, viewport: { width, height }, deviceScaleFactor: scale, hasTouch: mobile, isMobile: mobile });
  await context.addInitScript(track => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
    localStorage.setItem('skyline-rush-last-track', track);
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', track])); // a fresh profile has only Coast
  }, opts.track);
  const page = await context.newPage();
  // Same read-only race handle the gameplay browser specs inject; the shipped app has none.
  await page.route('**/src/race-factory.ts', async route => {
    const response = await route.fetch(), anchor = /setLayoutSeed\(\(\) => [^;]*\);/, source = await response.text();
    if (!anchor.test(source)) throw new Error('Missing layout seed anchor in race-factory.ts');
    await route.fulfill({ response, body: source.replace(anchor, `setLayoutSeed(() => ${Number(opts.seed)});`) });
  });
  await page.route('**/src/main.js', async route => {
    const response = await route.fetch(), anchor = 'let race = createRace();', source = await response.text();
    if (!source.includes(anchor)) throw new Error('Missing race anchor in main.js');
    await route.fulfill({ response, body: source.replace(anchor, `${anchor} window.gameplay = { get race() { return race; } };`) });
  });
  await page.clock.install({ time: 0 });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700); // the music prompt appears after 600 ms where autoplay is blocked
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const card = page.locator(`[data-track="${opts.track}"]`);
  if (await card.getAttribute('aria-pressed') !== 'true') await card.click();
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500); // the car and scenery models finish loading in real time, before the clock stops
  const track = await page.evaluate(() => window.gameplay.race.trackId);
  if (track !== opts.track) throw new Error(`Expected track ${opts.track}, the game chose ${track}`);
  if (await page.locator('[data-wave3-wallet]').count()) throw new Error('Trial-only wallet chips are showing: the server is not on the coming-soon Garage build');
  // From here the game runs on a paused virtual clock that advances 1/FPS per screenshot: every frame is rendered and
  // captured whole at --scale x (no dropped frames, a constant 30 fps), whatever the machine's real speed.
  await page.clock.pauseAt(await page.evaluate(() => Math.ceil((Date.now() + 100) / 1000) * 1000)); // a whole second: the same frame phase every run
  const step = () => page.clock.runFor(1000 / FPS);
  const read = () => page.evaluate(() => {
    const { elapsed, player: p, traffic, rivals, rings, pickups } = window.gameplay.race, ahead = list => list.filter(i => i.distance > p.distance + 10 && i.distance < p.distance + 220);
    return {
      elapsed, x: p.x, speed: p.speed, nitro: p.nitro, chain: p.nitroChain, collisions: p.collisions,
      cars: [...traffic, ...rivals].filter(c => c.distance > p.distance && c.distance < p.distance + 70).map(c => ({ gap: c.distance - p.distance, x: c.x, speed: c.speed })),
      rewards: [...ahead(rings.filter(r => !r.hit && (r.type === 'nitro' || r.type === 'risk'))), ...ahead(pickups.filter(i => !i.taken && ['cell', 'can', 'tank'].includes(i.tier)))]
        .filter(i => i.altitude < 3).sort((a, b) => a.distance - b.distance).map(i => ({ gap: i.distance - p.distance, x: i.x })),
    };
  });
  let held = null; // the steering key the bot holds
  const drive = async state => {
    const blocker = state.cars.find(c => Math.abs(c.x - state.x) < 3.4 && c.gap < 25 + Math.max(0, state.speed - c.speed) * 1.2);
    const goal = blocker ? (blocker.x >= state.x ? -99 : 99) : state.rewards.find(r => Math.abs(r.x - state.x) < 9)?.x ?? state.x;
    const want = goal - state.x > 0.9 ? 'KeyD' : goal - state.x < -0.9 ? 'KeyA' : null;
    if (want === held) return;
    if (held) await page.keyboard.up(held);
    if (want) await page.keyboard.down(want);
    held = want;
  };
  await page.locator('#start-button').click();
  while (await page.locator('#countdown').isVisible()) await step();
  await page.locator('#intro').waitFor({ state: 'hidden' }); // the home panel's leave animation runs on real time and can outlast the countdown, so it would cover the first frames
  await page.keyboard.down('ArrowUp');
  const dir = await mkdtemp(join(tmpdir(), 'whats-new-')), cdp = await context.newCDPSession(page);
  // CSS animations and transitions run on real time, not the virtual clock: match them to the game's pace (1/FPS s of
  // animation per step) from the measured real time per step.
  let realMs = 150, last = Date.now(), window0, state;
  for (let frame = 0, next = 0; frame < seconds * FPS; await step()) {
    realMs = 0.8 * realMs + 0.2 * (Date.now() - last); last = Date.now();
    await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.max(0.05, 1000 / FPS / realMs) });
    state = await read();
    const now = state.elapsed;
    if (opts.bot) await drive(now < Number(opts['bot-until']) ? state : { ...state, cars: [], rewards: [], x: 0 }); // past --bot-until: no goal, so the held key is released
    if (now >= from && !window0) window0 = state;
    for (; next < steps.length && steps[next][0] <= now; next++) await page.keyboard[steps[next][1]](steps[next][2]);
    if (now >= from) await page.screenshot({ path: `${dir}/${String(frame++).padStart(5, '0')}.png`, animations: 'allow', caret: 'initial' });
  }
  await context.close();
  console.log(`${locale} ${shape}: NITRO chain x${state.chain} (${state.nitro.toFixed(2)} charges left), ${state.collisions - window0.collisions} collisions in the clip`);

  const base = `${outDir}${slug}.${shape}.${locale}`;
  // Balanced quality, never coarsened to fit: CRF 20 with a 4 MB cap; shorten --seconds (or lower --scale) instead.
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', `${FPS}`, '-i', `${dir}/%05d.png`, '-an', '-vf', 'crop=trunc(iw/2)*2:trunc(ih/2)*2', '-c:v', 'libx264', // x264 needs even sizes (390 × 1.25 is not)
    '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', `${base}.mp4`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', `${dir}/${String(Math.floor(seconds * FPS / 2)).padStart(5, '0')}.png`, '-frames:v', '1', '-q:v', '2', `${base}.jpg`]);
  await rm(dir, { recursive: true, force: true });
  const bytes = (await stat(`${base}.mp4`)).size;
  console.log(`${base}.mp4 ${Math.round(width * scale)}x${Math.round(height * scale)} ${(bytes / 1024).toFixed(0)} KB, ${seconds} s at ${FPS} fps`);
  if (bytes > MAX_BYTES) throw new Error(`${base}.mp4 is ${bytes} bytes; keep clips under 4 MB (shorter --seconds or --scale 1.5)`);
}

try {
  await mkdir(outDir, { recursive: true });
  for (const [locale, system] of LOCALES) for (const [shape, spec] of Object.entries(SHAPES)) await record(locale, system, shape, spec);
} finally {
  await browser.close();
  await server.close();
}
