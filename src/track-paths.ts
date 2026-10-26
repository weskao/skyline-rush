import { RACE_TRACKS } from './game.js';
import { skyFrame, skyPoint, type Vec3, type SkyPoint } from './sky-track.ts';

interface OverviewPoint { distance: number; x: number; y: number }
const tracks = RACE_TRACKS as Readonly<Record<string, { length: number }>>;

// A single distance -> main-road mapping drives previews, minimaps and world geometry.
// The original flat routes retain their exact world-space centreline.
const oldRoadCenter = (distance: number): number => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const flatCourses = new Set(['coast', 'neon', 'canyon', 'aurora']);
const profiles: Record<string, (s: number) => Pick<SkyPoint, 'x' | 'y'>> = {
 taipei: s => ({ x: 205 * Math.sin(s/670) + 60 * Math.sin(s/185), y: 0 }),
 tokyo: s => ({ x: 275 * Math.sin(s/455) + 90 * Math.cos(s/205), y: 0 }),
 alpine: s => ({ x: 380 * Math.sin(s/310) + 150 * Math.sin(s/790), y: 34 * Math.sin(s/1300) + 65*s/7600 }),
 coastal: s => ({ x: 235 * Math.sin(s/890) + 65 * Math.sin(s/300), y: 12 * Math.sin(s/650) }),
 cosmic: s => ({ x: 405 * Math.sin(s/900) + 220 * Math.sin(s/460), y: 65 + 24 * Math.sin(s/1050) }),
};
const clamp = (value: number, from: number, to: number): number => Math.min(to, Math.max(from, value));
const unit = ([x, y, z]: Vec3): Vec3 => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function trackPoint(trackId: string, distance: number): SkyPoint {
  const track = tracks[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const s = clamp(Number.isFinite(distance) ? distance : 0, 0, track.length);
  if (trackId === 'spiral') return skyPoint(s);
  const profile = profiles[trackId];
  if (profile) return { ...profile(s), z: -s };
  return { x: oldRoadCenter(s), y: 0, z: -s };
}

export function trackFrame(trackId: string, distance: number) {
  const track = tracks[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const s = clamp(Number.isFinite(distance) ? distance : 0, 0, track.length);
  if (trackId === 'spiral') return skyFrame(s);
  const a = trackPoint(trackId, s - 0.5);
  const b = trackPoint(trackId, s + 0.5);
  // The end derivative is a one-sided difference, not a zero-length tangent.
  const forward = unit([b.x - a.x, b.y - a.y, b.z - a.z]);
  const right = unit([-forward[2], 0, forward[0]]);
  return { point: trackPoint(trackId, s), forward, right, up: unit(cross(right, forward)) };
}

/** Convert game-distance, lane and altitude to camera-relative 3D coordinates. */
export function trackLocalPosition(trackId: string, distance: number, lateral = 0, altitude = 0, origin = 0): Vec3 {
  const point = trackPoint(trackId, distance);
  const home = trackPoint(trackId, origin);
  const frame = trackFrame(trackId, distance);
  return [
    point.x - home.x + frame.right[0] * lateral + frame.up[0] * altitude,
    point.y - home.y + frame.right[1] * lateral + frame.up[1] * altitude,
    point.z - home.z + frame.right[2] * lateral + frame.up[2] * altitude,
  ];
}

// Map-only projection. Actual race geometry is unchanged. The historic flat
// road bends by <100m over 4-6km: an equal-scale full-course map would render
// as a near-invisible vertical thread. Independently scale the lateral axis so
// players can READ the turns. This is a schematic, not a map-distance scale.
const mapFit = (points: readonly OverviewPoint[], mode: 'flat' | 'world-tour'): OverviewPoint[] => {
  const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const midX=(minX+maxX)/2, spanX=Math.max(maxX-minX,1), spanY=Math.max(maxY-minY,1);
  // Old flat courses show their actual sinusoidal road centerline; no hidden
  // shortcuts or artificial bends are added.
  return points.map(p=>({
    distance:p.distance,
    x:.5 + (p.x-midX)/spanX*(mode==='flat'?.72:.84),
    y:.08 + (p.y-minY)/spanY*.84,
  }));
};

export function trackOverview(trackId: string, count = 128): OverviewPoint[] {
  const track=tracks[trackId];
  if(!track)throw new Error(`Unknown track: ${trackId}`);
  const size=Number.isInteger(count)?Math.max(2,Math.min(1000,count)):128;
  const points=Array.from({length:size},(_,i)=>{
    const distance=i*track.length/(size-1);
    const world=trackPoint(trackId,distance);
    return {distance,x:world.x,y:-world.z};
  });
  if(flatCourses.has(trackId))return mapFit(points,'flat');
  if(trackId==='spiral'){
    const start=1100,end=2200,after=Math.max(1,track.length-end);
    return points.map(p=>{
      if(p.distance<start)return {
        distance:p.distance,x:.16,y:.07+(p.distance/start)*.36,
      };
      if(p.distance<=end){
        // Project the canonical helix to a legible 360-degree loop.
        // The radius and orientation come from skyPoint; its height is not
        // another "secret path" and is intentionally excluded.
        return {
          distance:p.distance,
          x:.16+(p.x/330)*.56,
          y:.43+(p.y-start)/165*.145,
        };
      }
      return {
        distance:p.distance,x:.16,y:.43+(p.distance-end)/after*.49,
      };
    });
  }
  // World Tour paths keep a world-geometry projection with nonuniform
  // schematic fit, so all ten courses are readable in the same small HUD.
  return mapFit(points,'world-tour');
}
