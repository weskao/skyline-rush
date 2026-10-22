import { seededRng } from './rng.js';

// Gauntlet-only barriers: never move the originals or change their RNG streams.
// Exactly one lane is blocked at a time; all other lanes and flight remain usable.
const HAZARD_SECTION_TYPES = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel']);

export function createHazards(track, lanes) {
  const random = seededRng(track.seed, 'gauntlet-hazards');
  const hazards = [];
  for (let distance = 450; distance < track.length - 220; distance += 290 + Math.floor(random() * 70)) {
    const blocked = track.sections.some(s => HAZARD_SECTION_TYPES.has(s.type) &&
      distance >= s.from - 35 && distance <= s.to + 35);
    const x = lanes[Math.floor(random() * lanes.length)];
    if (!blocked) hazards.push({ distance, x, altitude: 0, hit: false, passed: false });
  }
  return hazards;
}
