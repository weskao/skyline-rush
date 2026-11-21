// NITRO sparks: small, short-lived points thrown back from every rear port while NITRO burns. This module decides
// what to emit; `effects.js` draws them in its particle pool (no mesh, material or draw call of their own).
import { skinVfxPalette } from '#garage-skin-palette';
import type { SkinCategory, SkinId } from './garage-skin-catalog.ts';
import { REAR_PORTS } from './aero-vfx.js';
import { gold } from './effects-palette.ts';
import { NITRO_CHAIN_LIFT } from './vfx-settings.ts';
import type { VfxQuality } from './vfx-settings.ts';

/** Sparks per second over all rear ports. */
export const SPARK_RATE: Record<VfxQuality, number> = { low: 12, medium: 24, high: 48 };
export const SPARK_LIFE = 0.3; // longest life in seconds
export const SPARKS_PER_FRAME = 4; // a stalled frame cannot dump a burst into the shared pool
export const SPARK_PEAK = 1.2; // brightest colour channel: the trail's cap (.claude/rules/nitro-trail-vfx.md)
/** Most sparks alive at once on a tier: 8, 12 and 19 of the pool's 480 slots. */
export const sparkBudget = (quality: VfxQuality): number => Math.ceil(SPARK_RATE[quality] * SPARK_LIFE) + SPARKS_PER_FRAME;
export const SPARK_GRAVITY = 4;
const OPACITY = 0.9;

/** One spark in the car's frame (m/s): `side` to its right, `up`, `back` out of the nozzle. */
export type Spark = { port: number; side: number; up: number; back: number; size: number; life: number };
export type SparkBatch = { count: number; carry: number; port: number; sparks: Spark[] };
export const createSparkBatch = (): SparkBatch => ({ count: 0, carry: 0, port: 0,
  sparks: Array.from({ length: SPARKS_PER_FRAME }, () => ({ port: 0, side: 0, up: 0, back: 0, size: 0, life: 0 })) });

/**
 * This frame's sparks, written into `out` (no allocation). `power`: 0 to 1 NITRO burn. `calm`: Reduced Motion or
 * Comfortable. `chain`: charges spent in the burst (car.nitroBurst); it makes sparks faster, so they reach further, and nothing else.
 */
export function nitroSparks(out: SparkBatch, power: number, quality: VfxQuality, dt: number, calm: boolean,
  chain = 1, random: () => number = Math.random): SparkBatch {
  out.count = 0;
  if (calm || !(power > 0)) { out.carry = 0; return out; }
  out.carry = Math.min(SPARKS_PER_FRAME, out.carry + Math.max(0, dt) * SPARK_RATE[quality] * Math.min(1, power));
  const lift = NITRO_CHAIN_LIFT[Math.max(0, Math.min(NITRO_CHAIN_LIFT.length, Math.round(chain)) - 1)]!;
  for (; out.carry >= 1; out.carry--) {
    const spark = out.sparks[out.count++]!;
    spark.port = out.port; out.port = (out.port + 1) % REAR_PORTS.length;
    // Each port throws to its own side: the jets are additive and wash out a spark that stays inside them.
    spark.side = Math.sign(REAR_PORTS[spark.port]!.position[0]!) * (2 + random() * 2.5);
    // Slow in the car's frame: the NITRO chase eye is under 4 m behind the nozzles, and a faster spark passes the lens.
    spark.up = 1 + random() * 1.5; // with SPARK_GRAVITY it never drops below its port, where the frame ends
    spark.back = (2.4 + random() * 1.2) * lift;
    spark.size = 0.09 + random() * 0.04; // born 6 to 13 device pixels wide from the landscape chase eye
    spark.life = 0.18 + random() * (SPARK_LIFE - 0.18);
  }
  return out;
}

type Rgb = readonly [number, number, number];
/** The equipped trail skin's colour, or NITRO gold without one, scaled so its brightest channel is SPARK_PEAK. */
export function sparkColor(ids: Partial<Record<SkinCategory, SkinId>> = {}): Rgb {
  const trail = skinVfxPalette(ids)['nitro-trail'], base = trail.some(value => value !== 1) ? trail : gold;
  const scale = SPARK_PEAK / Math.max(...base);
  return [base[0] * scale, base[1] * scale, base[2] * scale];
}

type Node = { matrixWorld: { elements: ArrayLike<number> }; updateWorldMatrix(parents: boolean, children: boolean): void;
  getObjectByName(name: string): Node | undefined };
type Burning = { nitroTime: number; nitroBurst?: number; speed: number };
type Emit = (x: number, y: number, distance: number, vx: number, vy: number, forward: number, size: number, life: number,
  color: Rgb, gravity: number, kind: number, opacity: number) => void;

/** Feeds the sparks to the pool's `emit` (effects.js), in its coordinates: world x, height, race distance. */
export function createNitroSparks(emit: Emit, random: () => number = Math.random) {
  const batch = createSparkBatch();
  let color = sparkColor(), host: Node | undefined, rear: Node | undefined;
  return {
    setSkin(ids?: Partial<Record<SkinCategory, SkinId>>): void { color = sparkColor(ids); },
    /** Call while racing with VFX on. `heading`: the road's, in radians; `center`/`originZ`: the pool's floating origin. */
    update(pose: Node | undefined, car: Burning, heading: number, center: number, originZ: number, dt: number,
      quality: VfxQuality, calm: boolean): void {
      if (!pose || !nitroSparks(batch, car.nitroTime > 0 ? 1 : 0, quality, dt, calm, car.nitroBurst, random).count) return;
      if (host !== pose) { host = pose; rear = pose.getObjectByName('Rear ports') ?? pose; } // looked up once per car
      rear!.updateWorldMatrix(true, false);
      const m = rear!.matrixWorld.elements, carX = Math.sin(heading) * car.speed, carForward = Math.cos(heading) * car.speed;
      for (let i = 0; i < batch.count; i++) {
        const spark = batch.sparks[i]!, port = REAR_PORTS[spark.port]!.position, x = port[0]!, y = port[1]!, z = port[2]!;
        const vx = m[0]! * spark.side + m[4]! * spark.up + m[8]! * spark.back + carX;
        const vy = m[1]! * spark.side + m[5]! * spark.up + m[9]! * spark.back;
        const forward = carForward - (m[2]! * spark.side + m[6]! * spark.up + m[10]! * spark.back);
        // One step upstream: the pool moves a particle in the frame that emits it, so the spark first shows at its port.
        emit(m[0]! * x + m[4]! * y + m[8]! * z + m[12]! + center - vx * dt, m[1]! * x + m[5]! * y + m[9]! * z + m[13]! - vy * dt,
          originZ - (m[2]! * x + m[6]! * y + m[10]! * z + m[14]!) - forward * dt,
          vx, vy, forward, spark.size, spark.life, color, SPARK_GRAVITY, 0, OPACITY);
      }
    },
  };
}
