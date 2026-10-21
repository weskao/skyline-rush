export async function selectLocale(page, locale) {
  // The first-visit music prompt opens under the sound button ~600 ms after load and covers this row until answered.
  await page.waitForFunction(() => performance.now() > 700);
  if (await page.locator('#music-prompt').isVisible()) await page.locator('#music-no').click();
  const picker = page.locator('#locale-select + .custom-select');
  await picker.getByRole('combobox').click();
  await picker.getByRole('option', { name: locale === 'zh-TW' ? '繁體中文' : 'English', exact: true }).click();
}
