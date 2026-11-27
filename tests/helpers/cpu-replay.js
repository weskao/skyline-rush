import { seededRng } from '../../src/rng.ts';

// Seeded input script: each control holds for a random 0.2-1.8 s span, so steering, boost, nitro, fly, brake and lane
// assist are all exercised (falls, rail scrapes, contacts, pickups) yet reproducible per seed.
export function scriptedInput(rng) {
  let left = 0, held = {};
  return () => {
    if (left-- <= 0) {
      left = Math.floor(12 + rng() * 96);
      const roll = rng();
      held = {
        throttle: roll > 0.08, brake: roll < 0.08,
        steer: rng() < 0.45 ? 0 : (rng() - 0.5) * 2 * (rng() < 0.3 ? 1.6 : 1),
        boost: rng() < 0.35, nitro: rng() < 0.25, fly: rng() < 0.3, laneAssist: rng() < 0.5,
      };
    }
    return held;
  };
}

// Cycle-safe canonical serialisation; `spec` (the immutable course description) is skipped, everything mutable is kept.
export function canonical(value, seen = new WeakSet()) {
  // 9 significant digits: libm last-bit differences between platforms (Linux CI vs macOS) must not change the digest.
  if (typeof value === 'number') return Object.is(value, -0) ? '-0' : String(Number(value.toPrecision(9)));
  if (value === undefined) return 'u';
  if (typeof value === 'function') return 'fn';
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (seen.has(value)) return '<cycle>';
  seen.add(value);
  let out;
  if (value instanceof Map) out = `M[${[...value].map(([k, v]) => `${canonical(k, seen)}=>${canonical(v, seen)}`).join(',')}]`;
  else if (value instanceof Set) out = `S[${[...value].map(v => canonical(v, seen)).join(',')}]`;
  else if (Array.isArray(value)) out = `[${value.map(v => canonical(v, seen)).join(',')}]`;
  else out = `{${Object.keys(value).sort().filter(k => k !== 'spec').map(k => `${k}:${canonical(value[k], seen)}`).join(',')}}`;
  seen.delete(value);
  return out;
}
