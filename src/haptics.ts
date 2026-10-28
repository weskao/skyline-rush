// Race haptics. Android browsers use navigator.vibrate with the full pattern. iOS Safari has no
// vibrate, but from iOS 18 tapping a <label> of an <input type="checkbox" switch> plays the
// system haptic tick; older iOS ignores the click silently.
type Pattern = number | number[];
interface HapticsEnv {
  navigator: { vibrate?: (pattern: Pattern) => boolean };
  document: Document;
  setTimeout: (fn: () => void, ms: number) => unknown;
}

export function createHaptics(env: HapticsEnv = { navigator, document, setTimeout: (fn, ms) => setTimeout(fn, ms) }): (pattern: Pattern) => void {
  const { navigator: nav, document: doc } = env;
  if (typeof nav.vibrate === 'function') {
    return pattern => { try { nav.vibrate!(pattern); } catch { /* Unsupported haptics never interrupt a race. */ } };
  }
  // Built once: no DOM writes on the per-event path. display:none keeps it out of focus and layout.
  const label = doc.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.display = 'none';
  const input = doc.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  label.append(input);
  doc.body.append(label);
  // shortcut: one fixed-strength tick per on-segment; iOS exposes no duration or intensity.
  return pattern => {
    const segments = typeof pattern === 'number' ? [pattern] : pattern;
    for (let i = 0, at = 0; i < segments.length; at += segments[i]! + (segments[i + 1] ?? 0), i += 2) {
      if (at === 0) label.click();
      else env.setTimeout(() => label.click(), at);
    }
  };
}
