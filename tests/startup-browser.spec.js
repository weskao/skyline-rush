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

test('saved Chinese appears before the startup module can load', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-locale', 'zh-TW'));
  await page.route('**/assets/*.js', route => route.abort());
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-TW');
  await expect(page.getByText('載入遊戲', { exact: true })).toBeVisible();
  await expect(page.getByText('駛出公路，飛向天際', { exact: true })).toBeVisible();
  await expect(page.getByText('Loading game', { exact: true })).toBeHidden();
});

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
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/main-*.js', async route => { await blocked; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  const button = page.getByRole('button', { name: '進入遊戲', exact: true });
  const progress = page.locator('#startup-progress');
  const heading = page.locator('#startup-title');
  const subtitle = page.getByText('駛出公路，飛向天際', { exact: true });
  const art = page.locator('#startup picture img');
  const assertBounds = async (width, height) => {
    await expect(subtitle).toBeVisible({ timeout: 4000 });
    const titleBox = await heading.boundingBox();
    const subtitleBox = await subtitle.boundingBox();
    const progressBox = await progress.boundingBox();
    for (const box of [titleBox, subtitleBox, progressBox]) {
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.y).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
    }
    expect(progressBox.height).toBeGreaterThanOrEqual(44);
    expect(titleBox.y + titleBox.height).toBeLessThan(subtitleBox.y);
    expect(subtitleBox.y + subtitleBox.height).toBeLessThan(progressBox.y);
  };
  const setSegments = segments => page.evaluate(value => {
    Object.defineProperty(window, 'viewport', { configurable: true, value: { segments: value } });
    window.dispatchEvent(new Event('resize'));
  }, segments);
  try {
    for (const [width, height, asset] of [
      [320, 568, 'portrait'], [390, 844, 'portrait'], [844, 390, 'wide'], [345, 206, 'wide'],
      [768, 1024, 'square'], [1024, 768, 'square'], [1440, 900, 'wide'], [1920, 1080, 'wide'],
    ]) {
      await page.setViewportSize({ width, height });
      await expect.poll(() => art.evaluate(img => img.currentSrc)).toContain('startup-' + asset);
      await assertBounds(width, height);
    }
    await page.setViewportSize({ width: 900, height: 700 });
    await setSegments([{ left: 0, top: 0, width: 438, height: 700 }, { left: 462, top: 0, width: 438, height: 700 }]);
    await expect(page.locator('body')).toHaveAttribute('data-fold-axis', 'vertical');
    await assertBounds(438, 700);
    await setSegments([{ left: 0, top: 0, width: 900, height: 338 }, { left: 0, top: 362, width: 900, height: 338 }]);
    await expect(page.locator('body')).toHaveAttribute('data-fold-axis', 'horizontal');
    await assertBounds(900, 700);
    expect(await subtitle.boundingBox().then(box => box.y + box.height)).toBeLessThan(338);
    expect(await progress.boundingBox().then(box => box.y)).toBeGreaterThan(362);
  } finally {
    release();
  }
  await expect(button).toBeVisible();
  await button.click();
  await expect(page.locator('#startup')).toBeHidden();
});

