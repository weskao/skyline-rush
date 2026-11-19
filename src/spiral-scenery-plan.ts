// Task 8c step 5: where the Sky Spiral kit (spiral-landmarks.glb) stands. Pure data and maths: the layer turns
// placements into instance matrices. Every piece is placed by its distance along the shipped route (rule item 28)
// and read from skyFrame, so nothing here moves the road, its lanes or its collision. The tower is not in the plan:
// it stands on skyTowerOrigin.
import { SKY_JUMPS, SKY_LENGTH, SKY_SPIRAL, skyFrame, skyPoint, skyTowerOrigin } from './sky-track.ts';

export const SPIRAL_NODES = ['strut', 'platform_a', 'platform_b', 'station', 'chevron_sign', 'gap_marker', 'cloud_a', 'cloud_b', 'cloud_c', 'peak'] as const;
export type SpiralNode = typeof SPIRAL_NODES[number];
/** Horizontal reach (m, at scale 1) of each node about its pivot's vertical axis, from the kit's node contract: the
 *  strut's is its length, a cloud's its smallest half-width. A node built wider re-runs the clearance test. */
export const SPIRAL_NODE_RADIUS: Readonly<Record<SpiralNode, number>> = {
  strut: 170, platform_a: 22, platform_b: 22, station: 17, chevron_sign: 2.2, gap_marker: 1.2, cloud_a: 150, cloud_b: 200, cloud_c: 250, peak: 250,
};
/** Lowest and highest point (m, at scale 1) of each node from its pivot, same contract. */
export const SPIRAL_NODE_SPAN: Readonly<Record<SpiralNode, readonly [number, number]>> = {
  strut: [-12, -.5], platform_a: [-50, 45], platform_b: [-50, 45], station: [0, 14], chevron_sign: [0, 6], gap_marker: [0, 6.5],
  cloud_a: [0, 60], cloud_b: [0, 75], cloud_c: [0, 90], peak: [0, 260],
};
export interface SpiralPlacement { node: SpiralNode; x: number; y: number; z: number; yaw: number; scale: number }

const L = SKY_LENGTH;
const hash = (n: number): number => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const mix = (from: number, to: number, t: number): number => from + (to - from) * t;

/** One run of the route. Endless drives odd runs mirrored (helixTraversal, sky-track.ts): a feature `d` metres into
 *  the shipped route sits at L - d of that run, with its side flipped. */
interface Run { at(d: number): number; side: 1 | -1; endless: boolean }
function runOf(run: number, endless: boolean): Run {
  const index = endless ? Math.max(0, Math.floor(run)) : 0, odd = index % 2 === 1;
  return { at: d => index * L + (odd ? L - d : d), side: odd ? -1 : 1, endless };
}

/** A piece `lateral` metres level to the shipped route's right at `d` and `rise` metres above the centre line. */
function beside(run: Run, node: SpiralNode, d: number, lateral: number, rise: number, yaw: number | 'along' | 'oncoming', scale = 1): SpiralPlacement {
  const { point, forward } = skyFrame(run.at(d), run.endless), flat = Math.hypot(forward[0], forward[2]), side = lateral * run.side / flat;
  // Object3D.rotation.y: 'along' lays local +X down the road, 'oncoming' turns local +Z to face the driver.
  const turn = yaw === 'along' ? Math.atan2(-forward[2], forward[0]) : yaw === 'oncoming' ? Math.atan2(-forward[0], -forward[2]) : yaw;
  return { node, x: point.x - forward[2] * side, y: point.y + rise, z: point.z + forward[0] * side, yaw: turn, scale };
}

// 16 struts a turn, one every 87.5 m of the helix: each hangs from the deck's inner edge and runs level to the tower.
const STRUTS = 16, STRUT_PITCH = (SKY_SPIRAL.end - SKY_SPIRAL.start) / STRUTS, DECK_EDGE = 13;
const STRUT_AT = Array.from({ length: STRUTS }, (_, k) => SKY_SPIRAL.start + (k + .5) * STRUT_PITCH);

export function spiralStrutStations(run = 0): number[] {
  return STRUT_AT.map(runOf(run, run > 0).at).sort((a, b) => a - b);
}

function struts(run: Run): SpiralPlacement[] {
  return STRUT_AT.map(d => {
    const s = run.at(d), bank = skyFrame(s, run.endless).right[1] * run.side * DECK_EDGE; // the banked deck's inner edge
    const p = beside(run, 'strut', d, DECK_EDGE, bank, 0), tower = skyTowerOrigin(s, run.endless);
    return { ...p, yaw: Math.atan2(-(tower.z - p.z), tower.x - p.x) }; // local +X to the tower's axis
  });
}

// Low blocks beside the approach, clear of the rail by their own half-length; a few metres under the deck.
function stations(run: Run): SpiralPlacement[] {
  return Array.from({ length: 12 }, (_, k) => beside(run, 'station', 150 + 150 * k, (k % 2 ? 1 : -1) * mix(36, 60, hash(k)), -mix(3, 6, hash(k + 40)), 'along'));
}

// Floating spire platforms beside the launches and the slalom: both sides, some above the road and some below.
const PLATFORM_RUNS: readonly (readonly [number, number])[] = [[4650, 6500], [6800, 9000]], PLATFORM_PITCH = 170;
function platforms(run: Run): SpiralPlacement[] {
  const out: SpiralPlacement[] = [];
  for (const [from, to] of PLATFORM_RUNS) for (let d = from + PLATFORM_PITCH / 2; d < to; d += PLATFORM_PITCH) {
    const i = out.length, lateral = (i % 2 ? 1 : -1) * mix(60, 160, hash(i + 100)), rise = (hash(i + 200) < .5 ? -1 : 1) * mix(8, 35, hash(i + 300));
    out.push(beside(run, (i >> 1) % 2 ? 'platform_b' : 'platform_a', d, lateral, rise, hash(i + 400) * Math.PI * 2, mix(.8, 1.3, hash(i + 500))));
  }
  return out;
}

