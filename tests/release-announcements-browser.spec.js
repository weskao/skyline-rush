import fs from 'node:fs';
import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { recentReleases, UPCOMING } from '../src/release-notes.ts';

const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const SEEN_KEY = 'skyline-rush-whats-new-seen-v1';
// Notes for the coming release show first as Upcoming and are never announced, marked unread or recorded as seen;
// once the release commit names them they count like any other entry, so these checks follow what the build holds.
const announced = recentReleases().map(release => release.version).filter(v => v !== UPCOMING);
const hasUpcoming = recentReleases().some(release => release.version === UPCOMING);
const tabFor = (dialog, v) => dialog.locator(`[role="tab"][data-version="${v}"]`);
// Upcoming notes stop automatic opening; manually opening them reads no published version.
const openIfNotAuto = page => hasUpcoming ? page.locator('#whats-new-open').click() : Promise.resolve();
// Page scripts run after the helper's context script, so this replaces its "already seen" record on the first load only.
const seedSeen = (page, value) => page.addInitScript(([key, seen]) => {
  if (sessionStorage.getItem('seeded-whats-new')) return;
  sessionStorage.setItem('seeded-whats-new', '1');
  if (seen === null) localStorage.removeItem(key); else localStorage.setItem(key, seen);
}, [SEEN_KEY, value]);
// The automatic check runs once the 3D world is up on the ready screen.
const settle = async page => {
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
};

test('players can read bilingual release notes, dismiss and reopen them', async ({ page }) => {
  await page.goto('/');
  const opener = page.locator('#whats-new-open');
  await expect(opener).toBeVisible();
  await opener.click();
  const dialog = page.locator('#whats-new-screen');
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('#release-title')).toHaveText("What's new");
  await expect(dialog.locator('.release-entry')).not.toHaveCount(0);
  await expect(dialog.locator('a')).toHaveCount(0); // no "All changes" link out of the game
  await page.locator('#locale-select').selectOption('zh-TW', { force: true });
  await expect(dialog.locator('#release-title')).toHaveText('新版本功能');
  await expect(dialog.locator('.release-entry').first().locator('strong')).toContainText(/[㐀-鿿]/);
  await page.screenshot({path: test.info().outputPath('whats-new-zh-TW.png'), animations: 'disabled'});
  await page.locator('#release-continue').click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(dialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});

test('players switch between the latest releases by click and keyboard', async ({ page }) => {
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  const tabs = dialog.getByRole('tab');
  const count = await tabs.count();
  expect(count).toBeGreaterThanOrEqual(3);
  expect(count).toBeLessThanOrEqual(5);
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toContainText(hasUpcoming ? 'Upcoming' : 'v' + version);
  await expect(dialog.getByRole('tabpanel')).toBeVisible();

  const second = tabs.nth(1);
  const secondVersion = await second.getAttribute('data-version');
  await second.click();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'false');
  await expect(dialog.locator('#release-version')).toHaveText('v' + secondVersion);
  await expect(dialog.locator('.release-entry')).not.toHaveCount(0);

  await page.keyboard.press('ArrowRight');
  await expect(tabs.nth(2)).toBeFocused();
  await expect(tabs.nth(2)).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowRight'); // wraps to the newest
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('ArrowLeft');
  await expect(tabs.last()).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Home');
  await expect(tabs.first()).toBeFocused();

  await second.click();
  await page.locator('#locale-select').selectOption('zh-TW', { force: true });
  await expect(second).toHaveAttribute('aria-selected', 'true'); // a language change keeps the chosen release
  await expect(dialog.locator('#release-version')).toHaveText('v' + secondVersion);
  await page.locator('#release-continue').click();
  await page.locator('#whats-new-open').click();
  await expect(tabs.first()).toHaveAttribute('aria-selected', 'true'); // reopening starts at the newest
});

test('release notes support optional localized hero images without leaking racing shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  const hero = dialog.locator('#release-hero');
  for (const release of recentReleases()) {
    await tabFor(dialog, release.version).click();
    for (const locale of ['en', 'zh-TW']) {
      await page.locator('#locale-select').selectOption(locale, { force: true });
      await expect(dialog.locator('.release-entry').first()).toBeVisible();
      const image = typeof release.image === 'string' ? release.image : release.image?.[locale] ?? release.image?.en;
      if (image) {
        await expect(hero).toBeVisible();
        await expect(hero).toHaveAttribute('src', '/' + image);
        await expect.poll(() => hero.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
      } else {
        await expect(hero).toBeHidden();
        await expect(hero).not.toHaveAttribute('src');
      }
    }
  }
  await page.keyboard.press('Enter'); // dialog control, not race start
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
});

