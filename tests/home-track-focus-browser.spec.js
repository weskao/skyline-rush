import { test, expect } from './helpers/test.js';
import { RACE_TRACKS } from '../src/game.js';

const tracks = Object.keys(RACE_TRACKS);
// Pixels between the selected track's centre and the row's centre (negative: left of centre).
const offCentre = (page, id) => page.locator(`[data-track="${id}"]`).evaluate(button => {
  const row = button.parentElement.getBoundingClientRect(), box = button.getBoundingClientRect();
  return box.left + box.width / 2 - (row.left + row.width / 2);
});
const raceThenLeave = async (page, id, exit) => {
  await page.locator(`[data-track="${id}"]`).click();
  // Scroll the row away while it is visible, so only the return path can bring the track back into view.
  await page.locator('.track-select').evaluate(row => { row.scrollLeft = 0; });
  await page.locator('#start-button').click();
  await expect(page.locator('#race-status')).toHaveText('RACING');
  await page.locator('.brand').click();
  await (exit === 'home' ? Promise.all([page.waitForEvent('load'), page.locator('#leave-home').click()]) : page.locator('#leave-end').click());
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'ready');
  await expect(page.locator(`[data-track="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(ids => localStorage.setItem('skyline-rush-unlocked', JSON.stringify(ids)), tracks);
  await page.goto('/');
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
});

for (const [device, options] of [['desktop', {}], ['phone', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) test.describe(device, () => {
  test.use(options);

  test('Back to home reopens on the raced track, centred in the row', async ({ page }) => {
    const id = tracks[Math.floor(tracks.length / 2)];
    await raceThenLeave(page, id, 'home');
    expect(Math.abs(await offCentre(page, id))).toBeLessThan(2);
  });

  test('End race keeps the raced track; an edge track rests at the row end', async ({ page }) => {
    await raceThenLeave(page, tracks.at(-1), 'end');
    expect(await page.locator('.track-select').evaluate(row => Math.abs(row.scrollWidth - row.clientWidth - row.scrollLeft))).toBeLessThan(2);
  });
});
