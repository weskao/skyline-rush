import { test, expect } from './helpers/test.js';
import { test as gameplayTest } from './helpers/gameplay-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { selectLocale } from './helpers/locale-browser.js';
import { resizeTo } from './helpers/viewport.js';
import { START_LAYOUT_SIZES, AIRFLOW_START_CLASSES, readAirflowStart, expectAirflowStartClear } from './helpers/responsive-start.js';
import { HOME_VERSION_SIZES, readHomeVersion, expectHomeVersion } from './helpers/responsive-home-version.js';
import { SAFE_AREA_PROFILES, readSafeArea, expectSafeArea } from './helpers/responsive-safe-areas.js';
import { RACE_MAP_SIZES, CONTROL_COMBOS, mapInsets, startControlCombo, readMapLayout, mapHits } from './helpers/responsive-map.js';
import { RACE_HUD_CLASSES, bootAirflowRace, readHudBoxes, expectHudBlocksApart } from './helpers/responsive-hud.js';

// Responsive layout: every size below is still checked, but each layout class boots once and walks its sizes with resizeTo (the
// size lists live in tests/helpers/responsive-*.js, pinned by tests/responsive-matrix.test.js). Intro, landscape-home and
// paint-guard tests keep one boot per size because they start a race or reload.

// One boot per locale: the page resizes through the sizes (the browser context, hasTouch included, is the same for all of them).
for (const locale of ['en', 'zh-TW']) {
  test(`home version stays vertically centered beside the footer tagline in ${locale} at ${HOME_VERSION_SIZES.map(size => size.join('x')).join(' ')}`, async ({ page }) => {
    test.setTimeout(ciTimeout(60000));
    const [[width, height]] = HOME_VERSION_SIZES;
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
    await page.goto('/');
    await selectLocale(page, locale);
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await page.evaluate(() => document.fonts.ready);
    for (const [w, h] of HOME_VERSION_SIZES) {
      await test.step(`${w}x${h}`, async () => {
        if (w !== width || h !== height) await resizeTo(page, w, h);
        expectHomeVersion(await readHomeVersion(page), w, h, locale);
        await page.locator('#whats-new-open').click();
        await expect(page.locator('#whats-new-screen')).toBeVisible();
        await page.locator('#release-close').click();
      });
    }
  });
}

