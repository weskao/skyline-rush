// ENV-05: authored courses stay fair. Every blocker leaves two lanes open, nothing
// starts on the grid, and warnings arrive in time even at the NITRO speed cap.
import { OBJECT_CATALOG } from './object-catalog.ts';
import type { HazardPlacement } from './hazard-schema.ts';
import { LANES } from './game.js'; // read only inside functions, so an import cycle cannot hit the TDZ

/** game.js speed cap with NITRO (+30), slipstream (+6) and shortcut (+12) bonuses, in m/s; pinned by tests/hazard-safety.test.js. */
export const MAX_APPROACH_SPEED = 136;
const GRID_END = 300, CAR_HALF_WIDTH = 0.85, LANE_CHANGE_GAP = 12, MIN_WARNING_SECONDS = 1, LEGACY_WARNING = 170; // m, m, m, s, m

/** How far ahead the HUD and audio warn about a hazard. */
export const hazardWarningDistance = (h: { placement?: HazardPlacement }): number => h.placement
  ? Math.max(LEGACY_WARNING, Math.ceil(Math.max(h.placement.warningLeadSeconds, MIN_WARNING_SECONDS) * MAX_APPROACH_SPEED))
  : LEGACY_WARNING;

/** Signs (branch markers, checkpoints) are not hazards: the HUD and audio warn only about the rest. */
export const isWarnedHazard = (h: { placement?: HazardPlacement }): boolean => !h.placement || OBJECT_CATALOG[h.placement.type].effect !== 'trigger';

// A timed hazard (pulse) opens again, so waiting is its escape; push/slow/collect/trigger never close a lane.
const closes = (p: HazardPlacement) => OBJECT_CATALOG[p.type].effect === 'block' && p.movementPattern.kind !== 'pulse';
const reach = (p: HazardPlacement) => p.hitbox.halfWidth + (p.movementPattern.kind === 'sweep' ? p.movementPattern.amplitude : 0);

/** Problems that would make a course unfair; empty means safe. */
export function courseSafetyIssues(placements: readonly HazardPlacement[]): string[] {
  const issues: string[] = [];
  const blockers = placements.filter(closes), reported = new Set<HazardPlacement>();
  for (const p of placements) if (p.distance < GRID_END) issues.push(`${p.id}: on the start grid`);
  for (const p of blockers) {
    // Hazards this close together must be dodged as one wall: there is no room to weave between them.
    const wall = blockers.filter(o => Math.abs(o.distance - p.distance) <= o.hitbox.halfLength + p.hitbox.halfLength + LANE_CHANGE_GAP);
    const open = LANES.filter(lane => wall.every(o => lane + CAR_HALF_WIDTH <= o.lateralOffset - reach(o) || lane - CAR_HALF_WIDTH >= o.lateralOffset + reach(o)));
    if (open.length < 2 && !wall.some(o => reported.has(o))) { reported.add(p); issues.push(`${p.id}: fewer than two open lanes`); }
  }
  return issues;
}