// Chevron signs on the outside of the slalom's bends, 3 m beyond the rail, facing the oncoming driver.
const SLALOM: readonly [number, number] = [6800, 9000], SIGN_LINE = 16, SIGN_PITCH = 100, BEND = .01;
function chevrons(run: Run): SpiralPlacement[] {
  const out: SpiralPlacement[] = [];
  for (let d = SLALOM[0] + SIGN_PITCH / 2; d < SLALOM[1]; d += SIGN_PITCH) {
    const a = skyFrame(d - 20).forward, b = skyFrame(d + 20).forward, turn = a[0] * b[2] - a[2] * b[0]; // sine of 40 m of bend, right positive
    if (Math.abs(turn) >= BEND) out.push(beside(run, 'chevron_sign', d, -Math.sign(turn) * SIGN_LINE, 0, 'oncoming'));
  }
  return out;
}

// Hazard markers on both edges where each gap opens and closes. Endless has no gap (skyJumpGap), so none there.
const MARKER_LINE = 14.8;
function gapMarkers(run: Run): SpiralPlacement[] {
  if (run.endless) return [];
  return SKY_JUMPS.flatMap(jump => [jump.gapFrom, jump.gapTo].flatMap(d => [-1, 1].map(side => beside(run, 'gap_marker', d, side * MARKER_LINE, 0, 'oncoming'))));
}

// Eight far snow peaks, 1.4 to 2.2 km from the nearest road: [distance, lateral]. The route winds, so a lateral is
// longer than the gap it leaves (the test measures the gap); none is measured from the helix, where "beside the
// road" turns a full circle. The road climbs 178 m, so a peak's foot is set PEAK_FOOT under the road nearest to it,
// not under the road it was measured from: under the far edge of the cloud sea, its summit over the driver.
const PEAKS: readonly (readonly [number, number])[] = [[300, 1700], [1500, -1800], [3600, 2100], [4700, 2000], [5800, -2100], [6900, -1700], [8000, 2500], [9300, 1800]];
const PEAK_FOOT = 160;
function peaks(run: Run): SpiralPlacement[] {
  const route = Array.from({ length: L / 50 + 1 }, (_, i) => skyPoint(run.at(i * 50), run.endless));
  return PEAKS.map(([d, lateral], k) => {
    const p = beside(run, 'peak', d, lateral, 0, hash(k + 700) * Math.PI * 2, mix(1, 1.3, hash(k + 800)));
    const gap = (q: { x: number; z: number }): number => Math.hypot(q.x - p.x, q.z - p.z);
    return { ...p, y: route.reduce((near, q) => gap(q) < gap(near) ? q : near).y - PEAK_FOOT };
  });
}

// The cloud sea: a hex grid of clouds kept within CLOUD_CORRIDOR of the route. At CLOUD_PITCH the smallest cloud
// (150 m, never scaled down) still reaches the middle of its three neighbours, so the kept cells leave no hole.
const CLOUD_PITCH = 250, CLOUD_ROW = CLOUD_PITCH * Math.sqrt(3) / 2, CLOUD_CORRIDOR = 215, CLOUD_CLEAR = 26;
const CLOUDS: readonly (readonly [SpiralNode, number, number])[] = [['cloud_a', 1, 1.3], ['cloud_b', .8, 1.3], ['cloud_c', .8, 1.2]];
function cloudSea(run: Run): SpiralPlacement[] {
  const route = Array.from({ length: L / 10 + 1 }, (_, i) => skyPoint(run.at(i * 10), run.endless));
  const xs = route.map(p => p.x), zs = route.map(p => p.z), out: SpiralPlacement[] = [];
  const cells = (lo: number, hi: number, step: number): [number, number] => [Math.floor((lo - CLOUD_CORRIDOR) / step), Math.ceil((hi + CLOUD_CORRIDOR) / step)];
  const [j0, j1] = cells(Math.min(...zs), Math.max(...zs), CLOUD_ROW), [i0, i1] = cells(Math.min(...xs), Math.max(...xs), CLOUD_PITCH);
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
    const seed = i * 57 + j * 131, x = (i + (j & 1) / 2) * CLOUD_PITCH + mix(-8, 8, hash(seed)), z = j * CLOUD_ROW + mix(-8, 8, hash(seed + 1));
    const [node, small, large] = CLOUDS[Math.floor(hash(seed + 2) * 3)], scale = mix(small, large, hash(seed + 3));
    // Its top stays CLOUD_CLEAR under the lowest road over it (the helix passes over its own approach).
    const reach = SPIRAL_NODE_RADIUS.cloud_c * scale + 10;
    let nearest = Infinity, low = Infinity, fallback = 0;
    for (const p of route) {
      const flat = Math.hypot(p.x - x, p.z - z);
      if (flat < nearest) { nearest = flat; fallback = p.y; }
      if (flat <= reach) low = Math.min(low, p.y);
    }
    if (nearest > CLOUD_CORRIDOR) continue;
    const top = (low === Infinity ? fallback : low) - CLOUD_CLEAR - 8 * hash(seed + 4);
    out.push({ node, x, y: top - SPIRAL_NODE_SPAN[node][1] * scale, z, yaw: hash(seed + 5) * Math.PI * 2, scale });
  }
  return out;
}

export function spiralSceneryPlan(run = 0, endless = false): SpiralPlacement[] {
  const r = runOf(run, endless);
  return [...struts(r), ...stations(r), ...platforms(r), ...chevrons(r), ...gapMarkers(r), ...peaks(r), ...cloudSea(r)];
}
