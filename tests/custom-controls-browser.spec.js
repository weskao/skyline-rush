import { test, expect } from './helpers/test.js';

const open = async page => {
  await page.goto('/');
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
};
const openVFX = page => page.locator('#vfx-panel > summary').click();

test('every dropdown is a web listbox, never the OS select popup', async ({ page }) => {
  await open(page);
  await openVFX(page);
  await expect(page.locator('select:visible')).toHaveCount(0);
  for (const name of ['Visual style', 'Quality', 'Aerodynamics', 'Showcase camera']) {
    await expect(page.getByRole('combobox', { name, exact: true })).toBeVisible();
  }
});

test('picking an option with the pointer applies, closes and persists it', async ({ page }) => {
  await open(page);
  await openVFX(page);
  const aero = page.getByRole('combobox', { name: 'Aerodynamics', exact: true });
  await expect(aero).toHaveText('Low drag');
  await aero.click();
  await expect(aero).toHaveAttribute('aria-expanded', 'true');
  const listbox = page.getByRole('listbox', { name: 'Aerodynamics' });
  await expect(listbox.getByRole('option')).toHaveText(['Low drag', 'High downforce']);
  await expect(listbox.getByRole('option', { name: 'Low drag' })).toHaveAttribute('aria-selected', 'true');
  await listbox.getByRole('option', { name: 'High downforce' }).click();
  await expect(listbox).toBeHidden();
  await expect(aero).toHaveAttribute('aria-expanded', 'false');
  await expect(aero).toHaveText('High downforce');
  await expect(page.locator('#aero-mode')).toHaveText('HIGH DOWNFORCE');
  await page.reload();
  await page.waitForTimeout(700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  await openVFX(page);
  await expect(page.getByRole('combobox', { name: 'Aerodynamics', exact: true })).toHaveText('High downforce');
});

test('the dropdown is fully keyboard operable and keeps keys away from driving', async ({ page }) => {
  await open(page);
  await openVFX(page);
  const quality = page.getByRole('combobox', { name: 'Quality', exact: true });
  const before = await quality.textContent();
  await quality.focus();
  await page.keyboard.press('ArrowDown');
  const listbox = page.getByRole('listbox', { name: 'Quality' });
  await expect(listbox).toBeVisible();
  await page.keyboard.press('Home');
  await expect(quality).toHaveAttribute('aria-activedescendant', await listbox.getByRole('option', { name: 'Low' }).getAttribute('id'));
  await page.keyboard.press('Escape');
  await expect(listbox).toBeHidden();
  await expect(quality).toHaveText(before);
  await expect(quality).toBeFocused();
  await expect(page.locator('#vfx-panel')).toHaveAttribute('open');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('End');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('Enter');
  await expect(listbox).toBeHidden();
  await expect(quality).toHaveText('Medium');
  await expect(page.locator('#speed')).toHaveText('0');
});

test('History track filter uses the web dropdown and reflects the opened track', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'History', exact: true }).click();
  const track = page.getByRole('combobox', { name: 'History track' });
  await expect(track).toHaveText('Coast');
  await track.click();
  await page.getByRole('option', { name: 'Neon Downtown' }).click();
  await expect(track).toHaveText('Neon Downtown');
  // The listbox click must not close the modal history dialog.
  await expect(page.getByRole('dialog', { name: 'Race history' })).toBeVisible();
});

test('checkboxes, sliders and disclosures are drawn by the page, not the OS', async ({ page }) => {
  await open(page);
  await openVFX(page);
  await page.locator('.vfx-tuning > summary').click();
  const native = await page.evaluate(() => [
    ...[...document.querySelectorAll('input[type="checkbox"], input[type="range"]')]
      .filter(input => getComputedStyle(input).appearance !== 'none').map(input => input.id || input.dataset.vfx),
    ...[...document.querySelectorAll('summary')]
      .filter(summary => getComputedStyle(summary).display === 'list-item').map(summary => summary.textContent.trim()),
  ]);
  expect(native).toEqual([]);
  const comfort = page.locator('[data-vfx="comfortable"]');
  await comfort.check();
  await expect(comfort).toBeChecked();
});

test('mid-race VFX panel never shows a setting row without its control', async ({ page }) => {
  // The racing rule hides the toolbar language picker; it must not leave the panel's dropdown labels orphaned.
  await open(page);
  await page.locator('#start-button').click();
  await expect(page.locator('body')).toHaveAttribute('data-phase', /countdown|racing/);
  await openVFX(page);
  const orphans = await page.locator('#vfx-panel .vfx-settings > label').evaluateAll(rows => rows
    .filter(row => row.getBoundingClientRect().height > 0)
    .filter(row => ![...row.querySelectorAll('input, .custom-select > button')].some(control => control.getBoundingClientRect().width > 0))
    .map(row => row.textContent.trim()));
  expect(orphans).toEqual([]);
  await expect(page.locator('#locale-select + .custom-select, .aero-tools > .custom-select').first()).toBeHidden();
});
