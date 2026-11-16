export async function openGarageSection(page, section) {
  const button = page.locator(`[data-garage-section="${section}"]`);
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
}
