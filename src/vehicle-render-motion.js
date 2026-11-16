// Render-only positions between fixed 60 Hz physics steps; simulation and collisions stay authoritative.
const FIELDS = ['distance', 'x', 'altitude', 'speed', 'steering', 'verticalSpeed'];

function capture(car, out = {}) {
  for (const field of FIELDS) out[field] = car[field] ?? 0;
  return out;
}

export function captureRaceMotion(race, previous = {}) {
  previous.player = capture(race.player, previous.player);
  for (const kind of ['rivals', 'traffic']) {
    const snapshots = previous[kind] ??= [];
    const vehicles = race[kind];
    snapshots.length = vehicles.length;
    for (let i = 0; i < vehicles.length; i++) snapshots[i] = capture(vehicles[i], snapshots[i]);
  }
  return previous;
}

export function interpolateMotion(car, previous, alpha, out = {}) {
  const t = Math.max(0, Math.min(1, alpha));
  for (const field of FIELDS) {
    const now = car[field] ?? 0;
    const before = previous?.[field] ?? now;
    out[field] = before + (now - before) * t;
  }
  return out;
}

// Drift's visual 25-degree yaw is presentation only; scoring and steering remain exact-step.
export function smoothDriftYaw(yaw, drift, dt) {
  const target = drift ? -drift.dir * Math.PI * 25 / 180 : 0;
  return yaw + (target - yaw) * (1 - Math.exp(-12 * Math.max(0, dt)));
}

// Reuse a buffer per visible car rather than allocating 50+ interpolated objects every frame.
export function poseFor(mesh, car, previous, alpha) {
  return previous && alpha < 1 ? interpolateMotion(car, previous, alpha, mesh.userData.renderMotion ??= {}) : car;
}

// NITRO/BOOST ignition squat (presentation only): the nose lifts SQUAT_PITCH radians (about 2 degrees) at a full squat share.
const SQUAT_PITCH = 0.034;
export const squatPitch = share => SQUAT_PITCH * Math.max(0, Math.min(1, Number.isFinite(share) ? share : 0));

// Lift that keeps the rear tyres on the road while the car pitches nose-up about its origin: the car squats on its rear axle.
export function rearAxleLift(mesh, pitch) {
  if (!pitch) return 0;
  let rear = 0;
  for (const wheel of mesh.userData.wheels ?? []) rear = Math.max(rear, wheel.position.z);
  return rear * mesh.scale.z * Math.sin(pitch);
}