for (const [width, height, hasTouch] of START_LAYOUT_SIZES) {
  test.describe(`start layout ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch });

    test('intro content stays clear of the HUD and actions remain reachable', async ({ page }) => {
      test.setTimeout(ciTimeout(90000));
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
      // Landscape phones put Start in the right rail (bottom-right thumb zone): fully on screen, never over the panel.
      const railStart = height <= 500 && width > height;
      if (railStart) {
        // The pinned Garage row shares Start's baseline and never covers the track cards (a portrait max-height lifted it 32px at 320 tall).
        const [card, garage, start] = await Promise.all(['.track-select button', '#garage-button', '#start-button']
          .map(selector => intro.locator(selector).first().boundingBox()));
        expect(card.y + card.height, 'pinned row covers the track cards').toBeLessThanOrEqual(garage.y);
        expect(Math.abs(garage.y + garage.height - (start.y + start.height)), 'pinned row bottom matches Start').toBeLessThanOrEqual(2);
      }
      for (const selector of ['#start-button', '.history-button', '.flight-tip']) {
        const item = intro.locator(selector);
        if (!await item.isVisible()) continue;
        await item.scrollIntoViewIfNeeded();
        const box = await item.boundingBox();
        if (railStart && selector === '#start-button') {
          expect(box.x >= bounds.x + bounds.width && box.x + box.width <= width && box.y >= 0 && box.y + box.height <= height,
            'rail Start is on screen, right of the panel').toBe(true);
          continue;
        }
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
      // Big viewports render few frames on CI and each frame's step is clamped, so the countdown can outlast the default.
      await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
    });
  });
}

// The airflow showcase boots once per touch class and resizes the same page; a >= 900 px size starts the race, so it comes last.
for (const { hasTouch, sizes } of AIRFLOW_START_CLASSES) {
  const [[width, height]] = sizes;
  test.describe(`start layout airflow ${sizes.map(size => size.join('x')).join(' ')}`, () => {
    test.use({ viewport: { width, height }, hasTouch });

    test('airflow showcase keeps Start clear of the car and the panels', async ({ page }) => {
      test.setTimeout(ciTimeout(60000));
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      await page.keyboard.press('v');
      await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'false');
      for (const [w, h] of sizes) {
        await test.step(`${w}x${h}`, async () => {
          if (w !== width || h !== height) await resizeTo(page, w, h);
          const found = await readAirflowStart(page);
          expectAirflowStartClear(found, w, h);
          // shortcut: the showcase car's projection isn't exposed to the page, so this checks the 40-68% column it is drawn in
          // from 900 px up (narrower screens draw it above Start); assert real car bounds if world gains a QA hook.
          if (w >= 900) {
            expect(found.start.x, `${w}x${h} Start covers the showcased car`).toBeGreaterThanOrEqual(w * 0.68);
            await page.locator('#start-button').click();
            await expect(page.locator('#race-status')).toHaveText('RACING', { timeout: ciTimeout(30000) });
          }
        });
      }
    });
  });
}

for (const width of [320, 390]) {
  test.describe(`daily challenge title ${width}px`, () => {
    test.use({ viewport: { width, height: 844 }, hasTouch: true, isMobile: true, timezoneId: 'UTC' });

    test('the full title fits in both languages on a long-title day', async ({ page }) => {
      await page.clock.install({ time: new Date('2026-10-25T12:00:00Z') });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const title = page.locator('#daily-card-route');
      await expect(title).toHaveText('Aurora Pass · Double traffic');
      for (const locale of ['en', 'zh-TW']) {
        await page.locator('#locale-select').selectOption(locale, { force: true });
        await expect(title).toBeVisible();
        expect(await title.evaluate(el => el.scrollWidth <= el.clientWidth && el.scrollHeight <= el.clientHeight)).toBe(true);
        expect((await page.locator('#daily-card-start').boundingBox()).height).toBeGreaterThanOrEqual(44);
        await page.screenshot({ path: test.info().outputPath(`daily-title-${width}-${locale}.png`), animations: 'disabled' });
      }
    });
  });
}

// Chrome on iPhone (browser tab, not installed) overlays a bottom toolbar without shrinking the fixed layout box, so
// 100% - 100dvh is the covered band; Chromium here has no such toolbar, so --browser-bar stands in for it.
for (const [width, height] of [[844, 390], [667, 375]]) {
  test.describe(`landscape home under a browser toolbar ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('Start, the rail and the pinned row stay above the toolbar', async ({ page }) => {
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const bottomOf = async selector => { const box = await page.locator(selector).first().boundingBox(); return box.y + box.height; };
      expect(Math.abs(await bottomOf('#start-button') - (height - 10)), 'no toolbar: Start keeps its 10px edge').toBeLessThanOrEqual(1);
      const bar = 56;
      await page.evaluate(px => document.body.style.setProperty('--browser-bar', `${px}px`), bar);
      const [tools, daily, dock, start, card, garage] = await Promise.all(['.aero-tools', '#daily-card', '#showcase-camera-dock',
        '#start-button', '.track-select button', '#garage-button'].map(selector => page.locator(selector).first().boundingBox()));
      expect(Math.abs(start.y + start.height - (height - bar - 10)), 'Start sits 10px above the toolbar').toBeLessThanOrEqual(1);
      expect(Math.abs(garage.y + garage.height - (start.y + start.height)), 'pinned row follows Start').toBeLessThanOrEqual(2);
      expect(card.y + card.height, 'pinned row covers the track cards').toBeLessThanOrEqual(garage.y);
      expect(dock.y + dock.height).toBeLessThanOrEqual(start.y);
      expect(daily.y + daily.height).toBeLessThanOrEqual(dock.y);
      expect(daily.y, 'rail runs into the AIRFLOW / VFX row').toBeGreaterThanOrEqual(tools.y + tools.height);
      await page.keyboard.press('v');
      await expect(page.locator('#airflow-hud')).toHaveAttribute('aria-hidden', 'false');
      expect(await bottomOf('#start-button'), 'AIRFLOW Start sits above the toolbar').toBeLessThanOrEqual(height - bar - 10);
    });
  });
}

