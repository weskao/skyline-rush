import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { TUTORIAL_COPY } from '../src/locales/tutorial-copy.ts';

// A right-handed, size-L cluster puts steering on the right and FLY/BOOST/NITRO on the left. The coach card, live
// cue, pass toast and guide arrow must never sit over a visible touch control, the AIRFLOW/VFX tool row, a top-bar
// button or the coach's own buttons, or the hint hides the very button it names. A page-side rAF recorder catches
// transient toasts that one awaited read would miss.
const OVERLAYS = ['#tutorial-coach', '#tutorial-cue', '#tutorial-pass', '#tutorial-guide'];
const recordOverlaps = page => page.evaluate(overlays => {
  const box = el => {
    const r = el?.getBoundingClientRect();
    return r && r.width > 0 && r.height > 0 ? r : null;
  };
  window.tutorialOverlaps = new Set();
  window.tutorialOverlaysSeen = new Set();
  window.checkTutorialOverlaps = () => {
    const controls = [...document.querySelectorAll('#touch-controls [data-control], #touch-controls .touch-pad, .aero-tools button, .topbar button, #tutorial-coach button')]
      .map(el => [el, el.dataset.control ?? el.id ?? el.className, box(el)]).filter(([, , r]) => r);
    for (const selector of overlays) {
      const overlay = document.querySelector(selector);
      const o = box(overlay);
      if (!o) continue;
      window.tutorialOverlaysSeen.add(selector);
      for (const [el, name, r] of controls) {
        if (!overlay.contains(el) && o.left < r.right && r.left < o.right && o.top < r.bottom && r.top < o.bottom) {
          window.tutorialOverlaps.add(`${selector} over ${name || el.textContent.trim()} (${document.querySelector('#tutorial-coach')?.dataset.step})`);
        }
      }
    }
  };
  const frame = () => { window.checkTutorialOverlaps(); requestAnimationFrame(frame); };
  frame();
}, OVERLAYS);

for (const [width, height] of [[390, 844], [844, 390]]) {
  for (const mode of ['buttons', 'slide']) {
    test.describe(`right-hand size L ${mode} ${width}x${height}`, () => {
      test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });
      test('tutorial hints never cover a visible control', async ({ page, context }, testInfo) => {
        test.setTimeout(ciTimeout(120000));
        await page.addInitScript(prefs => localStorage.setItem('skyline-rush-controls', JSON.stringify(prefs)),
          { version: 1, mode, hand: 'right', size: 'L' });
        await page.goto('/');
        await page.locator('#controls-button').click();
        await page.locator('#tutorial-open').click();
        const coach = page.locator('#tutorial-coach');
        await expect(coach).toHaveAttribute('data-step', 'throttle');
        await expect(page.locator('#touch-controls')).toHaveAttribute('data-hand', 'right');
        await expect(page.locator('#touch-controls')).toHaveAttribute('data-size', 'L');
        await recordOverlaps(page);
        const session = await context.newCDPSession(page);
        const touch = (type, touchPoints) => session.send('Input.dispatchTouchEvent', { type, touchPoints });
        const hold = async (selector, next, dx = 0, dy = 0) => {
          const b = await page.locator(selector).boundingBox();
          const p = { id: 1, x: b.x + b.width / 2, y: b.y + b.height * .25 };
          await touch('touchStart', [p]);
          if (dx || dy) await touch('touchMove', [{ ...p, x: p.x + dx, y: p.y + dy }]);
          await expect(coach).toHaveAttribute('data-step', next);
          await touch('touchEnd', []);
        };
        const slide = mode === 'slide';
        await expect(page.locator('#tutorial-cue')).toBeVisible();
        await expect(page.locator('#tutorial-guide')).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath('throttle.png') });
        // Widest cue copy in either language, measured in place: long cues wrap instead of spreading over controls.
        const longest = Object.values(TUTORIAL_COPY).map(copy => Object.entries(copy).filter(([key]) => key.startsWith('tutorial.cue.'))
          .map(([, text]) => text).reduce((a, b) => (b.length > a.length ? b : a)));
        await page.evaluate(texts => {
          const label = document.querySelector('#tutorial-cue strong');
          const shown = label.textContent;
          for (const text of texts) { label.textContent = text; window.checkTutorialOverlaps(); }
          label.textContent = shown;
        }, longest);
        await hold('[data-control="throttle"]', 'left');
        await page.screenshot({ path: testInfo.outputPath('left.png') });
        await hold(slide ? '.touch-pad' : '[data-control="left"]', 'right', slide ? -55 : 0);
        await hold(slide ? '.touch-pad' : '[data-control="right"]', 'brake', slide ? 55 : 0);
        await page.screenshot({ path: testInfo.outputPath('brake.png') });
        // Every later lesson's coach card and cue at its ready state: Skip step is a real tap, not a pass.
        // A grounded car clears Landing on its own, so wait for any next lesson rather than a fixed list.
        for (let current = 'brake'; current !== 'nitro';) {
          await page.locator('#tutorial-skip-step').tap();
          await expect(coach).not.toHaveAttribute('data-step', current);
          current = await coach.getAttribute('data-step');
          await page.waitForTimeout(ciTimeout(600));
          await page.screenshot({ path: testInfo.outputPath(`${current}.png`) });
        }
        await session.detach();
        expect(await page.evaluate(() => [...window.tutorialOverlaysSeen].sort())).toEqual([...OVERLAYS].sort());
        expect(await page.evaluate(() => [...window.tutorialOverlaps])).toEqual([]);
      });
    });
  }
}
