import { expect } from './test.js';

// Insets are 0 on Android 14 and on iOS standalone once the status bar sits outside the web view.
// Android 15 draws edge-to-edge, and a notch or Dynamic Island reports its own inset.
// [name, insets, width, height]; one booted page walks them all (every profile is a touch, mobile context).
export const SAFE_AREA_PROFILES = [
  ['notch iphone', { top: 47, bottom: 34, left: 0, right: 0 }, 390, 844],
  ['dynamic island', { top: 59, bottom: 34, left: 0, right: 0 }, 402, 874],
  ['android 15 gesture', { top: 24, bottom: 24, left: 0, right: 0 }, 412, 915],
  ['android 15 buttons', { top: 48, bottom: 48, left: 0, right: 0 }, 412, 892],
  ['android 14', { top: 0, bottom: 0, left: 0, right: 0 }, 412, 915],
  ['notch landscape', { top: 0, bottom: 21, left: 47, right: 47 }, 844, 390],
  ['android 15 landscape buttons', { top: 24, bottom: 0, left: 0, right: 48 }, 915, 412],
  ['ipad portrait', { top: 24, bottom: 20, left: 0, right: 0 }, 820, 1180],
  ['ipad landscape', { top: 24, bottom: 20, left: 0, right: 0 }, 1180, 820],
];

export async function readSafeArea(page) {
  const box = selector => page.locator(selector).boundingBox();
  const line = page.locator('.bottomline');
  return {
    world: await box('#world'), bar: await box('.topbar'), brand: await box('.brand'), camera: await box('#camera-button'),
    line: await line.isVisible() ? await line.boundingBox() : null, start: await box('#start-button'),
  };
}

export function expectSafeArea({ world, bar, brand, camera, line, start }, name, insets, width, height) {
  expect(world.x, name).toBeLessThanOrEqual(1);
  expect(world.y, name).toBeLessThanOrEqual(1);
  expect(world.x + world.width, name).toBeGreaterThanOrEqual(width - 1);
  expect(world.y + world.height, name).toBeGreaterThanOrEqual(height - 1);
  expect(bar.y, `${name} top bar`).toBeGreaterThanOrEqual(insets.top - 1);
  expect(bar.y, `${name} top bar`).toBeLessThanOrEqual(insets.top + 1);
  expect(brand.x, `${name} brand`).toBeGreaterThanOrEqual(insets.left - 1);
  expect(camera.x + camera.width, `${name} camera`).toBeLessThanOrEqual(width - insets.right + 1);
  expect(camera.y, `${name} camera`).toBeGreaterThanOrEqual(insets.top - 1);
  // touch tablets hide the footer by design
  if (height >= 500 && line) {
    const gap = height - (line.y + line.height);
    expect(gap, `${name} footer`).toBeGreaterThanOrEqual(insets.bottom - 1);
    expect(gap, `${name} footer`).toBeLessThanOrEqual(Math.max(22, insets.bottom) + 2);
  }
  expect(start.y, `${name} start`).toBeGreaterThanOrEqual(insets.top - 1);
  expect(start.y + start.height, `${name} start`).toBeLessThanOrEqual(height - insets.bottom + 1);
}
