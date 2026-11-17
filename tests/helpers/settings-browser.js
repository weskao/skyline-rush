// Navigate through the same entry points available to the player.
export async function openSettingsSection(page, section) {
  const dialog = page.locator('#settings-panel');
  if (!await dialog.isVisible()) await page.locator('#settings-button').click();
  const tab = dialog.locator(`[data-settings-section="${section}"]`);
  if (await tab.getAttribute('aria-pressed') !== 'true') await tab.click();
}

export async function toggleSettingsSection(page, section) {
  const tab = page.locator(`[data-settings-section="${section}"][aria-pressed="true"]`);
  if (await tab.isVisible()) await page.locator('#settings-close').click();
  else await openSettingsSection(page, section);
}

export async function toggleAirflowPreview(page) {
  await openSettingsSection(page, 'display');
  await page.locator('#airflow-toggle').click();
  await page.locator('#settings-close').click();
}
