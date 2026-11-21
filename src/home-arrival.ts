import { createMotion } from './motion.ts';

export function prepareHomeArrival(app: HTMLElement, lowQuality: boolean) {
  const short = matchMedia('(max-height: 500px)').matches;
  const compact = short || Boolean(document.body.dataset.foldAxis) || matchMedia('(max-width: 1000px)').matches;
  const groups = [
    ['.topbar .brand, .intro-wordmark, .lobby-race-heading, #race-mode-picker, #race-rules-row', -1, 0],
    ['#home-airflow-toggle, #settings-button, #daily-card, #showcase-camera-dock', 1, 32],
    ['#start-button, #garage-button, .intro .history-button, #practice-button', -1, 64],
  ] as const;
  const { motionOptions } = createMotion(() => false);
  const options = motionOptions(lowQuality ? 'fast' : compact ? 'base' : 'slow');

  // Keep the scroll container and its fixed-rail ancestors out of the animation.
  const moves = groups.flatMap(([selectors, side, delay]) => Array.from(app.querySelectorAll<HTMLElement>(selectors), control => {
    if (lowQuality) return { control, delay: 0, from: { opacity: 0 } };
    if (compact) return { control, delay, from: { opacity: 0, translate: `0 ${short ? 6 : 10}px` } };
    const box = control.getBoundingClientRect();
    const zoom = box.width && control.offsetWidth ? box.width / control.offsetWidth : 1;
    const x = side < 0 ? -box.right - 16 : window.innerWidth - box.left + 16;
    return { control, delay, from: { opacity: 0, translate: `${x / zoom}px 0` } };
  }));
  return moves.map(({ control, delay, from }) => {
    const animation = control.animate([from, lowQuality ? { opacity: 1 } : { opacity: 1, translate: 'none' }],
      { ...options, id: 'home-arrival', fill: 'backwards', delay });
    animation.pause();
    animation.currentTime = 0;
    return animation;
  });
}