test('a returning player on an older version gets the notes once, and the record moves forward', async ({ page }) => {
  await seedSeen(page, '0.1.0');
  await page.goto('/');
  const dialog = page.locator('#whats-new-screen');
  if (hasUpcoming) { // Upcoming notes never open by themselves and never replace the record
    await settle(page);
    await expect(dialog).toBeHidden();
    expect(await page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toBe('0.1.0');
    return;
  }
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toContain(version);
  await expect(page.locator('#whats-new-open')).toHaveClass(/has-update/); // older visible releases remain unread
  await page.locator('#release-continue').click();
  await page.reload();
  await settle(page);
  await expect(dialog).toBeHidden();
});

test.describe('several releases missed', () => {
  const shown = announced;
  test.use({ whatsNewSeen: null });
  test('each displayed release clears only its own dot, and Home keeps its dot until all are read', async ({ page }) => {
    await seedSeen(page, shown[2]);
    await page.goto('/');
    await openIfNotAuto(page);
    const dialog = page.locator('#whats-new-screen'), opener = page.locator('#whats-new-open');
    const newest = tabFor(dialog, shown[0]), older = tabFor(dialog, shown[1]);
    const dot = '.release-tab-unread';
    await expect(dialog).toBeVisible();
    await expect(newest.locator(dot)).toHaveCount(hasUpcoming ? 1 : 0);
    await expect(older.locator(dot)).toHaveCount(1);
    await expect(older.locator(dot)).toHaveText('New');
    await expect(opener).toHaveClass(/has-update/);
    if (hasUpcoming) await newest.click();
    await expect(newest.locator(dot)).toHaveCount(0);
    await expect(older.locator(dot)).toHaveCount(1);
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(older.locator(dot)).toHaveText('未讀');
    await page.locator('#release-continue').click();
    await expect(opener.locator(dot)).toBeVisible();
    await page.reload();
    await settle(page);
    await expect(dialog).toBeHidden();
    await expect(opener.locator(dot)).toBeVisible();
    await opener.click();
    await expect(newest.locator(dot)).toHaveCount(0);
    await expect(older.locator(dot)).toHaveCount(1);
    await newest.click();
    await page.keyboard.press('ArrowRight');
    await expect(older).toHaveAttribute('aria-selected', 'true');
    await expect(dialog.locator(dot)).toHaveCount(0);
    await expect(opener).not.toHaveClass(/has-update/);
    await page.locator('#release-continue').click();
    await expect(opener.locator(dot)).toHaveCount(0);
    await page.reload();
    await settle(page);
    await expect(opener.locator(dot)).toHaveCount(0);
    await opener.click();
    await expect(dialog.locator(dot)).toHaveCount(0);
  });

  for (const [width, height] of [[1440,900],[390,844]]) test(`the unread badge sits on the tab's top-right corner at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await seedSeen(page, shown[2]);
    await page.goto('/');
    await openIfNotAuto(page);
    const tab = tabFor(page.locator('#whats-new-screen'), shown[1]);
    await expect(tab.locator('.release-tab-unread')).toBeVisible();
    const [t, badge, label, rail] = await Promise.all([tab, tab.locator('.release-tab-unread'), tab.locator('.release-tab-version'), page.locator('#release-versions')].map(l => l.boundingBox()));
    expect(Math.abs(badge.width - badge.height)).toBeLessThanOrEqual(1); // a round dot, not a text tag
    expect(badge.width).toBeLessThanOrEqual(12);
    expect(Math.abs(badge.y + badge.height / 2 - t.y)).toBeLessThanOrEqual(2); // centred on the top border
    expect(badge.x + badge.width).toBeGreaterThan(t.x + t.width); // overhangs the right edge
    expect(badge.y + badge.height).toBeLessThanOrEqual(label.y + 1); // never covers the version
    expect(badge.y).toBeGreaterThanOrEqual(rail.y); // not clipped by the scrolling rail
    expect(label.x + label.width).toBeLessThanOrEqual(t.x + t.width); // the badge adds no width to the tab
  });
});

test('a player already on the latest notes is not interrupted', async ({ page }) => {
  await seedSeen(page, version);
  await page.goto('/');
  await settle(page);
  await expect(page.locator('#whats-new-screen')).toBeHidden();
  await expect(page.locator('#whats-new-open')).not.toHaveClass(/has-update/);
});

test.describe('first visit', () => {
  test.use({ guideSeen: false });
  test('a first-time or incognito visit gets the notes on load, and the version is recorded', async ({ page }) => {
    await seedSeen(page, null);
    await page.goto('/');
    if (hasUpcoming) { // Upcoming notes never open by themselves and never replace the record
      await settle(page);
      await expect(page.locator('#whats-new-screen')).toBeHidden();
      expect(await page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toBeNull();
      return;
    }
    await expect(page.locator('#whats-new-screen')).toBeVisible();
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toContain(version);
  });
});

for (const [width, height] of [[1440,900],[390,844],[320,740],[844,390]]) {
  test.describe(`release dialog ${width}x${height}`, () => {
    test.use({viewport:{width,height}});
    test('dialog fits safe viewport and primary controls are clickable', async ({page}) => {
      await page.goto('/');
      await page.locator('#whats-new-open').click();
      const d=page.locator('#whats-new-screen'), close=page.locator('#release-continue');
      await expect(d).toBeVisible();
      await page.screenshot({ path: test.info().outputPath('whats-new-' + width + 'x' + height + '.png'), animations: 'disabled' });
      const box=await d.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(-1);
      expect(box.y).toBeGreaterThanOrEqual(-1);
      expect(box.x+box.width).toBeLessThanOrEqual(width+1);
      expect(box.y+box.height).toBeLessThanOrEqual(height+1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
      for (const tab of await d.getByRole('tab').all()) expect((await tab.boundingBox()).height).toBeGreaterThanOrEqual(44);
      await d.getByRole('tab').last().click();
      await expect(d.getByRole('tab').last()).toHaveAttribute('aria-selected', 'true');
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await close.click();
      await expect(d).toBeHidden();
    });
  });
}

test('scrolled notes slide under the dialog top edge, never over its gradient bar', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  await expect(dialog).toBeVisible();
  const scrolled = await dialog.evaluate(el => { el.scrollTop = 120; return el.scrollTop; });
  expect(scrolled).toBeGreaterThan(0);
  // The 3px bar is the dialog's own ::before: a hit test on it must return the dialog, not scrolled media or cards.
  const hit = await dialog.evaluate(el => {
    const r = el.getBoundingClientRect();
    return document.elementFromPoint(r.left + r.width / 2, r.top + el.clientTop + 1.5) === el;
  });
  expect(hit).toBe(true);
});

// A forward-filling entry animation keeps every card on its own GPU layer for as long as the notes are open; scrolling
// them under the sticky bar and footer then re-layers the dialog each frame, which phones show as flicker.
test('release cards drop their entry animation once it ends, so scrolling the notes never flickers', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  await expect(dialog.locator('.release-entry')).not.toHaveCount(0);
  await expect.poll(() => dialog.evaluate(el => [...el.querySelectorAll('.release-entry')]
    .filter(card => card.getAnimations().length || getComputedStyle(card).transform !== 'none').length), { timeout: ciTimeout(5000) }).toBe(0);
});

// Landscape screens show the desktop recording of Freeze and EMP, portrait phones the mobile one.
for (const [width, height, shape] of [[1440, 900, 'desktop'], [844, 390, 'desktop'], [390, 844, 'mobile']]) {
  test(`Freeze and EMP announcement shows its ${shape} clip at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.locator('#whats-new-open').click();
    const entry = page.locator('.release-entry').filter({ hasText: 'Rivals fight back with Freeze and EMP' });
    const poster = entry.locator('button.release-play img');
    await poster.scrollIntoViewIfNeeded();
    await expect.poll(() => poster.evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await expect(poster).toHaveAttribute('src', new RegExp(`rival-items\\.${shape}\\.en\\.jpg$`));
  });
}
