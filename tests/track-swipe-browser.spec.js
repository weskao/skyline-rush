import { test, expect } from './helpers/test.js';

const selected = page => page.locator('[data-track][aria-pressed="true"]').getAttribute('data-track');
const trackOrder = page => page.locator('[data-track]').evaluateAll(buttons => buttons.map(button => button.dataset.track));
const chip = page => page.locator('#track-swipe');

// Real touch input through CDP: start, a few moves, release; holdMs pauses before lifting (no flick).
async function touchSwipe(page, from, to, y, { steps = 8, stepMs = 16, holdMs = 0 } = {}) {
  const cdp = await page.context().newCDPSession(page);
  const point = x => [{ x, y, id: 1 }];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from) });
  for (let i = 1; i <= steps; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from + (to - from) * i / steps) });
    await page.waitForTimeout(stepMs);
  }
  if (holdMs) await page.waitForTimeout(holdMs);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('first Airflow shows the animated swipe hint once, and swiping the preview pages through tracks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const [first, second] = await trackOrder(page);
    await page.locator('#airflow-toggle').tap();
    await expect(chip(page)).toHaveAttribute('data-state', 'hint');
    await expect(chip(page)).toContainText('Swipe left or right to change track');
    await expect(page.locator('.swipe-gesture i')).toBeVisible();
    expect(await page.locator('.swipe-gesture i').evaluate(dot => getComputedStyle(dot).animationName)).toBe('swipe-gesture');
    expect(await page.evaluate(() => document.elementFromPoint(195, 560)?.id)).toBe('world');

    await touchSwipe(page, 195, 165, 560, { stepMs: 30, holdMs: 150 });
    expect(await selected(page), 'a short slow drag snaps back').toBe(first);
    await expect(page.locator('#world')).toHaveAttribute('style', /^(?!.*translate)/);

    await touchSwipe(page, 320, 90, 560);
    await expect.poll(() => selected(page)).toBe(second);
    await expect(chip(page)).toHaveAttribute('data-state', 'done');
    await expect(page.locator('#track-swipe-name')).not.toHaveText('');
    await expect.poll(() => page.locator('#world').evaluate(canvas => canvas.getAnimations().length + canvas.style.transform)).toBe('0');

    await touchSwipe(page, 70, 300, 560);
    await expect.poll(() => selected(page)).toBe(first);
    await page.waitForTimeout(800);
    await touchSwipe(page, 70, 300, 560);
    await page.waitForTimeout(800);
    expect(await selected(page), 'the first track rubber-bands instead of wrapping').toBe(first);

    // A touch starting in the iOS edge-swipe zone is left to the browser.
    await touchSwipe(page, 8, 260, 560);
    await page.waitForTimeout(800);
    expect(await selected(page)).toBe(first);

    await page.reload();
    await page.locator('#airflow-toggle').tap(); // airflow was saved on: off, then on again
    await page.locator('#airflow-toggle').tap();
    await expect(page.locator('#airflow-toggle')).toHaveAttribute('aria-pressed', 'true');
    await page.waitForTimeout(300);
    await expect(chip(page)).toHaveAttribute('data-state', '');
    expect(errors).toEqual([]);
  });

  test('reduced motion still swipes, without sliding the scene', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const [, second] = await trackOrder(page);
    await page.locator('#airflow-toggle').tap();
    expect(await page.locator('.swipe-gesture i').evaluate(dot => getComputedStyle(dot).animationName)).toBe('none');
    await touchSwipe(page, 320, 90, 560);
    await expect.poll(() => selected(page)).toBe(second);
    expect(await page.locator('#world').evaluate(canvas => canvas.style.transform)).toBe('');
  });
});

test('desktop: dragging the preview with the mouse changes track from the regular home screen', async ({ page }) => {
  await page.goto('/');
  const [, second] = await trackOrder(page);
  expect(await page.evaluate(() => document.elementFromPoint(1150, 600)?.id)).toBe('world');
  expect(await page.locator('#world').evaluate(canvas => getComputedStyle(canvas).cursor)).toBe('grab');
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  for (let x = 1130; x >= 950; x -= 30) { await page.mouse.move(x, 600); await page.waitForTimeout(16); }
  await expect(chip(page)).toHaveAttribute('data-state', 'drag');
  await page.mouse.up();
  await expect.poll(() => selected(page)).toBe(second);
  await expect(page.locator(`[data-track="${second}"]`)).toHaveAttribute('aria-pressed', 'true');
});

test('desktop: a two-finger trackpad swipe changes one track per gesture, momentum included', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  const [first, second, third] = await trackOrder(page);
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  // Pin CSS-pixel deltas and gesture time: native wheel scaling and slow WebGL frames vary by runner.
  const scroll = async (deltaX, events, deltaY = 0) => { for (let i = 0; i < events; i++) { await page.locator('#world').dispatchEvent('wheel', { deltaX, deltaY, deltaMode: 0 }); await page.clock.runFor(16); } };
  await scroll(10, 4);
  await page.clock.runFor(400);
  expect(await selected(page), 'a nudge springs back').toBe(first);
  await expect.poll(() => page.locator('#world').evaluate(canvas => canvas.style.transform)).toBe('');
  await scroll(30, 20); // swipe plus its momentum tail: still one track
  await expect.poll(() => selected(page)).toBe(second);
  await page.clock.runFor(400);
  expect(await selected(page)).toBe(second);
  await scroll(30, 6);
  await expect.poll(() => selected(page)).toBe(third);
  await page.clock.runFor(400);
  await scroll(-30, 6);
  await expect.poll(() => selected(page)).toBe(second);
  await page.clock.runFor(400);
  await scroll(0, 1, 200); // vertical scrolling is not a swipe
  await page.clock.runFor(400);
  expect(await selected(page)).toBe(second);
});


test('desktop: neighboring 3D previews touch edge-to-edge while dragging, with no exposed background', async ({ page }) => {
  await page.goto('/');
  const [first, second] = await trackOrder(page);
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(1020, 600, { steps: 6 });
  const pages = page.locator('#track-swipe-scenes canvas');
  await expect(pages).toHaveCount(2);
  const geometry = await pages.evaluateAll(canvases => canvases.map(canvas => {
    const box = canvas.getBoundingClientRect();
    const pixels = canvas.getContext('2d').getImageData(
      Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data;
    return { left: box.left, right: box.right, width: box.width, height: box.height, alpha: pixels[3] };
  }));
  expect(Math.abs(geometry[0].right - geometry[1].left)).toBeLessThan(1);
  expect(geometry[0].left).toBeLessThanOrEqual(0);
  expect(geometry[1].right).toBeGreaterThanOrEqual(1440);
  expect(geometry.every(part => part.width === 1440 && part.height > 0 && part.alpha === 255), 'both actual scenes remain fully opaque').toBe(true);
  expect(await selected(page)).toBe(first);
  expect(await page.locator('#world').evaluate(canvas => canvas.style.opacity)).toBe('');
  await page.mouse.up();
  await expect.poll(() => selected(page)).toBe(second);
  await expect(pages).toHaveCount(0);
});

test('desktop: a short drag snaps the joined previews back without changing track', async ({ page }) => {
  await page.goto('/');
  const [first] = await trackOrder(page);
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(1120, 600, { steps: 4 });
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(2);
  await page.mouse.up();
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(0);
  expect(await selected(page)).toBe(first);
});
