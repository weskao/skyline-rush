// Three-dimensional Sky Spiral road centreline, shared by gameplay and rendering.
// Distances are measured along the race, not in projected world-space Z.
export const SKY_SPIRAL = Object.freeze({ start: 1100, end: 2200, radius: 165, rise: 82 });
export const SKY_JUMPS = Object.freeze([
  { rampFrom: 2800, rampTo: 2870, gapFrom: 2870, gapTo: 2935 },
  { rampFrom: 3700, rampTo: 3775, gapFrom: 3775, gapTo: 3840 },
  { rampFrom: 4550, rampTo: 4630, gapFrom: 4630, gapTo: 4700 },
]);
const TAU = 2 * Math.PI;
const clamp01 = x => Math.max(0, Math.min(1, x));
const smooth = t => t * t * (3 - 2 * t);
const between = (x, a, b) => clamp01((x - a) / (b - a));

function elevation(distance) {
  if (distance <= 500) return 0;
  if (distance < 1100) {
    const t = between(distance, 500, 1100);
    // Hermite approach: a smooth take-off slope matching the helix's gradient.
    return 22 * (3 * t * t - 2 * t * t * t) + (82 / 1100 * 600) * (t ** 3 - t * t);
  }
  if (distance < 2200) return 22 + 82 * between(distance, 1100, 2200);
  if (distance < 2600) {
    const t = between(distance, 2200, 2600);
    return 104 * (2 * t ** 3 - 3 * t * t + 1) +
      115 * (-2 * t ** 3 + 3 * t * t) +
      (82 / 1100 * 400) * (t ** 3 - 2 * t * t + t);
  }
  if (distance < 5400) return 115 - 95 * smooth(between(distance, 2600, 5400));
  return 20;
}

function launchProfile(distance) {
  let offset = 0;
  for (const jump of SKY_JUMPS) {
    if (distance < jump.rampFrom || distance > jump.gapTo + 180) continue;
    if (distance < jump.rampTo) offset += 5 * smooth(between(distance, jump.rampFrom, jump.rampTo));
    else if (distance <= jump.gapTo) offset += 5;
    else offset += 5 * (1 - smooth(between(distance, jump.gapTo, jump.gapTo + 180)));
  }
  return offset;
}

export function skyPoint(distance) {
  const s = Number.isFinite(distance) ? distance : 0;
  const { start, end, radius } = SKY_SPIRAL;
  const y = elevation(s) + launchProfile(s);
  if (s < start) return { x: 0, y, z: -s };
  if (s <= end) {
    const angle = TAU * (s - start) / (end - start);
    return { x: radius * (1 - Math.cos(angle)), y, z: -start - radius * Math.sin(angle) };
  }
  return { x: 0, y, z: -start - (s - end) };
}

const unit = vector => {
  const length = Math.hypot(...vector) || 1;
  return vector.map(x => x / length);
};
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function skyFrame(distance) {
  const before = skyPoint(distance - 0.25), after = skyPoint(distance + 0.25);
  const forward = unit([after.x - before.x, after.y - before.y, after.z - before.z]);
  const horizontalRight = unit([-forward[2], 0, forward[0]]);
  const normal = unit(cross(horizontalRight, forward));
  const spiralBlend = smooth(between(distance, 1100, 1200)) * (1 - smooth(between(distance, 2100, 2200)));
  const bank = 0.11 * spiralBlend;
  const right = horizontalRight.map((v, i) => v * Math.cos(bank) + normal[i] * Math.sin(bank));
  const up = normal.map((v, i) => v * Math.cos(bank) - horizontalRight[i] * Math.sin(bank));
  return { point: skyPoint(distance), forward, right, up, bank };
}

export function skyPosition(distance, lateral = 0, altitude = 0, originDistance = 0) {
  const { point, right, up } = skyFrame(distance);
  const origin = skyPoint(originDistance);
  return [
    point.x - origin.x + right[0] * lateral + up[0] * altitude,
    point.y - origin.y + right[1] * lateral + up[1] * altitude,
    point.z - origin.z + right[2] * lateral + up[2] * altitude,
  ];
}

export function skyGapAt(distance) {
  return SKY_JUMPS.some(jump => distance >= jump.gapFrom && distance < jump.gapTo);
}
