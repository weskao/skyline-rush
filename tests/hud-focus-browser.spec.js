import { openSettingsSection, toggleAirflowPreview } from './helpers/settings-browser.js';
import { expect } from '@playwright/test';
import { test } from './helpers/gameplay-browser.js';

// input.ts leaves Space to a focused button for keyboard users; a mouse click must not leave HUD focus behind.
const racing = async page => {
  await page.locator('#performance-notice summary').click();
  await page.locator('#performance-notice-dismiss').click();
  await page.locator('#start-button').click();
  await page.waitForFunction(() => window.gameplay.race.phase === 'racing');
};
const spaceFlies = async page => {
  await page.evaluate(() => { window.gameplay.race.player.speed = 90; });
  await page.keyboard.down('Space');
  await expect.poll(() => page.evaluate(() => window.gameplay.race.player.altitude)).toBeGreaterThan(1);
  await page.keyboard.up('Space');
};

test('a clicked AIRFLOW toggle leaves Space to FLY', async ({ gameplayPage: page }) => {
  await racing(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.gameplay.race.phase === 'paused');
  const airflow = page.locator('#airflow-toggle');
  await toggleAirflowPreview(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.gameplay.race.phase === 'racing');
  await expect(airflow).toHaveAttribute('aria-pressed', 'true');
  await spaceFlies(page);
  await expect(airflow).toHaveAttribute('aria-pressed', 'true');
});

// Racing hides every dropdown; the pause screen shows them, and resuming must hand focus back (focusRace).
test('a VFX pick by mouse while paused leaves Space to FLY after Esc resumes', async ({ gameplayPage: page }) => {
  await racing(page);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.gameplay.race.phase === 'paused');
  const combobox = page.locator('[data-vfx="preset"] + .custom-select > [role="combobox"]');
  await openSettingsSection(page, 'display');
  await combobox.click();
  await expect(combobox).toHaveAttribute('aria-expanded', 'true'); // the opening click keeps its list
  await page.locator('[data-vfx="preset"] + .custom-select [role="option"]').nth(1).click();
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Escape');
  await expect(page.locator('#settings-panel')).toBeHidden();
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.gameplay.race.phase === 'racing');
  await spaceFlies(page);
  await expect(combobox).toHaveAttribute('aria-expanded', 'false');
});
