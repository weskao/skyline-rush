// Road-aligned Sky Spiral geometry uses fixed-length tuples to prevent missing axes.
export type Vec3 = [number, number, number];
export interface SkyPoint { x: number; y: number; z: number }

// Three-dimensional Sky Spiral road centreline, shared by gameplay and rendering.
// Distances are measured along the race, not in projected world-space Z.
export const SKY_SPIRAL = Object.freeze({ start: 1100, end: 2200, radius: 165, rise: 82 });
export const SKY_JUMPS = Object.freeze([
  { rampFrom: 2800, rampTo: 2870, gapFrom: 2870, gapTo: 2935 },
  { rampFrom: 3700, rampTo: 3775, gapFrom: 3775, gapTo: 3840 },
  { rampFrom: 4550, rampTo: 4630, gapFrom: 4630, gapTo: 4700 },
]);
const TAU = 2 * Math.PI;
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const between = (x: number, a: number, b: number): number => clamp01((x - a) / (b - a));

function elevation(distance: number): number {
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

function launchProfile(distance: number): number {
  let offset = 0;
  for (const jump of SKY_JUMPS) {
    if (distance < jump.rampFrom || distance > jump.gapTo + 180) continue;
    if (distance < jump.rampTo) offset += 5 * smooth(between(distance, jump.rampFrom, jump.rampTo));
    else if (distance <= jump.gapTo) offset += 5;
    else offset += 5 * (1 - smooth(between(distance, jump.gapTo, jump.gapTo + 180)));
  }
  return offset;
}

export function skyPoint(distance: number, endless = false): SkyPoint {
  const s = Number.isFinite(distance) ? distance : 0;
  const { start, end, radius } = SKY_SPIRAL;
  const y = elevation(s) + launchProfile(s);
  if (s < start) return { x: 0, y, z: -s };
  if (s <= end) {
    const angle = TAU * (s - start) / (end - start);
    return { x: radius * (1 - Math.cos(angle)), y, z: -start - radius * Math.sin(angle) };
  }
  const original = { x: 0, y, z: -start - (s - end) };
  // Only Endless adds repeatable 3D loops after the untouched 5.6 km sprint.
  if (!endless || s <= 5600) return original;
  const phase = (s - 5600) % 3800;
  if (phase <= 900 || phase >= 2500) return original;
  const u = (phase - 900) / 1600, angle = TAU * u;
  const envelope = Math.sin(Math.PI * u) ** 2;
  return {
    x: SKY_SPIRAL.radius * (1 - Math.cos(angle)),
    y: y + SKY_SPIRAL.rise * envelope,
    z: original.z - SKY_SPIRAL.radius * Math.sin(angle) * envelope,
  };
}

const unit = (vector: Vec3): Vec3 => {
  const length = Math.hypot(...vector) || 1;
  return vector.map(x => x / length) as Vec3;
};
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

export function skyFrame(distance: number, endless = false) {
  const before = skyPoint(distance - 0.25, endless), after = skyPoint(distance + 0.25, endless);
  const forward = unit([after.x - before.x, after.y - before.y, after.z - before.z]);
  const horizontalRight = unit([-forward[2], 0, forward[0]]);
  const normal = unit(cross(horizontalRight, forward));
  const spiralBlend = smooth(between(distance, 1100, 1200)) * (1 - smooth(between(distance, 2100, 2200)));
  const bank = 0.11 * spiralBlend;
  const right = horizontalRight.map((v, i) => v * Math.cos(bank) + normal[i] * Math.sin(bank)) as Vec3;
  const up = normal.map((v, i) => v * Math.cos(bank) - horizontalRight[i] * Math.sin(bank)) as Vec3;
  return { point: skyPoint(distance, endless), forward, right, up, bank };
}

export function skyPosition(distance: number, lateral = 0, altitude = 0, originDistance = 0, endless = false): Vec3 {
  const { point, right, up } = skyFrame(distance, endless);
  const origin = skyPoint(originDistance, endless);
  return [
    point.x - origin.x + right[0] * lateral + up[0] * altitude,
    point.y - origin.y + right[1] * lateral + up[1] * altitude,
    point.z - origin.z + right[2] * lateral + up[2] * altitude,
  ];
}

export function skyGapAt(distance: number): boolean {
  return SKY_JUMPS.some(jump => distance >= jump.gapFrom && distance < jump.gapTo);
}
