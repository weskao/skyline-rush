import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { advanceRouteProgress, createRouteProgress, type RouteProgress } from './course-progress.ts';

/** Opt-in graph movement in physical metres. The legacy Race simulation is unaffected. */
export interface CourseTravel extends RouteProgress {
  readonly localS: number;
  readonly lateral: number;
  readonly altitude: number;
}

export function createCourseTravel(graph: CourseGraph): CourseTravel {
  return { ...createRouteProgress(graph), localS: 0, lateral: 0, altitude: 0 };
}

/** The same sampled world position is used for the race car and the future road renderer. */
export function courseTravelPosition(graph: CourseGraph, state: CourseTravel): CoursePoint3 {
  const frame = sampleRoute(graph, state.currentEdgeId, state.localS);
  return [
    frame.point[0] + frame.right[0] * state.lateral + frame.up[0] * state.altitude,
    frame.point[1] + frame.right[1] * state.lateral + frame.up[1] * state.altitude,
    frame.point[2] + frame.right[2] * state.lateral + frame.up[2] * state.altitude,
  ];
}

/**
 * Advance a vehicle along the canonical arc-length route. 'choices' comes from a trusted
 * branch controller; flight is opt-in and must first be authorized by shared flight physics.
 */
export function advanceCourseTravel(
  graph: CourseGraph, state: CourseTravel, metres: number,
  choices: Readonly<Record<string, string>> = {}, allowFlight = false,
): CourseTravel {
  if (state.finished || !Number.isFinite(metres) || metres <= 0 ||
      !Number.isFinite(state.localS) || !Number.isFinite(state.lateral) || !Number.isFinite(state.altitude)) return state;
  const startEdge = graph.edges.find(edge => edge.id === state.currentEdgeId);
  if (!startEdge || state.localS < 0 || state.localS >= routeLength(graph, startEdge.id)) return state;
  if (startEdge.mode === 'flight' && !allowFlight) return state;

  let current = state;
  let remaining = metres;
  // Acyclic CourseGraph: at most one transition per edge in a single simulation step.
  for (let traversed = 0; traversed <= graph.edges.length; traversed++) {
    const edge = graph.edges.find(candidate => candidate.id === current.currentEdgeId)!;
    const length = routeLength(graph, edge.id);
    const toEnd = length - current.localS;
    if (remaining < toEnd) return { ...current, localS: current.localS + remaining };

    const node = graph.nodes.find(candidate => candidate.id === edge.to)!;
    const selected = choices[node.id] ?? graph.groundRoute.find(id => graph.edges.some(e => e.id === id && e.from === node.id));
    const next = graph.edges.find(candidate => candidate.id === selected);
    if (node.id !== graph.finish && (!next || next.from !== node.id || (next.mode === 'flight' && !allowFlight))) return state;
    const progressed = advanceRouteProgress(graph, current, {
      edgeId: edge.id, fromS: current.localS, toS: length,
      position: courseTravelPosition(graph, { ...current, localS: length }),
      ...(node.id === graph.finish ? {} : { nextEdgeId: next!.id }),
    });
    if (progressed === current) return state;
    if (progressed.finished) return { ...current, ...progressed, localS: length };
    remaining -= toEnd;
    current = { ...current, ...progressed, localS: 0 };
    if (remaining === 0) return current;
  }
  return state;
}
