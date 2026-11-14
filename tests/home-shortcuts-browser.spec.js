import { test, expect } from './helpers/test.js';
import { selectLocale } from './helpers/locale-browser.js';
import { ciTimeout } from './helpers/ci.js';
import { resizeTo } from './helpers/viewport.js';
// CI speed: the three touch sizes share one booted page per check and are resized in place (each size is also freshly booted in one
// check), the two promoted-Garage widths share a page per locale and the four NEW-tag sizes share one page. Desktop mouse tests boot alone.

const inViewport = async (page, locator) => {
  const box = await locator.boundingBox();
  const { width, height } = page.viewportSize();
  return box && box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1;
};

test('Garage replaces Practice beside Start, advertises NEW and still opens the showroom', async ({ page }) => {
  await page.goto('/');
  const primary = page.locator('.intro-primary');
  expect(await primary.locator('button').evaluateAll(buttons => buttons.map(button => button.id))).toEqual(['start-button', 'garage-button']);
  expect(await page.locator('.intro-actions > button').evaluateAll(buttons => buttons.map(button => button.id || 'history'))).toEqual(['history', 'practice-button']);
  const garage = page.locator('#garage-button');
  await expect(garage.locator('.garage-new-tag')).toHaveText('NEW');
  await expect(garage).toHaveCSS('animation-name', 'garage-highlight');
  await garage.click();
  await expect(page.locator('#garage-screen')).toBeVisible();
});

test('Garage promotion remains distinct but stops animating with reduced motion and comfort mode', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const garage = page.locator('#garage-button');
  await expect(garage).toHaveCSS('animation-name', 'none');
  await expect(garage.locator('.garage-new-tag')).toHaveCSS('animation-name', 'none');
  await expect(garage.locator('.garage-new-tag')).toBeVisible();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(garage).toHaveCSS('animation-name', 'garage-highlight');
  await page.locator('body').evaluate(body => body.classList.add('vfx-comfort'));
  await expect(garage).toHaveCSS('animation-name', 'none');
  await expect(garage.locator('.garage-new-tag')).toHaveCSS('animation-name', 'none');
});

// The NEW-tagged Garage pushed Practice onto a second desktop row and the 900px intro scrolled by 59px.
// The system language is per browser context, so each locale boots once and visits both widths in place.
for (const system of ['en-US', 'zh-TW']) {
  test.describe(`promoted Garage fits ${system} 1280x900 and 1440x900`, () => {
    test.use({ locale: system, viewport: { width: 1280, height: 900 } });
    test('a one-line tagline pays for the Practice row, so the intro does not scroll', async ({ page }) => {
      test.setTimeout(ciTimeout(60_000));
      await page.goto('/');
      await page.evaluate(() => document.fonts.ready);
      for (const width of [1280, 1440]) await test.step(`${width}x900`, async () => {
        await resizeTo(page, width, 900);
        const title = await page.locator('#intro-title').boundingBox();
        const lineHeight = await page.locator('#intro-title').evaluate(el => parseFloat(getComputedStyle(el).lineHeight));
        expect(title.height, `${width}x900 title`).toBeLessThanOrEqual(lineHeight + 1);
        expect(await page.locator('#intro').evaluate(el => el.scrollHeight - el.clientHeight), `${width}x900 intro scrolls`).toBeLessThanOrEqual(0);
        for (const selector of ['#start-button', '#garage-button', '.history-button', '#practice-button'])
          expect((await page.locator(selector).boundingBox()).height, `${width}x900 ${selector}`).toBeGreaterThanOrEqual(44);
      });
    });
  });
}

test('home Practice opens the guide on the practice call to action, which starts the lesson', async ({ page }) => {
  await page.goto('/');
  await page.locator('#practice-button').click();
  await expect(page.locator('#guide-screen')).toBeVisible();
  await expect(page.locator('#guide-practice')).toBeFocused();
  // The practice call to action leads the guide, above the device tabs and key list.
  const [practiceBox, devicesBox] = [await page.locator('#guide-practice').boundingBox(), await page.locator('.guide-devices').boundingBox()];
  expect(practiceBox.y + practiceBox.height).toBeLessThanOrEqual(devicesBox.y);
  await page.locator('#guide-practice').click();
  await expect(page.locator('#tutorial-coach')).toHaveAttribute('data-step', 'throttle');
  await page.locator('#tutorial-exit').click();
  await expect(page.locator('#tutorial-coach')).toBeHidden();
});

test('the daily card names today\'s route and starts that challenge from the home screen', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('#daily-card');
  await expect(card).toBeVisible();
  await expect(card.locator('#daily-card-best')).toHaveText('New route every day · separate from history');
  const start = page.locator('#daily-card-start');
  await expect(start).toBeEnabled();
  await selectLocale(page, 'zh-TW');
  await expect(start).toHaveText('挑戰');
  await expect(card.locator('h2')).toHaveText('每日挑戰');
  await selectLocale(page, 'en');
  const route = await page.locator('#daily-card-route').textContent();
  await start.click();
  await expect(page.locator('#race-status')).not.toHaveText('READY');
  const trackName = await page.locator('[data-track][aria-pressed="true"] strong').textContent();
  expect(route.startsWith(trackName)).toBe(true);
});

