import { readFile } from 'node:fs/promises';
import { test, expect } from './helpers/test.js';

const key = 'skyline-rush-challenge-medals-v1';
const medals = { version: 1, awards: { 'time-clean': '2026-10-29T01:00:00.000Z' }, longestFlight: 0, maxAerialCombo: 0 };

test('local backup exports personal medals without adding them to Career', async ({ page }) => {
  await page.addInitScript(({ key, medals }) => localStorage.setItem(key, JSON.stringify(medals)), { key, medals });
  await page.goto('/');
  await page.locator('#cloud-open').click();
  const downloading = page.waitForEvent('download');
  await page.locator('#cloud-export').click();
  const backup = JSON.parse(await readFile(await (await downloading).path(), 'utf8'));
  expect(backup.localChallengeMedals?.awards).toEqual(medals.awards);
  expect(backup.medals).toEqual({});
});

test('local backup import restores personal medals and keeps old backups compatible', async ({ page }) => {
  await page.goto('/');
  await page.locator('#cloud-open').click();
  const backup = { version: 2, unlocked: ['coast'], stars: {}, bests: {}, medals: {}, history: [], modeHistory: [], daily: [], localChallengeMedals: medals };
  for (const contents of [backup, { ...backup, localChallengeMedals: undefined }]) {
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#cloud-import-file').setInputFiles({ name: 'progress.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(contents)) });
    await expect(page.locator('#cloud-status')).toHaveAttribute('data-cloud-state', 'imported');
    expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key) || 'null'), key)).toEqual(medals);
  }
});
