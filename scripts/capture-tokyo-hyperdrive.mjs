// Capture actual Tokyo gameplay frames from the feature branch (no mock scene or generated concept art).
// Run: node scripts/capture-tokyo-hyperdrive.mjs
import { createServer } from 'vite';
import { chromium } from '@playwright/test';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { RACE_TRACKS } from '../src/race-tracks.ts';

const root = new URL('../', import.meta.url);
const out = new URL('../artifacts/tokyo-hyperdrive/', import.meta.url);
mkdirSync(out, { recursive: true });
const frames = mkdtempSync(join(tmpdir(), 'tokyo-frames-'));
const server = await createServer({ root: root.pathname, server: { host: '127.0.0.1', port: 5187, strictPort: true } });
let browser;
const sections = RACE_TRACKS.tokyo.sections.filter(section => section.type === 'boost-tunnel');
if (sections.length !== 2) throw new Error('Tokyo preview expects two charged sectors');
const probe = async (page, distance) => {
  await page.evaluate(d => {
    const race = window.gameplay?.race;
    if (!race || race.phase !== 'racing') throw new Error('Tokyo racing state is unavailable');
    race.traffic = [];
    for (const rival of race.rivals) rival.distance = 0;
    Object.assign(race.player, { distance: d, speed: 72, altitude: 0, verticalSpeed: 0,
      x: 0, fuel: 48, miniBoost: 0, boosting: false, boostTunnelEvent: null });
  }, distance);
  await page.waitForFunction(() => window.gameplay?.race?.player?.section === 'boost-tunnel', { timeout: 30000 });
  await page.waitForTimeout(180);
};
async function gamePage(viewport, quality) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await context.addInitScript(level => {
    sessionStorage.setItem('skyline-rush-startup-skip', '1');
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
    localStorage.setItem('skyline-rush-unlocked', JSON.stringify(['coast', 'tokyo']));
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({
      quality: level, preset: level === 'low' ? 'realistic' : 'cinematic',
      comfortable: true, bloom: level === 'low' ? 0.12 : 0.3, motionBlur: 0,
      afterimages: 0, shake: 0,
    }));
  }, quality);
  for (const [file, anchor, replacement] of [
    ['main.js', 'let race = createRace();', 'let race = createRace(); window.gameplay = { get race() { return race; } };'],
  ]) await context.route(url => url.pathname === `/src/${file}`, async route => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes(anchor)) throw new Error(`Missing capture hook in ${file}`);
    await route.fulfill({ response, body: source.replace(anchor, replacement) });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(server.resolvedUrls.local[0], { waitUntil: 'domcontentloaded' });
  await page.locator('#start-button').waitFor({ timeout: 90000 });
  await page.waitForFunction(() => document.body.dataset.phase === 'ready', { timeout: 90000 });
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#lobby-tracks-toggle').click();
  await page.locator('#track-chooser [data-track="tokyo"]').first().click();
  await page.locator('#track-choose-confirm').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'racing', { timeout: 90000 });
  if (errors.length) throw new Error('Browser error(s): ' + errors.join(' | '));
  return { context, page, errors };
}
try {
  await server.listen();
  browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
  const desktop = await gamePage({ width: 1280, height: 720 }, 'high');
  let index = 0;
  for (const [sectorIndex, section] of sections.entries()) {
    await probe(desktop.page, section.from + 90);
    await desktop.page.screenshot({ path: new URL(`sector-${sectorIndex + 1}-high.png`, out).pathname });
    for (let i = 0; i < 14; i++) {
      await probe(desktop.page, section.from + 95 + i * 26);
      await desktop.page.screenshot({ path: join(frames, `frame-${String(index++).padStart(3, '0')}.png`) });
    }
  }
  if (desktop.errors.length) throw new Error(desktop.errors.join(' | '));
  await desktop.context.close();

  const phone = await gamePage({ width: 844, height: 390 }, 'low');
  for (const [sectorIndex, section] of sections.entries()) {
    await probe(phone.page, section.from + 160);
    await phone.page.screenshot({ path: new URL(`sector-${sectorIndex + 1}-phone-low.png`, out).pathname });
  }
  if (phone.errors.length) throw new Error(phone.errors.join(' | '));
  await phone.context.close();

  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '7',
    '-i', join(frames, 'frame-%03d.png'), '-vf', 'fps=24,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '25', '-movflags', '+faststart',
    new URL('tokyo-hyperdrive-gameplay.mp4', out).pathname], { stdio: 'inherit' });
  console.log('Captured 4 actual gameplay screenshots and 1 MP4:', out.pathname);
} finally {
  if (browser) await browser.close();
  await server.close();
  rmSync(frames, { recursive: true, force: true });
}
