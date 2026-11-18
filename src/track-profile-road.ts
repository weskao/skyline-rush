import designs from '../docs/designs/3d-pipeline/track-profiles/route-designs.json' with { type: 'json' };
import type { ClassicRoad } from './classic-road-routes.ts';

const STEP = 4;
const CELL = 24;
const RAD = Math.PI / 180;

const canyon = designs.find(track => track.id === 'canyon')!;
export const CANYON_LENGTH = canyon.designDistanceM;
export const CANYON_GAP = { from: 3672, to: 3732, type: 'gap' } as const;

export function buildCanyonRoad(): ClassicRoad {
  const knots = canyon.knots.map(([distance, bearing, height]) => ({ distance, bearing, height }));
  // One straight bridge deck, with room to line up before takeoff and recover after touchdown.
  knots.push({ distance: 3580, bearing: -51, height: 102 }, { distance: 3800, bearing: -51, height: 99 });
  knots.sort((a, b) => a.distance - b.distance);
  return buildProfileRoad(CANYON_LENGTH, knots);
}

interface Knot { distance: number; bearing: number; height: number }

function buildProfileRoad(length: number, knots: readonly Knot[]): ClassicRoad {
  const first = knots[0], last = knots[knots.length - 1];
  const at = (distance: number) => {
    const next = knots.findIndex(knot => knot.distance > distance);
    const b = next > 0 ? knots[next] : last;
    const a = next > 0 ? knots[next - 1] : knots[knots.length - 2];
    const t = (distance - a.distance) / (b.distance - a.distance);
    const blend = t * t * (3 - 2 * t);
    return {
      heading: (a.bearing + blend * (b.bearing - a.bearing)) * RAD,
      elevation: a.height + blend * (b.height - a.height) - first.height,
      pitch: Math.asin((b.height - a.height) * 6 * t * (1 - t) / (b.distance - a.distance)),
    };
  };

  const count = length / STEP;
  const xs = new Float64Array(count + 1), zs = new Float64Array(count + 1);
  const buckets = new Map<string, number[]>();
  const cell = (value: number) => Math.floor(value / CELL);
  const key = (x: number, z: number) => `${x},${z}`;
  for (let i = 0; i <= count; i++) {
    if (i) {
      const end = i * STEP, start = end - STEP;
      const { heading } = at((start + end) / 2);
      const climb = at(end).elevation - at(start).elevation;
      const ground = Math.sqrt(STEP ** 2 - climb ** 2);
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
    const sample = Math.min(count - 1, Math.floor(station / STEP)), t = station / STEP - sample;
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
