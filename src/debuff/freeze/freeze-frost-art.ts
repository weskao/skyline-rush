// Freeze's HUD line art, built once at load as SVG path data (viewBox 0 0 100 100, the corner at 0 0): feathered frost
// ferns growing from a screen corner, thin ice cracks, and the icicles under the centre card (viewBox 0 0 100 12).
// Deterministic, so every hit and every capture draws the same frost.

function seeded(seed: number) {
  let s = seed >>> 0;
  return (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}
const f1 = (n: number): string => n.toFixed(1);

/** A frost fern: a stem with alternating barbs that carry smaller barbs, thinning towards the tip. */
function fern(out: string[], x: number, y: number, angle: number, length: number, depth: number, rnd: () => number) {
  const ex = x + Math.cos(angle) * length, ey = y + Math.sin(angle) * length;
  out.push(`M${f1(x)} ${f1(y)}L${f1(ex)} ${f1(ey)}`);
  if (!depth) return;
  const barbs = depth > 1 ? 6 : 3;
  for (let i = 1; i <= barbs; i++) {
    const t = i / (barbs + 1), bx = x + (ex - x) * t, by = y + (ey - y) * t;
    const reach = length * (1 - t) * (depth > 1 ? 0.5 : 0.42) * (0.75 + rnd() * 0.5);
    for (const side of [-1, 1]) fern(out, bx, by, angle + side * (0.85 + rnd() * 0.3), reach, depth - 1, rnd);
  }
}

function frostCorner(): { ferns: string; fine: string } {
  const rnd = seeded(7), ferns: string[] = [], fine: string[] = [];
  for (const [angle, length] of [[0.08, 92], [0.42, 74], [0.78, 86], [1.12, 70], [1.47, 94]] as const) {
    fern(ferns, 0, 0, angle + (rnd() - 0.5) * 0.1, length, 2, rnd);
  }
  for (let i = 0; i < 6; i++) fern(fine, 6 + rnd() * 30, 6 + rnd() * 30, rnd() * Math.PI * 0.5, 14 + rnd() * 16, 1, rnd); // crust
  return { ferns: ferns.join(''), fine: fine.join('') };
}

/** Jagged cracks running in from the corner and along both edges. */
function cracks(): string {
  const rnd = seeded(23), out: string[] = [];
  for (const [x0, y0, angle] of [[0, 18, 0.25], [24, 0, 1.25], [0, 46, 0.05], [52, 0, 1.5], [6, 6, 0.75]] as const) {
    let x = x0, y = y0, a = angle;
    const path = [`M${f1(x)} ${f1(y)}`];
    for (let s = 0; s < 7; s++) {
      a += (rnd() - 0.5) * 0.9; const step = 4 + rnd() * 6;
      x += Math.cos(a) * step; y += Math.sin(a) * step; path.push(`L${f1(x)} ${f1(y)}`);
      if (rnd() < 0.35) path.push(`M${f1(x)} ${f1(y)}l${f1(Math.cos(a + 1.1) * step * 0.7)} ${f1(Math.sin(a + 1.1) * step * 0.7)}M${f1(x)} ${f1(y)}`);
    }
    out.push(path.join(''));
  }
  return out.join('');
}

/** A row of icicles of varied length hanging from y 0. */
function icicles(): string {
  const rnd = seeded(41), out: string[] = [];
  for (let x = 3; x < 97; x += 5 + rnd() * 6) {
    const w = 1.6 + rnd() * 1.6, h = 3.5 + rnd() * 8;
    out.push(`M${f1(x - w)} 0L${f1(x + w)} 0L${f1(x + rnd() * 0.6)} ${f1(h)}Z`);
  }
  return out.join('');
}

export const FROST_CORNER = frostCorner();
export const FROST_CRACKS = cracks();
export const ICICLES = icicles();

/** A six-armed snowflake (viewBox -12 -12 24 24), stroked. */
export const SNOWFLAKE = Array.from({ length: 6 }, (_, arm) => {
  const a = arm * Math.PI / 3, c = Math.cos(a), s = Math.sin(a), at = (r: number, t: number) => `${f1(c * r - s * t)} ${f1(s * r + c * t)}`;
  return `M0 0L${at(11, 0)}M${at(5, 0)}L${at(8, 3)}M${at(5, 0)}L${at(8, -3)}M${at(8, 0)}L${at(10, 1.8)}M${at(8, 0)}L${at(10, -1.8)}`;
}).join('');
