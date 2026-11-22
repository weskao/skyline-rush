import { test, expect, gotoHome, settled } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { toggleSettingsSection } from './helpers/settings-browser.js';
import { CATALOGS } from '../src/i18n.ts';

// Real keyboard and touch input for the AUTO accelerator lesson (docs/tutorial-driving.md).
const en = CATALOGS.en;
const TOAST_NAME = { en: 'Auto accelerate', 'zh-TW': '自動加速' };
const coach = page => page.locator('#tutorial-coach');
const status = page => page.locator('#tutorial-auto-status');
const instruction = page => page.locator('#tutorial-instruction');
const step = (page, name) => expect(coach(page)).toHaveAttribute('data-step', name, { timeout: ciTimeout(15000) });
const racing = page => expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
const autoOff = page => page.addInitScript(() => localStorage.setItem('skyline-rush-auto', 'off'));
const openPractice = async page => {
  await toggleSettingsSection(page, 'driving');
  await page.locator('#tutorial-open').click();
};
const begin = async page => {
  await gotoHome(page);
  await openPractice(page);
  await step(page, 'throttle');
  await racing(page);
};
// The toast lives 1.8 s: read it and the coach label in one page tick, straight after the action.
const expectAuto = (page, on, label, lang = 'en') => page.waitForFunction(want => {
  const pill = [...document.querySelectorAll('#game-toast .game-toast-pill')].at(-1);
  return pill?.dataset.state === want.state && pill.querySelector('.game-toast-label')?.textContent.trim() === want.name
    && document.querySelector('#tutorial-auto-status')?.textContent.trim() === want.label;
}, { state: on ? 'on' : 'off', name: TOAST_NAME[lang], label }, { polling: 'raf', timeout: ciTimeout(10000) });
const toggleTwice = async page => {
  await page.keyboard.press('F2');
  await expectAuto(page, false, en['assist.titleOff']);
  await page.keyboard.press('F2');
  await expectAuto(page, true, en['assist.titleOn']);
};
const skipTo = async (page, next) => {
  await page.locator('#tutorial-skip-step').click();
  await step(page, next);
};

test('F2 toggles AUTO in all 11 lessons, and the toast and coach label agree', async ({ page }) => {
  test.setTimeout(ciTimeout(150000));
  await begin(page);
  for (const next of ['left', 'right', 'brake', 'drift', 'fly']) {
    await toggleTwice(page);
    await skipTo(page, next);
  }
  await toggleTwice(page);
  await expect.poll(async () => Number(await page.locator('#speed').textContent()), { timeout: ciTimeout(15000) }).toBeGreaterThan(66);
  await page.keyboard.down('Space');
  await step(page, 'land');
  await toggleTwice(page); // still airborne: FLY stays held so the landing lesson cannot clear first
  await page.keyboard.up('Space');
  await step(page, 'boost');
  for (const next of ['airChain', 'barrelRoll', 'nitro']) {
    await toggleTwice(page);
    await skipTo(page, next);
  }
  await toggleTwice(page);
});

