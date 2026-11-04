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
