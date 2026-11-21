import { expect } from './test.js';

// Sizes the home version chip is judged at: portrait phone, tall phone, landscape phone, desktop.
export const HOME_VERSION_SIZES = [[320, 740], [390, 844], [844, 390], [1440, 900]];

export async function readHomeVersion(page) {
  await expect(page.locator('.bottomline > span')).toHaveCount(0);
  return page.locator('#whats-new-open').boundingBox();
}

export function expectHomeVersion(version, width, height, locale) {
  const tag = `${width}x${height} ${locale}`;
  expect(version, `${tag} version visible`).not.toBeNull();
  expect(Math.abs(version.x + version.width / 2 - width / 2), `${tag} version horizontally centered`).toBeLessThanOrEqual(1);
  if (height <= 500 && width > height) {
    expect(Math.abs(version.y + version.height - (height - 4)), `${tag} version at the bottom edge`).toBeLessThanOrEqual(1);
  }
  expect(version.height, `${tag} version tap target`).toBeGreaterThanOrEqual(44);
}
