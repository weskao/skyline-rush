type Frame = { readonly point: readonly [number, number, number]; readonly right: readonly [number, number, number] };
type Sample = (edgeId: string, localS: number) => Frame;

/** A continuous canyon floor below Dune's airborne shortcut (visual only).
 * Uses the shared arc-length frame. Physics and terrain contact remain shared-runtime responsibilities.
 */
export function buildDuneChasmTerrain(sample: Sample, edgeId: string, from: number, to: number,
  fullLength: number, roadWidth: number, baseY: number, spacing = 24) {
  if (![from, to, fullLength, roadWidth, baseY, spacing].every(Number.isFinite) ||
      from < 0 || to <= from || to > fullLength || fullLength <= 0 ||
      roadWidth <= 0 || spacing <= 0) throw new RangeError('Invalid Dune chasm range or bounds');
  const rows = Math.ceil((to - from) / spacing);
  const extent = Math.max(120, roadWidth * 4);
  const offsets = [-1, -2 / 3, -1 / 3, 0, 1 / 3, 2 / 3, 1];
  const positions: number[] = [], indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const s = from + (to - from) * row / rows;
    const frame = sample(edgeId, s);
    if (![...frame.point, ...frame.right].every(Number.isFinite))
      throw new RangeError('Dune chasm requires a finite route frame');
    const depth = 42 * Math.sin(Math.PI * s / fullLength) ** 2;
    const floor = Math.min(baseY - 25 - depth, frame.point[1] - 40);
    for (const fraction of offsets) {
      const lateral = fraction * extent;
      const canyonRise = (35 + depth * .4) * Math.abs(fraction) ** 1.7;
      const y = Math.min(frame.point[1] - 8, floor + canyonRise);
      positions.push(frame.point[0] + frame.right[0] * lateral,
        y, frame.point[2] + frame.right[2] * lateral);
    }
    if (row === 0) continue;
    for (let col = 0; col < 6; col++) {
      const a = (row - 1) * 7 + col, b = row * 7 + col;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  return { positions, indices };
}
