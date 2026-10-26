import { seededRng, RACE_STREAMS } from './rng.ts';
const HAZARD_SECTION_TYPES = new Set(['gap', 'launch', 'tunnel', 'boost-tunnel', 'shortcut']);

// Obstacles move across a single lane at most; the other lanes always stay open.
export function createHazards(track, lanes, tier = 'standard') {
  if (!['standard', 'extreme'].includes(tier) || !Number.isFinite(track?.length) ||
      track.length < 800 || track.length > 100000 || !Number.isInteger(track.seed) ||
      track.seed < 0 || track.seed > 0xffffffff || !Array.isArray(track.sections) ||
      track.sections.length > 200 ||
      !track.sections.every(section => Number.isFinite(section.from) && Number.isFinite(section.to) &&
        section.from >= 0 && section.from < section.to && section.to <= track.length) ||
      !Array.isArray(lanes) || !lanes.length || lanes.length > 8 ||
      !lanes.every(lane => Number.isFinite(lane) && Math.abs(lane) <= 9)) throw new RangeError('Invalid gauntlet rules: track or lane bounds');
  const random = seededRng(track.seed, RACE_STREAMS.hazards);
  const hazards = [];
  for (let distance = 450; distance < track.length - 220; distance += (tier === 'extreme' ? 200 : 290) + Math.floor(random() * 70)) {
    const blocked = track.sections.some(s => HAZARD_SECTION_TYPES.has(s.type) &&
      distance >= s.from - 35 && distance <= s.to + 35);
    const x = lanes[Math.floor(random() * lanes.length)];
    if (!blocked) hazards.push({ distance, x, altitude: 0, hit: false, passed: false,
      moving: hazards.length % (tier === 'extreme' ? 2 : 4) === 0,
      phase: hazards.length * 1.7, speed: tier === 'extreme' ? 1.65 : 1.05 });
  }
  return hazards;
}

export function hazardX(hazard, time) {
  const elapsed = Number.isFinite(time) ? time : 0; // fail safely on corrupt external timestamps
  return hazard.moving ? Math.max(-9, Math.min(9, hazard.x + Math.sin(elapsed * hazard.speed + hazard.phase) * 1.8)) : hazard.x;
}
