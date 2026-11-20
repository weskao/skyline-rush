import { devices, expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { expectMusicPlaying, installMusicProbe } from './helpers/music-probe.js';

for (const name of ['iPhone 13', 'Pixel 7']) {
  test.describe(name, () => {
    const { viewport, userAgent } = devices[name];
    test.use({ viewport, userAgent, isMobile: true, hasTouch: true });

    test('recovers race audio after foreground and background interruptions', async ({ page, gameplayURL }) => {
      await installMusicProbe(page);
      // Exercise the real race audio and controls without waiting on GPU assets during a media timing test.
      await page.route('**/audio-interruption', route => route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><button id="mute-all">Mute all</button><button id="race-touch">Race</button>',
      }));
      await page.goto(new URL('audio-interruption', gameplayURL).href);
      await page.evaluate(async () => {
        const [{ createSound }, { setupAudioUI }, { createRace }] = await Promise.all(
          ['/src/audio.js', '/src/audio-ui.ts', '/src/game.js'].map(url => import(url)));
        const sound = createSound(), race = createRace('spiral');
        race.phase = 'racing';
        window.audioTestRace = race;
        setupAudioUI({ audio: { music: true, sfx: true }, volume: { music: .55, sfx: .6 }, sound });
        function frame() { sound.update(race); requestAnimationFrame(frame); }
        frame();
      });
      const touch = page.locator('#race-touch');
      await touch.tap();
      await expectMusicPlaying(page);

      const count = await page.evaluate(() => {
        const { ctxs } = window.__music, context = ctxs.at(-1), suspend = context.suspend.bind(context);
        // The OS may cover the screen while the page remains visible and the clock is stuck.
        Object.defineProperty(context, 'currentTime', { value: context.currentTime, configurable: true });
        context.suspend = () => { delete context.currentTime; context.suspend = suspend; return suspend(); };
        return ctxs.length;
      });
      await expectMusicPlaying(page);
      expect(await page.evaluate(() => window.__music.ctxs.length)).toBe(count);

      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
      await expect.poll(() => page.evaluate(() => window.__music.ctxs.at(-1).state)).toBe('suspended');
      await page.evaluate(() => document.dispatchEvent(new Event('resume')));
      await expectMusicPlaying(page);
      expect(await page.evaluate(() => window.__music.ctxs.length)).toBe(count);

      const stalledAt = await page.evaluate(() => {
        const context = window.__music.ctxs.at(-1);
        Object.defineProperty(context, 'currentTime', { value: context.currentTime });
        return performance.now();
      });
      await expect.poll(() => page.evaluate(() => performance.now()), { timeout: ciTimeout(5000) })
        .toBeGreaterThan(stalledAt + 1100);
      await touch.tap();
      await expectMusicPlaying(page);
      await expect.poll(() => page.evaluate(() => window.__music.ctxs.length)).toBe(count + 1);
      await expect.poll(() => page.evaluate(() => window.audioTestRace.phase)).toBe('racing');
    });
  });
}
