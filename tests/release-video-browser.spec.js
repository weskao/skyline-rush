import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// Attach the bundled clips to the current release (and, with `onHighlight`, to its first highlight) on the served build.
const CLIPS = 'whats-new/0.24.0/air-road-chain';
const VIDEO = {
  desktop: { src: { en: `${CLIPS}.desktop.en.mp4`, 'zh-TW': `${CLIPS}.desktop.zh-TW.mp4` }, poster: { en: `${CLIPS}.desktop.en.jpg`, 'zh-TW': `${CLIPS}.desktop.zh-TW.jpg` } },
  mobile: { src: { en: `${CLIPS}.mobile.en.mp4`, 'zh-TW': `${CLIPS}.mobile.zh-TW.mp4` }, poster: { en: `${CLIPS}.mobile.en.jpg`, 'zh-TW': `${CLIPS}.mobile.zh-TW.jpg` } },
};
async function openNotes(page, gameplayURL, onHighlight = false) {
  await page.route('**/src/release-notes.ts', async route => {
    const response = await route.fetch();
    const source = await response.text();
    if (!source.includes('export const CURRENT_RELEASE')) throw new Error('Missing CURRENT_RELEASE in release-notes.ts');
    await route.fulfill({ response, body: `${source}\nif (CURRENT_RELEASE) CURRENT_RELEASE.video = ${JSON.stringify(VIDEO)};${onHighlight ? ` CURRENT_RELEASE.highlights[0].video = ${JSON.stringify(VIDEO)};` : ''}\n` });
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
const noInlineVideo = page => expect(page.locator('#release-panel video')).toHaveCount(0);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the release clip waits behind a poster and play button, and plays enlarged on a click, in the reader\'s language', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const poster = page.locator('#release-video'), play = page.locator('#release-video-zoom');
    await expect(poster).toHaveAttribute('data-variant', 'desktop');
    await expect(poster).toHaveAttribute('data-source', new RegExp(`${CLIPS}\\.desktop\\.en\\.mp4$`));
    await expect(poster).toHaveAttribute('src', /desktop\.en\.jpg$/);
    await expect(play.locator('.release-play-badge svg')).toBeVisible(); // the badge tells readers it is a video
    await expect(play).toHaveAccessibleName('Play video');
    await expect(page.locator('#release-hero')).toBeHidden();
    await page.waitForTimeout(600);
    await noInlineVideo(page); // nothing autoplays when the notes open
    const box = await poster.boundingBox();
    expect(box.height).toBeLessThanOrEqual(302);
    expect(Math.abs(box.width / box.height - 1.6)).toBeLessThan(0.02); // the whole 16:10 still, uncropped
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(page.locator('#release-video')).toHaveAttribute('data-source', /desktop\.zh-TW\.mp4$/);
    await expect(play).toHaveAccessibleName('播放影片');
    await page.screenshot({ path: test.info().outputPath('release-video-desktop-zh-TW.png') });
    await play.click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toBeVisible();
    await expect(clip).toHaveAttribute('data-source', /desktop\.zh-TW\.mp4$/);
    await expect.poll(() => playing(clip)).toBe(true); // enlarged, it starts at once
    await page.keyboard.press('Escape');
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await noInlineVideo(page);
    expect(errors).toEqual([]);
  });

  test('the clip is downloaded once: reopening the notes, switching versions and reloading reuse it', async ({ page, gameplayURL }) => {
    const downloads = [];
    page.on('request', request => { if (request.url().endsWith(`${CLIPS}.desktop.en.mp4`)) downloads.push(request.url()); });
    await openNotes(page, gameplayURL);
    const watch = async () => {
      await page.locator('#release-video-zoom').click();
      const clip = page.locator('#release-media-viewer video');
      await expect(clip).toHaveAttribute('src', /^blob:/); // played from the kept copy, never streamed again
      await expect.poll(() => playing(clip)).toBe(true);
      await page.keyboard.press('Escape');
      await expect(page.locator('#release-media-viewer')).toBeHidden();
    };
    await expect.poll(() => downloads.length).toBe(1); // the notes fetch it ahead, once they open
    await watch();
    await page.locator('#release-continue').click();
    await page.locator('#whats-new-open').click();
    await page.getByRole('tab').nth(1).click();
    await page.getByRole('tab').first().click();
    await watch();
    expect(downloads).toHaveLength(1);
    await page.reload();
    if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
    await page.locator('#whats-new-open').click();
    await watch();
    expect(downloads).toHaveLength(1); // a later visit plays it from Cache Storage
  });

  test('reduced motion enlarges the clip as a still with controls and never autoplays', async ({ page, gameplayURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // A cached clip decodes its first frame (currentTime 1/30 s), so autoplay is judged by play events, not the clock.
    await page.addInitScript(() => { window.releaseClipPlays = 0; document.addEventListener('play', () => window.releaseClipPlays++, true); });
    await openNotes(page, gameplayURL);
    await expect(page.locator('#release-video')).toHaveAttribute('src', /desktop\.en\.jpg$/);
    await noInlineVideo(page);
    await page.locator('#release-video-zoom').click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    await expect(clip).toHaveAttribute('controls', '');
    await page.waitForTimeout(500);
    expect(await clip.evaluate(element => element.paused && window.releaseClipPlays === 0)).toBe(true);
  });

  test('a clip that fails to load closes the enlarged view and leaves the notes readable', async ({ page, gameplayURL }) => {
    await page.route(`**/${CLIPS}.desktop.en.mp4`, route => route.fulfill({ status: 404, body: '' }));
    const requested = page.waitForRequest(request => request.url().endsWith(`${CLIPS}.desktop.en.mp4`));
    const errors = await openNotes(page, gameplayURL);
    await requested;
    await page.locator('#release-video-zoom').click();
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await expect(page.locator('#whats-new-screen')).toBeVisible();
    await expect(page.locator('.release-entry').first()).toBeVisible();
    await page.locator('#release-continue').click();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('a highlight shows its video as a poster with a play button in the picture slot and plays it enlarged', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL, true);
    const play = page.locator('#release-items .release-play');
    const entry = page.locator('#release-items .release-entry').filter({ has: page.locator('.release-play') });
    const title = await entry.locator('strong').textContent();
    await expect(play.locator('img')).toHaveAttribute('src', /desktop\.en\.jpg$/);
    await expect(play.locator('.release-play-badge svg')).toBeVisible();
    await expect(play).toHaveAccessibleName(`Play video: ${title}`);
    await noInlineVideo(page);
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(play).toHaveAccessibleName(`播放影片：${await entry.locator('strong').textContent()}`);
    await play.click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toHaveAttribute('data-source', /desktop\.zh-TW\.mp4$/);
    await expect.poll(() => playing(clip)).toBe(true);
    await page.screenshot({ path: test.info().outputPath('release-highlight-video-enlarged.png') });
    await page.keyboard.press('Escape');
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await expect(play).toBeFocused();
    await noInlineVideo(page);
    expect(errors).toEqual([]);
  });
});

