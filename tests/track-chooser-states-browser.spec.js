import { test, expect } from './helpers/test.js';
import { ciTimeout } from './helpers/ci.js';
import { RACE_TRACKS } from '../src/game.js';
import { UPCOMING_TRACKS } from '../src/upcoming-tracks.ts';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('skyline-rush-unlocked', '["coast","neon"]');
    localStorage.setItem('skyline-rush-locale', 'zh-TW');
    localStorage.setItem('skyline-rush-music', 'off');
    localStorage.setItem('skyline-rush-vfx', JSON.stringify({ quality: 'low' }));
  });
});

test('race availability colors stay distinct from pending selection and the confirmation action', async ({ page }) => {
  await page.goto('/');
  await page.locator('#lobby-tracks-toggle').click();
  const chooser = page.locator('#track-chooser');
  for (const [selector, state, label, color] of [
    ['[data-track="coast"]', 'selected', '已選擇', 'rgb(255, 203, 130)'],
    ['[data-track="neon"]', 'available', '可選擇', 'rgb(131, 240, 178)'],
    ['[data-track="canyon"]', 'locked', '未解鎖', 'rgb(255, 179, 156)'],
    ['[data-upcoming-track="dune-tempest"]', 'preview', '預覽', 'rgb(199, 169, 255)'],
  ]) {
    const card = chooser.locator(selector);
    await expect(card).toHaveAttribute('data-track-state', state);
    await expect(card.locator('small')).toHaveText(label);
    await expect(card.locator('small')).toHaveCSS('color', color);
  }

  const action = chooser.locator('#track-choose-confirm');
  await chooser.locator('[data-upcoming-track="dune-tempest"]').click();
  await expect(action).toHaveText('在首頁預覽');
  await expect(action).toHaveAttribute('data-preview-only', 'true');
  await expect(chooser.locator('#track-choose-state')).toHaveCSS('color', 'rgb(199, 169, 255)');
  await chooser.locator('[data-track="canyon"]').click();
  await expect(action).toHaveText('在首頁預覽');
  await expect(chooser.locator('#track-choose-state')).toHaveCSS('color', 'rgb(255, 179, 156)');
  await chooser.locator('[data-track="neon"]').click();
  await expect(action).toHaveText('確認賽道');
  await expect(action).toHaveAttribute('data-preview-only', 'false');
  await expect(chooser.locator('[data-track="neon"] small')).toHaveCSS('color', 'rgb(131, 240, 178)');
  await action.click();
  await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', 'neon');
  await expect(page.locator('#start-button')).toBeEnabled();
});

test('every playable, locked and upcoming card can select its own Home map without unlocking races', async ({ page }) => {
  test.setTimeout(ciTimeout(120_000));
  await page.goto('/');
  const ids = [...Object.keys(RACE_TRACKS), ...Object.keys(UPCOMING_TRACKS)];
  await page.locator('#lobby-tracks-toggle').click();
  await expect(page.locator('#track-chooser .track-select .track-card-select')).toHaveCount(ids.length);
  for (const id of ids) {
    const card = page.locator('#track-chooser').locator(`[data-track="${id}"], [data-upcoming-track="${id}"]`);
    await expect(card).toBeEnabled();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#track-choose-confirm').click();
    await expect(page.locator('#intro')).toHaveAttribute('data-lobby-track', id);
    await expect(page.locator('#lobby-hero-art')).toHaveAttribute('src', new RegExp(`track-teasers/${id}\\.jpg$`));
    if (Object.hasOwn(UPCOMING_TRACKS, id) || !['coast', 'neon'].includes(id))
      await expect(page.locator('#start-button')).toBeDisabled();
    await page.locator('#lobby-tracks-toggle').click();
  }
});
