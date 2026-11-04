// Deterministic, branch-aware obstacle contracts: same pose is consumed by physics,
// AI and the visible scene. Shared race logic owns any knockback or scoring.
import {
  sampleVolcanicRoute, volcanicEdgeLength, volcanicWorldPosition,
  VOLCANIC_CROWN_EDGES, type Vec3,
} from './volcanic-crown.ts';

export type ObstacleKind = 'boulder' | 'fissure' | 'vent' | 'rockfall';
export type VolcanicObstacle = {
  readonly id: string; readonly edgeId: string; readonly s: number;
  readonly lateral: number; readonly radius: number; readonly kind: ObstacleKind;
};
export type ObstaclePose = {
  readonly point: Vec3; readonly active: boolean; readonly warning: boolean;
  readonly radius: number;
};
export const VOLCANIC_OBSTACLES: readonly VolcanicObstacle[] = [
  { id:'basalt-01', edgeId:'ground-0', s:810, lateral:12, radius:4, kind:'boulder' },
  { id:'basalt-02', edgeId:'ground-2', s:570, lateral:-10, radius:5, kind:'boulder' },
  { id:'crack-01', edgeId:'ground-3', s:820, lateral:6, radius:4, kind:'fissure' },
  { id:'crack-02', edgeId:'ground-4', s:1110, lateral:-5, radius:4.5, kind:'fissure' },
  { id:'heat-vent', edgeId:'ground-5', s:630, lateral:11, radius:5, kind:'vent' },
  { id:'rockfall-01', edgeId:'ground-6', s:690, lateral:0, radius:4.4, kind:'rockfall' },
  { id:'rockfall-02', edgeId:'ground-8', s:950, lateral:4, radius:4.4, kind:'rockfall' },
  { id:'basalt-03', edgeId:'ground-7', s:1040, lateral:-12, radius:5, kind:'boulder' },
  { id:'eruption-vent', edgeId:'ground-9', s:680, lateral:-10, radius:5, kind:'vent' },
  { id:'rift-flight-rock', edgeId:'rift-flight', s:550, lateral:10, radius:4, kind:'boulder' },
  { id:'lava-risk-01', edgeId:'vent-risk', s:480, lateral:2, radius:5, kind:'fissure' },
  { id:'gorge-flight-rock', edgeId:'gorge-flight', s:690, lateral:-9, radius:4.5, kind:'boulder' },
];

