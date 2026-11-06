import type { CourseGraph, CoursePoint3 } from './course-graph.ts';
import { routeLength, sampleRoute } from './course-route-frame.ts';
import { courseTravelPosition, type CourseTravel } from './course-travel.ts';
import { advanceSignedGate, type GateHeightBand } from './course-signed-gates.ts';

/** Supplied by the authoritative car physics step, never by browser/UI input. */
export interface MeasuredCourseMotion {
  readonly edgeId: string;
  readonly fromS: number;
  readonly toS: number;
  readonly fromPosition: CoursePoint3;
  readonly toPosition: CoursePoint3;
  readonly maxStepMetres: number;
  readonly nextEdgeId?: string;
  readonly flightAuthorized?: boolean;
  readonly gateHeight?: GateHeightBand;
}
const finitePoint = (p: CoursePoint3): boolean => Array.isArray(p) && p.length === 3 && p.every(Number.isFinite);
const delta = (a: CoursePoint3, b: CoursePoint3): CoursePoint3 =>
  [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: CoursePoint3, b: CoursePoint3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const norm = (v: CoursePoint3): number => Math.hypot(...v);

/** Opt-in bridge: route progress can only follow a measured physical 3D sweep. */
export function advanceMeasuredCourseTravel(graph: CourseGraph, state: CourseTravel, motion: MeasuredCourseMotion): CourseTravel {
  const edge = graph.edges.find(candidate => candidate.id === state.currentEdgeId);
  if (!edge || state.finished || motion.edgeId !== edge.id || (edge.mode === 'flight' && !motion.flightAuthorized)) return state;
  const length = routeLength(graph, edge.id);
  if (![motion.fromS, motion.toS, motion.maxStepMetres, state.localS, state.lateral, state.altitude].every(Number.isFinite) ||
      !finitePoint(motion.fromPosition) || !finitePoint(motion.toPosition) ||
      motion.maxStepMetres <= 0 || state.localS < 0 || state.localS >= length ||
      Math.abs(motion.fromS - state.localS) > 1e-5 || motion.toS < motion.fromS ||
      motion.toS - motion.fromS > motion.maxStepMetres + 1e-6 ||
      norm(delta(motion.toPosition, motion.fromPosition)) > motion.maxStepMetres + 1e-6 ||
      norm(delta(motion.fromPosition, courseTravelPosition(graph, state))) > 0.05) return state;

  if (motion.toS < length) {
    if (motion.nextEdgeId) return state;
    const frame = sampleRoute(graph, edge.id, motion.toS), off = delta(motion.toPosition, frame.point);
    const lateral = dot(off, frame.right), altitude = dot(off, frame.up);
    if (Math.abs(dot(off, frame.forward)) > 0.25 || Math.abs(lateral) > frame.width / 2 ||
        (edge.mode === 'ground' && (altitude < -2 || (altitude > 5 && !motion.flightAuthorized)))) return state;
    return { ...state, localS: motion.toS, lateral, altitude };
  }

  const node = graph.nodes.find(candidate => candidate.id === edge.to);
  if (node?.id === graph.finish && motion.nextEdgeId) return state;
  const next = graph.edges.find(candidate => candidate.id === motion.nextEdgeId);
  if (node?.id !== graph.finish && (!next || next.from !== node?.id || (next.mode === 'flight' && !motion.flightAuthorized))) return state;
  const crossed = advanceSignedGate(graph, state, {
    edgeId: edge.id, fromS: motion.fromS, toS: motion.toS,
    fromPosition: motion.fromPosition, toPosition: motion.toPosition,
    maxStepMetres: motion.maxStepMetres,
    ...(node?.id === graph.finish ? {} : { nextEdgeId: next!.id }),
  }, motion.gateHeight);
  if (crossed === state) return state;
  if (crossed.finished) return { ...state, ...crossed, localS: length };
  const entry = sampleRoute(graph, next!.id, 0), displacement = delta(motion.toPosition, entry.point);
  const consumedS = Math.max(0, dot(displacement, entry.forward));
  if (consumedS > motion.maxStepMetres + 1e-6 || consumedS >= routeLength(graph, next!.id)) return state;
  const frame = sampleRoute(graph, next!.id, consumedS), off = delta(motion.toPosition, frame.point);
  const lateral = dot(off, frame.right), altitude = dot(off, frame.up);
  if (Math.abs(dot(off, frame.forward)) > 0.25 || Math.abs(lateral) > frame.width / 2 ||
      (next!.mode === 'ground' && (altitude < -2 || altitude > 5))) return state;
  return { ...state, ...crossed, localS: consumedS, lateral, altitude };
}
