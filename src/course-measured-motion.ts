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
  if (node?.id === graph.finish) {
    if (motion.nextEdgeId) return state;
    const crossed = advanceSignedGate(graph, state, {
      edgeId: edge.id, fromS: motion.fromS, toS: motion.toS,
      fromPosition: motion.fromPosition, toPosition: motion.toPosition, maxStepMetres: motion.maxStepMetres,
    }, motion.gateHeight);
    return crossed === state ? state : { ...state, ...crossed, localS: length };
  }
  const next = graph.edges.find(candidate => candidate.id === motion.nextEdgeId);
  if (!next || next.from !== node?.id || (next.mode === 'flight' && !motion.flightAuthorized)) return state;
  // Odometer overflow is the arc distance on the next edge; the measured pose must sit on its road frame there.
  const localS = motion.toS - length;
  if (localS >= routeLength(graph, next.id)) return state;
  const frame = sampleRoute(graph, next.id, localS), off = delta(motion.toPosition, frame.point);
  const lateral = dot(off, frame.right), altitude = dot(off, frame.up);
  if (Math.abs(dot(off, frame.forward)) > 0.25 || Math.abs(lateral) > frame.width / 2 ||
      // Authorized flight may cross onto a ground edge up to the gate band, like the in-edge rule.
      (next.mode === 'ground' && (altitude < -2 ||
        altitude > (motion.flightAuthorized ? motion.gateHeight?.maxHeight ?? 5 : 5)))) return state;
  // Gate sweep in the incoming node frame, so a kink cannot swing an outer/inner lateral behind the plane.
  const end = sampleRoute(graph, edge.id, length), f = end.forward, r = end.right, u = end.up;
  const crossed = advanceSignedGate(graph, state, {
    edgeId: edge.id, fromS: motion.fromS, toS: motion.toS, fromPosition: motion.fromPosition,
    toPosition: [
      end.point[0] + f[0] * localS + r[0] * lateral + u[0] * altitude,
      end.point[1] + f[1] * localS + r[1] * lateral + u[1] * altitude,
      end.point[2] + f[2] * localS + r[2] * lateral + u[2] * altitude,
    ],
    maxStepMetres: motion.maxStepMetres, nextEdgeId: next.id,
  }, motion.gateHeight);
  if (crossed === state) return state;
  return { ...state, ...crossed, localS, lateral, altitude };
}