test('the medal chip shows the tally and opens History at the medals', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('skyline-rush-medals', JSON.stringify({ 'first-win': '2026-10-01T00:00:00.000Z' })));
  await page.goto('/');
  const chip = page.locator('#medal-chip');
  await expect(chip).toHaveText('1/4');
  await expect(chip).toHaveAccessibleName('1 of 4 medals awarded.');
  await chip.click();
  await expect(page.locator('#history-screen')).toBeVisible();
  await expect(page.locator('#achievements-title')).toBeInViewport();
  await page.keyboard.press('Escape');
  await expect(page.locator('#history-screen')).toBeHidden();
  await expect(chip).toBeFocused();
});

// Home layout checks at the page's current size. Each leaves the page as it found it (scroll aside), so one booted page
// can be resized through several sizes; the helpers read `width`/`height` for the size they judge.
async function expectHomeEntriesReachable(page, width, height) {
  const start = page.locator('#start-button');
  await expect(start).toBeVisible();
  // The intro scrolls on the smallest phones (Start already sat below the fold at 320x568).
  await start.scrollIntoViewIfNeeded();
  expect(await inViewport(page, start), `${width}x${height}`).toBe(true);
  const startBox = await start.boundingBox();
  for (const selector of ['#practice-button', '.history-button', '#garage-button', '#daily-card-start']) {
    const item = page.locator(selector);
    await item.scrollIntoViewIfNeeded();
    const box = await item.boundingBox();
    expect(box.height, `${width}x${height} ${selector}`).toBeGreaterThanOrEqual(44);
    await start.scrollIntoViewIfNeeded();
    const again = await item.boundingBox();
    const now = await start.boundingBox();
    expect(again.x + again.width <= now.x || now.x + now.width <= again.x || again.y + again.height <= now.y || now.y + now.height <= again.y, `${width}x${height} ${selector} overlaps Start`).toBe(true);
  }
  expect(startBox.width).toBeGreaterThan(0);
  if (width >= 1001) {
    // A wider Garage once wrapped Practice onto a second row and made the desktop intro scroll.
    expect(await page.locator('#intro').evaluate(el => el.scrollHeight <= el.clientHeight + 1), 'desktop intro must fit without scrolling').toBe(true);
    // Desktop keeps History and the promoted Garage on the Start row.
    const [garage, history] = [await page.locator('#garage-button').boundingBox(), await page.locator('.history-button').boundingBox()];
    for (const box of [garage, history]) expect(Math.abs((startBox.y + startBox.height / 2) - (box.y + box.height / 2))).toBeLessThan(2);
  }
  expect(await page.locator('#intro').evaluate(el => el.scrollWidth <= el.clientWidth), `${width}x${height} intro scrolls sideways`).toBe(true);
}

// Compact rows may draw smaller than 44px but must still answer a 44px-tall tap (drawn box or hit area).
async function expectCompactTouchTargets(page, width, height) {
  await page.locator('button[data-race-mode="custom"]').evaluate(el => el.click());
  await page.locator('#race-mode-rules > summary').scrollIntoViewIfNeeded();
  const groups = ['.aero-tools > button, .aero-tools > details > summary, .aero-tools > .custom-select > button',
    '#showcase-camera-prev, #showcase-camera-next', '[data-race-mode]', '#race-mode-rules > summary'];
  for (const selector of groups) for (const control of await page.locator(selector).all()) {
    await control.scrollIntoViewIfNeeded();
    expect(await control.evaluate(el => {
      const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
      return [y - 21.5, y + 21.5].every(py => el.contains(document.elementFromPoint(x, py)));
    }), `${width}x${height} ${selector} ${await control.textContent()}`).toBe(true);
  }
  await page.locator('#settings-button').click();
  expect((await page.locator('#mute-all').boundingBox()).height, `${width}x${height} #mute-all`).toBeGreaterThanOrEqual(44);
  // Close the audio panel again so the next size starts from the same page.
  await page.locator('#settings-button').click();
  await expect(page.locator('#settings-panel')).toBeHidden();
}

