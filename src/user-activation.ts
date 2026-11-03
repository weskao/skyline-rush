// Every event that grants user activation (a tap, drag, click or key). Media the browser refused to start on its own
// (sound before any gesture; on iPhone in Low Power Mode, even a muted clip) can start inside one of these.
export function onUserActivation(listener: () => void): void {
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, listener, { capture: true });
}
