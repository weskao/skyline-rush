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
// --master instead plays the same race in real time in a visible window and screen-records it with sound (ffmpeg,
// system output routed to BlackHole 2ch while it runs), compressed by `vidpress` (its recommended H.265 + AAC) into
// assets-src/whats-new/<theme-slug>/: an archive with audio. The game's clips above stay silent; nothing plays it.
import { execFileSync, spawn } from 'node:child_process';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const USAGE = 'Usage: record-whats-new-clip.mjs <theme-slug> [--track id] [--from s] [--seconds s] [--scale n] [--seed n] [--bot] [--press "Key@s[:hold],..."] [--shapes desktop,mobile] [--master]';
const { values: opts, positionals: [slug] } = parseArgs({ allowPositionals: true, options: {
  track: { type: 'string', default: 'coast' }, from: { type: 'string', default: '3' }, seconds: { type: 'string', default: '6' },
  scale: { type: 'string', default: '2' }, seed: { type: 'string', default: '1' }, press: { type: 'string', default: '' }, bot: { type: 'boolean', default: false }, 'bot-until': { type: 'string', default: '1e9' }, shapes: { type: 'string', default: 'desktop,mobile' },
  master: { type: 'boolean', default: false },
} });
const master = opts.master;
const fail = message => { throw new Error(`${message}\n${USAGE}`); };
if (!/^[a-z0-9-]+$/.test(slug ?? '')) fail('Missing or bad theme slug.');
const from = Number(opts.from), seconds = Number(opts.seconds), scale = Number(opts.scale), FPS = 30;
// Sorted [race second, 'down' | 'up', code] steps from "KeyE@4,KeyS@8:2.5".
const steps = opts.press.split(',').filter(Boolean).flatMap(spec => {
  const [, code, at, hold = '0.15'] = spec.match(/^(\w+)@([\d.]+)(?::([\d.]+))?$/) ?? fail(`Bad --press "${spec}".`);
  return [[Number(at), 'down', code], [Number(at) + Number(hold), 'up', code]];
}).sort((a, b) => a[0] - b[0]);
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}${master ? 'assets-src' : 'public'}/whats-new/${slug}/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const ALL_SHAPES = { desktop: { width: 960, height: 600, mobile: false }, mobile: { width: 390, height: 844, mobile: true } };
const SHAPES = Object.fromEntries(opts.shapes.split(',').map(name => [name, ALL_SHAPES[name] ?? fail(`Unknown shape "${name}".`)]));
const MAX_BYTES = 4 * 1024 * 1024;

// The dev server defaults to the Garage `trial` build; players get `coming-soon`, so shoot that one.
process.env.GARAGE_VFX_RELEASE_MODE = 'coming-soon';
const server = await createServer({ root, optimizeDeps: { entries: ['index.html'] }, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
// Metal-backed GPU (the dev machine's real renderer), so the game runs at its real frame rate.
// The master is shot on the second display (kept clear, Do Not Disturb on), so no other app's window is recorded.
// Its top-left in the global top-left coordinates Chrome uses; Cocoa frames count y up from the main display's bottom.
const display = master && JSON.parse(execFileSync('osascript', ['-l', 'JavaScript', '-e',
  'ObjC.import("AppKit"); var s = $.NSScreen.screens; if (s.count < 2) throw "--master needs a second display";'
  + ' var m = s.objectAtIndex(0).frame, f = s.objectAtIndex(1).frame;'
  + ' JSON.stringify({ x: f.origin.x, y: m.size.height - f.origin.y - f.size.height })'], { encoding: 'utf8' }));
// A locked Mac shows its lock-screen wallpaper video, which a take once recorded in place of the race.
if (master && /"CGSSessionScreenIsLocked"=Yes/.test(execFileSync('ioreg', ['-n', 'Root', '-d1'], { encoding: 'utf8' }))) fail('--master needs the screen unlocked.');
// The screensaver once started mid-take and was recorded instead of the race; caffeinate holds it off until we exit.
if (master) spawn('caffeinate', ['-d', '-i', '-w', `${process.pid}`], { stdio: 'ignore' }).unref();
// The output device is chosen when Chrome starts, so BlackHole is selected first; the speakers come back on any exit.
const audioOut = master && execFileSync('SwitchAudioSource', ['-c', '-t', 'output'], { encoding: 'utf8' }).trim();
if (audioOut) {
  // macOS keeps a volume per device and BlackHole's own was 31 (the game recorded at about -55 dB), so it goes to 100.
  // Both devices' levels are read before and written back after, so the speakers return at the owner's level.
  const volume = () => execFileSync('osascript', ['-e', 'output volume of (get volume settings)'], { encoding: 'utf8' }).trim();
  const setVolume = level => execFileSync('osascript', ['-e', `set volume output volume ${level}`]);
  const speakerVolume = volume();
  execFileSync('SwitchAudioSource', ['-t', 'output', '-s', 'BlackHole 2ch']);
  const blackHoleVolume = volume();
  setVolume(100);
  process.on('exit', () => {
    setVolume(blackHoleVolume);
    execFileSync('SwitchAudioSource', ['-t', 'output', '-s', audioOut]);
    setVolume(speakerVolume);
  });
}
// Playwright mutes Chrome by default, which would leave the master silent.
const browser = await chromium.launch({ channel: 'chrome', headless: !master, ignoreDefaultArgs: master ? ['--mute-audio'] : [], args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader',
  ...master ? [`--window-position=${display.x},${display.y}`, '--autoplay-policy=no-user-gesture-required'] : []] });

// Screen-records the page's box on the second display with the system sound (BlackHole) until stop() is called.
async function screenRecord(page, cdp, path) {
  await page.bringToFront();
  // Phone emulation rewrites screenX/outerWidth, so the real window comes from CDP; the page sits at the content area's
  // top-left, under the toolbar.
  const { bounds: win } = await cdp.send('Browser.getWindowForTarget');
  const { width: w, height: h } = page.viewportSize();
  const crop = `crop=${w - w % 2}:${h - h % 2}:${win.left - display.x}:${win.top + win.height - h - display.y}`;
  const ffmpeg = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'avfoundation', '-capture_cursor', '0', '-pixel_format', 'nv12', '-framerate', `${FPS}`,
    '-i', 'Capture screen 1:BlackHole 2ch', '-vf', crop, '-c:v', 'libx264', '-preset', 'ultrafast', '-qp', '0', '-c:a', 'pcm_s16le', path], { stdio: ['pipe', 'inherit', 'inherit'] });
  process.once('exit', () => ffmpeg.kill('SIGKILL')); // a run that throws must not leave ffmpeg recording the screen
  const done = new Promise((resolve, reject) => ffmpeg.on('exit', code => code === 0 ? resolve() : reject(new Error(`ffmpeg screen capture exited ${code}`))));
  await new Promise(resolve => setTimeout(resolve, 1500)); // avfoundation needs a moment before the first frame
  return () => { ffmpeg.stdin.end('q'); return done; };
}

