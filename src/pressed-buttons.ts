// Touch driving prevents default pointer behavior, so :active alone cannot show a press.
export function trackPressedButtons(): () => void {
  const pressedButtons = new Map<number, Element>();
  document.addEventListener('pointerdown', event => {
    const button = (event.target as Element).closest('button:not(:disabled)');
    if (button) { pressedButtons.set(event.pointerId, button); button.classList.add('is-pressed'); }
  }, { capture: true });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) document.addEventListener(type, event => {
    pressedButtons.get(event.pointerId)?.classList.remove('is-pressed');
    pressedButtons.delete(event.pointerId);
  }, { capture: true });
  /** Drops every press highlight, e.g. when an overlay replaces the buttons mid-press. */
  return function clearButtonPresses(): void {
    for (const button of pressedButtons.values()) button.classList.remove('is-pressed');
    pressedButtons.clear();
  };
}
