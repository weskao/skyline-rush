// Pure slide-pad state machine: touch-down point is the steering center, no DOM.
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export const SLIDE_BRAKE_DISTANCES = { light: 40, balanced: 52, firm: 64 };
const BRAKE_RELEASE_MARGIN = 10;
const BRAKE_DIRECTION_RATIO = 1.15;
const BRAKE_EXTRA_PULL = 16;

export function createSlidePad({ fullLock = 60, deadZone = 6, brakeDown = SLIDE_BRAKE_DISTANCES.balanced }: { fullLock?: number; deadZone?: number; brakeDown?: number } = {}) {
  let lock = fullLock;
  let startX = 0;
  let brakeDistance = brakeDown;
  let brake = false;
  let active = false;
  let origin = { x: 0, y: 0 };
  let thumb = { x: 0, y: 0 };

  // Past full lock the center trails the thumb, so reversing responds immediately.
  const follow = () => {
    const dx = thumb.x - origin.x;
    if (Math.abs(dx) > lock) origin.x = thumb.x - Math.sign(dx) * lock;
  };

  return {
    down(x: number, y: number, distance = brakeDown) {
      active = true;
      startX = x;
      origin = { x, y };
      thumb = { x, y };
      brakeDistance = distance;
      brake = false;
    },
    move(x: number, y: number) {
      if (!active) return;
      thumb = { x, y };
      follow();
      const pull = y - origin.y;
      // Use the original touch-down X: the steering center follows the thumb after full lock.
      // A longer pull still allows deliberate braking when the thumb is already full-steer.
      const directionalDistance = Math.min(Math.abs(x - startX) * BRAKE_DIRECTION_RATIO, brakeDistance + BRAKE_EXTRA_PULL);
      brake = brake
        ? pull >= brakeDistance - BRAKE_RELEASE_MARGIN
        : pull >= Math.max(brakeDistance, directionalDistance);
    },
    up() { active = false; brake = false; origin = { x: 0, y: 0 }; thumb = { x: 0, y: 0 }; },
    reset() { this.up(); },
    setFullLock(px: number) {
      if (!(px > 0) || !Number.isFinite(px)) return;
      lock = px;
      if (active) follow();
    },
    read() {
      const dx = thumb.x - origin.x;
      return {
        steer: active && Math.abs(dx) >= deadZone ? clamp(dx / lock, -1, 1) : 0,
        brake,
        active,
        origin: { ...origin },
        thumb: { ...thumb },
      };
    },
  };
}
