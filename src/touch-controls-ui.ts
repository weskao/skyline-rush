import { t } from './i18n.ts';
import { controlSettings, CONTROLS_KEY, normalizeOrientationLayouts, readOrientationLayouts, writeOrientationLayouts, orientationForViewport, type ControlPreferences } from './control-settings.ts';
import type { createControls } from './input.ts';
import { resolveFoldableLayout, placeInVisibleSegment, type FoldableLayout } from './foldable-layout.ts';

type Controls = ReturnType<typeof createControls>;
type Hand = ControlPreferences['hand'];
type Point = { x: number; y: number };
type Size = { width: number; height: number };
export type InputPrefs = ControlPreferences & { editing: boolean };
type Say = (element: HTMLElement, text: () => string) => void;
interface TouchControlsOptions {
  controls: Controls;
  getRacePhase(): string;
  isTutorialActive(): boolean;
  say: Say;
  cueUi(): void;
  closeControlsPanel(): void;
  /** Re-applies phase visibility after layout editing starts or stops. */
  refreshPhase(): void;
  reducedMotion: MediaQueryList;
}

const TOUCH_SCALE: Record<ControlPreferences['size'], number> = { S: 0.85, M: 1, L: 1.15 };
const PAD_BRAKE_PX = 40;
const PAD_HINT_SECONDS = 4;

/** What input.ts reads: practice uses slide steering until the tilt permission is granted. */
export const inputPrefsFor = (prefs: ControlPreferences, { tutorial, tiltGranted, editing }: { tutorial: boolean; tiltGranted: boolean; editing: boolean }): InputPrefs =>
  ({ ...prefs, mode: tutorial && prefs.mode === 'tilt' && !tiltGranted ? 'slide' : prefs.mode, editing });

/** CSS position of a custom-placed touch button, kept 8 px inside the safe area. */
export function layoutPosition(point: Point, hand: Hand, button: Size, viewport: Size, foldable: FoldableLayout | null = null): { left: string; top: string } {
  const halfWidth = button.width / 2 || 32;
  const halfHeight = button.height / 2 || 35;
  const position = placeInVisibleSegment({ x: (hand === 'right' ? 1 - point.x : point.x) * viewport.width,
    y: point.y * viewport.height }, button, foldable);
  return {
    left: `clamp(calc(env(safe-area-inset-left, 0px) + ${halfWidth + 8}px), ${position.x}px, calc(100vw - env(safe-area-inset-right, 0px) - ${halfWidth + 8}px))`,
    top: `clamp(calc(env(safe-area-inset-top, 0px) + ${halfHeight + 8}px), ${position.y}px, calc(100dvh - env(safe-area-inset-bottom, 0px) - ${halfHeight + 8}px))`,
  };
}

/** Viewport-relative point for a button dragged to (centerX, centerY), mirrored for the right hand. */
export function layoutPoint(centerX: number, centerY: number, button: Size, hand: Hand, viewport: Size, foldable: FoldableLayout | null = null): Point {
  const projected = placeInVisibleSegment({ x: centerX, y: centerY }, button, foldable);
  const x = Math.min(viewport.width - button.width / 2 - 8, Math.max(button.width / 2 + 8, projected.x));
  const y = Math.min(viewport.height - button.height / 2 - 8, Math.max(button.height / 2 + 8, projected.y));
  return { x: hand === 'right' ? 1 - x / viewport.width : x / viewport.width, y: y / viewport.height };
}

