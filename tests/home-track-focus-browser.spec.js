import { clickLobbyOption, openLobbyTracks } from './helpers/home-lobby.js';
import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';

const tracks = Object.keys(RACE_TRACKS);
const selectedCard = (page, id) => page.locator(`[data-track="${id}"]`);
const raceThenLeave = async (page, id, exit) => {
  await clickLobbyOption(page, `[data-track="${id}"]`);
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.locator('.brand').click();
  const origin = await page.evaluate(() => performance.timeOrigin);
  await page.locator(exit === 'home' ? '#leave-home' : '#leave-end').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator(`[data-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  expect(await page.evaluate(() => performance.timeOrigin)).toBe(origin);
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), tracks);
  await page.goto('/');
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
});

for (const [device, options] of [['desktop', {}], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) test.describe(device, () => {
  test.use(options);

  test('Back to home highlights the raced track when the chooser reopens', async ({ page }) => {
    const id = tracks[Math.floor(tracks.length / 2)];
    await raceThenLeave(page, id, 'home');
    await openLobbyTracks(page);
    await expect(selectedCard(page, id)).toBeFocused();
  });

  test('End race keeps the last playable track highlighted before six preview-only cards', async ({ page }) => {
    const id = tracks.at(-1);
    await raceThenLeave(page, id, 'end');
    await openLobbyTracks(page);
    await expect(selectedCard(page, id)).toBeFocused();
    await expect(page.locator('[data-upcoming-track]')).toHaveCount(6);
    await expect(page.locator('button[data-upcoming-track][aria-pressed="false"]')).toHaveCount(6);
  });

  test('Confirming a track restores focus to the home track card', async ({ page }) => {
    const id = tracks[Math.floor(tracks.length / 2)];
    await clickLobbyOption(page, `[data-track="${id}"]`);
    await expect(page.locator('#lobby-tracks-toggle')).toBeFocused();
    await openLobbyTracks(page);
    await expect(selectedCard(page, id)).toBeFocused();
  });
});
