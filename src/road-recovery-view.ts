import type { Object3D, Vector3 } from 'three';
import { roadFallInProgress, roadFallPose, roadRecoveryFade, type RoadRecovery } from './road-falls.ts';

export function createRoadRecoveryView(canvas: HTMLCanvasElement) {
  const overlay = canvas.parentElement?.querySelector<HTMLElement>('#race-recovery');
  let seenSeat: RoadRecovery | undefined;
  return {
    cut: false,
    update(phase: string, recovery: RoadRecovery | undefined): RoadRecovery | undefined {
      const active = phase === 'racing' || phase === 'paused' ? recovery : undefined;
      const seat = active?.reseated ? active : undefined;
      this.cut = !!seat && seat !== seenSeat;
      seenSeat = seat;
      if (overlay && (active || !overlay.hidden)) {
        overlay.hidden = !active;
        if (active) {
          const stage = roadFallInProgress(active) ? 'fall' : 'return';
          if (overlay.dataset.stage !== stage) overlay.dataset.stage = stage;
          overlay.style.setProperty('--recovery-fade', String(this.cut ? 1 : roadRecoveryFade(active)));
        }
      }
      return active;
    },
  };
}

export function poseRoadRecovery(mesh: Object3D, recovery: RoadRecovery, altitude: number, graphAltitude: number | undefined, calm: boolean): void {
  if (graphAltitude !== undefined) mesh.position.y += altitude - graphAltitude;
  if (!roadFallInProgress(recovery) || calm) return;
  const fall = roadFallPose(recovery);
  mesh.translateZ(-fall.forward);
  mesh.rotateX(-fall.pitch);
  mesh.rotateZ(fall.roll);
}

export function frameRoadRecovery(eye: Vector3, look: Vector3, car: Object3D, recovery: RoadRecovery | undefined, altitude: number, calm: boolean): void {
  if (calm || !roadFallInProgress(recovery)) return;
  // Move in as the car falls so the last deck segment does not cover it.
  const progress = recovery.elapsed / recovery.transferAt;
  const ease = progress * (2 - progress);
  const dx = car.position.x - eye.x, dz = car.position.z - eye.z;
  const outward = 8 * ease / Math.max(1, Math.hypot(dx, dz));
  eye.x += dx * .42 * ease + dz * outward;
  eye.z += dz * .42 * ease - dx * outward;
  eye.y += Math.max(0, recovery.startAltitude - altitude) * .5 + progress * 1.5;
  look.lerp(car.position, .55 + progress * .34);
}
