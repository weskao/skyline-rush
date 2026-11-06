import type { CourseGraph } from './course-graph.ts';
import { routeLength } from './course-route-frame.ts';
import type { CourseFleet } from './course-fleet.ts';

/** Deterministic branch hint for existing AI: no flight edge without flight authorization. */
export function chooseCourseNextEdge(
  graph: CourseGraph, nodeId: string, driverIndex: number, flightAuthorized = false, seed = 0,
): string | null {
  if (!Number.isSafeInteger(driverIndex) || driverIndex < 0 || !Number.isSafeInteger(seed)) return null;
  const available = graph.edges.filter(e => e.from === nodeId && (flightAuthorized || e.mode === 'ground'));
  available.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  return available.length ? available[((driverIndex + seed) % available.length + available.length) % available.length].id : null;
}

export interface CourseStanding {
  readonly id: string;
  readonly place: number;
  readonly finished: boolean;
  readonly nextCheckpoint: number;
  readonly remainingMetres: number;
}

/** The next mandatory checkpoint (or FINISH) is the shared comparison target across forks. */
export function rankCourseFleet(
  graph: CourseGraph, fleet: CourseFleet, finishTimes: Readonly<Record<string, number>> = {},
): CourseStanding[] {
  const distanceCache = new Map<string, Map<string, number>>();
  const distanceTo = (from: string, target: string): number => {
    let memo = distanceCache.get(target);
    if (!memo) { memo = new Map(); distanceCache.set(target, memo); }
    if (from === target) return 0;
    const cached = memo.get(from);
    if (cached !== undefined) return cached;
    let best = Infinity;
    for (const edge of graph.edges) if (edge.from === from)
      best = Math.min(best, routeLength(graph, edge.id) + distanceTo(edge.to, target));
    memo.set(from, best);
    return best;
  };
  const ranked = fleet.map((car, index) => {
    const travel = car.travel, cp = travel.nextCheckpoint;
    const edge = graph.edges.find(candidate => candidate.id === travel.currentEdgeId);
    const valid = edge && Number.isSafeInteger(cp) && cp >= 0 && cp <= graph.checkpoints.length &&
      Number.isFinite(travel.localS) && travel.localS >= 0 && travel.localS <= routeLength(graph, edge.id) &&
      (cp === 0 || Number.isFinite(distanceTo(graph.checkpoints[cp - 1], edge.from)));
    const target = valid ? (graph.checkpoints[cp] ?? graph.finish) : null;
    const remaining = valid && target ? routeLength(graph, edge.id) - travel.localS + distanceTo(edge.to, target) : Infinity;
    const reachable = Boolean(valid && Number.isFinite(remaining));
    const finish = Boolean(reachable && edge && travel.finished && cp === graph.checkpoints.length &&
      edge.to === graph.finish && travel.localS === routeLength(graph, edge.id));
    const finishTime = Number.isFinite(finishTimes[car.id]) && finishTimes[car.id] >= 0 ? finishTimes[car.id] : Infinity;
    return { id: car.id, nextCheckpoint: reachable ? cp : -1, finished: finish, remainingMetres: reachable ? remaining : Infinity,
      finishTime, index };
  });
  ranked.sort((a, b) => Number(b.finished) - Number(a.finished) ||
    (a.finished && b.finished ? a.finishTime - b.finishTime : 0) ||
    b.nextCheckpoint - a.nextCheckpoint || a.remainingMetres - b.remainingMetres || a.index - b.index);
  return ranked.map(({id,finished,nextCheckpoint,remainingMetres},index)=>({id,finished,nextCheckpoint,remainingMetres,place:index+1}));
}
