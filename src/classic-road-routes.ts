// A sector describes a smooth change of heading from a straight, through an apex, back to a straight.
// Signed apex headings are degrees from the route's overall bearing. Paired corners can have different lengths.
type Bend = readonly [entry: number, exit: number, apexDegrees: number];

export interface ClassicRoad {
  /** World-space x and z, with the lane offset measured perpendicular to the driving direction. */
  point(distance: number, lane?: number): readonly [x: number, z: number];
  heading(distance: number): number;
  centerAtZ(z: number): number;
}

const STEP = 4;
const radians = Math.PI / 180;

function buildRoad(length: number, bends: readonly Bend[]): ClassicRoad {
  function headingAt(distance: number): number {
    for (const [entry, exit, degrees] of bends) {
      if (distance < entry) break;
      if (distance < exit) {
        const t = (distance - entry) / (exit - entry), blend = t * (1 - t);
        return degrees * radians * 16 * blend * blend;
      }
    }
    return 0;
  }

  // Integrate unit tangents once so race distance stays in road metres, including through a corner.
  const samples = length / STEP;
  const xs = new Float64Array(samples + 1), zs = new Float64Array(samples + 1);
  for (let i = 1; i <= samples; i++) {
    const angle = headingAt((i - .5) * STEP);
    xs[i] = xs[i - 1]! + Math.sin(angle) * STEP;
    zs[i] = zs[i - 1]! - Math.cos(angle) * STEP;
  }
  const endX = xs[samples]!, endZ = zs[samples]!;
  // Mirror alternating runs to retain the track's rhythm without an indefinitely growing lateral offset.
  return {
    point(distance, lane = 0) {
      if (distance <= 0) return [lane, -distance];
      const run = Math.floor(distance / length), s = distance % length, sign = run % 2 ? -1 : 1;
      const sample = Math.floor(s / STEP), fraction = s / STEP - sample;
      const x = xs[sample]! + (xs[sample + 1]! - xs[sample]!) * fraction;
      const z = zs[sample]! + (zs[sample + 1]! - zs[sample]!) * fraction;
      const angle = headingAt(s) * sign;
      return [(sign < 0 ? endX : 0) + sign * x + lane * Math.cos(angle),
        endZ * run + z + lane * Math.sin(angle)];
    },
    centerAtZ(z) {
      if (z >= 0) return 0;
      const run = Math.floor(z / endZ), s = z - endZ * run;
      let lo = 0, hi = samples;
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1;
        if (zs[mid]! > s) lo = mid; else hi = mid;
      }
      const fraction = (s - zs[lo]!) / (zs[hi]! - zs[lo]!);
      const x = xs[lo]! + (xs[hi]! - xs[lo]!) * fraction;
      return run % 2 ? endX - x : x;
    },
    heading(distance) {
      if (distance <= 0) return 0;
      return headingAt(distance % length) * (Math.floor(distance / length) % 2 ? -1 : 1);
    },
  };
}

const roads: Readonly<Record<string, ClassicRoad>> = {
  // Coast: big, readable sweeps and room to use BOOST alongside the water.
  coast: buildRoad(5000, [
    [210, 710, 30], [760, 1250, -38], [1440, 1950, 35],
    [2110, 2790, -32], [3020, 3460, 46], [3500, 3970, -47],
    [4160, 4700, 31], [4750, 4910, -22],
  ]),
  // Neon: successive city corners, with sightlines through the three tunnel mouths.
  neon: buildRoad(4000, [
    [160, 425, -41], [455, 575, 23], [645, 1040, 50],
    [1150, 1380, -52], [1405, 1645, 44], [1745, 2145, -55],
    [2310, 2575, 55], [2600, 2870, -49], [2940, 3350, 46],
    [3470, 3670, -44], [3685, 3900, 37],
  ]),
  // Canyon: long bends against the crosswind and a straight approach and landing at each broken span.
  canyon: buildRoad(6000, [
    [180, 620, -51], [700, 1375, 37], [1650, 2020, -54],
    [2035, 2380, 57], [2510, 2890, -56], [3140, 3520, 43],
    [3560, 4250, -35], [4560, 5100, 62], [5140, 5730, -48],
  ]),
  // Aurora: wider entries on ice, alternating sweepers and a tighter switchback before the final climb.
  aurora: buildRoad(5500, [
    [185, 565, 37], [600, 865, -45], [920, 1490, 35],
    [1610, 1960, -55], [1990, 2480, 49], [2620, 2780, -28],
    [2810, 3450, -43], [3520, 3740, 50], [3760, 4010, -53],
    [4250, 4830, 38], [4870, 5300, -46],
  ]),
};

export const classicRoadRoute = (id: string): ClassicRoad | undefined => Object.hasOwn(roads, id) ? roads[id] : undefined;
export const classicRoadCenter = (distance: number): number => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
export const legacyClassicRoad: ClassicRoad = {
  point: (distance, lane = 0) => [classicRoadCenter(distance) + lane, -distance],
  centerAtZ: z => classicRoadCenter(-z),
  heading: distance => Math.atan((classicRoadCenter(distance + 1) - classicRoadCenter(distance - 1)) / 2),
};

/** Grounded fast cars run a little wide while the road turns. Lane assist and full steering can both counter it. */
export function classicCornerPush(id: string, distance: number, speed: number): number {
  const road = classicRoadRoute(id);
  if (!road || speed <= 35) return 0;
  const turn = (road.heading(distance + 2) - road.heading(distance - 2)) / 4;
  const push = -turn * .25 * (speed - 35) ** 2;
  return Math.max(-2.8, Math.min(2.8, push));
}