test('AUTO on holds lesson 1 for the 3-second read even though the car is already rolling', async ({ page }) => {
  await gotoHome(page);
  await page.evaluate(() => {
    const seen = window.__autoRead = { go: 0, rolled: 0, cleared: 0 };
    const sample = now => {
      if (document.body.dataset.phase === 'racing') seen.go ||= now;
      if (seen.go && Number(document.querySelector('#speed')?.textContent) > 18) seen.rolled ||= now;
      if (seen.go && document.querySelector('#tutorial-coach')?.dataset.step === 'left') seen.cleared = now;
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  await openPractice(page);
  await step(page, 'left');
  await expect.poll(() => page.evaluate(() => window.__autoRead.cleared)).toBeGreaterThan(0);
  const { go, rolled, cleared } = await page.evaluate(() => window.__autoRead);
  expect(rolled, 'the car passes 5 m/s before the lesson clears').toBeGreaterThan(0);
  expect(rolled).toBeLessThan(cleared);
  // Game time never runs ahead of the wall clock, so 3 s of read is at least 3 s of frames (one frame of sampling slack).
  expect(cleared - go).toBeGreaterThanOrEqual(2900);
});

test('AUTO off waits for the held accelerator, and a mid-lesson toggle switches copy and clear rule', async ({ page }) => {
  await autoOff(page);
  await begin(page);
  await expect(status(page)).toHaveText(en['assist.titleOff']);
  await expect(instruction(page)).toHaveText(en['tutorial.throttle']);
  await expect(page.locator('#tutorial-cue')).toHaveAttribute('data-cue', 'tutorial.cue.throttle');
  await page.waitForTimeout(ciTimeout(800));
  await expect(page.locator('#speed')).toHaveText('0');
  await step(page, 'throttle');
  await page.keyboard.press('F2');
  await expectAuto(page, true, en['assist.titleOn']);
  await expect(instruction(page)).toHaveText(en['tutorial.throttleAuto']);
  await expect.poll(async () => Number(await page.locator('#speed').textContent()), { timeout: ciTimeout(8000) }).toBeGreaterThan(0);
  await page.keyboard.press('F2');
  await expectAuto(page, false, en['assist.titleOff']);
  await expect(instruction(page)).toHaveText(en['tutorial.throttle']);
  await step(page, 'throttle');
  await page.keyboard.down('w');
  await step(page, 'left');
  await page.keyboard.up('w');
});

test('pause stops the AUTO read, F2 still works while paused, and resume finishes the lesson', async ({ page }) => {
  await begin(page);
  await page.locator('#pause-button').click();
  await settled(page.locator('#race-overlay'));
  const progress = page.locator('#tutorial-progress');
  const read = await progress.evaluate(el => el.value);
  await page.waitForTimeout(ciTimeout(3200));
  await step(page, 'throttle');
  await expect(progress).toHaveJSProperty('value', read);
  await toggleTwice(page);
  await page.locator('#resume-button').click();
  await racing(page);
  await step(page, 'left');
});

for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) for (const [locale, lang] of [['en-US', 'en'], ['zh-TW', 'zh-TW']]) {
  test.describe(`touch AUTO ${viewport.width}x${viewport.height} ${locale}`, () => {
    test.use({ viewport, locale, hasTouch: true, isMobile: true });
    test('the Settings path toggles AUTO mid-lesson and no touch copy names F2', async ({ page, context }) => {
      const copy = CATALOGS[lang];
      const touchLabel = key => copy[key].replace(' · F2', '');
      const input = page.locator('#tutorial-input');
      await begin(page);
      await expect(status(page)).toHaveText(touchLabel('assist.titleOn'));
      await expect(instruction(page)).toHaveText(copy['tutorial.throttleAutoTouch']);
      await expect(input).toContainText(copy['tutorial.touch.throttleAuto']);
      await page.locator('#pause-button').tap();
      await settled(page.locator('#race-overlay'));
      await page.locator('#settings-button').tap();
      await expect(page.locator('#settings-panel')).toBeVisible();
      await page.locator('[data-settings-section="driving"]').tap();
      await page.locator('#assist-button').scrollIntoViewIfNeeded();
      await page.locator('#assist-button').tap();
      await expectAuto(page, false, touchLabel('assist.titleOff'), lang);
      await expect(page.locator('#assist-button')).toHaveAttribute('aria-pressed', 'false');
      await page.locator('#settings-close').tap();
      await page.locator('#resume-button').tap();
      await racing(page);
      await expect(status(page)).toHaveText(touchLabel('assist.titleOff'));
      await expect(instruction(page)).toHaveText(copy['tutorial.throttleTouch']);
      await expect(input).toContainText(copy['tutorial.touch.throttle']);
      for (const shown of [status(page), instruction(page), input]) await expect(shown).not.toContainText('F2');
      // The touch path wraps to two lines; the coach must still end above the slide pad, or it swallows the pad's top edge.
      await expect.poll(async () => {
        const [c, p] = await Promise.all([coach(page).boundingBox(), page.locator('.touch-pad').boundingBox()]);
        return p.y - (c.y + c.height);
      }).toBeGreaterThan(0);
      const gas = page.locator('#touch-controls [data-control="throttle"]');
      await expect(gas).toHaveClass(/tutorial-target/);
      const b = await gas.boundingBox();
      const session = await context.newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ id: 1, x: b.x + b.width / 2, y: b.y + b.height / 2 }] });
      await step(page, 'left');
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await session.detach();
    });
  });
}
