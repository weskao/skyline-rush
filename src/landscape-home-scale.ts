// Short landscape pages (in-app browsers leave ~265 px) shrink the home panel and right rail together with CSS zoom,
// so the layout stays the same: Start bottom-right, rail below the top-bar tools, track cards above the pinned row.
const PANEL_NEEDS = 236; // panel height that shows the mode picker, the track cards and the pinned row unscaled
const RAIL_NEEDS = 190; // Daily + camera dock + Start, gaps included, with a little room for a two-line Daily title
const MIN_SCALE = 0.7; // keeps Start a usable tap target; below this the panel scrolls instead

export function landscapeHomeScale({ panelHeight, railRoom }: { panelHeight: number; railRoom: number }): number {
  // Floored to 0.01: zoom rounds the panel by 1/64 px, and an exact ratio would re-zoom it every frame.
  return Math.max(MIN_SCALE, Math.floor(Math.min(1, panelHeight / PANEL_NEEDS, railRoom / RAIL_NEEDS) * 100) / 100);
}

type Box = Pick<HTMLElement, 'getBoundingClientRect'>;

// The panel's on-screen box doesn't depend on the scale (its insets are divided by it), so measuring it can't loop.
export function trackLandscapeHomeScale(intro: Box, tools: Box,
  root: { style: Pick<CSSStyleDeclaration, 'setProperty'> } = document.documentElement): void {
  if (typeof ResizeObserver === 'undefined') return; // full size remains the fallback
  new ResizeObserver(() => {
    const panel = intro.getBoundingClientRect();
    if (!panel.height) return;
    const railRoom = panel.bottom - tools.getBoundingClientRect().bottom - 6;
    root.style.setProperty('--home-scale', String(landscapeHomeScale({ panelHeight: panel.height, railRoom })));
  }).observe(intro as Element);
}
