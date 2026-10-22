import { test, expect } from '@playwright/test';
import { CATALOGS } from '../src/i18n.js';

for (const [width, height, hasTouch] of [
  [320, 568, true], [390, 844, true], [568, 320, true], [844, 390, true],
  [768, 1024, true], [768, 600, true], [761, 501, false], [760, 501, true],
  [1024, 768, true], [900, 600, false],
  [1280, 720, false], [1440, 900, false], [1804, 504, false], [2560, 1440, false],
]) {
  test.describe(`start layout ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch });

    test('intro content stays clear of the HUD and actions remain reachable', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const bounds = await intro.boundingBox();
      for (const selector of ['.telemetry', '.topbar', '.aero-tools', '.bottomline']) {
        const panel = page.locator(selector);
        if (!await panel.isVisible()) continue;
        const box = await panel.boundingBox();
        expect(bounds.x + bounds.width <= box.x || box.x + box.width <= bounds.x ||
          bounds.y + bounds.height <= box.y || box.y + box.height <= bounds.y,
        `Intro overlaps ${selector}`).toBe(true);
      }
      expect(await intro.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
      for (const selector of ['#start-button', '.history-button', '.flight-tip']) {
        const item = intro.locator(selector);
        if (!await item.isVisible()) continue;
        await item.scrollIntoViewIfNeeded();
        const box = await item.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(bounds.x);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
        expect(box.y).toBeGreaterThanOrEqual(bounds.y);
        expect(box.y + box.height).toBeLessThanOrEqual(Math.min(bounds.y + bounds.height, height));
      }
      const [start, history] = await Promise.all([
        intro.locator('#start-button').boundingBox(), intro.locator('.history-button').boundingBox(),
      ]);
      expect(start.x + start.width <= history.x || history.x + history.width <= start.x ||
        start.y + start.height <= history.y || history.y + history.height <= start.y).toBe(true);
      await intro.locator('.history-button').click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.getByRole('button', { name: 'Close history' }).click();
      await page.locator('#start-button').click();
      await expect(intro).toBeHidden();
      await expect(page.locator('.telemetry')).toBeVisible();
      await expect(page.locator('#race-status')).toHaveText('RACING');
    });
  });
}

// 874x339 is iPhone landscape Safari with its toolbar showing (402 pt screen minus ~63 pt of chrome).
for (const [width, height] of [[844, 390], [874, 339]]) {
  test.describe(`touch race HUD ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('START RACE is on screen without scrolling the intro', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const [panel, start] = await Promise.all([intro.boundingBox(), page.locator('#start-button').boundingBox()]);
      expect(start.y + start.height).toBeLessThanOrEqual(Math.min(panel.y + panel.height, height));
      expect(await intro.evaluate(el => el.scrollTop)).toBe(0);
    });
  });
}

// zh-TW runs the tight viewports only: its CJK font stack widens HUD text (the place-change arrow once did), the roomy ones add no signal.
const ZH_TW_HUD_SIZES = ['844x390', '874x339', '390x844', '320x568'];
for (const locale of ['en-US', 'zh-TW']) for (const [width, height, hasTouch] of [[844, 390, true], [874, 339, true],
  [1440, 900, false], [1024, 768, true], [390, 844, true], [360, 780, true], [320, 568, true]]) {
  if (locale === 'zh-TW' && !ZH_TW_HUD_SIZES.includes(`${width}x${height}`)) continue;
  test.describe(`race HUD ${width}x${height}${locale === 'zh-TW' ? ' zh-TW' : ''}`, () => {
    test.use({ viewport: { width, height }, hasTouch, isMobile: hasTouch, locale });

    test('racing HUD blocks stay apart', async ({ page, context }) => {
      // iPhone landscape keeps a home-indicator inset below the page; it lifts every bottom-anchored block.
      if (height < 380) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 62, right: 62, top: 0, bottom: 21 } });
      await page.goto('/');
      await page.waitForTimeout(700);
      if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
      await page.locator('#start-button').click();
      await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing');
      await expect(page.locator('#race-status')).toHaveText(CATALOGS[locale === 'zh-TW' ? 'zh-TW' : 'en']['phase.racing']);
      await expect(page.locator('#countdown')).toBeHidden();
      // The live map only steps aside on short screens with no free HUD slot.
      await expect(page.locator('.race-route-map')).toBeVisible();
      const blocks = ['.position-stat', '.leaderboard', '.race-route-map', '.race-progress', '.mode-indicator', '.speedometer',
        '.flight-telemetry', '.aero-tools', '#controls-button', '#pause-button',
        // .touch-pad is left out: it is the invisible slide zone the pointer-transparent HUD sits on.
        ...['fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];
      // One synchronous evaluate with the place-change arrow forced on: it widens POSITION for a moment,
      // and sampling it by luck made this test flaky.
      const boxes = await page.evaluate(selectors => {
        const arrow = document.querySelector('#position-change');
        const [hidden, text] = [arrow.hidden, arrow.textContent];
        Object.assign(arrow, { hidden: false, textContent: '\u2193' });
        const rects = selectors.flatMap(selector => {
          const el = document.querySelector(selector);
          if (!el || !el.checkVisibility()) return [];
          const { x, y, width, height } = el.getBoundingClientRect();
          return [[selector, { x, y, width, height }]];
        });
        Object.assign(arrow, { hidden, textContent: text });
        return rects;
      }, blocks);
      const apart = (a, b) => a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
      const overlaps = boxes.flatMap(([name, box], i) => boxes.slice(i + 1).filter(([, other]) => !apart(box, other)).map(([other]) => `${name} × ${other}`));
      expect(overlaps).toEqual([]);
      for (const [name, box] of boxes) expect(box.y + box.height, `${name} below the screen`).toBeLessThanOrEqual(height);
    });
  });
}

