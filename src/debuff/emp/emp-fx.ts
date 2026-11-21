import { emp as EMP } from '../../effects-palette.ts';
import type { EffectFx, FxRival, Rgb, StatusEmit } from '../fx-shared.ts';

// EMP around a hit car: sparks spit from the body while it lasts (the shared shockwave fires on the hit).
// Low and reduced motion emit fewer particles (`thin`).

const SPARK_WHITE: Rgb = [2.8, 2.65, 2.3];

export function createEmpFx(capacity: number): EffectFx {
  const carry = new Float64Array(capacity);

  function emitAround(emit: StatusEmit, rival: FxRival, count: number, burst: boolean) {
    const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.7, forward = rival.pace ?? rival.speed ?? 0;
    for (let n = 0; n < count; n++) { // streaked sparks (particle kind 1) fanning out of the body
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), d = d0 + s * 2, x = x0 + c * 1;
      const v = burst ? 7 + Math.random() * 8 : 3 + Math.random() * 6;
      emit(d, x, y0 + Math.random() * 0.5, c * v, 1.5 + Math.random() * 4, forward + s * v, 0.06 + Math.random() * 0.06,
        0.2 + Math.random() * 0.3, n % 3 ? EMP : SPARK_WHITE, 10, 1, 1);
    }
  }

  return {
    objects: [],
    wave: EMP,
    begin() {},
    car(i, f) {
      if (f.began) carry[i] = 0;
      if (!f.emit || !f.rival) return;
      if (f.began) emitAround(f.emit, f.rival, Math.round(26 * f.thin), true);
      if (f.on) { // sparks crackle hard
        carry[i] = carry[i]! + f.dt * 38 * f.thin;
        const count = Math.floor(carry[i]!);
        carry[i] = carry[i]! - count;
        if (count) emitAround(f.emit, f.rival, count, false);
      }
    },
    end() {},
    reset() { carry.fill(0); },
    dispose() {},
  };
}
