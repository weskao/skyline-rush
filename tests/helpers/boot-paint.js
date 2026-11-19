import { expect } from '@playwright/test';

// Playwright reads the page on its main thread. Once Home is painted, createWorld holds that thread for seconds on CI's
// software WebGL, so a locator check right after goto sees Home only after the world is built (CI 44468157574). A boot
// budget is judged in the page instead: the frame after the element is first visible with text, in ms since navigation.
export const recordPaint = (page, selector) => page.addInitScript(selector => {
  const painted = window.__painted ??= {};
  new MutationObserver((_, observer) => {
    const node = document.querySelector(selector);
    if (!node?.checkVisibility() || !node.textContent.trim()) return;
    observer.disconnect();
    requestAnimationFrame(() => { painted[selector] = performance.now(); });
  }).observe(document, { subtree: true, childList: true, characterData: true, attributes: true });
}, selector);

/** When `selector` (registered with recordPaint before goto) first reached the screen; the poll may wait out the world build. */
export async function firstPaint(page, selector) {
  await expect.poll(() => page.evaluate(selector => window.__painted?.[selector] ?? null, selector)).not.toBeNull();
  return page.evaluate(selector => window.__painted[selector], selector); // settled: polled above, written once
}
