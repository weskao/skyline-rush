// Captures the Garage home screen (bigger car, pose buttons, camera views) for a What's New highlight from the real game.
//   node scripts/record-whats-new-garage-home.mjs <theme-slug>
// Writes public/whats-new/<slug>/garage-home.{en,zh-TW}.jpg at 960x600, one per language (the buttons carry text).
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const slug = process.argv[2];
if (!/^[a-z0-9-]+$/.test(slug ?? '')) throw new Error('Usage: record-whats-new-garage-home.mjs <theme-slug>');
const root = fileURLToPath(new URL('../', import.meta.url));
const outDir = `${root}public/whats-new/${slug}/`;
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];

const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

try {
  await mkdir(outDir, { recursive: true });
  for (const [locale, system] of LOCALES) {
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
    await page.locator('#garage-button').click();
    await page.locator('#garage-wing').waitFor();
    await page.waitForTimeout(2500); // the showroom car settles
    await page.addStyleTag({ content: '#whats-new-open { visibility: hidden !important; }' }); // the build number changes at release
    await page.screenshot({ path: `${outDir}garage-home.${locale}.jpg`, type: 'jpeg', quality: 90 });
    await context.close();
    console.log(`${outDir}garage-home.${locale}.jpg`);
  }
} finally {
  await browser.close();
  await server.close();
}
