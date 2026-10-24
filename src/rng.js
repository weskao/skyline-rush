// mulberry32 PRNG; each named stream gets its own state so generators never shift each other.
function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// FNV-1a hash of the stream name, mixed into the seed.
const hash = text => [...text].reduce((h, char) => Math.imul(h ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;

export const streamSeed = (seed, streamName) => (seed ^ hash(streamName)) >>> 0;
export const seededRng = (seed, streamName) => mulberry32(streamSeed(seed, streamName));

// Stable stream names: never silently rename them or old generated courses change.
// Adding or consuming a separate stream cannot change pickups and rings.
export const RACE_STREAMS = Object.freeze({
  pickups: 'pickups',
  rings: 'rings',
  hazards: 'gauntlet-hazards',
  mysteryPrefix: 'mystery',
  traffic: 'traffic',
  checkpoints: 'checkpoints',
  obstacles: 'world-obstacles',
  items: 'active-items',
});
