export async function selectLocale(page, locale) {
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const picker = page.locator('#locale-select + .custom-select');
  await picker.getByRole('combobox').click();
  await picker.getByRole('option', { name: locale === 'zh-TW' ? '繁體中文' : 'English', exact: true }).click();
}
