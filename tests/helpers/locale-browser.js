import { openSettingsSection } from './settings-browser.js';

export async function selectLocale(page, locale) {
  // The delayed music prompt can appear while Playwright is clicking this row.
  const prompt = page.locator('#music-prompt');
  await page.addLocatorHandler(prompt, () => page.locator('#music-no').click());
  try {
    const alreadyOpen = await page.locator('#settings-panel').isVisible();
    await openSettingsSection(page, 'language');
    const picker = page.locator('#locale-select + .custom-select');
    await picker.getByRole('combobox').click();
    await picker.getByRole('option', { name: locale === 'zh-TW' ? '繁體中文' : 'English', exact: true }).click();
    if (!alreadyOpen) await page.locator('#settings-close').click();
  } finally {
    await page.removeLocatorHandler(prompt);
  }
}
