import { emp as EMP } from '../../effects-palette.ts';
import type { EffectFx, FxRival, Rgb, StatusEmit } from '../fx-shared.ts';
import { createEmpDischarges } from './emp-discharges.ts';

// EMP around a hit car: short discharges jump off the body (emp-discharges.ts) and fine sparks crackle off it while
// it lasts (the shared shockwave fires on the hit). Low and reduced motion emit fewer particles (`thin`).

const SPARK_WHITE: Rgb = [2.6, 2.45, 2], SPARK_GOLD: Rgb = [2.2, 1.5, 0.35];

export function createEmpFx(capacity: number): EffectFx {
  const carry = new Float64Array(capacity), discharges = createEmpDischarges(capacity);

  function emitAround(emit: StatusEmit, rival: FxRival, count: number, burst: boolean) {
    const d0 = rival.distance ?? 0, x0 = rival.x ?? 0, y0 = (rival.altitude ?? 0) + 0.5, forward = rival.pace ?? rival.speed ?? 0;
    for (let n = 0; n < count; n++) { // fine streaked sparks (particle kind 1) spat from the body's outline
      const a = Math.random() * Math.PI * 2, c = Math.cos(a), s = Math.sin(a), d = d0 + s * 2.1, x = x0 + c * 0.95;
      const v = burst ? 6 + Math.random() * 7 : 2 + Math.random() * 4;
      emit(d, x, y0 + Math.random() * 0.7, c * v, 1 + Math.random() * 3, forward + s * v, 0.03 + Math.random() * 0.04,
        0.15 + Math.random() * 0.2, n % 3 ? SPARK_GOLD : SPARK_WHITE, 10, 1, 1);
    }
  }

  return {
    objects: [discharges.mesh],
    wave: EMP,
    begin(dt) { discharges.begin(dt); },
    car(i, f) {
      if (f.began) carry[i] = 0;
      discharges.car(i, f);
      if (!f.emit || !f.rival) return;
      if (f.began) emitAround(f.emit, f.rival, Math.round(30 * f.thin), true);
      if (f.on) { // sparks crackle
        carry[i] = carry[i]! + f.dt * 26 * f.thin;
        const count = Math.floor(carry[i]!);
        carry[i] = carry[i]! - count;
        if (count) emitAround(f.emit, f.rival, count, false);
      }
    },
    end() { discharges.end(); },
    reset() { carry.fill(0); discharges.reset(); },
    dispose() { discharges.dispose(); },
  };
}