// Page boxes measured on an iPhone (402x874 pt): Chrome landscape is 743x340 with its tab strip outside the page and a
// left notch / bottom home-indicator inset; an in-app browser (Telegram) leaves only 756x265. The panel and the rail scale
// down together so the home keeps its layout: Start bottom-right, rail below the top-bar tools, cards above the pinned row.
for (const [name, width, height, insets] of [['Chrome', 743, 340, { left: 62, right: 0, top: 0, bottom: 20 }],
  ['in-app browser', 756, 265, null]]) {
  test.describe(`landscape home in ${name} ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('the scaled panel and rail keep Start bottom-right without overlaps', async ({ page, context }) => {
      if (insets) await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets });
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      const intro = page.locator('#intro');
      await intro.evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
      const edge = Math.max(10, insets?.bottom ?? 0);
      for (const locale of ['en', 'zh-TW']) {
        await page.locator('#locale-select').selectOption(locale, { force: true });
        const [tools, daily, dock, start, card, garage, panel] = await Promise.all(['.aero-tools', '#daily-card',
          '#showcase-camera-dock', '#start-button', '.track-select button', '#garage-button', '#intro']
          .map(selector => page.locator(selector).first().boundingBox()));
        await page.screenshot({ path: test.info().outputPath(`home-${width}x${height}-${locale}.png`), animations: 'disabled' });
        expect(Math.abs(start.y + start.height - (height - edge)), `${locale} Start keeps its bottom edge`).toBeLessThanOrEqual(1);
        expect(start.x + start.width, `${locale} Start stays right`).toBeLessThanOrEqual(width - 10);
        expect(start.x, `${locale} Start sits right of the panel`).toBeGreaterThanOrEqual(panel.x + panel.width);
        expect(panel.x, `${locale} panel clears the notch`).toBeGreaterThanOrEqual(Math.max(16, insets?.left ?? 0) - 1);
        expect(dock.y + dock.height, `${locale} dock above Start`).toBeLessThanOrEqual(start.y);
        expect(daily.y + daily.height, `${locale} daily above dock`).toBeLessThanOrEqual(dock.y);
        expect(daily.y, `${locale} rail runs into the AIRFLOW / VFX row`).toBeGreaterThanOrEqual(tools.y + tools.height);
        expect(card.y + card.height, `${locale} pinned row covers the track cards`).toBeLessThanOrEqual(garage.y);
        expect(start.height, `${locale} Start stays a usable tap target`).toBeGreaterThanOrEqual(36);
      }
      // iOS WebKit (not desktop engines) clips a fixed box to a scroller that is, or holds, its nearest stacking context:
      // Start, Daily and the dock were invisible yet tappable on iPhone Chrome. Only a fixed ancestor lifts them out.
      const clippedBy = await page.evaluate(() => ['#start-button', '#daily-card', '#showcase-camera-dock'].map(selector => {
        for (let el = document.querySelector(selector).parentElement; el; el = el.parentElement) {
          const { position, zIndex, display } = getComputedStyle(el);
          if (display === 'contents') continue; // no box, so no stacking context
          if (position === 'fixed') return null;
          if (position === 'sticky' || (position !== 'static' && zIndex !== 'auto')) {
            for (let up = el; up; up = up.parentElement) if (/auto|scroll/.test(getComputedStyle(up).overflowY)) return `${selector} in ${el.className}`;
            return null;
          }
        }
        return null;
      }).filter(Boolean));
      expect(clippedBy, 'rail painted inside the scrolling panel').toEqual([]);
      await page.locator('#start-button').click();
      await expect(intro).toBeHidden();
    });
  });
}

// iPhone Chrome 154 (743x340, diag log 2026-11-09): on first load the rail had its real place and took taps, but was not
// painted. iOS WebKit paints a fixed box into an animating ancestor's layer, clipped to that ancestor's box, and the
// rail lies outside the panel. Desktop engines composite it correctly, so the guard is that no ancestor animates.
for (const [width, height] of [[743, 340], [844, 390]]) {
  test.describe(`landscape home rail paint ${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true });

    test('no ancestor of the fixed rail runs an animation', async ({ page }) => {
      await page.goto('/');
      const animated = await page.evaluate(() => ['#start-button', '#daily-card', '#showcase-camera-dock'].flatMap(selector => {
        const found = [];
        for (let el = document.querySelector(selector)?.parentElement; el; el = el.parentElement) {
          if (getComputedStyle(el).animationName !== 'none') found.push(`${selector} < ${el.id || el.className}`);
        }
        return found;
      }));
      expect(animated).toEqual([]);
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

// One booted race per class: the first size is the fresh boot, the rest resize the same page (tests/helpers/viewport.js).
// hasTouch / isMobile / locale are fixed per browser context, so each class below keeps its own test.
for (const { name, locale, hasTouch, sizes } of RACE_HUD_CLASSES) {
  const [[width, height, insets]] = sizes;
  test.describe(`race HUD ${name}`, () => {
    test.use({ viewport: { width, height }, hasTouch, isMobile: hasTouch, locale });

    test('racing HUD blocks stay apart', async ({ page, context }) => {
      test.setTimeout(ciTimeout(75000));
      await bootAirflowRace(page, context, locale, insets);
      for (const [w, h, sizeInsets] of sizes) {
        await test.step(`${w}x${h}`, async () => {
          if (w !== width || h !== height) {
            await resizeTo(page, w, h, sizeInsets ?? null);
            await expect(page.locator('#countdown'), `${w}x${h} countdown`).toBeHidden();
            await expect(page.locator('.race-route-map'), `${w}x${h} live map`).toBeVisible();
          }
          expectHudBlocksApart(await readHudBoxes(page), w, h);
        });
      }
    });
  });
}

// The short-screen live map must follow every touch size, steering mode and hand. Each combo reloads once (the app reads it
// at load), reaches the countdown HUD once, then the same page walks the seven viewports; the first size is the fresh boot.
// zh-TW only changes HUD text widths, so it runs the Large size, the tightest slot. Split so no test passes ~150 estimated CI seconds.
const MAP_CLASSES = [
  ...['S', 'M', 'L'].map(size => ({ locale: 'en-US', combos: CONTROL_COMBOS.filter(combo => combo.size === size) })),
  { locale: 'zh-TW', combos: CONTROL_COMBOS.filter(combo => combo.size === 'L') },
];
for (const { locale, combos } of MAP_CLASSES) {
  test.describe(`race map clears touch controls ${locale} ${combos[0].size}`, () => {
    const [[width, height]] = RACE_MAP_SIZES;
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: true, locale });

    test('every touch size, steering mode and hand', async ({ page }) => {
      test.setTimeout(ciTimeout(90000));
      // Music off up front: its prompt opens 600ms after load and would sit over START.
      await page.addInitScript(() => localStorage.setItem('skyline-rush-music', 'off'));
      await page.goto('/');
      for (const combo of combos) {
        // Back at the boot size before the reload, so every combo starts like a fresh page there.
        await resizeTo(page, width, height, mapInsets(height));
        await startControlCombo(page, combo);
        for (const [w, h] of RACE_MAP_SIZES) {
          await test.step(`${combo.size}/${combo.mode}/${combo.hand} ${w}x${h}`, async () => {
            if (w !== width || h !== height) await resizeTo(page, w, h, mapInsets(h));
            expect(mapHits(await readMapLayout(page), combo, w, h)).toEqual([]);
          });
        }
      }
    });
  });
}

test.describe('device safe areas', () => {
  test.use({ hasTouch: true, isMobile: true });

  // One booted page walks every device profile (resizeTo sets the viewport and its insets); nine fresh loads in one test overran the timeout on slow runners.
  test('scene stays full-bleed and controls clear every device inset', async ({ page, context }) => {
    test.setTimeout(ciTimeout(60000));
    const [[, firstInsets, firstWidth, firstHeight]] = SAFE_AREA_PROFILES;
    await page.setViewportSize({ width: firstWidth, height: firstHeight });
    await (await context.newCDPSession(page)).send('Emulation.setSafeAreaInsetsOverride', { insets: firstInsets });
    await page.goto('./');
    await page.evaluate(() => document.fonts.ready);
    for (const [name, insets, width, height] of SAFE_AREA_PROFILES) {
      await test.step(`${name} ${width}x${height}`, async () => {
        if (width !== firstWidth || height !== firstHeight || insets !== firstInsets) await resizeTo(page, width, height, insets);
        await page.locator('#intro').evaluate(el => Promise.all(el.getAnimations().map(animation => animation.finished)));
        expectSafeArea(await readSafeArea(page), name, insets, width, height);
      });
    }
  });

  // Chromium never matches the iOS-only @supports block, so the test applies its real rules by hand.
  test('iOS footer and version sit in the home-indicator inset, clear of the bar', async ({ page, context }) => {
    for (const [name, bottom, width, height] of [['notch iphone', 34, 390, 844], ['dynamic island', 34, 402, 874], ['ipad portrait', 20, 820, 1180]]) {
      await page.setViewportSize({ width, height });
      const cdp = await context.newCDPSession(page);
      await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 47, bottom, left: 0, right: 0 } });
      await page.goto('./');
      await page.evaluate(() => document.fonts.ready);
      const iosRules = await page.evaluate(() => [...document.styleSheets].flatMap(sheet => [...sheet.cssRules])
        .filter(rule => rule instanceof CSSSupportsRule && rule.conditionText.includes('-webkit-touch-callout'))
        .flatMap(rule => [...rule.cssRules].map(inner => inner.cssText)).join('\n'));
      expect(iosRules, 'iOS @supports block').toContain('.bottomline');
      await page.addStyleTag({ content: iosRules });
      // iOS draws the home indicator 8-13px above the bottom edge.
      for (const selector of ['.bottomline', '.build-version']) {
        if (!await page.locator(selector).isVisible()) continue; // touch tablets hide the footer
        const box = await page.locator(selector).boundingBox();
        const gap = height - (box.y + box.height);
        expect(gap, `${name} ${selector}`).toBeGreaterThanOrEqual(16);
        if (bottom > 21) expect(gap, `${name} ${selector}`).toBeLessThan(bottom);
      }
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

// A callout can fire mid-flight (slow CI runners hit it by timing); on phones its two-line form once ran into the flight director.
for (const [width, height] of [[390, 844], [375, 667], [320, 568], [844, 390]]) {
  gameplayTest(`flight director and a mid-flight callout stay apart at ${width}x${height}`, async ({ gameplayPage: page }) => {
    await page.setViewportSize({ width, height });
    await page.locator('#start-button').click();
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'racing', { timeout: ciTimeout(15000) });
    await page.evaluate(() => { document.activeElement?.blur(); window.gameplay.race.player.speed = 90; });
    await page.keyboard.down('Space');
    await expect(page.locator('body')).toHaveClass(/airborne/);
    await expect(page.locator('.flight-director')).toHaveCSS('opacity', '0.8');
    await page.evaluate(() => { const car = window.gameplay.race.player; car.nearMisses++; car.nearMiss = { time: window.gameplay.race.elapsed, combo: 4, charge: 37 }; });
    await expect(page.locator('#event-callout')).toBeVisible();
    // No settle wait: the overlap must be gone from the callout's first frame, not after a fade (CI's i18n check caught one mid-fade).
    const [director, callout] = await Promise.all(['.flight-director', '#event-callout'].map(selector => page.locator(selector).boundingBox()));
    // Callouts last ~1.4s; on a portrait phone the director may step aside (fade out) for one instead of moving.
    const directorShown = await page.locator('.flight-director').evaluate(el => Number(getComputedStyle(el).opacity) > 0.05);
    await page.keyboard.up('Space');
    expect(!directorShown || callout.y + callout.height <= director.y + 0.5 || director.y + director.height <= callout.y + 0.5 ||
      callout.x + callout.width <= director.x + 0.5 || director.x + director.width <= callout.x + 0.5,
    `callout ${JSON.stringify(callout)} overlaps director ${JSON.stringify(director)}`).toBe(true);
  });
}

// iOS fires resize on rotation before the new layout lands, so the scene must follow the canvas box itself.
test('scene aspect follows the canvas when its size changes without a resize event', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('./');
  const mismatch = () => page.locator('#world').evaluate(canvas =>
    Math.abs(canvas.width / canvas.height - canvas.clientWidth / canvas.clientHeight));
  await expect.poll(mismatch).toBeLessThan(0.02);
  // The stale landscape box iOS can leave behind after rotating back to portrait.
  await page.locator('#world').evaluate(canvas => { canvas.style.width = '874px'; canvas.style.height = '402px'; });
  await expect.poll(mismatch).toBeLessThan(0.02);
  await page.locator('#world').evaluate(canvas => canvas.removeAttribute('style'));
  await expect.poll(mismatch).toBeLessThan(0.02);
});

test.describe('airflow panel in landscape', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 874, height: 402 } });

  test('clears the Dynamic Island inset', async ({ page, context }) => {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, bottom: 21, left: 62, right: 62 } });
    await page.goto('./');
    const left = await page.locator('#airflow-hud').evaluate(el => el.getBoundingClientRect().left);
    expect(left).toBeGreaterThanOrEqual(62);
  });
});
