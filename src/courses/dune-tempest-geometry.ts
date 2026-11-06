type Point3 = readonly [number, number, number];
type Frame = { readonly point: Point3; readonly right: Point3; readonly up: Point3; readonly width: number };
type Sample = (edgeId: string, localS: number) => Frame;
type Hazard = {
  readonly id: string; readonly kind: string; readonly edgeId: string; readonly atFraction: number;
  readonly lateralMeters: number; readonly collisionRadiusMeters: number;
  readonly visualRadiusMeters: number; readonly aiPreviewMeters: number;
};
type Quality = 'low' | 'medium' | 'high';

/** Same shared route frames used by vehicles; four vertices per row: shoulder/road/road/shoulder. */
export function buildDuneRoadChunk(sample: Sample, edgeId: string, startS: number, endS: number,
  width: number, spacing = 10) {
  if (![startS, endS, width, spacing].every(Number.isFinite) ||
    startS < 0 || endS <= startS || width <= 0 || spacing <= 0) {
    throw new RangeError('Dune road chunk requires a valid distance window and width');
  }
  const segments = Math.ceil((endS - startS) / spacing);
  const positions: number[] = [], roadIndices: number[] = [], shoulderIndices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const s = startS + (endS - startS) * i / segments;
    const frame = sample(edgeId, s);
    for (const [lateral, lift] of [[-width / 2 - 6, -0.12], [-width / 2, .035],
      [width / 2, .035], [width / 2 + 6, -0.12]]) {
      positions.push(...frame.point.map((value, axis) =>
        value + frame.right[axis] * lateral + frame.up[axis] * lift));
    }
    if (i === 0) continue;
    const a = (i - 1) * 4, b = i * 4;
    for (const [lane, target] of [[1, roadIndices], [0, shoulderIndices], [2, shoulderIndices]] as const) {
      target.push(a + lane, a + lane + 1, b + lane, a + lane + 1, b + lane + 1, b + lane);
    }
  }
  return { positions, roadIndices, shoulderIndices };
}

/** Hazard centres and renderer footprints remain in the same sampled road coordinates. */
export function positionDuneHazards(hazards: readonly Hazard[], edgeId: string,
  edgeLength: number, sample: Sample) {
  if (!Number.isFinite(edgeLength) || edgeLength <= 0) throw new RangeError('Invalid edge length');
  return hazards.filter(h => h.edgeId === edgeId).map(h => {
    if (!(h.atFraction > 0 && h.atFraction < 1) ||
      !(h.visualRadiusMeters >= h.collisionRadiusMeters && h.collisionRadiusMeters > 0)) {
      throw new RangeError('Dune hazard visual footprint/radius must cover its collider');
    }
    const atS = edgeLength * h.atFraction, frame = sample(edgeId, atS);
    const position = frame.point.map((value, axis) => value + frame.right[axis] * h.lateralMeters);
    return { ...h, atS, position };
  });
}

export function duneWeatherBudget(zone: { readonly particleBudgets: Readonly<Record<Quality | 'reducedMotion', number>> },
  quality: Quality, reducedMotion: boolean): number {
  return reducedMotion ? zone.particleBudgets.reducedMotion : zone.particleBudgets[quality];
}

/** Only the physically grounded takeoff and landing pads are solid on a flight edge. */
export function duneSurfaceIntervals(start: number, end: number, length: number,
  takeoff: number, landing: number): number[][] {
  if (![start, end, length, takeoff, landing].every(Number.isFinite) ||
    start < 0 || end <= start || end > length || length <= 0 ||
    takeoff < 0 || landing < 0 || takeoff + landing > length) {
    throw new RangeError('Invalid Dune aerial segment bounds');
  }
  const pads: number[][] = [];
  for (const [min, max] of [[0, takeoff], [length - landing, length]]) {
    const a = Math.max(start, min), b = Math.min(end, max);
    if (b > a) pads.push([a, b]);
  }
  return pads;
}

/** Deterministic native 3D sand terrain with exact chunk joins.
 * Map-owned visuals only: shared runtime must own terrain collisions and recovery.
 */
export function buildDuneTerrainChunk(sample: Sample, edgeId: string, startS: number, endS: number,
  width: number, extent = 120, spacing = 12) {
  if (![startS,endS,width,extent,spacing].every(Number.isFinite) ||
    startS < 0 || endS <= startS || width <= 0 || extent <= width / 2 + 6 || spacing <= 0) {
    throw new RangeError('Invalid Dune terrain bounds');
  }
  const segments = Math.ceil((endS-startS) / spacing), columns = 5;
  const positions: number[] = [], indices: number[] = [];
  const shoulder = width / 2 + 6;
  for (let row = 0; row <= segments; row++) {
    const s = startS + (endS-startS) * row/segments;
    const f = sample(edgeId,s);
    for (const side of [-1,1]) for (let column = 0; column < columns; column++) {
      const outward = shoulder + (extent-shoulder)*column/(columns-1);
      const lateral = outward*side, blend = Math.min(1,Math.max(0,(outward-shoulder)/45));
      const p = f.point.map((v,axis)=>v+f.right[axis]*lateral);
      const wave = (Math.sin(p[0]*.037)*Math.cos(p[2]*.025)+.6*Math.sin((p[0]+p[2])*.023))*blend;
      const lift = -.20 + Math.max(0,outward-shoulder-10)*.08 + 2.1*wave;
      positions.push(...p.map((v,axis)=>v+f.up[axis]*lift));
    }
    if (row === 0) continue;
    for (let side=0;side<2;side++) for(let col=0;col<columns-1;col++) {
      const a=((row-1)*2+side)*columns+col, b=(row*2+side)*columns+col;
      indices.push(a,a+1,b,a+1,b+1,b);
    }
  }
  return {positions,indices};
}
