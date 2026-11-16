import { routeLength, sampleRoute } from '../course-route-frame.ts';
// Volcanic Crown: independent authored graph data and world-space route sampling.
// The integration host owns race state, camera, physics and rendering.
export type Vec3 = readonly [number, number, number];
export type RouteMode = 'ground' | 'flight';
export type RouteNode = { readonly id: string; readonly kind: 'start' | 'split' | 'merge' | 'checkpoint' | 'finish'; readonly at: Vec3 };
export type RouteEdge = {
  readonly id: string; readonly from: string; readonly to: string;
  readonly mode: RouteMode; readonly width: number; readonly points: readonly Vec3[];
};
export type RouteFrame = {
  readonly edgeId: string; readonly localS: number; readonly point: Vec3;
  readonly forward: Vec3; readonly right: Vec3; readonly up: Vec3;
};

const stations: readonly Vec3[] = [
  [0, 18, 0], [210, 35, -1500], [-300, 95, -2700],
  [280, 125, -3900], [650, 30, -5200], [-150, 95, -6400],
  [500, 180, -7600], [100, 65, -8900], [620, 15, -10200],
  [190, 20, -11600], [0, 22, -12900],
];
const names = ['start', 'rim', 'rift-landing', 'crater-hairpin', 'basalt-pass',
  'vent-landing', 'high-ridge', 'gorge-landing', 'eruption-zone', 'sprint', 'finish'] as const;
const kinds = ['start', 'split', 'merge', 'checkpoint', 'split',
  'merge', 'checkpoint', 'split', 'merge', 'checkpoint', 'finish'] as const;

export const VOLCANIC_CROWN_NODES: readonly RouteNode[] = names.map((id, i) => ({
  id, kind: kinds[i], at: stations[i],
}));

const ground: readonly (readonly Vec3[])[] = [
  [stations[0], [0, 24, -490], [130, 29, -920], stations[1]],
  [stations[1], [240, 62, -1900], [60, 82, -2290], stations[2]],
  [stations[2], [-610, 145, -2780], [-670, 158, -2950], [-350, 157, -3200], stations[3]],
  [stations[3], [620, 100, -4180], [740, 78, -4730], stations[4]],
  [stations[4], [260, 65, -5490], [-160, 84, -5880], stations[5]],
  [stations[5], [80, 130, -6770], [450, 170, -7230], stations[6]],
  [stations[6], [900, 192, -7740], [950, 185, -7900], [450, 130, -8150], stations[7]],
  [stations[7], [500, 48, -9300], [720, 22, -9760], stations[8]],
  [stations[8], [300, 40, -10700], [10, 27, -11000], stations[9]],
  [stations[9], [-140, 20, -12000], [-140, 22, -12500], stations[10]],
];
const mainEdges: RouteEdge[] = ground.map((points, i) => ({
  id: `ground-${i}`, from: names[i], to: names[i + 1],
  mode: 'ground', width: i === 2 || i === 6 ? 28 : 34, points,
}));

// Every optional route re-enters at the SAME node as its safe ground alternative.
const alternativeEdges: readonly RouteEdge[] = [
  { id: 'rift-flight', from: 'rim', to: 'rift-landing', mode: 'flight', width: 27,
    points: [stations[1], [370, 73, -1750], [295, 200, -2030], [-140, 70, -2660], stations[2]] },
  { id: 'vent-risk', from: 'basalt-pass', to: 'vent-landing', mode: 'ground', width: 25,
    points: [stations[4], [530, 38, -5450], [70, 34, -5750], [-170, 84, -6110], stations[5]] },
  { id: 'gorge-flight', from: 'gorge-landing', to: 'eruption-zone', mode: 'flight', width: 28,
    points: [stations[7], [330, 100, -9210], [510, 190, -9590], [780, 2, -9950], stations[8]] },
];
export const VOLCANIC_CROWN_EDGES: readonly RouteEdge[] = [...mainEdges, ...alternativeEdges];
export const VOLCANIC_CROWN_CHECKPOINTS = ['crater-hairpin', 'high-ridge', 'sprint'] as const;
export const VOLCANIC_CROWN = {
  id: 'volcanic-crown', topologyVersion: 1, start: 'start', finish: 'finish',
  nodes: VOLCANIC_CROWN_NODES, edges: VOLCANIC_CROWN_EDGES,
  checkpoints: VOLCANIC_CROWN_CHECKPOINTS, groundEdgeIds: mainEdges.map(edge => edge.id),

} as const;

