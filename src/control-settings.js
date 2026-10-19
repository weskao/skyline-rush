// Touch-control preferences only; persistence (localStorage under CONTROLS_KEY) lives in main.js.
export const CONTROLS_KEY = 'skyline-rush-controls';
export const CONTROL_DEFAULTS = { mode: 'slide', hand: 'left', fullLock: 60, size: 'M', opacity: 0.9, flyMode: 'hold', version: 1 };
export function controlSettings(values = {}) {
  if (!values || typeof values !== 'object' || Array.isArray(values) || values.version !== CONTROL_DEFAULTS.version) return { ...CONTROL_DEFAULTS };
  const d = CONTROL_DEFAULTS;
  return {
    mode: ['slide', 'buttons'].includes(values.mode) ? values.mode : d.mode,
    hand: ['left', 'right'].includes(values.hand) ? values.hand : d.hand,
    fullLock: [40, 60, 80].includes(values.fullLock) ? values.fullLock : d.fullLock,
    size: ['S', 'M', 'L'].includes(values.size) ? values.size : d.size,
    opacity: typeof values.opacity === 'number' && Number.isFinite(values.opacity) ? Math.min(1, Math.max(0.4, values.opacity)) : d.opacity,
    flyMode: ['hold', 'toggle'].includes(values.flyMode) ? values.flyMode : d.flyMode,
    version: d.version,
  };
}
