// Mini-boost start cue: two bundles of camera-facing ribbons from behind the rear wheels that stretch back up to
// ~8.6 m, played once when a mini-boost starts (when: mini-boost-cue.ts). Drawn in the fitted car frame, so they
// never fall behind at speed. The sustained part of the boost is aero-vfx.js's exhaust/airflow, not this.
// Rule: .claude/rules/mini-boost-streaks.md.
import * as THREE from 'three';
import { createStreakRibbons, streakEnvelope } from './pickup-collect-streaks.js';
import { placeInCarFrame } from './pickup-vehicle-fit.js';
import { createMiniBoostCue, stepMiniBoostCue, MINI_BOOST_STREAK_LIFE } from './mini-boost-cue.ts';

const LINES = 8, MEDIUM_LINES = 4;
// HDR (above 1) so the bloom lifts them over the pale boost plumes they overlap (aero-vfx.js).
const NEUTRAL_TINT = new THREE.Color().setRGB(.55, 1.3, 1.9), NEUTRAL_CORE = new THREE.Color().setRGB(1.3, 1.75, 2);
const WHITE = new THREE.Color(1, 1, 1);

function point(q, line, age, out) {
  const side = line % 2 ? 1 : -1, progress = age / MINI_BOOST_STREAK_LIFE;
  const reach = q * (2.2 + 6.4 * progress), phase = q * 12 - age * 24 + line * .85;
  // Rooted at the rear wheels (±1 m), not the can's ±.58 m: the chase camera sits behind the car, so a bundle that
  // starts at the exhausts runs down the screen inside aero-vfx's boost plumes and never reads.
  out.set(side * (.98 + reach * .16 + (line >> 1) * .06) + Math.sin(phase) * (.025 + q * .27),
    .38 + q * (.15 + .37 * progress) + Math.sin(phase * 1.2) * q * .28, 2.33 + reach);
}
const radius = line => line < 4 ? .23 : .12;

/** `driftColors`: the drift tier colours (effects.js), so a drift release streaks in the tier that paid. */
export function createMiniBoostStreaks(scene, driftColors) {
  const group = new THREE.Group();
  group.name = 'Mini boost cue';
  scene.add(group);
  const ribbons = createStreakRibbons(group, LINES, 'Mini boost streaks', NEUTRAL_TINT, NEUTRAL_CORE);
  ribbons.mesh.renderOrder = 12; // after the plumes, which would otherwise dim them
  const { tint, core } = ribbons.mesh.material.uniforms;
  let cue = createMiniBoostCue();

  return {
    /** `car`: the player's race state; `pose`: its rendered car. `active`: racing, effects on, time running. */
    update(car, pose, camera, dt, { active, enabled = true, quality = 'high', reducedMotion = false }) {
      if (stepMiniBoostCue(cue, car, dt, active)) {
        const rgb = driftColors[cue.tier - 1];
        if (rgb) { tint.value.setRGB(...rgb).multiplyScalar(.75); core.value.copy(tint.value).lerp(WHITE, .65); }
        else { tint.value.copy(NEUTRAL_TINT); core.value.copy(NEUTRAL_CORE); }
      }
      const power = cue.age < MINI_BOOST_STREAK_LIFE ? streakEnvelope(cue.age, MINI_BOOST_STREAK_LIFE) : 0;
      ribbons.mesh.visible = !!camera && !!pose && enabled && !reducedMotion && quality !== 'low' && power > .005;
      if (!ribbons.mesh.visible) return;
      placeInCarFrame(group, pose);
      group.updateMatrixWorld();
      ribbons.draw(camera, quality === 'medium' ? MEDIUM_LINES : LINES, cue.age, power, point, radius);
    },
    reset() { cue = createMiniBoostCue(); ribbons.mesh.visible = false; },
    dispose() { group.removeFromParent(); ribbons.dispose(); },
  };
}