// Canonical data-only handoff for the shared CourseGraph validator/renderer.
// No independent physics, state, frame loop or race registration lives here.
export const VOLCANIC_CROWN_COURSE_GRAPH = {
  id: VOLCANIC_CROWN.id,
  version: VOLCANIC_CROWN.topologyVersion,
  start: VOLCANIC_CROWN.start,
  finish: VOLCANIC_CROWN.finish,
  nodes: VOLCANIC_CROWN.nodes,
  edges: VOLCANIC_CROWN.edges,
  checkpoints: VOLCANIC_CROWN.checkpoints,
  groundRoute: VOLCANIC_CROWN.groundEdgeIds,
  groundJoinBlend: 36,
} as const;

const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec3, n: number): Vec3 => [a[0] * n, a[1] * n, a[2] * n];

// Keep the map's legacy exports, but share the exact arc-length and road frame
// used by CourseGraph, AI, collisions and the future race runtime.
export function volcanicEdgeLength(edgeId: string): number {
  return routeLength(VOLCANIC_CROWN_COURSE_GRAPH, edgeId);
}
export function volcanicGroundLength(): number {
  return mainEdges.reduce((sum, edge) => sum + volcanicEdgeLength(edge.id), 0);
}
export function sampleVolcanicRoute(edgeId: string, localS: number): RouteFrame {
  return sampleRoute(VOLCANIC_CROWN_COURSE_GRAPH, edgeId, localS);
}

export function volcanicWorldPosition(edgeId: string, localS: number, lateral=0, altitude=0): Vec3 {
  const frame=sampleVolcanicRoute(edgeId, localS);
  return add(add(frame.point, scale(frame.right,lateral)),scale(frame.up,altitude));
}

// The caller must verify physically signed, forward gate crossings first.
export type VolcanicGateState = { readonly nextCheckpoint: number; readonly finished: boolean };
export function advanceVolcanicGate(state: VolcanicGateState, nodeId: string, forward: boolean): VolcanicGateState {
  if (!forward || state.finished) return state;
  if (nodeId === VOLCANIC_CROWN_CHECKPOINTS[state.nextCheckpoint]) {
    return { nextCheckpoint: state.nextCheckpoint+1, finished:false };
  }
  if (nodeId === VOLCANIC_CROWN.finish && state.nextCheckpoint === VOLCANIC_CROWN_CHECKPOINTS.length) {
    return { nextCheckpoint: state.nextCheckpoint, finished:true };
  }
  return state;
}
export function volcanicRecovery(state: VolcanicGateState): RouteFrame {
  const checkpoint = state.nextCheckpoint === 0 ? VOLCANIC_CROWN.start
    : VOLCANIC_CROWN_CHECKPOINTS[Math.min(state.nextCheckpoint-1, VOLCANIC_CROWN_CHECKPOINTS.length-1)];
  const edge=mainEdges.find(item=>item.from===checkpoint) ?? mainEdges[0];
  return sampleVolcanicRoute(edge.id, Math.min(32, volcanicEdgeLength(edge.id)*.05));
}

// Static presentation metadata only: the shared race runtime authorizes swept,
// forward, route-layer-aware checkpoint crossings and finish transitions.
export type VolcanicDirectionalGate = {
  readonly nodeId:string; readonly kind:'checkpoint'|'finish';
  readonly incomingEdgeId:string; readonly localS:number;
  readonly point:Vec3; readonly forward:Vec3; readonly up:Vec3;
  readonly width:number;
};
export const VOLCANIC_CROWN_DIRECTIONAL_GATES: readonly VolcanicDirectionalGate[] =
  [...VOLCANIC_CROWN_CHECKPOINTS,VOLCANIC_CROWN.finish].map(nodeId=>{
    const edge=mainEdges.find(item=>item.to===nodeId)!;
    const localS=volcanicEdgeLength(edge.id);
    const frame=sampleVolcanicRoute(edge.id,localS);
    const kind:'checkpoint'|'finish'=nodeId===VOLCANIC_CROWN.finish?'finish':'checkpoint';
    return {nodeId,kind,incomingEdgeId:edge.id,localS,
      point:frame.point,forward:frame.forward,up:frame.up,width:edge.width};
  });
