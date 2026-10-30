export type InputKind = 'pointer' | 'keyboard';

// Marks <html data-input> with how the last input arrived, so CSS can draw a focus ring for the keyboard only:
// a tap that closes a dialog hands focus back by script, and iOS then shows a ring nobody asked for.
const EVENTS: ReadonlyArray<readonly [string, InputKind]> = [['pointerdown', 'pointer'], ['touchstart', 'pointer'], ['keydown', 'keyboard']];

export function setupInputModality(root: { dataset: DOMStringMap } = document.documentElement, target: EventTarget = document): () => void {
  const listeners = EVENTS.map(([type, kind]) => {
    const listener = (): void => { if (root.dataset.input !== kind) root.dataset.input = kind; };
    target.addEventListener(type, listener, { capture: true, passive: true });
    return [type, listener] as const;
  });
  return () => listeners.forEach(([type, listener]) => target.removeEventListener(type, listener, { capture: true }));
}
