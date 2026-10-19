// Pure slide-pad state machine: touch-down point is the steering center, no DOM.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function createSlidePad({ fullLock = 60, deadZone = 6, brakeDown = 40 } = {}) {
  let lock = fullLock;
  let active = false;
  let origin = { x: 0, y: 0 };
  let thumb = { x: 0, y: 0 };

  // Past full lock the center trails the thumb, so reversing responds immediately.
  const follow = () => {
    const dx = thumb.x - origin.x;
    if (Math.abs(dx) > lock) origin.x = thumb.x - Math.sign(dx) * lock;
  };

  return {
    down(x, y) { active = true; origin = { x, y }; thumb = { x, y }; },
    move(x, y) {
      if (!active) return;
      thumb = { x, y };
      follow();
    },
    up() { active = false; origin = { x: 0, y: 0 }; thumb = { x: 0, y: 0 }; },
    reset() { this.up(); },
    setFullLock(px) {
      if (!(px > 0) || !Number.isFinite(px)) return;
      lock = px;
      if (active) follow();
    },
    read() {
      const dx = thumb.x - origin.x;
      return {
        steer: active && Math.abs(dx) >= deadZone ? clamp(dx / lock, -1, 1) : 0,
        brake: active && thumb.y - origin.y >= brakeDown,
        active,
        origin: { ...origin },
        thumb: { ...thumb },
      };
    },
  };
}
