export async function openLobbyModes(page) {
  if (!await page.locator('#lobby-mode-options').isVisible()) {
    await page.locator('#lobby-modes-toggle').click();
  }
}

export async function openLobbyTracks(page) {
  if (!await page.locator('#lobby-track-options').isVisible()) {
    await page.locator('#lobby-tracks-toggle').click();
  }
}

export async function clickLobbyOption(page, selector, action = 'click') {
  const option = page.locator(selector);
  if (!await option.isVisible()) {
    if (selector.includes('data-race-mode=')) await openLobbyModes(page);
    else await openLobbyTracks(page);
  }
  await option[action]();
}