export function setupTouchControlsUI({ controls, getRacePhase, isTutorialActive, say, cueUi, closeControlsPanel, refreshPhase, reducedMotion }: TouchControlsOptions) {
  const $ = <T extends Element = HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;
  const touch = $('#touch-controls');
  const panel = $('#controls-panel');
  const tiltStatus = $('#tilt-status');
  const touchButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-control]')];
  const controlInputs = [...document.querySelectorAll<HTMLInputElement>('[data-controls]')];
  // In-memory source of truth: input.ts reads it on every pointermove, so storage is only touched on load/change.
  let controlPrefs = controlSettings();
  try { controlPrefs = controlSettings(JSON.parse(localStorage.getItem(CONTROLS_KEY)!)); } catch { /* Defaults work without storage. */ }
  let orientedLayouts = readOrientationLayouts(controlPrefs.layout);
  const currentOrientation = () => orientationForViewport(innerWidth, innerHeight);
  const readFoldable = (): FoldableLayout | null => {
    const provider = (window as Window & { getWindowSegments?: () => unknown }).getWindowSegments;
    try { return resolveFoldableLayout({ width: innerWidth, height: innerHeight }, typeof provider === 'function' ? provider.call(window) : null); }
    catch { return null; } // Optional API may throw during a fold transition.
  };
  let foldable = readFoldable();
  function publishFoldable(): void {
    const axis = foldable?.axis ?? '';
    touch.dataset.foldAxis = axis;
    document.body.dataset.foldAxis = axis;
    const vars = {
      '--fold-pane-left-end': foldable?.segments[0].left !== undefined && axis === 'vertical'
        ? `${foldable.segments[0].left + foldable.segments[0].width}px` : '',
      '--fold-pane-right-start': axis === 'vertical' ? `${foldable!.segments[1].left}px` : '',
      '--fold-pane-top-end': axis === 'horizontal'
        ? `${foldable!.segments[0].top + foldable!.segments[0].height}px` : '',
      '--fold-pane-bottom-start': axis === 'horizontal' ? `${foldable!.segments[1].top}px` : '',
    };
    for (const [name, value] of Object.entries(vars)) {
      if (value) document.body.style.setProperty(name, value);
      else document.body.style.removeProperty(name);
    }
  }
  publishFoldable();
  let editingLayout = false;
  let inputPrefs: InputPrefs = { ...controlPrefs, editing: false };
  let tiltRequest = 0, tiltGranted = false, tiltSeen = false;
  let tiltTimeout: ReturnType<typeof setTimeout> | undefined;

  function applyControls(persist = true): void {
    inputPrefs = inputPrefsFor(controlPrefs, { tutorial: isTutorialActive(), tiltGranted, editing: editingLayout });
    touch.dataset.steerMode = inputPrefs.mode;
    touch.dataset.hand = controlPrefs.hand;
    touch.dataset.size = controlPrefs.size;
    touch.style.setProperty('--touch-scale', String(TOUCH_SCALE[controlPrefs.size]));
    touch.style.setProperty('--touch-opacity', String(controlPrefs.opacity));
    // The Controls panel's preview strip reads the same two values, so size and opacity changes show immediately.
    panel.style.setProperty('--touch-scale', touch.style.getPropertyValue('--touch-scale'));
    panel.style.setProperty('--touch-opacity', String(controlPrefs.opacity));
    controls.setFlyMode(controlPrefs.flyMode);
    $('#tilt-enable').hidden = controlPrefs.mode !== 'tilt';
    if (controlPrefs.mode !== 'tilt') { controls.setTilt(false); tiltGranted = false; clearTimeout(tiltTimeout); }
    for (const button of touchButtons) {
      const point = isTutorialActive() ? undefined : orientedLayouts[currentOrientation()][button.dataset.control as keyof ControlPreferences['layout']];
      button.classList.toggle('is-positioned', !!point);
      if (point) {
        const { left, top } = layoutPosition(point, controlPrefs.hand, { width: button.offsetWidth, height: button.offsetHeight }, { width: innerWidth, height: innerHeight }, foldable);
        button.style.left = left;
        button.style.top = top;
      } else { button.style.removeProperty('left'); button.style.removeProperty('top'); }
    }
    for (const input of controlInputs) {
      const value = controlPrefs[input.dataset.controls as keyof ControlPreferences];
      if (input.type === 'radio') input.checked = input.value === String(value);
      else { input.value = String(value); (input.previousElementSibling as HTMLOutputElement).value = `${Math.round(Number(value) * 100)}%`; }
    }
    if (persist) {
      try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(controlPrefs)); } catch { /* Settings remain usable in memory. */ }
      writeOrientationLayouts(orientedLayouts);
    }
  }

  // input.ts keeps the slide-pad state private, so the ring/knob mirror it from the same pointer events (same follow-the-thumb rule as slide-pad.ts).
  const pad = $('.touch-pad');
  controls.bindSlidePad(pad, { getSettings: () => inputPrefs });
  const padRing = $('.pad-ring');
  const padKnob = $('.pad-knob');
  let padTouch: { id: number; ox: number; oy: number; x: number; y: number } | null = null;
  let padHint = false;
  const clampPad = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
  // Ring/knob sit at the pad's top-left in CSS; transform alone moves them (percentages centre each on its point).
  function placePad(el: HTMLElement, x: number, y: number, opacity: string): void {
    el.style.transform = `translate(calc(${x}px - 50%), calc(${y}px - 50%))`;
    el.style.opacity = opacity;
    el.style.transition = reducedMotion.matches ? 'none' : 'opacity 0.6s ease';
  }
  function drawPad(): void {
    const rect = pad.getBoundingClientRect();
    const brake = !!padTouch && padTouch.y - padTouch.oy >= PAD_BRAKE_PX;
    if (brake) touch.dataset.padBrake = 'true'; else delete touch.dataset.padBrake;
    if (padTouch) {
      const lock = controlPrefs.fullLock;
      placePad(padRing, padTouch.ox - rect.left, padTouch.oy - rect.top, '0.35');
      placePad(padKnob, clampPad(padTouch.x, padTouch.ox - lock, padTouch.ox + lock) - rect.left, clampPad(padTouch.y, padTouch.oy - lock, padTouch.oy + lock) - rect.top, '0.6');
    } else {
      placePad(padRing, rect.width / 2, rect.height / 2, padHint ? '0.25' : '0');
      placePad(padKnob, rect.width / 2, rect.height / 2, padHint ? '0.45' : '0');
    }
  }
  pad.addEventListener('pointerdown', event => { // the newest finger owns the pad, as in input.ts
    padTouch = { id: event.pointerId, ox: event.clientX, oy: event.clientY, x: event.clientX, y: event.clientY };
    drawPad();
  });
  pad.addEventListener('pointermove', event => {
    if (event.pointerId !== padTouch?.id) return;
    padTouch.x = event.clientX; padTouch.y = event.clientY;
    const dx = padTouch.x - padTouch.ox;
    if (Math.abs(dx) > controlPrefs.fullLock) padTouch.ox = padTouch.x - Math.sign(dx) * controlPrefs.fullLock;
    drawPad();
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
    pad.addEventListener(type, event => {
      if (event.pointerId !== padTouch?.id) return;
      padTouch = null;
      drawPad();
    });
  }
  applyControls();
  if (controlPrefs.mode === 'tilt') say(tiltStatus, () => t('tilt.saved'));

  panel.addEventListener('input', ({ target }) => {
    const input = target as HTMLInputElement;
    const key = input.dataset.controls;
    if (!key) return;
    tiltRequest++;
    controls.clear();
    if (key === 'mode' && input.value === 'tilt') { enableTilt(); return; }
    controlPrefs = controlSettings({ ...controlPrefs, [key]: ['fullLock', 'opacity', 'sensitivity'].includes(key) ? Number(input.value) : input.value });
    applyControls();
  });
  async function enableTilt(): Promise<void> {
    const request = ++tiltRequest;
    try {
      if (!window.isSecureContext || !window.DeviceOrientationEvent) throw new Error('unavailable');
      // iOS asks for motion permission; other browsers grant it implicitly.
      const permission = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
      const result = permission ? await permission.call(DeviceOrientationEvent) : 'granted';
      if (request !== tiltRequest || !['ready', 'paused'].includes(getRacePhase())) return;
      if (result !== 'granted') throw new Error('denied');
      controls.clear(); tiltGranted = true; tiltSeen = false;
      controlPrefs = { ...controlPrefs, mode: 'tilt' }; applyControls(); controls.setTilt(true);
      say(tiltStatus, () => t('tilt.waiting'));
      clearTimeout(tiltTimeout);
      tiltTimeout = setTimeout(() => {
        if (!tiltSeen && tiltGranted) {
          controlPrefs = { ...controlPrefs, mode: 'slide' }; applyControls();
          say(tiltStatus, () => t('tilt.none'));
        }
      }, 2500);
    } catch (error) {
      if (request !== tiltRequest) return;
      controlPrefs = { ...controlPrefs, mode: 'slide' }; applyControls();
      say(tiltStatus, () => t((error as Error).message === 'denied' ? 'tilt.denied' : 'tilt.unavailable'));
    }
  }
  $('#tilt-enable').addEventListener('click', enableTilt);
  $('#controls-reset').addEventListener('click', () => { tiltRequest++; controls.clear(); controlPrefs = controlSettings(); orientedLayouts = normalizeOrientationLayouts(null); applyControls(); cueUi(); });

  function editLayout(editing: boolean): void {
    editingLayout = editing;
    controls.clear(); padTouch = null; drawPad();
    document.body.classList.toggle('layout-editing', editing);
    $('#layout-toolbar').hidden = !editing;
    closeControlsPanel();
    refreshPhase();
    applyControls();
  }
  $('#layout-edit').addEventListener('click', () => editLayout(true));
  $('#layout-done').addEventListener('click', () => editLayout(false));
  $('#layout-reset').addEventListener('click', () => { controlPrefs = { ...controlPrefs, layout: {} }; orientedLayouts = normalizeOrientationLayouts(null); applyControls(); });
  for (const button of touchButtons) {
    let drag: { id: number; x: number; y: number; origins: { action: keyof ControlPreferences['layout']; x: number; y: number; width: number; height: number }[] } | null = null;
    button.addEventListener('pointerdown', event => {
      if (!editingLayout) return;
      event.preventDefault();
      // Moving either member moves its whole thumb cluster; the pad remains input-owned.
      const steer = ['left', 'right', 'brake'].includes(button.dataset.control!);
      const peers = touchButtons.filter(peer => steer === ['left', 'right', 'brake'].includes(peer.dataset.control!));
      drag = { id: event.pointerId, x: event.clientX, y: event.clientY, origins: peers.map(peer => {
        const rect = peer.getBoundingClientRect();
        return { action: peer.dataset.control as keyof ControlPreferences['layout'],
          x: rect.left + rect.width / 2, y: rect.top + rect.height / 2,
          width: peer.offsetWidth, height: peer.offsetHeight };
      }) };
      button.setPointerCapture(event.pointerId);
    });
    button.addEventListener('pointermove', event => {
      if (!editingLayout || event.pointerId !== drag?.id) return;
      const offsetX = event.clientX - drag.x, offsetY = event.clientY - drag.y;
      const next = { ...orientedLayouts[currentOrientation()] };
      for (const origin of drag.origins) {
        next[origin.action] = layoutPoint(origin.x + offsetX, origin.y + offsetY,
          { width: origin.width, height: origin.height }, controlPrefs.hand, { width: innerWidth, height: innerHeight }, foldable);
      }
      orientedLayouts = { ...orientedLayouts, [currentOrientation()]: next };
      applyControls(false);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) button.addEventListener(type, event => { if (event.pointerId === drag?.id) { drag = null; applyControls(); } });
  }
  let lastOrientation = currentOrientation();
  let lastWidth = innerWidth;
  const onViewportChange = (): void => {
    const orientation = currentOrientation();
    const previous = JSON.stringify(foldable);
    foldable = readFoldable();
    publishFoldable();
    // Browser chrome changes height frequently; only fold/unfold, width change or rotation releases held input.
    if (orientation !== lastOrientation || Math.abs(innerWidth - lastWidth) > 16 || JSON.stringify(foldable) !== previous) {
      controls.clear(); padTouch = null; drawPad();
    }
    lastOrientation = orientation;
    lastWidth = innerWidth;
    applyControls(false); // Never overwrite stored custom coordinates on a resize.
  };
  window.addEventListener('resize', onViewportChange);
  window.visualViewport?.addEventListener('resize', onViewportChange);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { controls.clear(); padTouch = null; drawPad(); }
  });
  window.addEventListener('pagehide', () => { controls.clear(); padTouch = null; });

  return {
    prefs: (): ControlPreferences => controlPrefs,
    inputPrefs: (): InputPrefs => inputPrefs,
    isEditing: (): boolean => editingLayout,
    applyControls,
    editLayout,
    setGhost(on: boolean): void { controlPrefs = controlSettings({ ...controlPrefs, ghost: on }); applyControls(); },
    /** controls.clear() resets the real pad; drop the mirrored ring/knob with it. */
    resetPad(): void { padTouch = null; drawPad(); },
    /** First seconds of a slide-steering race show where the pad is. */
    updatePadHint(phase: string, elapsed: number): void {
      const hint = !padTouch && phase === 'racing' && elapsed < PAD_HINT_SECONDS && controlPrefs.mode === 'slide';
      if (hint !== padHint) { padHint = hint; drawPad(); }
    },
    onTilt(): void {
      if (tiltSeen) return;
      tiltSeen = true; clearTimeout(tiltTimeout);
      say(tiltStatus, () => t('tilt.ready'));
    },
  };
}
