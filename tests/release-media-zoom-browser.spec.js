import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { recentReleases } from '../src/release-notes.ts';

// Tapping a What's New picture or clip shows all of it, uncropped and on screen, on desktops, tablets and phones.
// Escape, the close button or a tap anywhere closes only the enlarged view and hands focus back.
const DEVICES = [['desktop', 1440, 900, false], ['tablet portrait', 820, 1180, true], ['tablet landscape', 1180, 820, true],
  ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true]];
// A two-frame 1×1 animated GIF (red, then blue, looping), served in place of a highlight image.
const GIF = Buffer.from('474946383961010001008000' + '00ff00000000ff' + '21ff0b4e45545343415045322e300301000000'
  + '21f904040a0000002c000000000100010000020244010021f904040a0000002c00000000010001000002024c0100' + '3b', 'hex');

async function openNotes(page, gameplayURL, patch = '') {
  if (patch) await page.route('**/src/release-notes.ts', async route => {
    const response = await route.fetch();
    await route.fulfill({ response, body: `${await response.text()}\nif (CURRENT_RELEASE) { ${patch} }\n` });
  });
  await page.route('**/whats-new/test/animated.gif', route => route.fulfill({ contentType: 'image/gif', body: GIF }));
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await page.goto(gameplayURL);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await page.locator('#whats-new-open').click();
  await expect(page.locator('#whats-new-screen')).toBeVisible();
  // Upcoming notes lead the tabs without pictures or a clip: read the newest release that has both.
  const [newest] = recentReleases(), media = recentReleases().find(release => release.video && release.highlights.some(item => item.image));
  if (!patch && media && media !== newest) await page.locator(`#whats-new-screen [role="tab"][data-version="${media.version}"]`).click();
  return errors;
}
const TOUCH = 44 - 0.01; // 44 px touch targets, give or take subpixel layout
const press = (locator, touch) => touch ? locator.tap() : locator.click();
const onScreen = (box, width, height) => box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 0.5 && box.y + box.height <= height + 0.5;
// The shown box keeps the media's own shape: nothing is cropped away.
const uncropped = (box, natural) => Math.abs(box.width / box.height - natural.width / natural.height) < 0.02;
const naturalSize = media => media.evaluate(el => el instanceof HTMLVideoElement ? { width: el.videoWidth, height: el.videoHeight } : { width: el.naturalWidth, height: el.naturalHeight });
const playing = video => video.evaluate(el => !el.paused && el.currentTime > 0);
// Records which layers of the enlarged view animate: the view itself and its dimmed backdrop.
const watchFades = page => page.evaluate(() => {
  window.viewerFades = [];
  const animate = Element.prototype.animate;
  Element.prototype.animate = function (keyframes, options) {
    if (this.id === 'release-media-viewer') window.viewerFades.push(options?.pseudoElement ?? 'view');
    return animate.call(this, keyframes, options);
  };
});
const fades = page => page.evaluate(() => window.viewerFades.splice(0));

