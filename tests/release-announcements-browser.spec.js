import fs from 'node:fs';
import { test, expect } from './helpers/test.js';
import { recentReleases } from '../src/release-notes.ts';

const { version } = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const SEEN_KEY = 'skyline-rush-whats-new-seen-v1';
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
  await expect(tabs.first()).toContainText('v' + version);
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

test('every release lists its NEW highlights first, then improvements, then fixes', async ({ page }) => {
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  const rank = kind => ({ new: 0, improvement: 1, fix: 2 })[kind] ?? 3;
  const tabs = dialog.getByRole('tab');
  for (let index = 0; index < await tabs.count(); index++) {
    await tabs.nth(index).click();
    await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
    const ranks = (await dialog.locator('.release-entry').evaluateAll(entries => entries.map(entry => entry.dataset.kind))).map(rank);
    expect(ranks.length).toBeGreaterThan(0);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
  }
});

test('release notes support optional localized hero images without leaking racing shortcuts', async ({ page }) => {
  await page.goto('/');
  await page.locator('#whats-new-open').click();
  const dialog = page.locator('#whats-new-screen');
  const hero = dialog.locator('#release-hero');
  for (const release of recentReleases()) {
    await dialog.getByRole('tab').filter({ hasText: 'v' + release.version }).click();
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
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('tab').first()).toHaveAttribute('aria-selected', 'true');
  await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toBe(version);
  await expect(page.locator('#whats-new-open')).not.toHaveClass(/has-update/);
  await page.locator('#release-continue').click();
  await page.reload();
  await settle(page);
  await expect(dialog).toBeHidden();
});

test.describe('several releases missed', () => {
  const shown = recentReleases().map(release => release.version);
  test.use({ whatsNewSeen: shown[2] });
  test('every release newer than the last one read is marked new until the notes are reopened', async ({ page }) => {
    await page.goto('/');
    const dialog = page.locator('#whats-new-screen');
    await expect(dialog).toBeVisible();
    const marked = dialog.getByRole('tab').filter({ has: page.locator('.release-tab-unread') });
    await expect(marked).toHaveCount(2);
    await expect(marked.nth(0)).toHaveAttribute('data-version', shown[0]);
    await expect(marked.nth(1)).toHaveAttribute('data-version', shown[1]);
    await expect(marked.nth(1)).toContainText('New');
    await marked.nth(1).click(); // switching releases keeps the marks for this visit
    await page.locator('#locale-select').selectOption('zh-TW', { force: true });
    await expect(marked).toHaveCount(2);
    await expect(marked.nth(1)).toContainText('未讀');
    await page.locator('#release-continue').click();
    await page.locator('#whats-new-open').click(); // opening the notes counted as reading every release
    await expect(dialog.locator('.release-tab-unread')).toHaveCount(0);
  });

  for (const [width, height] of [[1440,900],[390,844]]) test(`the unread badge sits on the tab's top-right corner at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const tab = page.locator('#whats-new-screen').getByRole('tab').first();
    await expect(tab.locator('.release-tab-unread')).toBeVisible();
    const [t, badge, label, rail] = await Promise.all([tab, tab.locator('.release-tab-unread'), tab.locator('.release-tab-version'), page.locator('#release-versions')].map(l => l.boundingBox()));
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
  test('a first-time player is not greeted with old news, but the version is recorded', async ({ page }) => {
    await seedSeen(page, null);
    await page.goto('/');
    await settle(page);
    await expect(page.locator('#whats-new-screen')).toBeHidden();
    await expect.poll(() => page.evaluate(key => localStorage.getItem(key), SEEN_KEY)).toBe(version);
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
