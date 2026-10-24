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

// Trackpad wheel events on the preview. A trackpad stamps its events 16ms apart on its own clock however late they reach the
// page (page.mouse.wheel stamps on delivery, so a slow CI round trip looks like the user pausing), and native wheel deltas are
// scaled differently per runner (Linux CI turned a 40px nudge into a full swipe), so both delta and timeStamp are pinned here.
// deliverMs spaces the deliveries; stallAt delays one delivery by 300ms.
async function trackpadSwipe(page, deltaX, events, { deliverMs = 16, stallAt = -1 } = {}) {
  const world = page.locator('#world');
  const start = await page.evaluate(() => performance.now());
  for (let i = 0; i < events; i++) {
    if (i === stallAt) await page.waitForTimeout(300);
    await world.evaluate((canvas, { deltaX, timeStamp }) => {
      const event = new WheelEvent('wheel', { deltaX, deltaMode: 0, bubbles: true, cancelable: true });
      Object.defineProperty(event, 'timeStamp', { value: timeStamp });
      canvas.dispatchEvent(event);
    }, { deltaX, timeStamp: start + i * 16 });
    await page.waitForTimeout(deliverMs);
  }
}

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('first Airflow shows the animated swipe hint once, and swiping the preview pages through tracks', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/');
    const [first, second] = await trackOrder(page);
    // Capture the brief completion state even if a slow software-rendered frame
    // delays Playwright past the chip's 1.4s visibility window.
    await chip(page).evaluate(element => {
      window.__sawSwipeDone = false;
      new MutationObserver(() => {
        if (element.dataset.state === 'done') window.__sawSwipeDone = true;
      }).observe(element, { attributes: true, attributeFilter: ['data-state'] });
    });
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
    await expect.poll(() => page.evaluate(() => window.__sawSwipeDone)).toBe(true);
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
    await expect(chip(page)).toHaveAttribute('data-state', 'hint'); // each new page load gets one hint
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
  await page.goto('/');
  const [first, second, third] = await trackOrder(page);
  await page.mouse.move(1150, 600);
  const scroll = (deltaX, events, options) => trackpadSwipe(page, deltaX, events, options);
  await scroll(10, 4);
  await page.waitForTimeout(400);
  expect(await selected(page), 'a nudge springs back').toBe(first);
  await expect.poll(() => page.locator('#world').evaluate(canvas => canvas.style.transform)).toBe('');
  await scroll(30, 20, { stallAt: 12 }); // swipe plus its momentum tail, one event delivered late: still one track
  await expect.poll(() => selected(page)).toBe(second);
  await page.waitForTimeout(400);
  expect(await selected(page)).toBe(second);
  await scroll(30, 6);
  await expect.poll(() => selected(page)).toBe(third);
  await page.waitForTimeout(400);
  await scroll(-30, 6);
  await expect.poll(() => selected(page)).toBe(second);
  await page.waitForTimeout(400);
  await page.mouse.wheel(0, 200); // vertical scrolling is not a swipe
  await page.waitForTimeout(400);
  expect(await selected(page)).toBe(second);
});

test('desktop: wheel momentum pauses over 160ms remain part of the same trackpad gesture', async ({ page }) => {
  await page.goto('/');
  const [, second] = await trackOrder(page);
  await page.mouse.move(1150, 600);
  // Under CPU-only WebGL, adjacent momentum events may reach the page >160ms apart.
  // Delivered 210ms apart but stamped 16ms apart, they are still the same physical swipe, not new gestures.
  await trackpadSwipe(page, 30, 9, { deliverMs: 210 });
  await expect.poll(() => selected(page)).toBe(second);
  await page.waitForTimeout(400);
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
  // The live WebGL renderer stays transparent to interactions but behind opaque snapshots.
  expect(await page.locator('#world').evaluate(canvas => canvas.style.opacity)).toBe('0');
  await page.mouse.up();
  await expect.poll(() => selected(page)).toBe(second);
  await expect(pages).toHaveCount(0);
  expect(await page.locator('#world').evaluate(canvas => canvas.style.opacity)).toBe('');
});


test('desktop: completed carousel animation stays on the incoming scene until WebGL handoff', async ({ page }) => {
  await page.goto('/');
  const [, second] = await trackOrder(page);
  // Observe the exact microtask where the selected track changes. The outgoing
  // snapshot MUST already be entirely off-screen even before the layer is removed.
  await page.evaluate(() => {
    window.__swipeHandoff = null;
    const tracks = document.querySelector('.track-select');
    new MutationObserver(() => {
      if (window.__swipeHandoff || !document.querySelector('#track-swipe-scenes canvas')) return;
      const canvases = document.querySelectorAll('#track-swipe-scenes canvas');
      if (canvases.length !== 2 || !document.querySelector('[data-track="neon"][aria-pressed="true"]')) return;
      const outgoing = canvases[0].getBoundingClientRect();
      const incoming = canvases[1].getBoundingClientRect();
      window.__swipeHandoff = { outgoingRight: outgoing.right, incomingLeft: incoming.left, incomingRight: incoming.right };
    }).observe(tracks, { subtree: true, attributes: true, attributeFilter: ['aria-pressed'] });
  });
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(1020, 600, { steps: 6 });
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(2);
  await page.mouse.up();
  await expect.poll(() => selected(page)).toBe(second);
  const frame = await expect.poll(() => page.evaluate(() => window.__swipeHandoff)).not.toBeNull();
  const seen = await page.evaluate(() => window.__swipeHandoff);
  expect(seen.outgoingRight, 'old track must not reappear after snap animation finishes').toBeLessThanOrEqual(1);
  expect(seen.incomingLeft).toBeLessThanOrEqual(1);
  expect(seen.incomingRight).toBeGreaterThanOrEqual(1439);
});

test.describe('phone reload hint', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('swipe hint appears once per page load, even after a previous visit saved a hint marker', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-swipe-hint', 'shown'));
  await page.goto('/');
  const seen = () => page.evaluate(() => window.__hintCount);
  const watch = () => page.evaluate(() => {
    window.__hintCount = 0;
    new MutationObserver(() => {
      if (document.querySelector('#track-swipe')?.dataset.state === 'hint') window.__hintCount++;
    }).observe(document.querySelector('#track-swipe'), { attributes: true, attributeFilter: ['data-state'] });
  });
  await watch();
  await page.locator('#airflow-toggle').click();
  await expect(chip(page)).toHaveAttribute('data-state', 'hint');
  await expect.poll(seen).toBe(1);
  await page.locator('#airflow-toggle').click();
  await page.locator('#airflow-toggle').click();
  expect(await seen(), 'toggle off/on again in same loaded page must not repeat hint').toBe(1);

  await page.reload();
  await watch();
  // Airflow setting persists; switch off then back on to trigger this page's first enable.
  await page.locator('#airflow-toggle').click();
  await page.locator('#airflow-toggle').click();
  await expect(chip(page)).toHaveAttribute('data-state', 'hint');
  await expect.poll(seen).toBe(1);
  });
});

test('desktop: a short drag snaps the joined previews back without changing track', async ({ page }) => {
  await page.goto('/');
  const [first] = await trackOrder(page);
  await page.mouse.move(1150, 600);
  await page.mouse.down();
  await page.mouse.move(1120, 600, { steps: 4 });
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(2);
  await page.waitForTimeout(160); // a held slow drag, not a 30px flick
  await page.mouse.up();
  await expect(page.locator('#track-swipe-scenes canvas')).toHaveCount(0);
  expect(await selected(page)).toBe(first);
});
