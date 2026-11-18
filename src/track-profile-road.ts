import designs from '../docs/designs/3d-pipeline/track-profiles/route-designs.json' with { type: 'json' };
import type { ClassicRoad } from './classic-road-routes.ts';

const STEP = 4;
const CELL = 24;
const RAD = Math.PI / 180;

const profiles = new Map(designs.map(track => [track.id, track]));
const roads = new Map<string, ClassicRoad>();
export const hasRoadProfile = (id: string): boolean => profiles.has(id);
export const profileLength = (id: string): number => profiles.get(id)!.designDistanceM;
export const CANYON_LENGTH = profileLength('canyon');
export const CANYON_GAP = { from: 3672, to: 3732, type: 'gap' } as const;

export function buildCanyonRoad(): ClassicRoad {
  const knots = profiles.get('canyon')!.knots.map(([distance, bearing, height]) => ({ distance, bearing, height }));
  // One straight bridge deck, with room to line up before takeoff and recover after touchdown.
  knots.push({ distance: 3580, bearing: -51, height: 102 }, { distance: 3800, bearing: -51, height: 99 });
  knots.sort((a, b) => a.distance - b.distance);
  return buildProfileRoad(CANYON_LENGTH, knots);
}

interface Knot { distance: number; bearing: number; height: number }
interface ProfileShape {
  helix?: { start: number; end: number; rise: number };
  straights?: readonly { from: number; to: number; bearing: number }[];
  deck?: (distance: number) => { offset: number; slope: number };
}

export function profileRoad(id: string, shape?: ProfileShape): ClassicRoad | undefined {
  const design = profiles.get(id);
  if (!design) return undefined;
  let road = roads.get(id);
  if (!road || shape) {
    road = buildProfileRoad(design.designDistanceM, design.knots.map(([distance, bearing, height]) =>
      ({ distance, bearing, height })), shape);
    roads.set(id, road);
  }
  return road;
}