async function expectTopBarPanelsTouchable(page, width, height) {
  const touch = width < 1001;
  const tall = async locator => { for (const el of await locator.all()) expect((await el.boundingBox()).height, `${width}x${height} ${await el.getAttribute('aria-label') ?? await el.textContent()}`).toBeGreaterThanOrEqual(44); };
  await page.locator('#settings-button').click();
  if (touch) await tall(page.locator('#settings-panel input[type="range"]'));
  await page.keyboard.press('Escape');
  await page.locator('.aero-tools > .custom-select > button').click();
  if (touch) await tall(page.locator('.aero-tools > .custom-select [role="option"]'));
  await page.keyboard.press('Escape');
  await page.locator('#vfx-panel > summary').click();
  // A fixed-width select must never spill past the panel's padding (320px wrapped "Showcase camera").
  const spill = await page.locator('.vfx-settings').evaluate(panel => {
    const edge = panel.getBoundingClientRect().right - parseFloat(getComputedStyle(panel).paddingRight);
    return [...panel.querySelectorAll(':scope > label > .custom-select > button')].filter(b => b.offsetParent).map(b => Math.round(b.getBoundingClientRect().right - edge)).filter(px => px > 1);
  });
  expect(spill, `${width}x${height}`).toEqual([]);
  if (touch) { await page.locator('#vfx-reset').scrollIntoViewIfNeeded(); await tall(page.locator('#vfx-reset')); }
  // Fold the VFX panel away again so the next size starts from the same page.
  await page.locator('#vfx-panel > summary').click();
  await expect(page.locator('#vfx-panel')).not.toHaveAttribute('open', '');
}

// Desktop (mouse) boots alone: hasTouch/isMobile are fixed per browser context. The three touch sizes share one booted
// page per check; each size is also reached by a fresh boot in one of the three checks (the size the check starts at).
test.describe('1440x900', () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test('home entries are reachable, sized for touch and never cover Start', async ({ page }) => {
    await page.goto('/');
    await expectHomeEntriesReachable(page, 1440, 900);
  });
  test('top-bar panels keep 44px taps and their selects inside the panel', async ({ page }) => {
    await page.goto('/');
    await expectTopBarPanelsTouchable(page, 1440, 900);
  });
});

const TOUCH_SIZES = [[390, 844], [320, 568], [844, 390]];
const touchChecks = [
  ['home entries are reachable, sized for touch and never cover Start', expectHomeEntriesReachable, TOUCH_SIZES[0]],
  ['compact touch controls still take a 44px tap', expectCompactTouchTargets, TOUCH_SIZES[2]],
  ['top-bar panels keep 44px taps and their selects inside the panel', expectTopBarPanelsTouchable, TOUCH_SIZES[1]],
];
for (const [title, check, [bootWidth, bootHeight]] of touchChecks) {
  test.describe(`touch sizes, booted at ${bootWidth}x${bootHeight}`, () => {
    test.use({ viewport: { width: bootWidth, height: bootHeight }, hasTouch: true, isMobile: true });
    test(`${title} at 390x844, 320x568 and 844x390`, async ({ page }) => {
      test.setTimeout(ciTimeout(90_000));
      await page.goto('/');
      for (const [width, height] of [[bootWidth, bootHeight], ...TOUCH_SIZES.filter(([w, h]) => w !== bootWidth || h !== bootHeight)]) await test.step(`${width}x${height}`, async () => {
        await resizeTo(page, width, height);
        await check(page, width, height);
      });
    });
  });
}

// The rules row (z-index 1, blurred) overlapped the corner NEW tag on desktop, and phones showed an inline tag instead.
// One mouse-context page visits every size in place; the intro is scrolled back to the top after each one.
const TAG_SIZES = { desktop: { width: 1280, height: 900 }, phone: { width: 390, height: 844 }, landscape: { width: 568, height: 320 }, narrow: { width: 320, height: 568 } };
test('Garage NEW tag is a top-corner overlay and never covered (desktop, phone, landscape, narrow)', async ({ page }) => {
  test.setTimeout(ciTimeout(60_000));
  await page.setViewportSize(TAG_SIZES.desktop);
  await page.goto('/');
  for (const [name, size] of Object.entries(TAG_SIZES)) await test.step(`${name} ${size.width}x${size.height}`, async () => {
    await resizeTo(page, size.width, size.height);
    const garage = page.locator('#garage-button'), tag = garage.locator('.garage-new-tag');
    await expect(tag).toBeVisible();
    await expect(tag).toHaveCSS('position', 'absolute');
    const hit = async () => tag.evaluate(el => { const r = el.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return true; /* Garage itself is scrolled away (568x320 landscape, pre-existing) */ return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
    expect(await hit(), `${name}: tag covered`).toBe(true);
    // Scrolling the intro (pinned row on phones) must not slide other widgets over the tag.
    await page.locator('#intro').evaluate(el => { el.scrollTop = el.scrollHeight; });
    expect(await hit(), `${name}: tag covered at the bottom`).toBe(true);
    await page.locator('#intro').evaluate(el => { el.scrollTop = el.scrollHeight / 2; });
    expect(await hit(), `${name}: tag covered halfway`).toBe(true);
    await page.locator('#intro').evaluate(el => { el.scrollTop = 0; });
  });
});
