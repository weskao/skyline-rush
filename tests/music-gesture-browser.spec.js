import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { installMusicProbe, expectMusicPlaying } from './helpers/music-probe.js';

// Chrome's default for a site without media engagement (and iPhone always): no sound before the first gesture.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--autoplay-policy=document-user-activation-required'] } });

const ready = async page => {
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect.poll(() => page.evaluate(() => window.__music.frames.length), { timeout: ciTimeout(30000) }).toBeGreaterThan(1);
};

test('where autoplay is blocked the first tap on What\'s new starts the music within that tap', async ({ page }) => {
  await installMusicProbe(page);
  // Playwright's own evaluate and locator checks count as a user gesture; read the page without one until the tap.
  const cdp = await page.context().newCDPSession(page);
  const quiet = async expression =>
    (await cdp.send('Runtime.evaluate', { expression, returnByValue: true, userGesture: false })).result.value;
  await page.goto('/');
  await expect.poll(() => quiet('window.__music.frames.length'), { timeout: ciTimeout(30000) }).toBeGreaterThan(1);
  await page.waitForTimeout(ciTimeout(1200)); // the engine's once-a-second resume retry has had its chance
  expect(await quiet('navigator.userActivation.hasBeenActive'), 'the page has had no gesture yet').toBe(false);
  expect(await quiet('window.__music.ctxs.at(-1)?.state'), 'no sound before a gesture').not.toBe('running');
  // Opened without user activation, as the automatic announcement does.
  await quiet("document.querySelector('#whats-new-open').click()");
  await expect.poll(() => quiet("!!document.querySelector('#whats-new-screen')?.checkVisibility()")).toBe(true);
  // A bare mouse tap: locator.click() runs its own (gesture-granting) checks before the pointer lands.
  const { x, y } = await quiet("(r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 }))(document.querySelector('#release-title').getBoundingClientRect())");
  await page.mouse.click(x, y);
  await expect.poll(() => page.evaluate(() => window.__music.taps.length)).toBe(1);
  // The first music note is queued inside the tap itself, not by a later (possibly stalled) animation frame.
  const sameTap = await page.evaluate(() => {
    const m = window.__music, [tap] = m.taps;
    return m.notes.some(note => note.ctx >= tap.ctxs - 1 && note.raf === tap.raf && m.ctxs[note.ctx].state !== 'closed');
  }); // settled: the tap was recorded, and notes queued in it are already in the list
  expect(sameTap).toBe(true);
  await expectMusicPlaying(page);
  await expect(page.locator('#whats-new-screen')).toBeVisible();
});

test('a page shown again without a visibilitychange event recovers its music on the next tap without rebuilding contexts', async ({ page }) => {
  await installMusicProbe(page);
  await page.goto('/');
  await ready(page);
  await page.locator('#intro-title').click();
  await expectMusicPlaying(page);
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await expect.poll(() => page.evaluate(() => window.__music.ctxs.at(-1).state)).toBe('suspended');
  // The page comes back, but the browser never fires visibilitychange (seen on Chrome and iOS home-screen apps).
  await page.evaluate(() => { delete document.hidden; });
  const before = await page.evaluate(() => window.__music.ctxs.length);
  for (let tap = 0; tap < 4; tap++) {
    await page.waitForTimeout(ciTimeout(1300)); // past the engine's 1 s rebuild guard, as a player's separate taps are
    await page.locator('#intro-title').click();
  }
  await expectMusicPlaying(page);
  const made = await page.evaluate(() => window.__music.ctxs.length); // settled: music is playing, so every tap was handled
  expect(made - before, 'at most the one iOS-style rebuild on the first tap, never one per tap').toBeLessThanOrEqual(1);
});
