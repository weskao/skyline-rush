const drivingKeys = {
  KeyW: 'throttle', ArrowUp: 'throttle', KeyS: 'brake', ArrowDown: 'brake',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'fly', ShiftLeft: 'boost', ShiftRight: 'boost',
};
const actionKeys = { Escape: 'pause', KeyP: 'pause', KeyR: 'restart', KeyC: 'camera', KeyM: 'sound', Enter: 'start' };

export function createControls(target = window, onAction = () => {}) {
  const keys = new Set();
  const pointers = new Map();
  const cleanups = [];
  function listen(element, type, handler) {
    element.addEventListener(type, handler);
    cleanups.push(() => element.removeEventListener(type, handler));
  }
  function clear() { keys.clear(); pointers.clear(); }
  listen(target, 'keydown', event => {
    if (event.target?.matches?.('input, textarea, select, [contenteditable="true"]')) return;
    if (drivingKeys[event.code]) {
      event.preventDefault();
      keys.add(event.code);
    } else if (actionKeys[event.code] && !event.repeat) {
      if (event.code === 'Enter' && event.target?.closest?.('button')) return;
      event.preventDefault();
      clear();
      onAction(actionKeys[event.code]);
    }
  });
  listen(target, 'keyup', event => keys.delete(event.code));
  listen(target, 'blur', clear);
  return {
    clear,
    read() {
      const held = new Set([...keys].map(key => drivingKeys[key]).concat([...pointers.values()]));
      return {
        throttle: held.has('throttle'), brake: held.has('brake'),
        steer: Number(held.has('right')) - Number(held.has('left')),
        fly: held.has('fly'), boost: held.has('boost'),
      };
    },
    bindButton(button, control) {
      listen(button, 'pointerdown', event => {
        event.preventDefault();
        pointers.set(event.pointerId, control);
        // Synthetic accessibility/test events do not own a native pointer to capture.
        if (button.hasPointerCapture && event.isTrusted) button.setPointerCapture(event.pointerId);
      });
      for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) {
        listen(button, type, event => pointers.delete(event.pointerId));
      }
    },
    destroy() { clear(); cleanups.forEach(remove => remove()); },
  };
}
