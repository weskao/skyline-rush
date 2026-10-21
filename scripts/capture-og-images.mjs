// Captures the bilingual link-preview and README images from the real app (never from mocks).
//   node scripts/capture-og-images.mjs [og] [readme]   (default: both)
//   og     -> public/og-image.en.jpeg + public/og-image.zh-TW.jpeg (1440x900 start screen), then copies the English one to
//             public/og-image.jpeg, the single static og:image (crawlers cannot switch language)
//   readme -> artifacts/{readme-start,readme-hero,mobile-flight,race-results}{,.zh-TW}.jpeg (English, then zh-TW)
// The zh-TW run uses Playwright locale zh-TW, so the app's own system-language detection picks the language.
import { copyFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const root = fileURLToPath(new URL('../', import.meta.url));
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['og', 'readme'];
for (const target of targets) if (!['og', 'readme'].includes(target)) throw new Error(`Unknown target "${target}"; use og or readme.`);
const LOCALES = [['en', 'en-US'], ['zh-TW', 'zh-TW']];
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 390, height: 844 };

const server = await createServer({ root, server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] });

const open = async (locale, viewport, mobile = false) => {
  const context = await browser.newContext({ locale, viewport, hasTouch: mobile, isMobile: mobile });
  const page = await context.newPage();
  await page.goto(url);
  await page.locator('#start-button').waitFor();
  await page.locator('#intro').evaluate(el => Promise.all(el.getAnimations().map(a => a.finished)));
  // Where autoplay is blocked the music prompt appears after 600ms over the settings buttons.
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-yes').click();
  return page;
};
const shoot = async (page, path) => {
  await page.screenshot({ path, quality: 70, type: 'jpeg' });
  console.log(path);
};
const startRace = async page => {
  await page.locator('#start-button').click();
  await page.locator('#countdown').waitFor({ state: 'visible' });
  await page.locator('#countdown').waitFor({ state: 'hidden' });
};

try {
  await mkdir(new URL('artifacts/', `file://${root}`), { recursive: true });
  for (const [locale, system] of LOCALES) {
    const suffix = locale === 'en' ? 'en' : locale;
    const readme = name => `${root}artifacts/${name}${locale === 'en' ? '' : `.${locale}`}.jpeg`;
    if (targets.includes('og') || targets.includes('readme')) {
      const page = await open(system, DESKTOP);
      // The scrollable intro panel is a few px too short at 1440x900, so the footnote tip is cut mid-sentence; keep it out of the cover.
      await page.addStyleTag({ content: '.flight-tip { display: none }' });
      await page.locator('#settings-button').click();
      if (targets.includes('og')) await shoot(page, `${root}public/og-image.${suffix}.jpeg`);
      if (targets.includes('readme')) await shoot(page, readme('readme-start'));
      await page.context().close();
    }
    if (!targets.includes('readme')) continue;
    // In flight: hold W to speed, then hold Space once above the lift-off speed.
    const hero = await open(system, DESKTOP);
    await startRace(hero);
    await hero.keyboard.down('w');
    await hero.waitForFunction(() => Number(document.querySelector('#speed').textContent) > 170, null, { timeout: 60000 });
    await hero.keyboard.down(' ');
    await hero.waitForFunction(() => Number(document.querySelector('#altitude').textContent) > 3, null, { timeout: 30000 });
    await shoot(hero, readme('readme-hero'));
    await hero.context().close();

    // Phone: hold throttle on one pointer and fly on another, as the browser suite does.
    const phone = await open(system, PHONE, true);
    await startRace(phone);
    await phone.locator('[data-control="throttle"]').dispatchEvent('pointerdown', { pointerId: 1 });
    await phone.waitForFunction(() => Number(document.querySelector('#speed').textContent) > 150, null, { timeout: 60000 });
    await phone.locator('[data-control="fly"]').dispatchEvent('pointerdown', { pointerId: 2 });
    await phone.waitForFunction(() => Number(document.querySelector('#altitude').textContent) > 3, null, { timeout: 30000 });
    await shoot(phone, readme('mobile-flight'));
    await phone.context().close();

    // Results: drive the full 5 km sprint with W held (bounded by the race itself), then capture the results overlay.
    const results = await open(system, DESKTOP);
    await startRace(results);
    await results.keyboard.down('w');
    await results.locator('#result-stats').waitFor({ state: 'visible', timeout: 180000 });
    await results.waitForTimeout(1500); // let the result cards finish animating in
    await shoot(results, readme('race-results'));
    await results.context().close();
  }
} finally {
  await browser.close();
  await server.close();
}
if (targets.includes('og')) await copyFile(`${root}public/og-image.en.jpeg`, `${root}public/og-image.jpeg`);
