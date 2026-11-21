// isVisible() does not wait: called before Home mounts it saw no option and expanded the Mode list for nothing
// (cup-recovery desktop overflowed #intro by 82px on CI). Wait until the option or the toggle is shown first.
const lobbyShown = (page, option) => option.or(page.locator('#lobby-modes-toggle')).first().waitFor();

export async function openLobbyModes(page) {
  const options = page.locator('#lobby-mode-options');
  await lobbyShown(page, options);
  if (!await options.isVisible()) {
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
  await lobbyShown(page, option);
  if (!await option.isVisible()) await openLobbyModes(page);
  await option[action]();
}
