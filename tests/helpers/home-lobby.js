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
  if (/\[data-(?:upcoming-)?track=/.test(selector)) {
    await openLobbyTracks(page);
    await page.locator('#track-chooser').locator(selector).first()[action]();
    await page.locator('#track-choose-confirm')[action]();
    return;
  }
  const option = page.locator(selector);
  if (!await option.isVisible()) await openLobbyModes(page);
  await option[action]();
}
