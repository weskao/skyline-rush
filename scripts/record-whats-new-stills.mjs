// Captures What's New stills from the real game (never a mock-up).
//   node scripts/record-whats-new-stills.mjs [results-cloud|ring-lanes|minimap-arrow|race-screen|garage-lighting
//     |garage-inspect|setting-toasts|lobby|race-stopwatch]
// Writes public/whats-new/{results-cloud,ring-lanes,minimap-arrow,race-screen,garage-lighting}/*.{en,zh-TW}.jpg and
// public/whats-new/{garage-inspect,setting-toasts,lobby,race-stopwatch}/*.{en,zh-TW}.webp (cwebp -q 85).
import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const only = process.argv[2] ?? '';
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const HIDE_VERSION = '#whats-new-open { visibility: hidden !important; }';
const want = name => !only || only === name;

// The dev server defaults to the Garage `trial` build; players get `coming-soon`, so shoot that one.
process.env.GARAGE_VFX_RELEASE_MODE = 'coming-soon';
const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

async function openPage({ locale: _locale, system, width, height, mobile, unlocked }) {
  const context = await browser.newContext({
    locale: system, viewport: { width, height }, hasTouch: mobile, isMobile: mobile,
  });
  await context.addInitScript(ids => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
    if (ids) localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids));
  }, unlocked);
  const page = await context.newPage();
  await page.route('**/src/main.js', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const anchor = 'let race = createRace();';
    if (!source.includes(anchor)) throw new Error('Missing race anchor in main.js');
    await route.fulfill({
      response,
      body: source.replace(anchor, `${anchor} window.gameplay = { get race() { return race; } };`),
    });
  });
  await page.goto(url);
  await page.locator('#startup-enter').click();
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.addStyleTag({ content: HIDE_VERSION });
  if (await page.locator('[data-wave3-wallet]').count()) throw new Error('Trial-only wallet chips are showing: the server is not on the coming-soon Garage build');
  return { context, page };
}

async function startRace(page) {
  await page.locator('#start-button').click();
  await page.locator('#countdown').waitFor({ state: 'hidden', timeout: 20000 });
}

async function shoot(page, path) {
  await mkdir(new URL('.', `file://${path}`).pathname, { recursive: true });
  await page.screenshot({ path, type: 'jpeg', quality: 90 });
  console.log(path);
}

// Screenshot PNG -> .webp at q85 (the format of the highlight images).
async function shootWebp(page, path) {
  await mkdir(new URL('.', `file://${path}`).pathname, { recursive: true });
  const png = path.replace(/\.webp$/, '.png');
  await page.screenshot({ path: png, type: 'png' });
  execFileSync('/opt/homebrew/bin/cwebp', ['-quiet', '-q', '85', png, '-o', path]);
  await rm(png);
  console.log(path);
}

