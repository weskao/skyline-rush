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
// Highlight clips never play inline; only the hero does.
const noInlineHighlightVideo = page => expect(page.locator('#release-items video')).toHaveCount(0);
const paused = video => video.evaluate(element => element.paused);
const time = video => video.evaluate(element => element.currentTime);

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('the release clip plays inline, muted and looping, as soon as the notes open, in the reader\'s language', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const video = page.locator('#release-video'), enlarge = page.locator('#release-video-zoom');
    await expect(video).toHaveJSProperty('tagName', 'VIDEO');
    await expect(video).toHaveAttribute('data-variant', 'desktop');
    await expect(video).toHaveAttribute('data-source', new RegExp(`${CLIPS}\\.desktop\\.en\\.mp4$`));
    await expect(video).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    await expect.poll(() => playing(video)).toBe(true); // no play button: it starts on its own
    expect(await video.evaluate(element => element.muted && element.loop && element.playsInline && !element.controls)).toBe(true);
    await expect(enlarge).toHaveAccessibleName('Enlarge video');
    await expect(enlarge.locator('svg')).toBeVisible();
    await expect(page.locator('#release-hero')).toBeHidden();
    const box = await video.boundingBox();
    expect(box.height).toBeLessThanOrEqual(302);
    expect(Math.abs(box.width / box.height - 1.6)).toBeLessThan(0.02); // the whole 16:10 clip, uncropped
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(video).toHaveAttribute('data-source', /desktop\.zh-TW\.mp4$/);
    await expect.poll(() => playing(video)).toBe(true);
    await expect(enlarge).toHaveAccessibleName('放大影片');
    await page.screenshot({ path: test.info().outputPath('release-video-desktop-zh-TW.png') });
    await enlarge.click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toBeVisible();
    await expect(clip).toHaveAttribute('data-source', /desktop\.zh-TW\.mp4$/);
    await expect.poll(() => playing(clip)).toBe(true);
    await expect.poll(() => paused(video), 'the inline hero waits while the clip is enlarged').toBe(true);
    await page.keyboard.press('Escape');
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await expect.poll(() => playing(video)).toBe(true); // and plays on once it closes
    expect(errors).toEqual([]);
  });

  test('the hero plays only while the notes are open and its version is shown', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL);
    const video = page.locator('#release-video');
    await expect.poll(() => playing(video)).toBe(true);
    const handle = await video.elementHandle();
    await page.getByRole('tab').nth(1).click();
    await expect.poll(() => handle.evaluate(element => element.paused || !element.isConnected)).toBe(true);
    await page.getByRole('tab').first().click();
    await expect.poll(() => playing(page.locator('#release-video'))).toBe(true);
    const again = await page.locator('#release-video').elementHandle();
    await page.locator('#release-continue').click();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(await again.evaluate(element => element.paused)).toBe(true);
    await page.locator('#whats-new-open').click();
    await expect.poll(() => playing(page.locator('#release-video'))).toBe(true);
  });

  test('the enlarged view continues from the hero\'s frame and hands its frame back on close', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL);
    const video = page.locator('#release-video'), clip = page.locator('#release-media-viewer video');
    await expect.poll(() => time(video)).toBeGreaterThan(1.2);
    await video.click(); // tapping the clip itself enlarges it too
    await expect(clip).toBeVisible();
    await expect.poll(() => playing(clip)).toBe(true);
    const heroTime = await time(video); // frozen at the hand-over
    expect(await paused(video)).toBe(true);
    expect(await time(clip), 'no restart: it carries on from the hero\'s frame').toBeGreaterThanOrEqual(heroTime - 0.1);
    expect(await time(clip)).toBeLessThan(heroTime + 0.5);
    await expect.poll(() => time(clip)).toBeGreaterThan(heroTime + 1);
    // CI RED #41520208780: comparing with a pre-Escape timestamp includes the
    // viewer's fade and slow-runner scheduling. Capture both clocks at close.
    await page.evaluate(() => {
      document.querySelector('#release-media-viewer').addEventListener('close', () => {
        const enlarged = document.querySelector('#release-media-viewer video')?.currentTime;
        queueMicrotask(() => { window.releaseHandoff = { enlarged, hero: document.querySelector('#release-video')?.currentTime }; });
      }, { once: true });
    });
    await page.keyboard.press('Escape');
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    const handoff = await page.evaluate(() => window.releaseHandoff);
    expect(handoff?.enlarged).toBeGreaterThan(heroTime + 1);
    expect(Math.abs(handoff.hero - handoff.enlarged), 'the hero resumes from the enlarged frame').toBeLessThan(0.1);
    await expect.poll(() => playing(video)).toBe(true);
  });

  test('a tap on the enlarged clip pauses and resumes it, a tap outside or the close button closes it', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL, true);
    const viewer = page.locator('#release-media-viewer'), clip = viewer.locator('video'), badge = viewer.locator('.release-play-badge');
    // Both the hero and the first highlight carry a clip here; check each one.
    for (const opener of [page.locator('#release-video-zoom'), page.locator('#release-items .release-play').first()]) {
      await opener.scrollIntoViewIfNeeded();
      await opener.click();
      await expect.poll(() => playing(clip)).toBe(true);
      await expect(badge).toHaveCount(0);
      await expect(clip).toHaveAccessibleName(/Pause video/);
      await clip.click();
      await expect.poll(() => paused(clip)).toBe(true);
      await expect(viewer, 'a tap on the clip never closes it').toBeVisible();
      await expect(badge, 'the paused frame shows the play badge').toBeVisible();
      await expect(clip).toHaveAccessibleName(/Resume video/);
      const frozen = await time(clip);
      await page.waitForTimeout(400);
      expect(await time(clip)).toBe(frozen);
      await clip.click();
      await expect.poll(() => playing(clip)).toBe(true);
      await expect(badge).toHaveCount(0);
      await expect(clip, 'the keyboard lands on the clip').toBeFocused();
      await page.keyboard.press('Space');
      await expect.poll(() => paused(clip)).toBe(true);
      await page.keyboard.press('Enter');
      await expect.poll(() => playing(clip)).toBe(true);
      await page.keyboard.press('Space');
      await expect.poll(() => paused(clip)).toBe(true);
      await viewer.click({ position: { x: 5, y: 200 } }); // outside the clip
      await expect(viewer).toBeHidden();
      await expect(page.locator('#whats-new-screen')).toBeVisible();
    }
    await page.locator('#release-video-zoom').click();
    await viewer.locator('.release-viewer-close').click();
    await expect(viewer).toBeHidden();
    await page.locator('#release-items .release-play').first().click();
    await expect.poll(() => time(clip)).toBeLessThan(1.5); // a highlight has no inline playback: it starts at 0
  });

  test('the pointer shows what a click does', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL, true);
    const cursor = locator => locator.evaluate(element => getComputedStyle(element).cursor);
    const viewer = page.locator('#release-media-viewer');
    expect(await cursor(page.locator('#release-video'))).toBe('zoom-in');
    expect(await cursor(page.locator('#release-video-zoom'))).toBe('pointer');
    expect(await cursor(page.locator('#release-items .release-play').first())).toBe('pointer'); // a play action
    expect(await cursor(page.locator('#release-items .release-zoom:not(.release-play)').first())).toBe('zoom-in');
    await page.locator('#release-video-zoom').click();
    await expect.poll(() => playing(viewer.locator('video'))).toBe(true);
    expect(await cursor(viewer.locator('video'))).toBe('pointer'); // a tap pauses
    expect(await cursor(viewer)).toBe('zoom-out'); // a tap on the backdrop closes
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    await page.locator('#release-items .release-zoom:not(.release-play)').first().click();
    expect(await cursor(viewer.locator('img'))).toBe('zoom-out'); // pictures close on any tap
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

  test('reduced motion keeps the hero on its poster with controls and never autoplays', async ({ page, gameplayURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    // A cached clip decodes its first frame (currentTime 1/30 s), so autoplay is judged by play events, not the clock.
    await page.addInitScript(() => { window.releaseClipPlays = 0; document.addEventListener('play', () => window.releaseClipPlays++, true); });
    await openNotes(page, gameplayURL);
    const video = page.locator('#release-video');
    await expect(video).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    await expect(video).toHaveAttribute('controls', '');
    await page.waitForTimeout(600);
    expect(await video.evaluate(element => element.paused && window.releaseClipPlays === 0)).toBe(true);
    await page.locator('#release-video-zoom').click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toHaveAttribute('poster', /desktop\.en\.jpg$/);
    await expect(clip).toHaveAttribute('controls', '');
    await page.waitForTimeout(500);
    expect(await clip.evaluate(element => element.paused && window.releaseClipPlays === 0)).toBe(true);
  });

  test('a clip that fails to load leaves the hero\'s fallback and the notes readable, and a failing enlarged clip closes', async ({ page, gameplayURL }) => {
    await page.route(`**/${CLIPS}.desktop.en.mp4`, route => route.fulfill({ status: 404, body: '' }));
    const requested = page.waitForRequest(request => request.url().endsWith(`${CLIPS}.desktop.en.mp4`));
    const errors = await openNotes(page, gameplayURL, true);
    await requested;
    await expect(page.locator('#release-video'), 'the broken hero clip is dropped').toHaveCount(0);
    await expect(page.locator('#release-video-zoom')).toHaveCount(0);
    await expect(page.locator('.release-entry').first()).toBeVisible();
    await page.locator('#release-items .release-play').first().click(); // the highlight's poster still shows, its clip is the same missing file
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await expect(page.locator('#whats-new-screen')).toBeVisible();
    await page.locator('#release-continue').click();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors.filter(error => !/Failed to load resource/.test(error))).toEqual([]);
  });

  test('a highlight shows its video as a poster with a play button in the picture slot and plays it enlarged', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL, true);
    // The injected clip sits on the first highlight; real notes may give other highlights clips too.
    const entry = page.locator('#release-items .release-entry').filter({ has: page.locator('.release-play') }).first();
    const play = entry.locator('.release-play');
    const title = await entry.locator('strong').textContent();
    await expect(play.locator('img')).toHaveAttribute('src', /desktop\.en\.jpg$/);
    await expect(play.locator('.release-play-badge svg')).toBeVisible();
    await expect(play).toHaveAccessibleName(`Play video: ${title}`);
    await noInlineHighlightVideo(page);
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
    await noInlineHighlightVideo(page);
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
    await expect.poll(() => playing(poster)).toBe(true); // autoplays inline on a phone too
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
    await page.locator('#release-media-viewer').tap({ position: { x: 5, y: 200 } }); // outside the clip
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    await page.locator('#release-continue').tap();
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    expect(errors).toEqual([]);
  });
});
