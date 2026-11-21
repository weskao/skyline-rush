// Lightning shapes for EMP, deterministic per seed: a jagged main arc (midpoint displacement) with forks.
// The screen edge draws them as SVG paths; the 3D discharges loft the same bolt into a ribbon.
export type Point = [number, number];

/** A small seeded generator (LCG): the same seed always draws the same lightning. */
export function random(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/** A jagged line from a to b: each pass splits every segment and kicks its midpoint sideways, less each pass. */
export function bolt(a: Point, b: Point, rand: () => number, passes = 4, jag = 0.26): Point[] {
  let points = [a, b];
  for (let pass = 0; pass < passes; pass++, jag *= 0.55) {
    const next: Point[] = [a];
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1]!, [x1, y1] = points[i]!, kick = (rand() * 2 - 1) * jag;
      next.push([(x0 + x1) / 2 - (y1 - y0) * kick, (y0 + y1) / 2 + (x1 - x0) * kick], points[i]!);
    }
    points = next;
  }
  return points;
}

/** A main arc from a to b plus `forks` shorter branches that leave it at a slant. */
export function arc(a: Point, b: Point, seed: number, forks = 3): Point[][] {
  const rand = random(seed), main = bolt(a, b, rand), dx = b[0] - a[0], dy = b[1] - a[1];
  const out = [main];
  for (let k = 0; k < forks; k++) {
    const from = main[2 + Math.floor(rand() * (main.length - 4))]!;
    const turn = (rand() < 0.5 ? -1 : 1) * (0.35 + rand() * 0.55), reach = 0.22 + rand() * 0.3;
    const c = Math.cos(turn) * reach, s = Math.sin(turn) * reach;
    out.push(bolt(from, [from[0] + dx * c - dy * s, from[1] + dx * s + dy * c], rand, 3, 0.3));
  }
  return out;
}

export const pathOf = (points: Point[]): string => `M${points.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L')}`;

/** Screen-edge arcs in a 0-100 box stretched over the view: three sets that take turns, each crawling in from an
 *  edge or corner and staying in the outer band so the centre stays clear. [from, to, seed, forks]. */
const EDGE_ARCS: [Point, Point, number, number][][] = [
  [[[0, 6], [15, 24], 11, 3], [[100, 40], [87, 58], 12, 3], [[0, 56], [9, 72], 13, 2], [[64, 0], [80, 7], 14, 2], [[100, 88], [86, 97], 15, 2]],
  [[[100, 5], [85, 22], 21, 3], [[0, 34], [12, 50], 22, 3], [[100, 64], [90, 78], 23, 2], [[22, 0], [38, 6], 24, 2], [[0, 90], [14, 99], 25, 2]],
  [[[0, 18], [11, 36], 31, 3], [[100, 22], [88, 40], 32, 3], [[3, 100], [16, 90], 33, 2], [[100, 76], [92, 92], 34, 2], [[44, 0], [56, 5], 35, 1]],
];

export const EMP_EDGE_ARCS: string[][] = EDGE_ARCS.map(set => set.flatMap(([a, b, seed, forks]) => arc(a, b, seed, forks).map(pathOf)));
