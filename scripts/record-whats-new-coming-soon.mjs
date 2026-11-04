// Captures the Coming Soon track sheet for a What's New highlight from the real Home screen (never a mock-up).
//   node scripts/record-whats-new-coming-soon.mjs <theme-slug>
// Writes public/whats-new/<slug>/<slug>.{en,zh-TW}.jpg: the six Coming Soon cards, each selected so its live 3D showroom
// shows behind the disabled COMING SOON button, tiled 3x2. One sheet per language (the cards and button carry text).
import { execFileSync } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

const slug = process.argv[2];
if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('Usage: record-whats-new-coming-soon.mjs <theme-slug>');
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${slug}/`, rawDir = `${root}artifacts/whats-new-raw/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];

const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

async function sheet(locale, system) {
  const context = await browser.newContext({ locale: system, viewport: { width: 960, height: 600 } });
  await context.addInitScript(() => {
    localStorage.setItem('skyline-rush-guide-seen', '1');
    localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0');
  });
  const page = await context.newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.locator('#start-button').waitFor();
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.addStyleTag({ content: '#whats-new-open { visibility: hidden !important; }' }); // the build number changes at release
  for (const [i, id] of Object.keys(UPCOMING_TRACKS).entries()) {
    await page.locator(`[data-upcoming-track="${id}"]`).click();
    await page.waitForTimeout(2500); // the live showroom builds, then settles
    await page.screenshot({ path: `${rawDir}${i}.png` });
  }
  await context.close();
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '1', '-i', `${rawDir}%d.png`, '-frames:v', '1',
    '-vf', 'scale=640:-2,tile=3x2', '-q:v', '2', `${outDir}${slug}.${locale}.jpg`]);
  console.log(`${outDir}${slug}.${locale}.jpg`);
}

try {
  await mkdir(outDir, { recursive: true });
  await mkdir(rawDir, { recursive: true });
  for (const [locale, system] of LOCALES) await sheet(locale, system);
} finally {
  await browser.close();
  await server.close();
  await rm(rawDir, { recursive: true, force: true });
}
