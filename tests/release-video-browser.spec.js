import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// No shipped entry carries a video yet: attach the bundled clips to the current release on the dev server.
const CLIPS = 'whats-new/0.24.0/air-road-chain';
const VIDEO = {
  desktop: { src: { en: `${CLIPS}.desktop.en.mp4`, 'zh-TW': `${CLIPS}.desktop.zh-TW.mp4` }, poster: { en: `${CLIPS}.desktop.en.jpg`, 'zh-TW': `${CLIPS}.desktop.zh-TW.jpg` } },
  mobile: { src: { en: `${CLIPS}.mobile.en.mp4`, 'zh-TW': `${CLIPS}.mobile.zh-TW.mp4` }, poster: { en: `${CLIPS}.mobile.en.jpg`, 'zh-TW': `${CLIPS}.mobile.zh-TW.jpg` } },
};
async function openNotes(page, gameplayURL) {
  await page.route('**/src/release-notes.ts', async route => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes('export const CURRENT_RELEASE')) throw new Error('Missing CURRENT_RELEASE in release-notes.ts');
    await route.fulfill({ response, body: `${source}\nif (CURRENT_RELEASE) CURRENT_RELEASE.video = ${JSON.stringify(VIDEO)};\n` });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(gameplayURL);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#whats-new-open').click();
  await expect(page.locator('#whats-new-screen')).toBeVisible();
  return errors;
}
const playing = video => video.evaluate(element => !element.paused && element.currentTime > 0);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the release clip plays muted inline only while the notes are open, in the reader\'s language', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const video = page.locator('#release-video');
    await expect(video).toHaveAttribute('data-variant', 'desktop');
    await expect(video).toHaveAttribute('src', new RegExp(`${CLIPS}\\.desktop\\.en\\.mp4$`));
    await expect(video).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    expect(await video.evaluate(element => element.muted && element.loop && element.playsInline)).toBe(true);
    await expect.poll(() => playing(video)).toBe(true);
    await expect(page.locator('#release-hero')).toBeHidden();
    const box = await video.boundingBox();
    expect(box.height).toBeLessThanOrEqual(302);
    expect(Math.abs(box.width / box.height - 1.6)).toBeLessThan(0.02); // the whole 16:10 clip, uncropped
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(page.locator('#release-video')).toHaveAttribute('src', /desktop\.zh-TW\.mp4$/);
    await expect.poll(() => playing(page.locator('#release-video'))).toBe(true);
    await page.screenshot({ path: test.info().outputPath('release-video-desktop-zh-TW.png') });
    const clip = await page.locator('#release-video').elementHandle();
    await page.locator('#release-continue').click();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    await expect.poll(() => clip.evaluate(element => element.paused)).toBe(true); // 'close' is dispatched in a later task
    expect(errors).toEqual([]);
  });

  test('reduced motion shows the still with controls and never autoplays', async ({ page, gameplayURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openNotes(page, gameplayURL);
    const video = page.locator('#release-video');
    await expect(video).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    await expect(video).toHaveAttribute('controls', '');
    await page.waitForTimeout(500);
    expect(await video.evaluate(element => element.paused && element.currentTime === 0)).toBe(true);
  });

  test('a clip that fails to load leaves the notes readable', async ({ page, gameplayURL }) => {
    await page.route(`**/${CLIPS}.desktop.en.mp4`, route => route.fulfill({ status: 404, body: '' }));
    const requested = page.waitForRequest(request => request.url().endsWith(`${CLIPS}.desktop.en.mp4`));
    const errors = await openNotes(page, gameplayURL);
    await requested;
    await expect(page.locator('#release-video')).toHaveCount(0);
    await expect(page.locator('.release-entry').first()).toBeVisible();
    await page.locator('#release-continue').click();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors).toEqual([]);
  });
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('a portrait phone plays the mobile recording without pushing the notes off screen', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const video = page.locator('#release-video');
    await expect(video).toHaveAttribute('data-variant', 'mobile');
    await expect(video).toHaveAttribute('src', /mobile\.en\.mp4$/);
    await expect.poll(() => playing(video)).toBe(true);
    const box = await video.boundingBox();
    expect(box.height).toBeLessThanOrEqual(844 * 0.46 + 1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(Math.abs(box.width / box.height - 390 / 844)).toBeLessThan(0.02);
    // The recording fills its frame: Playwright pads a small viewport with grey instead of scaling it.
    expect(await video.evaluate(element => [element.videoWidth, element.videoHeight])).toEqual([390, 844]);
    await expect(page.locator('#release-continue')).toBeInViewport();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#release-video')).toHaveAttribute('data-variant', 'desktop');
    await expect.poll(() => playing(page.locator('#release-video'))).toBe(true);
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#release-video')).toHaveAttribute('data-variant', 'mobile');
    await page.waitForTimeout(2500); // mid-flight frame for the review screenshot
    await page.screenshot({ path: test.info().outputPath('release-video-phone-en.png') });
    await page.locator('#release-continue').tap();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors).toEqual([]);
  });
});