function buildProfileRoad(length: number, knots: readonly Knot[], { helix, straights, deck }: ProfileShape = {}): ClassicRoad {
  const first = knots[0], last = knots[knots.length - 1];
  const helixSlope = helix ? helix.rise / (helix.end - helix.start) : 0;
  const steering = straights
    ? [...knots, ...straights.flatMap(({ from, to, bearing }) => [{ distance: from, bearing }, { distance: to, bearing }])]
      .sort((a, b) => a.distance - b.distance)
    : null;
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const slopeAt = (station: number) => helix && station >= helix.start && station <= helix.end ? helixSlope : 0;
  const at = (distance: number) => {
    const next = knots.findIndex(knot => knot.distance > distance);
    const b = next > 0 ? knots[next] : last;
    const a = next > 0 ? knots[next - 1] : knots[knots.length - 2];
    const span = b.distance - a.distance;
    const t = (distance - a.distance) / span;
    const blend = smooth(t);
    const climb = b.height - a.height, entry = slopeAt(a.distance), exit = slopeAt(b.distance);
    const inHelix = helix && a.distance >= helix.start && b.distance <= helix.end;
    const platform = deck?.(distance);
    let bearing = a.bearing + (inHelix ? t : blend) * (b.bearing - a.bearing);
    if (steering && !inHelix) {
      const nextTurn = steering.findIndex(knot => knot.distance > distance);
      if (nextTurn > 0) {
        const before = steering[nextTurn - 1], after = steering[nextTurn];
        bearing = before.bearing + smooth((distance - before.distance) / (after.distance - before.distance))
          * (after.bearing - before.bearing);
      }
    }
    return {
      heading: bearing * RAD,
      elevation: a.height + blend * climb + span * t * (1 - t) * (entry * (1 - t) - exit * t)
        - first.height + (platform?.offset ?? 0),
      pitch: Math.asin(climb * 6 * t * (1 - t) / span + entry * (1 - 4 * t + 3 * t * t)
        + exit * (3 * t * t - 2 * t) + (platform?.slope ?? 0)),
    };
  };

  const count = Math.ceil(length / STEP), step = length / count;
  const xs = new Float64Array(count + 1), zs = new Float64Array(count + 1);
  const buckets = new Map<string, number[]>();
  const cell = (value: number) => Math.floor(value / CELL);
  const key = (x: number, z: number) => `${x},${z}`;
  for (let i = 0; i <= count; i++) {
    if (i) {
      const end = i * step, start = end - step;
      const { heading } = at((start + end) / 2);
      const climb = at(end).elevation - at(start).elevation;
      const ground = Math.sqrt(step ** 2 - climb ** 2);
      xs[i] = xs[i - 1] + Math.sin(heading) * ground;
      zs[i] = zs[i - 1] - Math.cos(heading) * ground;
    }
    const bucket = key(cell(xs[i]), cell(zs[i]));
    const indices = buckets.get(bucket) ?? [];
    if (!indices.length) buckets.set(bucket, indices);
    indices.push(i);
  }

  const endX = xs[count], endZ = zs[count], rise = last.height - first.height;
  const base = (distance: number) => {
    const run = Math.floor(Math.max(distance, 0) / length);
    const local = Math.max(distance, 0) - run * length;
    // Alternate forward and reflected traversals. The headings and slopes meet at both seams.
    const sign = run % 2 === 0 ? 1 : -1;
    const station = sign === 1 ? local : length - local;
    const sample = Math.min(count - 1, Math.floor(station / step)), t = station / step - sample;
    return {
      ...at(station), sign, run,
      x: (run + (sign < 0 ? 1 : 0)) * endX + sign * (xs[sample] + (xs[sample + 1] - xs[sample]) * t),
      z: (run + (sign < 0 ? 1 : 0)) * endZ + sign * (zs[sample] + (zs[sample + 1] - zs[sample]) * t),
    };
  };

  function segmentDistance(index: number, x: number, z: number): number {
    const dx = xs[index + 1] - xs[index], dz = zs[index + 1] - zs[index];
    const rx = x - xs[index], rz = z - zs[index];
    const t = Math.min(1, Math.max(0, (rx * dx + rz * dz) / (dx * dx + dz * dz)));
    return Math.hypot(rx - t * dx, rz - t * dz);
  }

  return {
    point(distance, lane = 0) {
      const { x, z, heading } = base(distance);
      const leadIn = Math.min(0, distance);
      return [x + Math.cos(heading) * lane + Math.sin(heading) * leadIn,
        z + Math.sin(heading) * lane - Math.cos(heading) * leadIn];
    },
    heading: distance => base(distance).heading,
    pitch: distance => base(distance).pitch,
    elevation(distance) {
      const { elevation, run, sign } = base(distance);
      return (run + (sign < 0 ? 1 : 0)) * rise + sign * elevation;
    },
    offset(x, z, reach = 16) {
      const projection = (x * endX + z * endZ) / (endX ** 2 + endZ ** 2);
      const guess = Math.max(0, Math.floor(projection));
      const radius = Math.ceil((reach + STEP) / CELL);
      let closest = Infinity;
      for (let run = Math.max(0, guess - 1); run <= guess + 1; run++) {
        const sign = run % 2 === 0 ? 1 : -1, shift = run + (sign < 0 ? 1 : 0);
        const bx = sign * (x - shift * endX), bz = sign * (z - shift * endZ);
        for (let ix = cell(bx) - radius; ix <= cell(bx) + radius; ix++) {
          for (let iz = cell(bz) - radius; iz <= cell(bz) + radius; iz++) {
            for (const i of buckets.get(key(ix, iz)) ?? []) {
              if (i > 0) closest = Math.min(closest, segmentDistance(i - 1, bx, bz));
              if (i < count) closest = Math.min(closest, segmentDistance(i, bx, bz));
            }
          }
        }
      }
      return closest;
    },
  };
}
