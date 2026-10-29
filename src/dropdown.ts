// One close rule for floating dropdowns (custom select, VFX, audio and controls).
// Keep this event-driven UI code typed, but importable by Node tests without DOM globals.
const open = new Map<Element, () => void>();

export function trackDropdown(region: Element, isOpen: boolean, close: () => void): void {
  if (isOpen) open.set(region, close);
  else open.delete(region);
}

export function dismissOutside(target: EventTarget | null): void {
  for (const [region, close] of open) if (!region.contains(target as Node)) close();
}

// A keyboard click can bypass pointerdown; iOS taps can bypass click.
// Capture phase also handles nested dialogs and stopPropagation correctly.
if (typeof document !== 'undefined') {
  for (const type of ['pointerdown', 'click']) {
    document.addEventListener(type, ({ target }) => dismissOutside(target), { capture: true });
  }
}