try {
  for (const [locale, system] of LOCALES) {
    if (want('results-cloud')) {
      // 1440×900 so the cloud status line sits on-screen with the results headline.
      const { context, page } = await openPage({ locale, system, width: 1440, height: 900, mobile: false });
      await startRace(page);
      await page.evaluate(() => {
        const race = window.gameplay.race;
        race.elapsed = 80;
        Object.assign(race.player, { distance: race.length - 10, speed: 60 });
      });
      await page.locator('#again-button').waitFor({ timeout: 20000 });
      const cloud = page.locator('#result-cloud');
      await cloud.waitFor({ state: 'visible' });
      await cloud.scrollIntoViewIfNeeded();
      await page.waitForTimeout(900);
      await shoot(page, `${root}public/whats-new/results-cloud/results-cloud.${locale}.jpg`);
      await context.close();
    }

    if (want('garage-lighting')) {
      const { context, page } = await openPage({ locale, system, width: 1440, height: 900, mobile: false });
      await page.locator('#garage-button').click();
      await page.locator('#garage-wing').waitFor();
      await page.locator('#garage-lighting').click();
      await page.locator('#garage-lighting').waitFor({ state: 'visible' });
      await page.waitForFunction(() => document.querySelector('#garage-lighting')?.getAttribute('aria-pressed') === 'true');
      await page.addStyleTag({
        content: [
          '.garage-collection { display: none !important; }',
          '.garage-layout { grid-template-columns: 1fr !important; }',
          '#garage-studio-open { visibility: hidden !important; }',
          '#whats-new-open { visibility: hidden !important; }',
        ].join('\n'),
      });
      await page.waitForTimeout(1600);
      await shoot(page, `${root}public/whats-new/garage-lighting/garage-night.${locale}.jpg`);
      await context.close();
    }

    if (want('garage-inspect')) {
      const { context, page } = await openPage({ locale, system, width: 960, height: 600, mobile: false });
      await page.locator('#garage-button').click();
      await page.locator('#garage-studio-open').click();
      await page.locator('[data-garage-section="paints"]').click();
      await page.waitForFunction(() => document.querySelector('#garage-angle-name')?.getAttribute('data-angle') === 'side');
      await page.waitForTimeout(1600);
      await shootWebp(page, `${root}public/whats-new/garage-inspect/inspect.${locale}.webp`);
      await context.close();
    }

    if (want('setting-toasts')) {
      const { context, page } = await openPage({ locale, system, width: 960, height: 600, mobile: false });
      await page.keyboard.press('m');
      await page.waitForTimeout(500); // the toast lives 1.8 s; let its entry settle
      await shootWebp(page, `${root}public/whats-new/setting-toasts/toast.${locale}.webp`);
      await context.close();
    }

    if (want('lobby')) {
      // A returning player who has opened the first tracks, as the picture has always shown.
      const unlocked = ['coast', 'neon', 'canyon', 'aurora', 'spiral'];
      const { context, page } = await openPage({ locale, system, width: 960, height: 600, mobile: false, unlocked });
      await page.locator('#lobby-tracks-toggle').click();
      await page.locator('#track-chooser').waitFor({ state: 'visible' });
      await page.waitForTimeout(900);
      await shootWebp(page, `${root}public/whats-new/lobby/track-rail.${locale}.webp`);
      await context.close();
    }

    if (want('race-stopwatch')) {
      const { context, page } = await openPage({ locale, system, width: 960, height: 600, mobile: false });
      await startRace(page);
      await page.keyboard.down('ArrowUp');
      // Past 8 s, at speed, with no crash shield and no car alongside: the clock and HUD are all that fill the view.
      await page.waitForFunction(() => {
        const { elapsed, player: p, traffic, rivals } = window.gameplay.race;
        const clear = [...traffic, ...rivals].every(c => Math.abs(c.distance - p.distance) > 9 || Math.abs(c.x - p.x) > 6);
        return elapsed > 8 && p.speed > 30 && p.cooldown === 0 && clear;
      }, null, { timeout: 60000, polling: 'raf' });
      await shootWebp(page, `${root}public/whats-new/race-stopwatch/stopwatch.${locale}.webp`);
      await context.close();
    }

    if (want('ring-lanes') || want('minimap-arrow')) {
      const { context, page } = await openPage({ locale, system, width: 960, height: 600, mobile: false });
      await startRace(page);
      await page.keyboard.down('ArrowUp');
      await page.waitForFunction(() => {
        const race = window.gameplay.race;
        if (!race || race.phase !== 'racing') return false;
        const ahead = (race.rings ?? []).filter(r =>
          !r.hit && !('spin' in r) && r.radius > 3
          && r.distance > race.player.distance + 18
          && r.distance < race.player.distance + 85);
        if (ahead.length < 3) return false;
        const xs = ahead.map(r => r.x);
        return Math.min(...xs) <= -2.5 && Math.max(...xs) >= 2.5;
      }, null, { timeout: 50000 });
      await page.waitForTimeout(180);
      if (want('ring-lanes')) await shoot(page, `${root}public/whats-new/ring-lanes/ring-lanes.${locale}.jpg`);
      if (want('minimap-arrow')) await shoot(page, `${root}public/whats-new/minimap-arrow/minimap-arrow.${locale}.jpg`);
      await context.close();
    }

    if (want('race-screen')) {
      const { context, page } = await openPage({ locale, system, width: 390, height: 844, mobile: true });
      await startRace(page);
      await page.locator('[data-control="throttle"]').dispatchEvent('pointerdown', { pointerId: 1 });
      await page.waitForFunction(() => Number(document.querySelector('#speed')?.textContent) > 120, null, { timeout: 30000 });
      await page.waitForTimeout(600);
      await shoot(page, `${root}public/whats-new/race-screen/race-screen.${locale}.jpg`);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await server.close();
}
