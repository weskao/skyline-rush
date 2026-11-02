import { createSlidePad } from './slide-pad.ts';
import { installGameTouchGuard } from './ios-touch-guard.ts';
import type { DriveAction, KeyMap } from './key-map.ts';
import type { ControlPreferences } from './control-settings.ts';

type ControlSettings = Partial<ControlPreferences> & { editing?: boolean };
type ControlTarget = EventTarget & { screen?: Screen; orientation?: number };
type ControlButton = HTMLElement & { disabled?: boolean };
interface ControlOptions {
  getSettings?: () => ControlSettings;
  getKeyMap?: () => KeyMap;
  onTilt?: () => void;
}
interface SlideBinding { pointerId: number | null; pad: ReturnType<typeof createSlidePad> }
type HeldAction = DriveAction;

import { DEFAULT_KEY_MAP, ACTION_KEYS as actionKeys } from './key-map.ts';

// code -> action lookup, rebuilt only when the key map object changes.
const lookupFor = (map: KeyMap): Record<string, DriveAction> => Object.fromEntries(Object.entries(map).flatMap(([action, codes]) => codes.map(code => [code, action]))) as Record<string, DriveAction>;

export function createControls(target: ControlTarget = window, onAction: (action: string) => void = () => {}, { getSettings: defaultSettings = () => ({}), getKeyMap = () => DEFAULT_KEY_MAP, onTilt = () => {} }: ControlOptions = {}) {
  let mapped: KeyMap | null = null;
  let drivingKeys: Record<string, DriveAction> = {};
  const syncKeys = () => { const map = getKeyMap(); if (map !== mapped) { mapped = map; drivingKeys = lookupFor(map); } };
  const keys = new Set<string>();
  const pointers = new Map<number, HeldAction[]>();
  const slides: SlideBinding[] = [];
  const actionButtons = new Map<DriveAction, ControlButton>();
  let brakeButton: ControlButton | null = null;
  let tiltEnabled = false, tiltBase: number | null = null, tiltAngle: number | null = null, tiltSteer = 0, tiltAt = 0;
  let flyMode = 'hold';
  let flyLatched = false;
  let flyEnabled = true;
  const cleanups: Array<() => void> = [];
  if (typeof document !== 'undefined') cleanups.push(installGameTouchGuard(document));
  function listen<T extends Event>(element: EventTarget, type: string, handler: (event: T) => void, options?: AddEventListenerOptions): void {
    const listener = handler as EventListener;
    element.addEventListener(type, listener, options);
    cleanups.push(() => element.removeEventListener(type, listener));
  }
  // iOS shows its long-press magnifier loupe despite user-select: none; only a cancelled touchstart stops it.
  // Pointer events still fire, and these controls never rely on the click a touchstart cancel suppresses.
  const holdWithoutLoupe = (element: EventTarget) => listen(element, 'touchstart', event => event.preventDefault(), { passive: false });
  function clear() {
    keys.clear(); pointers.clear(); flyLatched = false;
    tiltBase = null; tiltSteer = 0;
    for (const slide of slides) { slide.pointerId = null; slide.pad.reset(); }
  }
  listen<KeyboardEvent>(target, 'keydown', event => {
    syncKeys();
    if ((event.target as Element | null)?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    // Buttons and <details> summaries keep native Enter/Space activation (a summary opens its panel).
    const nativeControl = (event.target as Element | null)?.closest?.('button, summary');
    if (event.code === 'Space' && nativeControl) return;
    if (drivingKeys[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    } else if (actionKeys[event.code as keyof typeof actionKeys] && !event.repeat) {
      if (event.code === 'Enter' && (nativeControl || (event.target as Element | null)?.closest?.('a[href]'))) return; // links activate on Enter too
      event.preventDefault();
      if (['pause', 'restart', 'start'].includes(actionKeys[event.code as keyof typeof actionKeys])) clear();
      onAction(actionKeys[event.code as keyof typeof actionKeys]);
    }
  });
  listen<KeyboardEvent>(target, 'keyup', event => keys.delete(event.code));
  listen(target, 'blur', clear);
  listen<DeviceOrientationEvent>(target, 'deviceorientation', event => {
    if (!tiltEnabled || defaultSettings()?.mode !== 'tilt' || defaultSettings()?.editing ||
      typeof event.gamma !== 'number' || !Number.isFinite(event.gamma) || typeof event.beta !== 'number' || !Number.isFinite(event.beta)) return;
    const angle = target.screen?.orientation?.angle ?? target.orientation ?? 0;
    if (angle !== tiltAngle) { tiltBase = null; tiltAngle = angle; }
    const radians = angle * Math.PI / 180;
    const value = event.gamma * Math.cos(radians) + event.beta * Math.sin(radians);
    tiltBase ??= value;
    const delta = ((value - tiltBase + 540) % 360) - 180;
    tiltSteer = Math.abs(delta) < 2 ? 0 : Math.max(-1, Math.min(1, delta / 20)) * (defaultSettings()?.sensitivity ?? 1);
    tiltAt = Date.now();
    onTilt();
  });
  for (const type of ['contextmenu', 'dragstart', 'selectstart']) {
    listen<Event>(target, type, event => event.preventDefault());
  }
  return {
    clear,
    read() {
      syncKeys();
      const held = new Set<HeldAction | undefined>([...keys].map(key => drivingKeys[key]).concat([...pointers.values()].flat()));
      let steer = (Number(held.has('right')) - Number(held.has('left'))) * (defaultSettings()?.sensitivity ?? 1);
      let brake = held.has('brake');
      if (defaultSettings()?.mode === 'tilt' && Date.now() - tiltAt < 500 && Math.abs(tiltSteer) > Math.abs(steer)) steer = tiltSteer;
      for (const { pad } of slides) {
        const read = pad.read();
        if (Math.abs(read.steer) > Math.abs(steer)) steer = read.steer;
        brake ||= read.brake;
      }
      return {
        throttle: held.has('throttle'), brake, steer,
        fly: flyEnabled && (held.has('fly') || flyLatched), boost: held.has('boost'), nitro: held.has('nitro'),
      };
    },
    bindButton(button: ControlButton, control: DriveAction) {
      if (control === 'fly' || control === 'boost') actionButtons.set(control, button);
      if (control === 'brake') brakeButton = button;
      holdWithoutLoupe(button);
      listen<PointerEvent>(button, 'pointerdown', event => {
        event.preventDefault();
        if (defaultSettings()?.editing || button.disabled || (control === 'fly' && !flyEnabled)) return;
        // WebKit withholds the release of a touch that became an edge-swipe gesture: a new finger on the
        // same button takes it over from any pointer still holding it.
        for (const [id, held] of pointers) if (held.includes(control)) pointers.set(id, held.filter(action => action !== control));
        if (control === 'fly' && flyMode === 'toggle') { flyLatched = !flyLatched; pointers.set(event.pointerId, []); }
        else pointers.set(event.pointerId, [control]);
        // Synthetic accessibility/test events do not own a native pointer to capture.
        if (typeof button.hasPointerCapture === 'function' && event.isTrusted) button.setPointerCapture(event.pointerId);
      });
      listen<PointerEvent>(button, 'pointermove', event => {
        if (!pointers.has(event.pointerId) || event.pointerType !== 'touch' || defaultSettings()?.editing) return;
        const steer = pointers.get(event.pointerId)!.find(action => action === 'left' || action === 'right');
        if (steer) {
          // One-thumb drift: a steering thumb slid up into BRAKE keeps its direction and brakes while it is over BRAKE.
          const rect = brakeButton?.getBoundingClientRect();
          const onBrake = !!rect && rect.width > 0 && !!brakeButton && !brakeButton.disabled && event.clientX >= rect.left && event.clientX <= rect.right &&
            event.clientY >= rect.top && event.clientY <= rect.bottom;
          pointers.set(event.pointerId, onBrake ? [steer, 'brake'] : [steer]);
          return;
        }
        if (!actionButtons.has(control)) return;
        const held: DriveAction[] = [];
        for (const [action, element] of actionButtons) {
          const rect = element.getBoundingClientRect();
          // An 8 px seam lets one thumb bridge adjacent buttons; edited distant buttons stay separate.
          if (!element.disabled && !(action === 'fly' && !flyEnabled) && event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8 && event.clientY >= rect.top && event.clientY <= rect.bottom &&
            !(action === 'fly' && flyMode === 'toggle')) held.push(action);
        }
        pointers.set(event.pointerId, held);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen<PointerEvent>(button, type, event => pointers.delete(event.pointerId));
      }
    },
    bindSlidePad(element: HTMLElement, { getSettings = defaultSettings }: { getSettings?: () => ControlSettings } = {}) {
      const slide: SlideBinding = { pointerId: null, pad: createSlidePad() };
      slides.push(slide);
      const syncLock = () => slide.pad.setFullLock(getSettings()?.fullLock ?? 60);
      holdWithoutLoupe(element);
      listen<PointerEvent>(element, 'pointerdown', event => {
        event.preventDefault();
        slide.pointerId = event.pointerId; // the newest finger owns the pad (see bindButton)
        syncLock();
        slide.pad.down(event.clientX, event.clientY);
        // Synthetic accessibility/test events do not own a native pointer to capture.
        if (typeof element.hasPointerCapture === 'function' && event.isTrusted) element.setPointerCapture(event.pointerId);
      });
      listen<PointerEvent>(element, 'pointermove', event => {
        if (event.pointerId !== slide.pointerId) return;
        syncLock();
        slide.pad.move(event.clientX, event.clientY);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen<PointerEvent>(element, type, event => {
          if (event.pointerId !== slide.pointerId) return;
          slide.pointerId = null;
          slide.pad.up();
        });
      }
    },
    setFlyMode(mode: string) { flyMode = mode === 'toggle' ? 'toggle' : 'hold'; if (flyMode === 'hold') flyLatched = false; },
    setFlyEnabled(enabled: boolean) {
      flyEnabled = !!enabled;
      if (!flyEnabled) {
        flyLatched = false;
        for (const [id, held] of pointers) pointers.set(id, held.filter(action => action !== 'fly'));
      }
    },
    setTilt(enabled: boolean) { tiltEnabled = !!enabled; tiltBase = null; tiltSteer = 0; },
    toggleFly() { flyLatched = !flyLatched; },
    setFly(on: boolean) { flyLatched = Boolean(on); },
    destroy() { clear(); cleanups.forEach(remove => remove()); },
  };
}
