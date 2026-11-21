import { profileLength, profileRoad } from './track-profile-road.ts';

// Road-aligned Sky Spiral geometry uses fixed-length tuples to prevent missing axes.
export type Vec3 = [number, number, number];
export interface SkyPoint { x: number; y: number; z: number }

// Three-dimensional Sky Spiral road centreline, shared by gameplay and rendering.
// Distances are measured along the race, not in projected world-space Z.
const helix = { start: 1850, end: 3250, rise: 104 };
const helixLength = helix.end - helix.start;
export const SKY_SPIRAL = Object.freeze({ ...helix, radius: Math.sqrt(helixLength ** 2 - helix.rise ** 2) / (2 * Math.PI) });
export const SKY_JUMPS = Object.freeze([
  { rampFrom: 4650, rampTo: 4720, gapFrom: 4720, gapTo: 4880 },
  { rampFrom: 5550, rampTo: 5625, gapFrom: 5625, gapTo: 5790 },
  { rampFrom: 6350, rampTo: 6430, gapFrom: 6430, gapTo: 6600 },
]);
export const SKY_LENGTH = profileLength('spiral');
const clamp01 = (x: number): number => Math.max(0, Math.min(1, x));
const smooth = (t: number): number => t * t * (3 - 2 * t);
const between = (x: number, a: number, b: number): number => clamp01((x - a) / (b - a));

function launchDeck(distance: number) {
  const jump = SKY_JUMPS.find(({ rampFrom, gapTo }) => distance >= rampFrom && distance <= gapTo + 180);
  if (!jump) return { offset: 0, slope: 0 };
  if (distance < jump.rampTo) {
    const t = between(distance, jump.rampFrom, jump.rampTo);
    return { offset: 5 * smooth(t), slope: 30 * t * (1 - t) / (jump.rampTo - jump.rampFrom) };
  }
  if (distance <= jump.gapTo) return { offset: 5, slope: 0 };
  const t = between(distance, jump.gapTo, jump.gapTo + 180);
  return { offset: 5 * (1 - smooth(t)), slope: -30 * t * (1 - t) / 180 };
}

// Give each launch a straight takeoff and landing, with room for the surrounding sweepers.
const straights = SKY_JUMPS.map((jump, i) => ({
  from: jump.rampFrom - 20, to: jump.gapTo + 55, bearing: [392, 333, 322][i],
}));
const road = profileRoad('spiral', { helix, straights, deck: launchDeck })!;

export function skyPoint(distance: number, endless = false): SkyPoint {
  const station = Number.isFinite(distance) ? distance : 0;
  const s = endless ? station : Math.min(SKY_LENGTH, station);
  const [x, z] = road.point(s);
  return { x, y: road.elevation!(s), z };
}

function helixTraversal(run: number) {
  const sign = run % 2 ? -1 : 1;
  const entry = run * SKY_LENGTH + (sign === 1 ? SKY_SPIRAL.start : SKY_LENGTH - SKY_SPIRAL.end);
  return { entry, sign };
}

export function skyTowerOrigin(distance: number, endless: boolean) {
  const { entry, sign } = helixTraversal(endless ? Math.floor(Math.max(0, distance) / SKY_LENGTH) : 0);
  const { x, y, z } = skyPoint(entry, endless);
  return { x: x + sign * SKY_SPIRAL.radius, y, z, entry };
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
  const s = endless ? distance : Math.min(SKY_LENGTH, distance);
  const heading = road.heading(s), pitch = road.pitch!(s);
  const forward: Vec3 = [Math.sin(heading) * Math.cos(pitch), Math.sin(pitch), -Math.cos(heading) * Math.cos(pitch)];
  const horizontalRight = unit([-forward[2], 0, forward[0]]);
  const normal = unit(cross(horizontalRight, forward));
  const { entry, sign } = helixTraversal(endless ? Math.floor(Math.max(0, s) / SKY_LENGTH) : 0);
  const t = s - entry;
  const spiralBlend = smooth(between(t, 0, 100)) * (1 - smooth(between(t, helixLength - 100, helixLength)));
  const bank = sign * 0.11 * spiralBlend;
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

export function skyJumpGap(distance: number, endless = false) {
  return endless ? undefined : SKY_JUMPS.find(jump => distance >= jump.gapFrom && distance < jump.gapTo);
}
export const skyGapAt = (distance: number, endless = false): boolean => !!skyJumpGap(distance, endless);
