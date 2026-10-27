// Presentation motion shared by overlays and the HUD; timings come from the CSS --dur-* tokens.
export const durationMs = (time: string): number => {
  const value = time.trim();
  return parseFloat(value) * (value.endsWith('ms') ? 1 : 1000);
};

export function createMotion(calm: () => boolean) {
  const tokens = getComputedStyle(document.documentElement);
  const motionOptions = (duration: string): { duration: number; easing: string } => ({
    duration: durationMs(tokens.getPropertyValue(`--dur-${duration}`)),
    easing: tokens.getPropertyValue('--ease-out').trim(),
  });
  function enter(element: Element, from: string, duration = 'base'): void {
    element.getAnimations().forEach(animation => animation.cancel());
    if (!calm()) element.animate([{ opacity: 0, transform: from }, { opacity: 1, transform: 'none' }], motionOptions(duration));
  }
  return { motionOptions, enter };
}
