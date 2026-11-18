import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// A dialog that fades out closes on an async history pop (src/dialog-navigation.ts). Its exit animation must hold the
// last frame until the dialog really closes, or it repaints at full opacity over whatever it covered: a flash on close.
// See .claude/rules/dialog-exit-animation.md.
const DEVICES = [['desktop', 1440, 900, false], ['phone portrait', 390, 844, true], ['phone landscape', 844, 390, true]];

// Records each dialog's painted opacity at the moment it closes, and every frame that paints it back after it faded out.
const watchExit = (page, selector, backdrop) => page.evaluate(([selector, backdrop]) => {
  const view = document.querySelector(selector), opacity = () => Math.max(+getComputedStyle(view).opacity, backdrop ? +getComputedStyle(view, '::backdrop').opacity : 0);
  const exit = window.dialogExit = { atClose: null, flashes: 0 };
  let faded = false;
  const close = HTMLDialogElement.prototype.close;
  HTMLDialogElement.prototype.close = function () {
    if (this === view) exit.atClose = opacity();
    return close.call(this);
  };
  const frame = () => {
    if (!view.open) return;
    if (opacity() <= 0.05) faded = true; else if (faded) exit.flashes++;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}, [selector, backdrop]);
const exit = page => page.evaluate(() => window.dialogExit);
// The entrance fade starts transparent too: only watch once it has settled.
const settled = dialog => expect.poll(() => dialog.evaluate(view => view.getAnimations().length === 0 && +getComputedStyle(view).opacity)).toBe(1);

async function home(page, gameplayURL) {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-guide-seen', '1'));
  await page.goto(gameplayURL);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
}

for (const [device, width, height, touch] of DEVICES) test.describe(device, () => {
  test.use({ viewport: { width, height }, hasTouch: touch, isMobile: touch });
  const press = locator => touch ? locator.tap() : locator.click();

  test('an enlarged What\'s New picture stays faded out until it closes', async ({ page, gameplayURL }) => {
    await home(page, gameplayURL);
    const notes = page.locator('#whats-new-screen'), viewer = page.locator('#release-media-viewer');
    if (!(await notes.isVisible())) await page.locator('#whats-new-open').click();
    const thumb = page.locator('#whats-new-screen .release-zoom:visible, #release-preview:visible').first();
    await thumb.scrollIntoViewIfNeeded();
    await press(thumb);
    await expect(viewer).toBeVisible();
    await settled(viewer);
    await watchExit(page, '#release-media-viewer', true);
    await press(viewer.locator('.release-viewer-close'));
    await expect(viewer).toBeHidden();
    expect(await exit(page), 'the view and its backdrop are still transparent when the dialog closes').toEqual({ atClose: 0, flashes: 0 });
    await press(thumb);
    await expect(viewer, 'and it opens again').toBeVisible();
    await settled(viewer);
  });

  test('the History dialog stays faded out until it closes', async ({ page, gameplayURL }) => {
    await page.addInitScript(() => localStorage.setItem('skyline-rush-whats-new-seen-v1', '999.0.0'));
    await home(page, gameplayURL);
    const history = page.locator('#history-screen'), opener = page.locator('[data-open-history]:visible').first();
    await press(opener);
    await expect(history).toBeVisible();
    await settled(history);
    await watchExit(page, '#history-screen', false);
    await press(page.locator('#history-close'));
    await expect(history).toBeHidden();
    expect(await exit(page), 'still transparent when the dialog closes').toEqual({ atClose: 0, flashes: 0 });
    await press(opener);
    await expect(history, 'and it opens again').toBeVisible();
    await settled(history);
  });
});