for (const [device, width, height, touch] of DEVICES) test.describe(device, () => {
  test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });

  test('a highlight picture opens whole and on screen, and every way out closes only the enlarged view', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const thumb = page.locator('#release-items .release-zoom').first();
    await thumb.scrollIntoViewIfNeeded();
    const thumbBox = await thumb.boundingBox(), thumbSrc = await thumb.locator('img').getAttribute('src');
    const viewer = page.locator('#release-media-viewer'), shown = viewer.locator('img');
    await watchFades(page);
    await press(thumb, touch);
    await expect(viewer).toBeVisible();
    expect(await fades(page), 'the picture and its backdrop fade in').toEqual(['view', '::backdrop']);
    await expect(shown).toHaveAttribute('src', thumbSrc);
    await expect.poll(() => shown.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    const box = await shown.boundingBox();
    expect(onScreen(box, width, height), `the whole picture is on screen: ${JSON.stringify(box)}`).toBe(true);
    expect(uncropped(box, await naturalSize(shown)), 'shown uncropped').toBe(true);
    expect(box.width * box.height, 'larger than the thumbnail').toBeGreaterThan(thumbBox.width * thumbBox.height * 2);
    const close = viewer.locator('.release-viewer-close'), closeBox = await close.boundingBox();
    expect(onScreen(closeBox, width, height) && closeBox.width >= TOUCH && closeBox.height >= TOUCH, `close is a full touch target on screen: ${JSON.stringify(closeBox)}`).toBe(true);
    await page.screenshot({ path: test.info().outputPath(`release-zoom-image-${width}x${height}.png`) });

    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    expect(await fades(page), 'and fade out before closing').toEqual(['view', '::backdrop']);
    await expect(page.locator('#whats-new-screen'), 'Escape leaves the notes open').toBeVisible();
    await expect(thumb, 'focus returns to the picture').toBeFocused();
    await page.keyboard.press('Enter');
    await expect(viewer, 'the keyboard opens it too').toBeVisible();
    await press(close, touch);
    await expect(viewer).toBeHidden();
    await expect(thumb).toBeFocused();
    await press(thumb, touch);
    await expect(viewer).toBeVisible();
    await press(shown, touch);
    await expect(viewer, 'a tap on the picture closes it').toBeHidden();
    await expect(page.locator('#whats-new-screen')).toBeVisible();
    expect(errors).toEqual([]);
  });

  // The enlarged view, the notes panel behind it and the picture or clip that gets focus back never draw a focus ring.
  // A tap closes it on touch screens (as on iPhone) and Escape elsewhere; both leave the notes panel without a ring.
  test('no focus ring shows on the enlarged view, the notes panel or the button focus returns to', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL);
    const ring = locator => locator.evaluate(el => getComputedStyle(el).outlineStyle);
    const viewer = page.locator('#release-media-viewer'), panel = page.locator('#release-panel');
    const openers = [page.locator('#release-items .release-zoom').first()];
    if (height > 420) openers.push(page.locator('#release-video-zoom'));
    for (const opener of openers) {
      await opener.scrollIntoViewIfNeeded();
      await press(opener, touch);
      await expect(viewer).toBeVisible();
      expect(await ring(viewer), 'enlarged view').toBe('none');
      if (touch) await viewer.tap({ position: { x: 20, y: 200 } }); else await page.keyboard.press('Escape');
      await expect(viewer).toBeHidden();
      expect(await ring(opener), 'button that regains focus').toBe('none');
      await panel.focus();
      expect(await ring(panel), 'notes panel').toBe('none');
    }
  });

  // Chromium keeps matching :focus-visible for scripted focus after a key press, which is how iOS shows a ring after a tap.
  test('a ring appears for the keyboard only, on any dialog button', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL);
    const next = page.locator('#release-continue');
    const ring = () => next.evaluate(el => { el.focus(); return getComputedStyle(el).outlineStyle; });
    await page.keyboard.press('Shift');
    expect(await ring(), 'keyboard focus shows a ring').not.toBe('none');
    await page.evaluate(() => document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
    expect(await ring(), 'script focus after a tap shows none').toBe('none');
    await page.keyboard.press('Shift');
    expect(await ring(), 'the keyboard brings the ring back').not.toBe('none');
  });

  test('the release clip opens whole and playing, and the clip behind waits until it closes', async ({ page, gameplayURL }) => {
    const errors = await openNotes(page, gameplayURL);
    const hero = page.locator('#release-video'), zoom = page.locator('#release-video-zoom');
    if (height <= 420) {
      // Short landscape screens leave the clip out to fit the notes; no enlarge button is left behind.
      await expect(hero).toBeHidden();
      await expect(zoom).toBeHidden();
      return;
    }
    await expect.poll(() => playing(hero)).toBe(true);
    // Measure together: the notes entrance animation can move between browser round trips.
    const [zoomBox, heroBox, iconBox] = await zoom.evaluate(el =>
      [el, document.getElementById('release-video'), el.querySelector('svg')].map(node => node.getBoundingClientRect().toJSON()));
    expect(zoomBox.width >= TOUCH && zoomBox.height >= TOUCH, `enlarge is a full touch target: ${JSON.stringify(zoomBox)}`).toBe(true);
    expect(zoomBox.x >= heroBox.x && zoomBox.y >= heroBox.y && zoomBox.x + zoomBox.width <= heroBox.x + heroBox.width && zoomBox.y + zoomBox.height <= heroBox.y + heroBox.height, 'enlarge sits on the clip').toBe(true);
    // A drawn icon, not a font glyph: Android's fallback font pushed "⤢" toward the lower left of its circle.
    expect(Math.abs(iconBox.x + iconBox.width / 2 - (zoomBox.x + zoomBox.width / 2)) <= 0.5
      && Math.abs(iconBox.y + iconBox.height / 2 - (zoomBox.y + zoomBox.height / 2)) <= 0.5, `enlarge icon centred: ${JSON.stringify({ iconBox, zoomBox })}`).toBe(true);
    await watchFades(page);
    await press(zoom, touch);
    const viewer = page.locator('#release-media-viewer'), clip = viewer.locator('video');
    await expect(viewer).toBeVisible();
    expect(await fades(page), 'the clip and its backdrop fade in').toEqual(['view', '::backdrop']);
    await expect(clip).toHaveAttribute('data-source', await hero.getAttribute('data-source'));
    // The poster is a still from mid-clip: a playing clip shows nothing until its own first frame, then fades in.
    expect(await clip.getAttribute('poster'), 'no mid-clip still flashes before the first frame').toBeNull();
    await expect.poll(() => clip.evaluate(el => el.readyState >= 2 && getComputedStyle(el).opacity === '1')).toBe(true);
    expect(await clip.evaluate(el => el.muted && el.loop && el.playsInline)).toBe(true);
    await expect.poll(() => playing(clip)).toBe(true);
    await expect.poll(() => hero.evaluate(el => el.paused), 'only one clip plays').toBe(true);
    const box = await clip.boundingBox();
    expect(onScreen(box, width, height), `the whole clip is on screen: ${JSON.stringify(box)}`).toBe(true);
    expect(uncropped(box, await naturalSize(clip)), 'shown uncropped').toBe(true);
    await page.screenshot({ path: test.info().outputPath(`release-zoom-video-${width}x${height}.png`) });
    await page.keyboard.press('Escape');
    await expect(viewer).toBeHidden();
    expect(await fades(page), 'and fade out before closing').toEqual(['view', '::backdrop']);
    await expect(page.locator('#whats-new-screen')).toBeVisible();
    await expect(zoom).toBeFocused();
    await expect.poll(() => playing(hero), 'the clip behind plays again').toBe(true);
    expect(errors).toEqual([]);
  });
});

