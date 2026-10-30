// Driving-control preferences; persistence (localStorage under CONTROLS_KEY) lives in main.js.
export const CONTROLS_KEY = 'skyline-rush-controls';

type SteeringMode = 'slide' | 'buttons' | 'tilt';
type ControlHand = 'left' | 'right';
type TouchSize = 'S' | 'M' | 'L';
type FlyMode = 'hold' | 'toggle';
type TouchAction = 'left' | 'right' | 'brake' | 'fly' | 'boost' | 'nitro' | 'throttle';
type TouchPoint = { x: number; y: number };

export interface ControlPreferences {
  mode: SteeringMode;
  hand: ControlHand;
  fullLock: 40 | 60 | 80;
  size: TouchSize;
  opacity: number;
  flyMode: FlyMode;
  sensitivity: number;
  ghost: boolean;
  layout: Partial<Record<TouchAction, TouchPoint>>;
  version: 1;
}

export const CONTROL_DEFAULTS: ControlPreferences = {
  mode: 'slide', hand: 'left', fullLock: 60, size: 'M', opacity: 0.9,
  flyMode: 'hold', sensitivity: 1, ghost: false, layout: {}, version: 1,
};
const ACTIONS: readonly TouchAction[] = ['left', 'right', 'brake', 'fly', 'boost', 'nitro', 'throttle'];
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);
const isOneOf = <T extends string | number>(value: unknown, allowed: readonly T[]): value is T =>
  allowed.includes(value as T);
const bounded = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0.4, value)) : fallback;

export function controlSettings(values: unknown = {}): ControlPreferences {
  if (!isRecord(values) || values.version !== CONTROL_DEFAULTS.version) return { ...CONTROL_DEFAULTS, layout: {} };
  const d = CONTROL_DEFAULTS;
  const layout: ControlPreferences['layout'] = {};
  const rawLayout = values.layout && typeof values.layout === 'object' ? values.layout : {};
  for (const [action, point] of Object.entries(rawLayout)) {
    if (!isOneOf(action, ACTIONS) || !isRecord(point)) continue;
    const { x, y } = point;
    if (typeof x === 'number' && Number.isFinite(x) && x >= 0 && x <= 1 &&
        typeof y === 'number' && Number.isFinite(y) && y >= 0 && y <= 1) {
      layout[action] = { x, y };
    }
  }
  return {
    mode: isOneOf(values.mode, ['slide', 'buttons', 'tilt'] as const) ? values.mode : d.mode,
    hand: isOneOf(values.hand, ['left', 'right'] as const) ? values.hand : d.hand,
    fullLock: isOneOf(values.fullLock, [40, 60, 80] as const) ? values.fullLock : d.fullLock,
    size: isOneOf(values.size, ['S', 'M', 'L'] as const) ? values.size : d.size,
    opacity: bounded(values.opacity, d.opacity),
    flyMode: isOneOf(values.flyMode, ['hold', 'toggle'] as const) ? values.flyMode : d.flyMode,
    sensitivity: bounded(values.sensitivity, d.sensitivity),
    ghost: typeof values.ghost === 'boolean' ? values.ghost : d.ghost,
    layout,
    version: d.version,
  };
}


// HUD presentation is independent of driving preferences; older v1 control settings remain untouched.
export const HUD_MODE_KEY = 'skyline-rush-hud-mode';
export type HudDisplayMode = 'hybrid' | 'competitive';
type HudModeReader = Pick<Storage, 'getItem'>;
type HudModeWriter = Pick<Storage, 'setItem'>;

export function resolveHudMode(value: unknown): HudDisplayMode {
  return value === 'competitive' ? 'competitive' : 'hybrid';
}

export function readHudMode(storage?: HudModeReader): HudDisplayMode {
  try { return resolveHudMode((storage ?? globalThis.localStorage).getItem(HUD_MODE_KEY)); }
  catch { return 'hybrid'; }
}

export function writeHudMode(mode: HudDisplayMode, storage?: HudModeWriter): void {
  try { (storage ?? globalThis.localStorage).setItem(HUD_MODE_KEY, resolveHudMode(mode)); }
  catch { /* Keep the chosen display mode in the mounted UI even if storage is blocked. */ }
}

/** Call from a Settings interaction, not the render loop. */
export function activateHudMode(mode: HudDisplayMode, root: Pick<HTMLElement, 'dataset'>, storage?: HudModeWriter): HudDisplayMode {
  const selected = resolveHudMode(mode);
  root.dataset.hudMode = selected;
  writeHudMode(selected, storage);
  return selected;
}

export const ORIENTATION_LAYOUT_KEY = 'skyline-rush-controls-layout-v2';
export type LayoutOrientation = 'portrait' | 'landscape';
export interface OrientationLayouts { version: 2; portrait: ControlPreferences['layout']; landscape: ControlPreferences['layout'] }
export function normalizeOrientationLayouts(value: unknown, legacy: ControlPreferences['layout'] = {}): OrientationLayouts {
  const sanitized = (layout: unknown): ControlPreferences['layout'] => controlSettings({ version: 1, layout }).layout;
  const fallback = sanitized(legacy);
  if (!isRecord(value) || value.version !== 2) return { version: 2, portrait: { ...fallback }, landscape: { ...fallback } };
  return { version: 2, portrait: sanitized(value.portrait), landscape: sanitized(value.landscape) };
}
export function readOrientationLayouts(legacy: ControlPreferences['layout'] = {}, storage?: Pick<Storage, 'getItem'>): OrientationLayouts {
  try { return normalizeOrientationLayouts(JSON.parse((storage ?? globalThis.localStorage).getItem(ORIENTATION_LAYOUT_KEY) ?? 'null'), legacy); }
  catch { return normalizeOrientationLayouts(null, legacy); }
}
export function writeOrientationLayouts(layouts: OrientationLayouts, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? globalThis.localStorage).setItem(ORIENTATION_LAYOUT_KEY, JSON.stringify(normalizeOrientationLayouts(layouts))); }
  catch { /* Layout remains active in memory when storage is blocked. */ }
}
export function orientationForViewport(width: number, height: number): LayoutOrientation { return width > height ? 'landscape' : 'portrait'; }

export const HUD_WIDGETS_KEY = 'skyline-rush-hud-widgets';
export interface HudWidgets { leaderboard: boolean; map: boolean; telemetry: boolean }
export const DEFAULT_HUD_WIDGETS: Readonly<HudWidgets> = Object.freeze({ leaderboard: true, map: true, telemetry: true });
export function normalizeHudWidgets(value: unknown): HudWidgets {
  return {
    leaderboard: isRecord(value) && typeof value.leaderboard === 'boolean' ? value.leaderboard : true,
    map: isRecord(value) && typeof value.map === 'boolean' ? value.map : true,
    telemetry: isRecord(value) && typeof value.telemetry === 'boolean' ? value.telemetry : true,
  };
}
export function readHudWidgets(storage?: Pick<Storage, 'getItem'>): HudWidgets {
  try { return normalizeHudWidgets(JSON.parse((storage ?? globalThis.localStorage).getItem(HUD_WIDGETS_KEY) ?? 'null')); }
  catch { return normalizeHudWidgets(null); }
}
export function writeHudWidgets(value: HudWidgets, storage?: Pick<Storage, 'setItem'>): void {
  try { (storage ?? globalThis.localStorage).setItem(HUD_WIDGETS_KEY, JSON.stringify(normalizeHudWidgets(value))); }
  catch { /* Widgets remain visible/usable in memory. */ }
}