async function record(locale, system, shape, { width, height, mobile }) {
  const context = await browser.newContext({ locale: system, viewport: { width, height }, deviceScaleFactor: scale, hasTouch: mobile, isMobile: mobile });
  await context.addInitScript(track => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
    localStorage.setItem('skyline-rush-last-track', track);
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', track])); // a fresh profile has only Coast
  }, opts.track);
  // A headed Chrome offers Google Translate over pages in a language other than its UI, and no launch flag stops it.
  if (master) await context.addInitScript(() => addEventListener('DOMContentLoaded', () => {
    const meta = document.createElement('meta'); meta.name = 'google'; meta.content = 'notranslate'; document.head.prepend(meta);
    document.documentElement.setAttribute('translate', 'no');
  }));
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
  if (!master) await page.clock.install({ time: 0 });
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#startup-enter').click();
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
  if (!master) await page.clock.pauseAt(await page.evaluate(() => Math.ceil((Date.now() + 100) / 1000) * 1000)); // a whole second: the same frame phase every run
  const step = () => master ? page.waitForTimeout(1000 / FPS) : page.clock.runFor(1000 / FPS);
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
  const dir = await mkdtemp(join(tmpdir(), 'whats-new-')), cdp = await context.newCDPSession(page);
  const base = `${outDir}${slug}.${shape}.${locale}`, raw = `${dir}/${slug}.${shape}.${locale}.mkv`;
  const stop = master && await screenRecord(page, cdp, raw); // the master keeps the countdown and the start-line sound
  await page.locator('#start-button').click();
  while (await page.locator('#countdown').isVisible()) await step();
  await page.locator('#intro').waitFor({ state: 'hidden' }); // the home panel's leave animation runs on real time and can outlast the countdown, so it would cover the first frames
  await page.keyboard.down('ArrowUp');
  // CSS animations and transitions run on real time, not the virtual clock: match them to the game's pace (1/FPS s of
  // animation per step) from the measured real time per step.
  let realMs = 150, last = Date.now(), window0, state;
  for (let frame = 0, next = 0; frame < seconds * FPS; await step()) {
    realMs = 0.8 * realMs + 0.2 * (Date.now() - last); last = Date.now();
    if (!master) await cdp.send('Animation.setPlaybackRate', { playbackRate: Math.max(0.05, 1000 / FPS / realMs) });
    state = await read();
    const now = state.elapsed;
    if (opts.bot) await drive(now < Number(opts['bot-until']) ? state : { ...state, cars: [], rewards: [], x: 0 }); // past --bot-until: no goal, so the held key is released
    if (now >= from && !window0) window0 = state;
    for (; next < steps.length && steps[next][0] <= now; next++) await page.keyboard[steps[next][1]](steps[next][2]);
    if (master) { if (now >= from + seconds) break; } // real time: the race clock, not a frame count, ends the master
    else if (now >= from) await page.screenshot({ path: `${dir}/${String(frame++).padStart(5, '0')}.png`, animations: 'allow', caret: 'initial' });
  }
  if (stop) await stop();
  await context.close();
  console.log(`${locale} ${shape}: NITRO chain x${state.chain} (${state.nitro.toFixed(2)} charges left), ${state.collisions - window0.collisions} collisions in the clip`);
  if (master) {
    // vidpress's recommended settings (H.265 balanced, AAC audio); it names the output after the input, as .mp4, and
    // silently keeps an existing one, so the previous take is removed first.
    await rm(`${base}.mp4`, { force: true });
    execFileSync('vidpress', ['compress', '-y', '--no-skip-if-larger', '-o', outDir, raw], { stdio: 'inherit' });
    await rm(dir, { recursive: true, force: true });
    console.log(`${base}.mp4 master with sound`);
    return;
  }

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
