import { test, expect } from './helpers/test.js';
import { QUALITY_STORAGE_KEY } from '../src/device-quality.ts';

test.use({ startupSeen: false });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!location.origin.startsWith('http')) return;
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-sound', 'off');
  });
});
const enter = page => page.getByRole('button', { name: 'Enter game', exact: true });

test('paints before scripts, waits for a rendered frame and enters the lobby via keyboard', async ({ page }) => {
  await page.addInitScript(() => {
    const requestFrame = window.requestAnimationFrame.bind(window);
    const queued = [];
    window.requestAnimationFrame = callback => queued.push(callback);
    window.releaseStartupFrames = () => {
      window.requestAnimationFrame = requestFrame;
      queued.forEach(requestFrame);
    };
  });
  let unblock;
  const blocked = new Promise(resolve => { unblock = resolve; });
  await page.route('**/assets/*.js', async route => { await blocked; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  try {
    await expect(page.getByRole('heading', { name: 'Skyline Rush', exact: true })).toBeVisible();
    await expect(page.getByText('Loading game', { exact: true })).toBeVisible();
    await expect(enter(page)).toBeHidden();
  } finally {
    unblock();
  }
  await expect(page.locator('#startup')).toHaveAttribute('data-stage', '2');
  await expect(enter(page)).toBeHidden();
  await page.evaluate(() => window.releaseStartupFrames());
  await expect(enter(page)).toBeEnabled();
  await enter(page).press('Enter');
  await expect(page.locator('#startup')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Start race', exact: true })).toBeEnabled();
  await expect(page.locator('#race-status')).not.toHaveText('RACING');
  // A new page load covers the half-built lobby again instead of revealing it.
  await page.reload();
  await expect(page.locator('#startup')).toBeVisible();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await page.evaluate(() => window.releaseStartupFrames());
  await expect(enter(page)).toBeEnabled();
});

test('renderer failure replaces progress with a retry action', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      return type.startsWith('webgl') ? null : getContext.call(this, type, ...args);
    };
  });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
  await expect(enter(page)).toBeHidden();
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
});

test('keeps localised text and touch targets in bounds through rotation and fold', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-locale', 'zh-TW'));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const button = page.getByRole('button', { name: '進入遊戲', exact: true });
  await expect(button).toBeVisible();
  const heading = page.locator('#startup-title');
  const subtitle = page.getByText('駛出公路，飛向天際', { exact: true });
  const art = page.locator('#startup picture img');
  for (const [width, height, asset, showSubtitle] of [
    [320, 568, 'portrait', true], [390, 844, 'portrait', true], [844, 390, 'wide', false],
    [345, 206, 'wide', false], [768, 1024, 'square', true], [1024, 768, 'square', true],
    [1440, 900, 'wide', true], [1920, 1080, 'wide', true],
  ]) {
    await page.setViewportSize({ width, height });
    await expect.poll(() => art.evaluate(img => img.currentSrc)).toContain('startup-' + asset);
    expect(await subtitle.isVisible()).toBe(showSubtitle);
    const titleBox = await heading.boundingBox();
    const buttonBox = await button.boundingBox();
    for (const box of [titleBox, buttonBox]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    }
    expect(buttonBox.height).toBeGreaterThanOrEqual(44);
    expect(titleBox.y + titleBox.height).toBeLessThan(buttonBox.y);
  }
  await page.setViewportSize({ width: 900, height: 700 });
  await page.evaluate(() => {
    Object.defineProperty(window, 'viewport', { configurable: true, value: { segments: [
      { left: 0, top: 0, width: 438, height: 700 },
      { left: 462, top: 0, width: 438, height: 700 },
    ] } });
    window.dispatchEvent(new Event('resize'));
  });
  await expect.poll(() => button.boundingBox().then(b => b.x + b.width)).toBeLessThanOrEqual(438);
  await button.click();
  await expect(page.locator('#startup')).toBeHidden();
});

test('scales decorative particles with existing graphics quality and reduced motion', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('test-initial-quality')) return;
    sessionStorage.setItem('test-initial-quality', '1');
    localStorage.setItem(key, JSON.stringify({ quality: 'high', enabled: true }));
  }, QUALITY_STORAGE_KEY);
  await page.goto('/');
  await expect(enter(page)).toBeVisible();
  const motes = page.locator('.startup-motes > i:visible');
  await expect(motes).toHaveCount(7);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(motes).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [tier, count] of [['medium', 3], ['low', 0]]) {
    await page.evaluate(([key, quality]) => localStorage.setItem(key, JSON.stringify({ quality, enabled: true })), [QUALITY_STORAGE_KEY, tier]);
    await page.reload();
    await expect(enter(page)).toBeVisible();
    await expect(motes).toHaveCount(count);
  }
});

test('a context loss during entry keeps the retry screen visible and the lobby inert', async ({ page }) => {
  await page.goto('/');
  await expect(enter(page)).toBeVisible();
  await enter(page).evaluate(button => {
    button.addEventListener('click', () => {
      document.querySelector('#world').dispatchEvent(new Event('webglcontextlost', { cancelable: true }));
    }, { once: true });
  });
  await enter(page).press('Enter');
  const retry = page.getByRole('button', { name: 'Retry', exact: true });
  await expect(retry).toBeVisible();
  await page.waitForFunction(() => document.getAnimations().every(animation => animation.effect?.target?.id !== 'startup'));
  await expect(retry).toBeVisible();
  await expect(page.locator('#startup')).toHaveCSS('opacity', '1');
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
});
