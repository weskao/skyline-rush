import * as THREE from 'three';

// Post-hit grace (`car.cooldown` > 0: crash, shield block or respawn, no collisions): the player car pulses
// translucent, the arcade "can't be hit" cue (kart racers blink, ghosting racers turn see-through).
export const GRACE_PULSE_HZ = 3; // at most 3 flashes/s (WCAG 2.3.1)
const LOW = 0.3, HIGH = 0.7, CALM = 0.5, EASE_OUT = 0.2; // opacity; seconds back to solid

export function graceOpacity(cooldown: number, elapsed: number, calm: boolean): number {
  if (!(cooldown > 0)) return 1;
  const o = calm ? CALM : LOW + (HIGH - LOW) * (0.5 + 0.5 * Math.cos(elapsed * Math.PI * 2 * GRACE_PULSE_HZ));
  return cooldown < EASE_OUT ? o + (1 - o) * (1 - cooldown / EASE_OUT) : o;
}

/** Captures the car's own materials now (VFX attached later keep their opacity); returns a setter for the scale. */
export function createGraceFade(car: THREE.Object3D): (opacity: number) => void {
  const parts: [THREE.Material, number][] = [];
  car.traverse(object => {
    for (const m of [(object as THREE.Mesh).material ?? []].flat()) {
      // Blending from creation (identical at opacity 1): flipping it on the first hit would compile new programs mid-race.
      if (m.transparent !== true) { m.transparent = true; m.needsUpdate = true; }
      if (!(m instanceof THREE.ShaderMaterial) && !parts.some(([seen]) => seen === m)) parts.push([m, m.opacity]);
    }
  });
  let last = 1;
  return opacity => {
    if (opacity === last) return;
    last = opacity;
    for (const [m, base] of parts) m.opacity = base * opacity;
  };
}
