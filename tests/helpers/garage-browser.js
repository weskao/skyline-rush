export async function openGarageSection(page, section) {
  const button = page.locator(`[data-garage-section="${section}"]`);
  if (await button.getAttribute('aria-pressed') !== 'true') await button.click();
}

export async function openStudioAngles(page) {
  const button = page.locator('#garage-angle-menu');
  if (await button.isVisible() && await button.getAttribute('aria-expanded') !== 'true') await button.click();
}
