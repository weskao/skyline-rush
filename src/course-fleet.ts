import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength } from './course-route-frame.ts';
import { advanceCourseTravel, courseTravelPosition, createCourseTravel, type CourseTravel } from './course-travel.ts';

/** Pure opt-in graph state for up to eight cars. Existing Race physics owns movement inputs. */
export interface CourseCar { readonly id: string; readonly travel: CourseTravel }
export type CourseFleet = readonly CourseCar[];
export interface CourseCarMove {
  readonly id: string;
  /** Physical metres computed by trusted simulation, not an input from the browser. */
  readonly metres: number;
  readonly choices?: Readonly<Record<string, string>>;
  /** Set only when existing flight/contact physics authorizes the active route. */
  readonly flightAuthorized?: boolean;
}

export function createCourseFleet(graph: CourseGraph, ids: readonly string[]): CourseFleet {
  if (ids.length < 1 || ids.length > 8 || ids.some(id => !id?.trim()) || new Set(ids).size !== ids.length)
    throw new Error('Invalid driver IDs: expected one to eight unique nonempty car IDs');
  return ids.map(id => ({ id, travel: createCourseTravel(graph) }));
}

/** Atomic per-frame update: reject invalid commands before advancing any driver. */
export function advanceCourseFleet(graph: CourseGraph, fleet: CourseFleet, moves: readonly CourseCarMove[]): CourseFleet {
  const ids = new Set(fleet.map(car => car.id));
  const seen = new Set<string>();
  for (const move of moves) {
    if (!ids.has(move.id)) throw new Error(`Unknown course car: ${move.id}`);
    if (seen.has(move.id)) throw new Error(`Duplicate course car move: ${move.id}`);
    if (!Number.isFinite(move.metres) || move.metres < 0) throw new RangeError(`Invalid physical distance for ${move.id}`);
    seen.add(move.id);
  }
  const byId = new Map(moves.map(move => [move.id, move]));
  return fleet.map(car => {
    const move = byId.get(car.id);
    if (!move) return car;
    return { ...car, travel: advanceCourseTravel(graph, car.travel, move.metres, move.choices, move.flightAuthorized) };
  });
}

/** Broad-phase 3D candidates only: existing shared car knock/bump logic owns responses. */
export function courseFleetContactPairs(graph: CourseGraph, fleet: CourseFleet): [string, string][] {
  const active = fleet.filter(car => !car.travel.finished).map(car => ({
    id: car.id, at: courseTravelPosition(graph, car.travel),
  }));
  const pairs: [string, string][] = [];
  for (let i = 0; i < active.length; i++) for (let j = i + 1; j < active.length; j++) {
    const [a, b] = [active[i], active[j]];
    if (Math.abs(a.at[1] - b.at[1]) < 1.8 && Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]) < 4.4)
      pairs.push([a.id, b.id]);
  }
  return pairs;
}

/** Find a confirmed clear ground pose after the last valid checkpoint; never teleport into hazards. */
export function recoverCourseFleetCar(
  graph: CourseGraph, fleet: CourseFleet, id: string,
  isClear: (worldPoint: CoursePoint3, pose: CourseTravel) => boolean,
): CourseFleet | null {
  const car = fleet.find(candidate => candidate.id === id);
  if (!car) throw new Error(`Unknown course car: ${id}`);
  if (car.travel.finished) return null;
  const checkpoint = car.travel.nextCheckpoint;
  if (!Number.isSafeInteger(checkpoint) || checkpoint < 0 || checkpoint > graph.checkpoints.length) return null;
  const from = checkpoint === 0 ? graph.start : graph.checkpoints[checkpoint - 1];
  const edgeId = graph.groundRoute.find(id => graph.edges.some(edge => edge.id === id && edge.from === from));
  if (!edgeId) return null;
  const length = routeLength(graph, edgeId);
  for (let n = 1; n <= 12; n++) {
    const localS = Math.min(n * 5, length / 2);
    const travel = { ...car.travel, currentEdgeId: edgeId, localS, lateral: 0, altitude: 0, finished: false };
    if (isClear(courseTravelPosition(graph, travel), travel))
      return fleet.map(other => other.id === id ? { ...other, travel } : other);
    if (localS >= length / 2) break;
  }
  return null;
}
