import { RACE_TRACKS } from './game.js';
import { trackOverview } from './track-paths.js';

const NS = 'http://www.w3.org/2000/svg';
const cache = new Map();
const racers = ['YOU', 'NOVA', 'ORBIT', 'APEX'];
const clamp = x => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const svg = (tag, attrs = {}) => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
export function routeSamples(trackId) {
  if (!cache.has(trackId)) cache.set(trackId, trackOverview(trackId, 128));
  return cache.get(trackId);
}
export function routePolyline(trackId) {
  return routeSamples(trackId).map(p => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ');
}
export function routeMarker(trackId, distance) {
  const samples = routeSamples(trackId);
  const total = RACE_TRACKS[trackId].length;
  const value = clamp(distance / total) * (samples.length - 1);
  const index = Math.min(Math.floor(value), samples.length - 2);
  const t = value - index, a = samples[index], b = samples[index + 1];
  return { x: (a.x + (b.x - a.x) * t) * 100, y: (a.y + (b.y - a.y) * t) * 100 };
}
export function createRouteMap(trackId, { live = false } = {}) {
  const element = svg('svg', { viewBox: '0 0 100 100', class: 'route-overview', role: 'img', 'aria-label': `Full ${RACE_TRACKS[trackId].name} main route` });
  element.append(svg('polyline', { points: routePolyline(trackId), class: 'route-overview-line', fill: 'none' }));
  for (const [kind, d] of [['start', 0], ['finish', RACE_TRACKS[trackId].length]]) {
    const p = routeMarker(trackId, d);
    element.append(svg('circle', { cx: p.x, cy: p.y, r: 2, class: `route-${kind}` }));
  }
  const markers = new Map();
  if (live) for (const [i, id] of racers.entries()) {
    const marker = svg('circle', { r: id === 'YOU' ? 3.5 : 2.8, class: `route-driver route-driver-${id.toLowerCase()}`, 'data-racer': id });
    marker.append(svg('title'));
    marker.firstChild.textContent = id;
    element.append(marker);
    markers.set(id, marker);
  }
  const updateDrivers = drivers => {
    for (const driver of drivers) {
      const marker = markers.get(driver.id);
      if (!marker) continue;
      const point = routeMarker(trackId, driver.distance);
      marker.setAttribute('cx', point.x.toFixed(2));
      marker.setAttribute('cy', point.y.toFixed(2));
    }
  };
  if (live) updateDrivers(racers.map(id => ({ id, distance: 0 })));
  return { element, updateDrivers, destroy() { element.remove(); } };
}