export function volcanicObstaclePose(obstacle: VolcanicObstacle, timeSeconds: number): ObstaclePose {
  const base=volcanicWorldPosition(obstacle.edgeId,obstacle.s,obstacle.lateral);
  if(obstacle.kind!=='rockfall'&&obstacle.kind!=='vent')
    return {point:base,active:true,warning:false,radius:obstacle.radius};
  // Both eruptions and falling rocks warn for 3 seconds. The 12s event
  // clock is absolute and independent of renderer frame rate.
  const phase=((Number.isFinite(timeSeconds)?timeSeconds:0)%12+12)%12;
  const warning=phase<3;
  const active=phase>=3 && phase<6;
  const height=obstacle.kind==='rockfall'
    ?phase<3?45:phase<5?45*(1-(phase-3)/2):0:0;
  const point: Vec3=[base[0],base[1]+height,base[2]];
  return {point,active,warning,radius:obstacle.radius};
}
export function volcanicObstacleContact(
  edgeId:string, localS:number, lateral:number, altitude:number, timeSeconds:number,
  vehicleRadius=1.65,
): VolcanicObstacle|null {
  const car=volcanicWorldPosition(edgeId,localS,lateral,altitude);
  for(const obstacle of VOLCANIC_OBSTACLES){
    if(obstacle.edgeId!==edgeId || Math.abs(obstacle.s-localS)>obstacle.radius+vehicleRadius+6)continue;
    const pose=volcanicObstaclePose(obstacle,timeSeconds);
    if(!pose.active)continue;
    const dx=car[0]-pose.point[0],dy=car[1]-pose.point[1],dz=car[2]-pose.point[2];
    const horizontal=Math.hypot(dx,dz);
    if(obstacle.kind==='fissure'||obstacle.kind==='vent'){
      if(horizontal<=obstacle.radius+vehicleRadius && Math.abs(dy)<1.7)return obstacle;
    }else if(Math.hypot(dx,dy,dz)<=pose.radius+vehicleRadius)return obstacle;
  }
  return null;
}
export function volcanicAIChooseLateral(
  edgeId:string, localS:number, preferredLateral:number, timeSeconds:number, lookAhead=90,
): number {
  const edge=VOLCANIC_CROWN_EDGES.find(item=>item.id===edgeId);
  if(!edge)throw new Error('Unknown Volcanic Crown edge: '+edgeId);
  const maxLateral=edge.width/2-2.3;
  const clamp=(n:number)=>Math.max(-maxLateral,Math.min(maxLateral,n));
  const blocked=VOLCANIC_OBSTACLES.filter(obstacle=>obstacle.edgeId===edgeId &&
    obstacle.s>=localS-6 && obstacle.s<=localS+lookAhead &&
    (volcanicObstaclePose(obstacle,timeSeconds).active || volcanicObstaclePose(obstacle,timeSeconds).warning));
  const candidates=[clamp(preferredLateral),-8,8,-3,3,0].map(clamp);
  const safe=candidates.filter(candidate=>blocked.every(obstacle=>
    Math.abs(candidate-obstacle.lateral)>obstacle.radius+2.3));
  return (safe.length?safe:candidates).sort((a,b)=>
    Math.abs(a-preferredLateral)-Math.abs(b-preferredLateral))[0];
}
export function validateVolcanicObstacles(): boolean {
  for(const obstacle of VOLCANIC_OBSTACLES){
    const edge=VOLCANIC_CROWN_EDGES.find(item=>item.id===obstacle.edgeId);
    if(!edge || obstacle.s<=0 || obstacle.s>=volcanicEdgeLength(edge.id) ||
      Math.abs(obstacle.lateral)+obstacle.radius > edge.width/2+1) return false;
    const frame=sampleVolcanicRoute(edge.id,obstacle.s);
    if(!frame.point.every(Number.isFinite))return false;
  }
  return true;
}

// Map-local continuous contact adapter. The shared collision provider decides
// damage, recovery and route validity; this uses the SAME pose as scene and AI.
export type VolcanicSweepSample = {
  readonly s: number;
  readonly lateral: number;
  readonly altitude: number;
  readonly timeSeconds: number;
};
export function volcanicObstacleSweptContact(
  edgeId: string, from: VolcanicSweepSample, to: VolcanicSweepSample,
  vehicleRadius = 1.65,
): VolcanicObstacle | null {
  const length = volcanicEdgeLength(edgeId);
  const values = [from.s, from.lateral, from.altitude, from.timeSeconds,
    to.s, to.lateral, to.altitude, to.timeSeconds, vehicleRadius];
  if (!values.every(Number.isFinite) || vehicleRadius < 0 ||
      from.s < 0 || to.s < 0 || from.s > length || to.s > length ||
      to.timeSeconds < from.timeSeconds) {
    throw new RangeError('Invalid Volcanic Crown swept contact samples');
  }
  // Sample by total route-frame motion, not only forward progress:
  // a sideways dodge or takeoff can cross a hazard within one frame.
  // Time samples also cover the falling rock's moving collision proxy.
  const spatialMeters = Math.hypot(to.s - from.s, to.lateral - from.lateral,
    to.altitude - from.altitude);
  const steps = Math.max(1, Math.ceil(spatialMeters / 2),
    Math.ceil((to.timeSeconds - from.timeSeconds) * 60));
  for (let i = 0; i <= steps; i++) {
    const fraction = i / steps;
    const lerp = (a: number, b: number) => a + (b - a) * fraction;
    const hit = volcanicObstacleContact(edgeId,
      lerp(from.s, to.s), lerp(from.lateral, to.lateral),
      lerp(from.altitude, to.altitude), lerp(from.timeSeconds, to.timeSeconds),
      vehicleRadius);
    if (hit) return hit;
  }
  return null;
}
