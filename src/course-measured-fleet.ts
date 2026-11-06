import type { CourseGraph } from './course-graph.ts';
import type { CourseFleet } from './course-fleet.ts';
import { advanceMeasuredCourseTravel, type MeasuredCourseMotion } from './course-measured-motion.ts';

export interface MeasuredFleetMove {
  readonly id: string;
  readonly motion: MeasuredCourseMotion;
}

/** All-or-nothing trusted physics telemetry. Legacy racing and collision responses are untouched. */
export function advanceMeasuredCourseFleet(
  graph: CourseGraph, fleet: CourseFleet, moves: readonly MeasuredFleetMove[],
): CourseFleet {
  const known = new Set(fleet.map(car => car.id)), commands = new Map<string, MeasuredCourseMotion>();
  for (const { id, motion } of moves) {
    if (!known.has(id)) throw new Error(`Unknown measured course car: ${id}`);
    if (commands.has(id)) throw new Error(`Duplicate measured course car: ${id}`);
    commands.set(id, motion);
  }
  let rejected = false;
  const next = fleet.map(car => {
    const move = commands.get(car.id);
    if (!move || car.travel.finished) return car;
    const travel = advanceMeasuredCourseTravel(graph, car.travel, move);
    if (travel === car.travel) rejected = true;
    return travel === car.travel ? car : { ...car, travel };
  });
  return rejected ? fleet : next;
}
