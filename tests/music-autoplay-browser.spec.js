import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { installMusicProbe, musicTimeline, expectMusicPlaying } from './helpers/music-probe.js';

// Chrome lets an installed PWA or a often-played site start sound without a gesture; this flag gives the test that case.
test.use({ launchOptions: { args: ['--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] } });

test('where autoplay is allowed the intro sounds before the first frame and keeps playing under What\'s new', async ({ page }) => {
  await installMusicProbe(page);
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.__music.frames.length), { timeout: ciTimeout(30000) }).toBeGreaterThan(0);
  const timeline = await musicTimeline(page);
  expect(timeline.firstNote, 'a music note was queued').not.toBeNull();
  expect(timeline.firstNote, 'the first note is heard before the 3D world draws its first frame').toBeLessThan(timeline.firstFrame);
  expect(timeline.queuedPastFirstFrame, 'music queued before the shader warm-up frame outlasts it').toBe(true);
  await page.locator('#whats-new-open').click();
  await expect(page.locator('#whats-new-screen')).toBeVisible();
  await expectMusicPlaying(page);
  await expect(page.locator('#whats-new-screen')).toBeVisible();
});
