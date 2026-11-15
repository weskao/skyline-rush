export async function openLobbyModes(page) {
  if (!await page.locator('#lobby-mode-options').isVisible()) {
    await page.locator('#lobby-modes-toggle').click();
  }
}
