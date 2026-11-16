import { groundOffset } from './course-items.ts';
import { courseRemaining, type CourseRuntime } from './course-race.ts';
import type { RaceSnapshot } from './game-types.ts';

export type HalfwayRace = Pick<RaceSnapshot, 'phase'> & {
  length?: number;
  endless?: unknown;
  circuit?: { player: { valid: boolean } } | null;
  course?: CourseRuntime;
  player: { distance?: number };
};
export interface HalfwayCue { readonly remainingMetres: number }

const HALFWAY_READING_TIME = 1.85;
const HALFWAY_VISIBLE_TIME = 2.15;

// Every route uses one milestone. Graph shortcuts are projected onto the authored ground route
// for the threshold, but the readout uses physical metres from the player's current edge to FINISH.
export function createRaceHalfway() {
  let previousRace: HalfwayRace | undefined;
  let announced = false;
  let cue: HalfwayCue | null = null;
  let age = 0;
  const frame = { cue: null as HalfwayCue | null, started: false, leaving: false };

  return (race: HalfwayRace, dt: number) => {
    const fresh = previousRace !== race;
    if (fresh) { previousRace = race; announced = false; cue = null; }
    let started = false;
    const length = race.length ?? 0;
    if (race.phase !== 'racing' || race.endless || race.circuit?.player.valid === false || !(length > 0)) {
      cue = null;
    } else if (!announced) {
      const travel = race.course?.cars.get('YOU')?.travel;
      const progress = travel && race.course
        ? groundOffset(race.course.spec.graph, travel.currentEdgeId, travel.localS)
        : race.player.distance ?? 0;
      if (progress >= length / 2) {
        announced = true;
        if (!fresh) {
          const metres = race.course ? courseRemaining(race.course, 'YOU') : length - progress;
          if (metres > 0) {
            cue = { remainingMetres: metres };
            age = 0;
            started = true;
          }
        }
      }
    } else if (cue) {
      age += dt;
      if (age >= HALFWAY_VISIBLE_TIME) cue = null;
    }
    frame.cue = cue;
    frame.started = started;
    frame.leaving = cue !== null && age >= HALFWAY_READING_TIME;
    return frame;
  };
}
