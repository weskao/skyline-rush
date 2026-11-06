// Mode HUD rows (items, laps, checkpoints, stunt, elimination) grow .race-progress; phone layouts pin the live map and
// the short-landscape mode indicator below it. Publish its bottom edge only when its size changes, never per frame.
// The tutorial coach reuses it as --tutorial-coach-bottom so the pause screen starts below the card on phones.
export function trackProgressBottom(progress: Pick<HTMLElement, 'getBoundingClientRect'>,
  root: { style: Pick<CSSStyleDeclaration, 'setProperty'> } = document.documentElement, name = '--race-progress-bottom'): void {
  if (typeof ResizeObserver === 'undefined') return; // the fixed CSS positions remain the fallback
  new ResizeObserver(() => root.style.setProperty(name, `${Math.ceil(progress.getBoundingClientRect().bottom)}px`))
    .observe(progress as Element);
}
