import { RACE_TRACKS } from './game.js';
import { skyFrame, skyPoint } from './sky-track.js';

// A single distance -> main-road mapping drives previews, minimaps and world geometry.
// The original flat routes retain their exact world-space centreline.
const oldRoadCenter = distance => Math.sin(distance / 270) * 18 + Math.sin(distance / 610) * 25;
const flatCourses = new Set(['coast', 'neon', 'canyon', 'aurora']);
const clamp = (value, from, to) => Math.min(to, Math.max(from, value));
const unit = ([x, y, z]) => {
  const length = Math.hypot(x, y, z) || 1;
  return [x / length, y / length, z / length];
};
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

export function trackPoint(trackId, distance) {
  const track = RACE_TRACKS[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const s = clamp(Number.isFinite(distance) ? distance : 0, 0, track.length);
  if (trackId === 'spiral') return skyPoint(s);
  return { x: oldRoadCenter(s), y: 0, z: -s };
}

export function trackFrame(trackId, distance) {
  const track = RACE_TRACKS[trackId];
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

export function trackOverview(trackId, count = 128) {
  const track = RACE_TRACKS[trackId];
  if (!track) throw new Error(`Unknown track: ${trackId}`);
  const size = Number.isInteger(count) ? Math.max(2, Math.min(1000, count)) : 128;
  const exaggeration = flatCourses.has(trackId) ? 12 : 1;
  const points = Array.from({ length: size }, (_, i) => {
    const distance = i * track.length / (size - 1);
    const point = trackPoint(trackId, distance);
    return { distance, x: point.x * exaggeration, y: -point.z };
  });
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), minY = Math.min(...ys);
  const width = Math.max(Math.max(...xs) - minX, 1);
  const height = Math.max(Math.max(...ys) - minY, 1);
  const scale = 0.84 / Math.max(width, height);
  const insetX = (1 - width * scale) / 2, insetY = (1 - height * scale) / 2;
  return points.map(p => ({
    distance: p.distance,
    x: insetX + (p.x - minX) * scale,
    y: insetY + (p.y - minY) * scale,
  }));
}
