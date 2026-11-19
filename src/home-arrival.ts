import { createMotion } from './motion.ts';

export function playHomeArrival(app: HTMLElement, lowQuality: boolean) {
  const narrowPortrait = matchMedia('(max-width: 760px) and (orientation: portrait)').matches;
  const folded = Boolean(document.body.dataset.foldAxis);
  const shortLandscape = matchMedia('(max-height: 500px) and (orientation: landscape)').matches;
  const travel = matchMedia('(max-width: 1000px)').matches || shortLandscape ? 10 : 28;
  const groups = [
    ['.topbar .brand, .lobby-race-heading, #race-mode-picker, #race-rules-row', -travel, 0],
    ['#home-airflow-toggle, #settings-button, #daily-card, #showcase-camera-dock', travel, 32],
    ['#start-button, #garage-button, .intro .history-button, #practice-button', -travel, 64],
  ] as const;
  const { motionOptions } = createMotion(() => false);
  const options = motionOptions(lowQuality ? 'fast' : 'base');

  // Keep the scroll container and its fixed-rail ancestors out of the animation.
  for (const [selectors, x, delay] of groups) {
    for (const control of app.querySelectorAll(selectors)) {
      const horizontal = shortLandscape && control.id === 'start-button' ? travel : x;
      const translate = narrowPortrait || folded ? '0 10px' : `${horizontal}px 0`;
      control.animate([
        lowQuality ? { opacity: .6 } : { opacity: .42, translate },
        lowQuality ? { opacity: 1 } : { opacity: 1, translate: 'none' },
      ], { ...options, id: 'home-arrival', fill: 'backwards', delay: lowQuality ? 0 : delay });
    }
  }
}
