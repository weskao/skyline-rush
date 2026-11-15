// A sector describes a smooth change of heading from a straight, through an apex, back to a straight.
// Signed apex headings are degrees from the route's overall bearing. Paired corners can have different lengths.
type Bend = readonly [entry: number, exit: number, apexDegrees: number];
// A lap is authored as legs: metres of road and the degrees it turns over them (right-hand positive, 0 = straight).
type Leg = readonly [metres: number, turnDegrees: number];

export interface ClassicRoad {
  /** World-space x and z, with the lane offset measured perpendicular to the driving direction. */
  point(distance: number, lane?: number): readonly [x: number, z: number];
  heading(distance: number): number;
  /** Metres from a world position to the centre line. An open road measures across x. A lap measures to its nearest
   *  part within `reach` metres (16 unless given) and reads Infinity beyond. */
  offset(x: number, z: number, reach?: number): number;
  /** Set on a closed lap: its length. The road then repeats instead of mirroring. */
  lap?: number;
}

const STEP = 4;
const radians = Math.PI / 180;

// Integrate unit tangents once so race distance stays in road metres, including through a corner.
function integrate(length: number, headingAt: (distance: number) => number) {
  const samples = length / STEP;
  const xs = new Float64Array(samples + 1), zs = new Float64Array(samples + 1);
  for (let i = 1; i <= samples; i++) {
    const angle = headingAt((i - .5) * STEP);
    xs[i] = xs[i - 1]! + Math.sin(angle) * STEP;
    zs[i] = zs[i - 1]! - Math.cos(angle) * STEP;
  }
  const at = (s: number, lane: number, angle: number): [number, number] => {
    const sample = Math.min(samples - 1, Math.floor(s / STEP)), fraction = s / STEP - sample;
    return [xs[sample]! + (xs[sample + 1]! - xs[sample]!) * fraction + lane * Math.cos(angle),
      zs[sample]! + (zs[sample + 1]! - zs[sample]!) * fraction + lane * Math.sin(angle)];
  };
  return { samples, xs, zs, at };
}

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
  const { samples, xs, zs } = integrate(length, headingAt);
  const endX = xs[samples]!, endZ = zs[samples]!;
  function centerAtZ(z: number): number {
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
  }
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
    offset: (x, z) => Math.abs(x - centerAtZ(z)),
    heading(distance) {
      if (distance <= 0) return 0;
      return headingAt(distance % length) * (Math.floor(distance / length) % 2 ? -1 : 1);
    },
  };
}

const CELL = 16; // offset() looks this far by default: the particle test runs per frame and only asks about 12 m

/** A closed lap: the legs turn through one full circle and the last one ends on the start line. */
function buildLoop(legs: readonly Leg[]): ClassicRoad {
  const length = legs.reduce((sum, [metres]) => sum + metres, 0);
  function headingAt(distance: number): number {
    let from = 0, turned = 0;
    for (const [metres, degrees] of legs) {
      if (distance < from + metres) {
        const t = (distance - from) / metres;
        return turned + degrees * radians * t * t * (3 - 2 * t);
      }
      from += metres; turned += degrees * radians;
    }
    return turned;
  }
  const { samples, xs, zs, at } = integrate(length, headingAt);
  // Whole-metre legs leave the lap a metre or two open: spread that evenly so the last sample is the first.
  const gapX = xs[samples]!, gapZ = zs[samples]!;
  for (let i = 1; i <= samples; i++) { xs[i] = xs[i]! - gapX * i / samples; zs[i] = zs[i]! - gapZ * i / samples; }
  // Bucket the samples on a grid over the lap's bounds. Typed arrays: offset() runs per particle, per frame.
  const column = (x: number) => Math.floor(x / CELL), x0 = column(Math.min(...xs)), z0 = column(Math.min(...zs));
  const columns = column(Math.max(...xs)) - x0 + 1, rows = column(Math.max(...zs)) - z0 + 1;
  const head = new Int32Array(columns * rows).fill(-1), next = new Int32Array(samples);
  for (let i = 0; i < samples; i++) {
    const bucket = (column(xs[i]!) - x0) * rows + column(zs[i]!) - z0;
    next[i] = head[bucket]!; head[bucket] = i;
  }
  function span(i: number, x: number, z: number): number {
    const ax = xs[i]!, az = zs[i]!, bx = xs[i + 1]! - ax, bz = zs[i + 1]! - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * bx + (z - az) * bz) / (bx * bx + bz * bz)));
    return Math.hypot(x - ax - bx * t, z - az - bz * t);
  }
  return {
    lap: length,
    point(distance, lane = 0) {
      if (distance <= 0) return [lane, -distance];
      const s = distance % length;
      return at(s, lane, headingAt(s));
    },
    heading: distance => distance <= 0 ? 0 : Math.floor(distance / length) * Math.PI * 2 + headingAt(distance % length),
    offset(x, z, reach = CELL) {
      const cx = column(x) - x0, cz = column(z) - z0, ring = Math.ceil(reach / CELL);
      const lastColumn = Math.min(columns - 1, cx + ring), lastRow = Math.min(rows - 1, cz + ring);
      let best = Infinity, nearest = -1;
      for (let u = Math.max(0, cx - ring); u <= lastColumn; u++) for (let v = Math.max(0, cz - ring); v <= lastRow; v++) {
        for (let i = head[u * rows + v]!; i >= 0; i = next[i]!) {
          const gap = (x - xs[i]!) ** 2 + (z - zs[i]!) ** 2;
          if (gap < best) { best = gap; nearest = i; }
        }
      }
      return nearest < 0 ? Infinity : Math.min(span(nearest, x, z), span((nearest + samples - 1) % samples, x, z));
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
  // Neon: one clockwise lap of the district, 10 km in eight sectors (owner decision N7 as amended 2026-11-15; lap plan:
  // docs/designs/3d-pipeline/phases/task-5b-neon-downtown.md step 11). No corner is tighter than the 279 m right-handers.
  neon: buildLoop([
    [663, 0], [279, 90], [358, 0], // Neon Boulevard north, then the right-hander under the railway
    [139, -32], [246, 64], [247, -64], [139, 32], [780, 0], // night-market S-bends, then the market straight, heading east
    [1500, 90], // elevated expressway: one long sweep over the water, east round to south
    [1237, 0], [400, 90], // harbour straight along the waterfront, then round to the west
    [1050, 0], // canal arch bridge, heading west
    [300, 90], [160, -50], [315, 100], [315, -100], [160, 50], [39, 0], [300, -90], // old town: north through linked S-bends, left onto the plaza
    [980, 0], [279, 90], [114, 0], // Violet Plaza, heading west, and the last corner back onto the boulevard
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
  offset: (x, z) => Math.abs(x - classicRoadCenter(-z)),
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
