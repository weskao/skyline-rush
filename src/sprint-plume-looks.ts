// The sprint exhaust's looks as data (docs/designs/sprint-tiers/DESIGN.md, .claude/rules/sprint-plume.md): one row per
// thruster skin, one row per sprint tier. src/sprint-plume.ts reads them into uniforms; a new skin or tier is a new
// row here, never a branch in the shader. Colour is not here: src/garage-skin-palette.ts and the :root tokens own it.
import type { SprintTierId } from './sprint-tier.ts';

/** How one thruster skin burns. Row order is the catalog's thruster order (`skinVfxPattern().thruster`).
 *  Envelope (the skin's signature motion, compiled into the one shader, picked by the `skinPattern` uniform):
 *  `floor + depth * wave^sharp`, `strands` lobes around the tube, wound `twist` rad along it, turning `spin` rad/s.
 *  Flame (the `look` uniform): `tear` how deep the texture's tongues cut the body (0 to 1), `hair` the strength of
 *  the thin racing filaments, `tiles` whole texture repeats around the tube, `stretch` texture tiles per metre. */
export interface ThrusterLook { floor: number; depth: number; strands: number; twist: number; spin: number; sharp: number;
  tear: number; hair: number; tiles: number; stretch: number }
export const THRUSTER_LOOKS: readonly ThrusterLook[] = [
  { floor: 0.82, depth: 0.18, strands: 2, twist: 25, spin: 7, sharp: 1, tear: 0.8, hair: 0.6, tiles: 2, stretch: 0.22 }, // Standard: a full, licking flame
  { floor: 0.6, depth: 0.4, strands: 3, twist: 36, spin: 12, sharp: 0.5, tear: 0.55, hair: 1, tiles: 3, stretch: 0.3 }, // Ion: tight, fine, all filaments
  { floor: 0.58, depth: 0.42, strands: 3, twist: 28, spin: 8, sharp: 2, tear: 1, hair: 0.45, tiles: 2, stretch: 0.16 }, // Plasma helix: big rolling tongues on three strands
  { floor: 0.35, depth: 0.56, strands: 1, twist: 13, spin: 5, sharp: 1, tear: 0.7, hair: 0.25, tiles: 1, stretch: 0.12 }, // Void pulse: one slow swell (its jets are hidden while its beams draw)
];

/** How one sprint tier burns (the `tier` uniform, eased). `core`: the white-hot core's falloff along the jet, lower is
 *  longer. `tongues`: scales every skin's `tear` and `hair`. `sheath`: the --boost red-orange layer around the core.
 *  `taper`: the tail's fade exponent, lower keeps light further back. `flow`: flame-clock seconds per second, at most 1
 *  (the texture's scroll is a flicker frequency: tests/sprint-plume-flame.test.js). */
export interface TierLook { core: number; tongues: number; sheath: number; taper: number; flow: number }
export const TIER_LOOKS = {
  idle: { core: 10, tongues: 0.45, sheath: 0, taper: 1.9, flow: 0.4 }, // spooling down, or a showroom at rest
  boost: { core: 9, tongues: 0.6, sheath: 0, taper: 1.7, flow: 0.55 },
  nitro: { core: 6.5, tongues: 0.85, sheath: 0, taper: 1.5, flow: 0.75 },
  'nitro-boost': { core: 5, tongues: 1, sheath: 1, taper: 1.35, flow: 0.9 },
} as const satisfies Record<SprintTierId, TierLook>;
/** Flame-clock rate added per unit of `PlumeFrame.chain` (0 to 0.4 on a x3 chain): a chain adds speed, never light. */
export const CHAIN_FLOW = 0.25;

const lit = (n: number) => { const text = String(+n.toFixed(4)).replace(/^0\./, '.'); return text.includes('.') ? text : `${text}.`; }; // a GLSL float
/** GLSL: `float shape` for the skin `skinPattern` selects, one generated select per row after the first. */
export const THRUSTER_SHAPE = THRUSTER_LOOKS.map((row, i) =>
  `${i ? `if(skinPattern>${i - 0.5}) ` : 'float '}shape=${lit(row.floor)}+${lit(row.depth)}*pow(max(0.,.5+.5*sin(vUv.x*${lit(6.2832 * row.strands)}+t*${lit(row.twist)}-time*${lit(row.spin)})),${lit(row.sharp)});`).join('');