test.describe('hero picture and animated pictures', () => {
  for (const [device, width, height, touch] of [DEVICES[0], DEVICES[3]]) test(`${device}: the hero picture and an animated highlight open whole`, async ({ browser, gameplayURL }) => {
    const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
    const errors = await openNotes(page, gameplayURL, "CURRENT_RELEASE.video = null; CURRENT_RELEASE.image = 'whats-new/0.26.0/world-tour-scenery.webp'; CURRENT_RELEASE.highlights[0].image = 'whats-new/test/animated.gif';");
    const viewer = page.locator('#release-media-viewer'), shown = viewer.locator('img');
    const hero = page.locator('#release-hero-zoom');
    await press(hero, touch);
    await expect(shown).toHaveAttribute('src', await page.locator('#release-hero').getAttribute('src'));
    await expect.poll(() => shown.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    const box = await shown.boundingBox();
    expect(onScreen(box, width, height) && uncropped(box, await naturalSize(shown)), `hero picture whole and on screen: ${JSON.stringify(box)}`).toBe(true);
    await page.keyboard.press('Escape');
    await expect(hero).toBeFocused();
    const animated = page.locator('#release-items .release-zoom').filter({ has: page.locator('img[src$="animated.gif"]') });
    await animated.scrollIntoViewIfNeeded();
    await press(animated, touch);
    await expect(shown).toHaveAttribute('src', /animated\.gif$/);
    await expect.poll(() => shown.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    expect(onScreen(await shown.boundingBox(), width, height)).toBe(true);
    expect(errors).toEqual([]);
    await page.close();
  });
});

test.describe('reduced motion and languages', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('under reduced motion the enlarged clip waits with controls, and its controls never close it', async ({ page, gameplayURL }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = await openNotes(page, gameplayURL);
    await watchFades(page);
    await page.locator('#release-video-zoom').click();
    const clip = page.locator('#release-media-viewer video');
    await expect(clip).toBeVisible();
    expect(await clip.getAttribute('poster'), 'the still waits in place of the clip').toBeTruthy();
    await clip.evaluate(el => { window.zoomPlays = 0; el.addEventListener('play', () => window.zoomPlays++); });
    expect(await clip.evaluate(el => el.controls && el.paused && !el.autoplay)).toBe(true);
    await clip.click();
    await expect(page.locator('#release-media-viewer'), 'pressing the controls keeps it open').toBeVisible();
    await page.locator('#release-media-viewer .release-viewer-close').click();
    await expect(page.locator('#release-media-viewer')).toBeHidden();
    expect(await fades(page), 'nothing fades under reduced motion').toEqual([]);
    expect(errors).toEqual([]);
  });

  test('enlarge and close are named in the reader\'s language', async ({ page, gameplayURL }) => {
    await openNotes(page, gameplayURL);
    const thumb = page.locator('#release-items .release-zoom').first();
    const card = page.locator('#release-items .release-entry').filter({ has: page.locator('.release-zoom') }).first();
    const title = await card.locator('strong').textContent();
    await expect(thumb).toHaveAccessibleName(`Enlarge image: ${title}`);
    await expect(page.locator('#release-video-zoom')).toHaveAccessibleName('Enlarge video');
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    const zhTitle = await card.locator('strong').textContent();
    await expect(thumb).toHaveAccessibleName(`放大圖片：${zhTitle}`);
    await expect(page.locator('#release-video-zoom')).toHaveAccessibleName('放大影片');
    await thumb.click();
    await expect(page.locator('#release-media-viewer .release-viewer-close')).toHaveAccessibleName('關閉放大檢視');
  });
});
