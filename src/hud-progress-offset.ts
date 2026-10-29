// Mode HUD rows (items, laps, checkpoints, stunt, elimination) grow .race-progress; phone layouts pin the live map and
// the short-landscape mode indicator below it. Publish its bottom edge only when its size changes, never per frame.
export function trackProgressBottom(progress: Pick<HTMLElement, 'getBoundingClientRect'>,
  root: { style: Pick<CSSStyleDeclaration, 'setProperty'> } = document.documentElement): void {
  if (typeof ResizeObserver === 'undefined') return; // the fixed CSS positions remain the fallback
  new ResizeObserver(() => root.style.setProperty('--race-progress-bottom', `${Math.ceil(progress.getBoundingClientRect().bottom)}px`))
    .observe(progress as Element);
}
