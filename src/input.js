import { createSlidePad } from './slide-pad.js';
import { DEFAULT_KEY_MAP, ACTION_KEYS as actionKeys } from './key-map.js';

// code -> action lookup, rebuilt only when the key map object changes.
const lookupFor = map => Object.fromEntries(Object.entries(map).flatMap(([action, codes]) => codes.map(code => [code, action])));

export function createControls(target = window, onAction = () => {}, { getSettings: defaultSettings = () => ({}), getKeyMap = () => DEFAULT_KEY_MAP, onTilt = () => {} } = {}) {
  let mapped = null;
  let drivingKeys = {};
  const syncKeys = () => { const map = getKeyMap(); if (map !== mapped) { mapped = map; drivingKeys = lookupFor(map); } };
  const keys = new Set();
  const pointers = new Map();
  const slides = [];
  const actionButtons = new Map();
  let tiltEnabled = false, tiltBase = null, tiltAngle = null, tiltSteer = 0, tiltAt = 0;
  let flyMode = 'hold';
  let flyLatched = false;
  const cleanups = [];
  function listen(element, type, handler) {
    element.addEventListener(type, handler);
    cleanups.push(() => element.removeEventListener(type, handler));
  }
  function clear() {
    keys.clear(); pointers.clear(); flyLatched = false;
    tiltBase = null; tiltSteer = 0;
    for (const slide of slides) { slide.pointerId = null; slide.pad.reset(); }
  }
  listen(target, 'keydown', event => {
    syncKeys();
    if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space' && event.target?.closest?.('button')) return;
    if (drivingKeys[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    } else if (actionKeys[event.code] && !event.repeat) {
      if (event.code === 'Enter' && event.target?.closest?.('button')) return;
      event.preventDefault();
      if (['pause', 'restart', 'start'].includes(actionKeys[event.code])) clear();
      onAction(actionKeys[event.code]);
    }
  });
  listen(target, 'keyup', event => keys.delete(event.code));
  listen(target, 'blur', clear);
  listen(target, 'deviceorientation', event => {
    if (!tiltEnabled || defaultSettings()?.mode !== 'tilt' || defaultSettings()?.editing ||
      !Number.isFinite(event.gamma) || !Number.isFinite(event.beta)) return;
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
  for (const type of ['contextmenu', 'dragstart']) {
    listen(target, type, event => event.preventDefault());
  }
  return {
    clear,
    read() {
      syncKeys();
      const held = new Set([...keys].map(key => drivingKeys[key]).concat([...pointers.values()].flat()));
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
        fly: held.has('fly') || flyLatched, boost: held.has('boost'), nitro: held.has('nitro'),
      };
    },
    bindButton(button, control) {
      if (control === 'fly' || control === 'boost') actionButtons.set(control, button);
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        if (defaultSettings()?.editing) return;
        if (control === 'fly' && flyMode === 'toggle') { flyLatched = !flyLatched; pointers.set(event.pointerId, []); }
        else pointers.set(event.pointerId, [control]);
        // Synthetic accessibility/test events do not own a native pointer to capture.
        if (button.hasPointerCapture && event.isTrusted) button.setPointerCapture(event.pointerId);
      });
      listen(button, 'pointermove', event => {
        if (!pointers.has(event.pointerId) || event.pointerType !== 'touch' || !actionButtons.has(control) || defaultSettings()?.editing) return;
        const held = [];
        for (const [action, element] of actionButtons) {
          const rect = element.getBoundingClientRect();
          // An 8 px seam lets one thumb bridge adjacent buttons; edited distant buttons stay separate.
          if (event.clientX >= rect.left - 8 && event.clientX <= rect.right + 8 && event.clientY >= rect.top && event.clientY <= rect.bottom &&
            !(action === 'fly' && flyMode === 'toggle')) held.push(action);
        }
        pointers.set(event.pointerId, held);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(button, type, event => pointers.delete(event.pointerId));
      }
    },
    bindSlidePad(element, { getSettings = defaultSettings } = {}) {
      const slide = { pointerId: null, pad: createSlidePad() };
      slides.push(slide);
      const syncLock = () => slide.pad.setFullLock(getSettings()?.fullLock);
      listen(element, 'pointerdown', event => {
        event.preventDefault();
        if (slide.pointerId !== null) return;
        slide.pointerId = event.pointerId;
        syncLock();
        slide.pad.down(event.clientX, event.clientY);
        // Synthetic accessibility/test events do not own a native pointer to capture.
        if (element.hasPointerCapture && event.isTrusted) element.setPointerCapture(event.pointerId);
      });
      listen(element, 'pointermove', event => {
        if (event.pointerId !== slide.pointerId) return;
        syncLock();
        slide.pad.move(event.clientX, event.clientY);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(element, type, event => {
          if (event.pointerId !== slide.pointerId) return;
          slide.pointerId = null;
          slide.pad.up();
        });
      }
    },
    setFlyMode(mode) { flyMode = mode === 'toggle' ? 'toggle' : 'hold'; if (flyMode === 'hold') flyLatched = false; },
    setTilt(enabled) { tiltEnabled = !!enabled; tiltBase = null; tiltSteer = 0; },
    toggleFly() { flyLatched = !flyLatched; },
    setFly(on) { flyLatched = Boolean(on); },
    destroy() { clear(); cleanups.forEach(remove => remove()); },
  };
}
