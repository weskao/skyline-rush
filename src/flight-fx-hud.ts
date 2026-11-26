// --flight-bank and --streak-opacity change every HUD tick while steering/boosting. Set on <body> they restyled the
// whole page; on the element that reads them only that subtree restyles.
const FADE_OUT_SECONDS = 0.45; // .speed-streaks fades opacity over .4 s (style.css)

type StyleNode = Pick<HTMLElement, 'style' | 'hasAttribute' | 'setAttribute' | 'removeAttribute'>;

export function createFlightFxHud(streaks: StyleNode, director: StyleNode) {
  let hiddenSince = -1;
  return function update(now: number, bankDegrees: number, streakOpacity: string): void {
    director.style.setProperty('--flight-bank', `${bankDegrees}deg`);
    streaks.style.setProperty('--streak-opacity', streakOpacity);
    // Opacity 0 hides all 18 infinite streak animations, which would still cost a style recalc per frame.
    if (streakOpacity !== '0') { hiddenSince = -1; if (streaks.hasAttribute('data-idle')) streaks.removeAttribute('data-idle'); return; }
    if (hiddenSince < 0) hiddenSince = now;
    if (now - hiddenSince >= FADE_OUT_SECONDS && !streaks.hasAttribute('data-idle')) streaks.setAttribute('data-idle', '');
  };
}