test.describe('phone portrait', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('a portrait phone shows the mobile poster without pushing the notes off screen and plays the mobile recording enlarged', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const poster = page.locator('#release-video');
    await expect(poster).toHaveAttribute('data-variant', 'mobile');
    await expect(poster).toHaveAttribute('data-source', /mobile\.en\.mp4$/);
    await noInlineVideo(page);
    const box = await poster.boundingBox();
    expect(box.height).toBeLessThanOrEqual(844 * 0.46 + 1);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(390);
    expect(Math.abs(box.width / box.height - 390 / 844)).toBeLessThan(0.02);
    await expect(page.locator('#release-continue')).toBeInViewport();
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(page.locator('#release-video')).toHaveAttribute('data-variant', 'desktop');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('#release-video')).toHaveAttribute('data-variant', 'mobile');
    await page.screenshot({ path: test.info().outputPath('release-video-phone-en.png') });
    await page.locator('#release-video-zoom').tap();
    const clip = page.locator('#release-media-viewer video');
    await expect.poll(() => playing(clip)).toBe(true);
    // The recording fills its frame: Playwright pads a small viewport with grey instead of scaling it.
    expect(await clip.evaluate(element => [element.videoWidth, element.videoHeight])).toEqual([390, 844]);
    await page.locator('#release-media-viewer').tap({ position: { x: 20, y: 200 } });
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await page.locator('#release-continue').tap();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors).toEqual([]);
  });
});