// The short-screen live map sits on the bottom row beside the thumb clusters, so its slot must follow every
// touch size, steering mode and hand (a fixed offset once overlapped the Large throttle/BOOST by 6-13px).
const CONTROL_COMBOS = ['S', 'M', 'L'].flatMap(size => ['slide', 'buttons'].flatMap(mode => ['left', 'right'].map(hand => ({ size, mode, hand, version: 1 }))));
for (const locale of ['en-US', 'zh-TW']) for (const [width, height] of [[375, 667], [360, 640], [320, 568], [844, 390], [874, 339], [812, 375], [932, 430]]) {
  test.describe(`race map clears touch controls ${width}x${height}${locale === 'zh-TW' ? ' zh-TW' : ''}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true, locale });

    test('every touch size, steering mode and hand', async ({ page, context }) => {
      test.setTimeout(90000);
      if (height < 380) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: { left: 62, right: 62, top: 0, bottom: 21 } });
      // Music off up front: its prompt opens 600ms after load and would sit over START.
      await page.addInitScript(() => { document.cookie = 'skyline-rush-music=off; path=/'; });
      await page.goto('/');
      const others = ['.position-stat', '.leaderboard', '.race-progress', '.mode-indicator', '.speedometer', '.flight-telemetry', '.aero-tools',
        '#controls-button', '#pause-button', ...['left', 'right', 'brake', 'fly', 'boost', 'nitro', 'throttle'].map(action => `[data-control="${action}"]`)];
      const hits = [];
      // zh-TW only changes HUD text widths, so it runs the Large size, the tightest slot.
      for (const combo of CONTROL_COMBOS.filter(({ size }) => locale === 'en-US' || size === 'L')) {
        await page.evaluate(value => localStorage.setItem('skyline-rush-controls', value), JSON.stringify(combo));
        await page.reload();
        await page.locator('#start-button').click();
        // The countdown already lays out the race HUD (telemetry only turns visible), and skipping its 3s keeps 112 layouts quick.
        await expect(page.locator('body')).toHaveAttribute('data-phase', 'countdown');
        const tag = `${combo.size}/${combo.mode}/${combo.hand}`;
        const result = await page.evaluate(selectors => {
          const box = el => { const { x, y, width, height } = el.getBoundingClientRect(); return { x, y, width, height }; };
          const map = document.querySelector('.race-route-map');
          const [steer, brake] = ['.touch-steer', '[data-control="brake"]'].map(selector => document.querySelector(selector));
          return { map: map.checkVisibility() ? box(map) : null, events: getComputedStyle(map).pointerEvents,
            steer: steer.checkVisibility() ? box(steer) : null, brake: brake.checkVisibility() ? box(brake) : null,
            others: selectors.flatMap(selector => [...document.querySelectorAll(selector)].filter(el => el.checkVisibility()).map(el => [selector, box(el)])) };
        }, others);
        if (!result.map) { hits.push(`${tag}: map hidden`); continue; }
        if (result.events !== 'none') hits.push(`${tag}: map takes pointer events`);
        // A phone caps BRAKE short of its row: it must keep to the outer screen edge for either hand (the map slot relies on it).
        if (result.brake) {
          const [s, b] = [result.steer, result.brake];
          const gap = combo.hand === 'left' ? b.x - s.x : (s.x + s.width) - (b.x + b.width);
          if (Math.abs(gap) > 0.5) hits.push(`${tag}: brake ${Math.round(gap)}px off the outer edge`);
        }
        const m = result.map;
        if (m.x < 0 || m.y < 0 || m.x + m.width > width + 0.5 || m.y + m.height > height + 0.5) hits.push(`${tag}: map off screen`);
        for (const [name, b] of result.others) {
          const apart = m.x + m.width <= b.x + 0.5 || b.x + b.width <= m.x + 0.5 || m.y + m.height <= b.y + 0.5 || b.y + b.height <= m.y + 0.5;
          if (!apart) hits.push(`${tag}: map × ${name} ${Math.round(Math.min(m.x + m.width - b.x, b.x + b.width - m.x))}px`);
        }
      }
      expect(hits).toEqual([]);
    });
  });
}

// Insets are 0 on Android 14 and on iOS standalone once the status bar sits outside the web view.
// Android 15 draws edge-to-edge, and a notch or Dynamic Island reports its own inset.
test.describe('device safe areas', () => {
  test.use({ hasTouch: true, isMobile: true });

  test('scene stays full-bleed and controls clear each device inset', async ({ page, context }) => {
    const profiles = [
      ['notch iphone', { top: 47, bottom: 34, left: 0, right: 0 }, 390, 844],
      ['dynamic island', { top: 59, bottom: 34, left: 0, right: 0 }, 402, 874],
      ['android 15 gesture', { top: 24, bottom: 24, left: 0, right: 0 }, 412, 915],
      ['android 15 buttons', { top: 48, bottom: 48, left: 0, right: 0 }, 412, 892],
      ['android 14', { top: 0, bottom: 0, left: 0, right: 0 }, 412, 915],
      ['notch landscape', { top: 0, bottom: 21, left: 47, right: 47 }, 844, 390],
      ['android 15 landscape buttons', { top: 24, bottom: 0, left: 0, right: 48 }, 915, 412],
      ['ipad portrait', { top: 24, bottom: 20, left: 0, right: 0 }, 820, 1180],
      ['ipad landscape', { top: 24, bottom: 20, left: 0, right: 0 }, 1180, 820],
    ];
    for (const [name, insets, width, height] of profiles) {
      await page.setViewportSize({ width, height });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets });
      await page.goto('./');
      await page.evaluate(() => document.fonts.ready);
      await page.locator('#intro').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const world = await page.locator('#world').boundingBox();
      expect(world.x, name).toBeLessThanOrEqual(1);
      expect(world.y, name).toBeLessThanOrEqual(1);
      expect(world.x + world.width, name).toBeGreaterThanOrEqual(width - 1);
      expect(world.y + world.height, name).toBeGreaterThanOrEqual(height - 1);
      const bar = await page.locator('.topbar').boundingBox();
      expect(bar.y, `${name} top bar`).toBeGreaterThanOrEqual(insets.top - 1);
      expect(bar.y, `${name} top bar`).toBeLessThanOrEqual(insets.top + 1);
      const brand = await page.locator('.brand').boundingBox();
      expect(brand.x, `${name} brand`).toBeGreaterThanOrEqual(insets.left - 1);
      const camera = await page.locator('#camera-button').boundingBox();
      expect(camera.x + camera.width, `${name} camera`).toBeLessThanOrEqual(width - insets.right + 1);
      expect(camera.y, `${name} camera`).toBeGreaterThanOrEqual(insets.top - 1);
      // touch tablets hide the footer by design
      if (height >= 500 && await page.locator('.bottomline').isVisible()) {
        const line = await page.locator('.bottomline').boundingBox();
        const gap = height - (line.y + line.height);
        expect(gap, `${name} footer`).toBeGreaterThanOrEqual(insets.bottom - 1);
        expect(gap, `${name} footer`).toBeLessThanOrEqual(Math.max(22, insets.bottom) + 2);
      }
      const start = await page.locator('#start-button').boundingBox();
      expect(start.y, `${name} start`).toBeGreaterThanOrEqual(insets.top - 1);
      expect(start.y + start.height, `${name} start`).toBeLessThanOrEqual(height - insets.bottom + 1);
      await cdp.detach();
    }
  });
});

// iOS keeps the status-bar style an icon was installed with. Icons added under black-translucent
// still lay out 62 pt short of the screen, and only the root background reaches that bottom band
// (WebKit 313800). The opaque status strip of a black install is root background too.
for (const [width, height] of [[402, 874], [1440, 900]]) {
  test(`root background continues the scene's bottom edge at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('./');
    await page.locator('#intro').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
    const edge = async () => {
      // Crop a full capture: CI's 0.25 scale makes 402x874 a 100.5x218.5 px surface, and a clipped
      // strip there straddles the half pixel and reads gray. The full capture's bottom row is right.
      const png = (await page.screenshot()).toString('base64');
      return page.evaluate(async src => {
        const bitmap = await createImageBitmap(await (await fetch(`data:image/png;base64,${src}`)).blob());
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext('2d');
        context.drawImage(bitmap, 0, 0);
        const rows = Math.max(1, Math.round(bitmap.height * 4 / innerHeight));
        const { data } = context.getImageData(0, bitmap.height - rows, bitmap.width, rows);
        const sum = [0, 0, 0];
        for (let i = 0; i < data.length; i += 4) for (let c = 0; c < 3; c++) sum[c] += data[i + c];
        return sum.map(value => value / (data.length / 4));
      }, png);
    };
    const root = (await page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)).match(/\d+/g).map(Number);
    const mismatch = rgb => Math.max(...rgb.map((value, c) => Math.abs(value - root[c])));
    expect(mismatch(await edge()), 'start screen').toBeLessThanOrEqual(10);
    await page.locator('#start-button').click();
    await expect(page.locator('#race-status')).toHaveText('RACING');
    expect(mismatch(await edge()), 'racing').toBeLessThanOrEqual(10);
  });
}
