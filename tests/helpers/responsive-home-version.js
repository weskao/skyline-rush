import { expect } from './test.js';

// Sizes the home version chip is judged at: portrait phone, tall phone, landscape phone, desktop.
export const HOME_VERSION_SIZES = [[320, 740], [390, 844], [844, 390], [1440, 900]];

export async function readHomeVersion(page) {
  const [tagline, version] = await Promise.all([
    page.locator('[data-i18n="footer.tagline"]').boundingBox(), page.locator('#whats-new-open').boundingBox(),
  ]);
  return { tagline, version };
}

export function expectHomeVersion({ tagline, version }, width, height, locale) {
  const tag = `${width}x${height} ${locale}`;
  if (height <= 500 && width > height) {
    expect(tagline, `${tag} tagline hidden`).toBeNull();
    expect(Math.abs(version.x + version.width / 2 - width / 2), `${tag} version horizontally centered`).toBeLessThanOrEqual(1);
    expect(Math.abs(version.y + version.height - (height - 4)), `${tag} version at the bottom edge`).toBeLessThanOrEqual(1);
  } else {
    expect(Math.abs(tagline.y + tagline.height / 2 - version.y - version.height / 2), `${tag} version centered on the tagline`).toBeLessThanOrEqual(1);
    expect(tagline.x + tagline.width, `${tag} tagline left of the version`).toBeLessThanOrEqual(version.x);
  }
  expect(version.height, `${tag} version tap target`).toBeGreaterThanOrEqual(44);
}