test('scales the camera and road motion with existing graphics quality and reduced motion', async ({ page }) => {
  await page.addInitScript(key => {
    if (sessionStorage.getItem('test-initial-quality')) return;
    sessionStorage.setItem('test-initial-quality', '1');
    localStorage.setItem(key, JSON.stringify({ quality: 'high', enabled: true }));
  }, QUALITY_STORAGE_KEY);
  // Measure the opening while the game chunk is still pending, before WebGL or the lobby can affect it.
  await page.route('**/assets/main-*.js', () => {});
  const startup = page.locator('#startup');
  await page.goto('/', { waitUntil: 'commit' });
  await expect(startup).toHaveAttribute('data-motion', 'high');
  const motes = page.locator('.startup-motes > i:visible');
  const road = page.locator('.startup-road > i:visible');
  const camera = page.locator('.startup-art img');
  await expect(motes).toHaveCount(7);
  await expect(road).toHaveCount(4);
  await expect(camera).toHaveCSS('animation-name', 'startup-camera');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(motes).toHaveCount(0);
  await expect(road).toHaveCount(0);
  await expect(camera).toHaveCSS('animation-name', 'none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  for (const [tier, count, roadCount] of [['medium', 3, 2], ['low', 0, 0]]) {
    await page.evaluate(([key, quality]) => localStorage.setItem(key, JSON.stringify({ quality, enabled: true })), [QUALITY_STORAGE_KEY, tier]);
    await page.reload({ waitUntil: 'commit' });
    await expect(startup).toHaveAttribute('data-motion', tier);
    await expect(motes).toHaveCount(count);
    await expect(road).toHaveCount(roadCount);
    await expect(camera).toHaveCSS('animation-name', 'none');
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

test('the landscape home lifts its controls without animating the fixed-rail ancestors', async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  await page.addInitScript(() => {
    window.homeArrivalFrames = [];
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      if (options?.id === 'home-arrival') window.homeArrivalFrames.push([this.id, frames[0].translate]);
      return animate.call(this, frames, options);
    };
  });
  await page.goto('/');
  await expect(enter(page)).toBeEnabled();
  await page.locator('#startup').evaluate(screen => { screen.dataset.motion = 'medium'; });
  await enter(page).press('Enter');
  await expect(page.locator('#startup')).toBeHidden();
  await expect(page.locator('#start-button')).toBeFocused();
  const arrivals = await page.evaluate(() => window.homeArrivalFrames);
  expect(arrivals).toEqual(expect.arrayContaining([
    ['race-mode-picker', '0 6px'], ['start-button', '0 6px'], ['garage-button', '0 6px'],
  ]));
  expect(arrivals.map(([id]) => id)).not.toContain('intro');
  await expect(page.locator('#intro')).toHaveCSS('animation-name', 'none');
  await expect(page.locator('#start-button')).toHaveCSS('translate', 'none');
});

test('slow startup fills continuously, the Enter hover changes appearance, and desktop starts off-screen', async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate;
    Element.prototype.animate = function (frames, options) {
      const animation = animate.call(this, frames, options);
      if (options?.id === 'startup-progress-fill' && frames.at(-1).transform === 'scaleX(1)') {
        animation.pause();
        animation.currentTime = 100;
        window.finalFill = animation;
      }
      if (options?.id === 'startup-ready-hold') {
        animation.pause();
        animation.currentTime = 0;
        window.readyHold = animation;
      }
      return animation;
    };
  });
  let release;
  const blocked = new Promise(resolve => { release = resolve; });
  await page.route('**/assets/main-*.js', async route => { await blocked; await route.continue(); });
  await page.goto('/', { waitUntil: 'commit' });
  const fill = page.locator('#startup-fill');
  const scaleAt = time => fill.evaluate((element, ms) => {
    const animation = element.getAnimations().find(animation => animation.id === 'startup-progress-fill');
    animation.pause();
    animation.currentTime = ms;
    return new DOMMatrixReadOnly(getComputedStyle(element).transform).a;
  }, time);
  try {
    await expect(page.locator('#startup')).toHaveAttribute('data-motion', 'low');
    const first = await scaleAt(1000);
    const later = await scaleAt(4500);
    expect(first).toBeGreaterThan(.03);
    expect(later).toBeGreaterThan(first);
    expect(later).toBeLessThan(1);
    await expect(enter(page)).toBeHidden();
  } finally {
    release();
  }

  await page.waitForFunction(() => Boolean(window.finalFill));
  await expect(page.locator('#startup-status')).toHaveText('Preparing 3D scene');
  expect(await fill.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a)).toBeLessThan(1);
  await page.evaluate(() => window.finalFill.finish());
  await expect(page.locator('#startup-status')).toHaveText('Ready to race');
  await expect(fill).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, 0)');
  await expect(enter(page)).toBeHidden();
  await page.evaluate(() => window.readyHold.finish());
  const button = enter(page);
  await expect(button).toBeEnabled();
  const normal = await button.evaluate(element => getComputedStyle(element).backgroundImage);
  await button.hover();
  expect(await button.evaluate(element => getComputedStyle(element).backgroundImage)).not.toBe(normal);
  expect(await button.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('startup-hover-sweep');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await button.evaluate(element => getComputedStyle(element, '::before').animationName)).toBe('none');
  await page.emulateMedia({ reducedMotion: 'no-preference' });

  await page.evaluate(() => {
    const splash = document.querySelector('#startup');
    splash.dataset.motion = 'medium';
    const animate = splash.animate.bind(splash);
    splash.animate = (...args) => {
      window.arrivalEdges = {
        intro: document.querySelector('.lobby-race-heading').getBoundingClientRect().right,
        settings: document.querySelector('#settings-button').getBoundingClientRect().left,
        viewport: window.innerWidth,
      };
      return animate(...args);
    };
  });
  await button.press('Enter');
  await expect(page.locator('#startup')).toBeHidden();
  const edges = await page.evaluate(() => window.arrivalEdges);
  expect(edges.intro).toBeLessThanOrEqual(0);
  expect(edges.settings).toBeGreaterThanOrEqual(edges.viewport);
  await expect(page.locator('#start-button')).toBeFocused();
});
