// MODE-07: the opt-in mixed Obstacle Gauntlet (layout:'mixed'). A seeded course of barricades,
// sweeping gates, falling debris and hoop-over-barricade risky lines that escalates toward the
// finish. Entries carry a validated ENV-02 placement, so motion and contact run only through
// ENV-05's hazard-race path. The default Gauntlet layout (createHazards) is not touched.
import { seededRng } from './rng.ts';
import { validateHazardPlacement, type HazardPlacement } from './hazard-schema.ts';
import type { GameplayType } from './object-catalog.ts';
import { HAZARD_SECTION_TYPES, type HazardTrack } from './hazards.ts';
import { RISK_RING_RADIUS } from './game.js';

type Tier = 'standard' | 'extreme';
export interface CourseHazard {
  id: string; type: GameplayType; distance: number; x: number; altitude: number;
  hit: boolean; passed: boolean; moving: false; phase: 0; speed: 0;
  halfWidth: number; halfLength: number; height: number; placement: HazardPlacement;
}
export interface CourseHoop { distance: number; x: number; altitude: number; radius: number; type: 'risk'; group: 0 }

const SPACING: Record<Tier, readonly [number, number]> = { standard: [420, 240], extreme: [300, 160] }; // m at start → finish
const SWEEP_SPEED: Record<Tier, number> = { standard: 1.05, extreme: 1.65 }; // rad/s, as the original Gauntlet
const HOOP_ALTITUDE = 6.4; // centre height: a FLY line through it clears a 2.5 m barricade
const TAU = Math.PI * 2;

const CYCLE = ['barrier', 'gate', 'debris', 'hoop'] as const;
// Every kind appears in each run of four; barricade slots turn into moving gates as the race goes on.
function pick(index: number, random: () => number, progress: number, tier: Tier): typeof CYCLE[number] {
  const kind = CYCLE[index % CYCLE.length], roll = random();
  return kind === 'barrier' && roll < progress + (tier === 'extreme' ? 0.15 : 0) ? 'gate' : kind;
}

export function createGauntletCourse(trackId: string, track: HazardTrack, lanes: readonly number[], tier: Tier = 'standard') {
  const random = seededRng(track.seed, 'gauntlet-course-v1');
  const hazards: CourseHazard[] = [], hoops: CourseHoop[] = [];
  const [first, last] = SPACING[tier];
  for (let distance = 450; distance < track.length - 220;) {
    const progress = distance / track.length;
    const kind = pick(hazards.length, random, progress, tier), x = lanes[Math.floor(random() * lanes.length)];
    const blocked = track.sections.some(s => HAZARD_SECTION_TYPES.has(s.type) && distance >= s.from - 35 && distance <= s.to + 35);
    if (!blocked) {
      const index = hazards.length, phase = (index * 1.7) % TAU, type = kind === 'hoop' ? 'barrier' : kind;
      const movementPattern = kind === 'gate' ? { kind: 'sweep', amplitude: 1.8, period: TAU / SWEEP_SPEED[tier], phase }
        : kind === 'debris' ? { kind: 'fall', period: 4, phase } : { kind: 'static' };
      const placement = validateHazardPlacement({ id: `gauntlet-${index}`, trackId, type, distance, lateralOffset: x,
        altitude: kind === 'debris' ? 6 : 0, triggerWindow: { from: distance - 60, to: distance + 60 }, warningLeadSeconds: 2,
        movementPattern, difficulty: tier, seed: (track.seed + index) >>> 0 });
      hazards.push({ id: placement.id, type, distance, x, altitude: placement.altitude, hit: false, passed: false, moving: false,
        phase: 0, speed: 0, halfWidth: placement.hitbox.halfWidth, halfLength: placement.hitbox.halfLength, height: placement.hitbox.height, placement });
      if (kind === 'hoop') hoops.push({ distance, x, altitude: HOOP_ALTITUDE, radius: RISK_RING_RADIUS, type: 'risk', group: 0 });
    }
    distance += Math.round(first + (last - first) * progress) + Math.floor(random() * 40);
  }
  return { hazards, hoops };
}
