import { raceTrack } from './race-tracks.ts';
import { CIRCUIT_ID, circuitDistance } from './circuit-track.ts';
import { trackOverview, trackPoint } from './track-paths.ts';
import { SKY_SPIRAL } from './sky-track.ts';
import { t, trackName, getLocale } from './i18n.ts';
import { RACE_DRIVER_IDS } from './race-grid.ts';

const NS = 'http://www.w3.org/2000/svg';
interface RoutePoint { x: number; y: number }
interface RouteSample extends RoutePoint { distance: number }
interface RouteDriver { id: string; distance: number; x?: number }
const cache = new Map<string, RouteSample[]>();
const lineCache = new Map<string, string>();
const overpassCache = new Map<string, string>();
const racers = RACE_DRIVER_IDS;
interface GradeCue extends RoutePoint { distance: number; direction: 'up' | 'down' }
const gradeCache = new Map<string, GradeCue[]>();
const clamp = (x: number): number => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const svg = (tag: string, attrs: Record<string, string | number> = {}): SVGElement => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
export function routeSamples(trackId: string): RouteSample[] {
  if (!cache.has(trackId)) cache.set(trackId, trackOverview(trackId, 128));
  return cache.get(trackId)!;
}
const pointText = (p: {x: number; y: number}): string => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
export function routePolyline(trackId: string): string {
  let line = lineCache.get(trackId);
  if (line === undefined) {
    line = routeSamples(trackId).map(p => pointText({x: p.x * 100, y: p.y * 100})).join(' ');
    lineCache.set(trackId, line);
  }
  return line;
}
// Mark only the elevated exit arc; all coordinates come from the cached centreline.
// No additional route geometry or per-frame SVG elements are constructed.
export function spiralUpperRoutePolyline(trackId: string): string {
  if (trackId !== 'spiral') return '';
  let line = overpassCache.get(trackId);
  if (line === undefined) {
    const start = (SKY_SPIRAL.start + SKY_SPIRAL.end) / 2;
    const samples = routeSamples(trackId).filter(p => p.distance > start && p.distance < SKY_SPIRAL.end);
    line = [pointText(routeMarker(trackId, start)),
      ...samples.map(p => pointText({x: p.x * 100, y: p.y * 100})),
      pointText(routeMarker(trackId, SKY_SPIRAL.end))].join(' ');
    overpassCache.set(trackId, line);
  }
  return line;
}
export function routeMarker(trackId: string, distance: number): RoutePoint {
  const samples = routeSamples(trackId);
  const total = raceTrack(trackId)!.length;
  const value = clamp((trackId === CIRCUIT_ID ? circuitDistance(distance) : distance) / total) * (samples.length - 1);
  const index = Math.min(Math.floor(value), samples.length - 2);
  const frac = value - index, a = samples[index], b = samples[index + 1];
  return { x: (a.x + (b.x - a.x) * frac) * 100, y: (a.y + (b.y - a.y) * frac) * 100 };
}
// Static chevron on the high half of the real helix. It is not another road
// path or a per-frame DOM update, and its heading comes from routeMarker().
export function spiralUpperDirectionChevron(trackId: string): string {
  if (trackId !== 'spiral') return '';
  const at = SKY_SPIRAL.start + (SKY_SPIRAL.end - SKY_SPIRAL.start) * .72;
  const previous = routeMarker(trackId, at - 20), next = routeMarker(trackId, at + 20);
  const point = routeMarker(trackId, at);
  const dx = next.x - previous.x, dy = next.y - previous.y, length = Math.hypot(dx, dy) || 1;
  const ux = dx / length, uy = dy / length;
  return [
    { x: point.x - ux * 1.6 - uy * 2.0, y: point.y - uy * 1.6 + ux * 2.0 },
    { x: point.x + ux * 2.5, y: point.y + uy * 2.5 },
    { x: point.x - ux * 1.6 + uy * 2.0, y: point.y - uy * 1.6 - ux * 2.0 },
  ].map(pointText).join(' ');
}
// The mini-map's two static grade hints use the actual 3D centreline and the
// same cached map coordinates as racer markers. No independent route model.
export function routeElevationCues(trackId: string): readonly GradeCue[] {
  if (trackId !== 'alpine' && trackId !== 'cosmic') return [];
  if (!gradeCache.has(trackId)) {
    let climb = { distance: 0, delta: 1.2 };
    let descent = { distance: 0, delta: -1.2 };
    for (const sample of routeSamples(trackId).slice(1, -1)) {
      const delta = trackPoint(trackId, sample.distance + 50).y - trackPoint(trackId, sample.distance - 50).y;
      if (delta > climb.delta) climb = { distance: sample.distance, delta };
      if (delta < descent.delta) descent = { distance: sample.distance, delta };
    }
    const cues: GradeCue[] = [climb, descent].filter(c => c.distance > 0).map(c => ({
      ...routeMarker(trackId, c.distance), distance: c.distance,
      direction: c.delta > 0 ? 'up' : 'down',
    }));
    gradeCache.set(trackId, cues);
  }
  return gradeCache.get(trackId)!;
}
const routeLabel = (trackId: string, locale: string = getLocale()): string => {
  const label = t('route.aria', { name: trackName(trackId, locale) }, locale);
  return routeElevationCues(trackId).length ? `${label} · ${t('route.grade', undefined, locale)}` : label;
};
export function createRouteMap(trackId: string, { live = false }: { live?: boolean } = {}) {
  const element = svg('svg', { viewBox: '0 0 100 100', class: `route-overview theme-${trackId}`, role: 'img' }); // aria-label: relabel() below
  element.append(svg('polyline', { points: routePolyline(trackId), class: 'route-overview-line', fill: 'none' }));
  const upper = spiralUpperRoutePolyline(trackId);
  if (upper) {
    element.append(svg('polyline', { points: upper, class: 'route-spiral-upper', fill: 'none', 'aria-hidden': 'true' }));
    element.append(svg('polyline', { points: spiralUpperDirectionChevron(trackId),
      class: 'route-spiral-direction', fill: 'none', 'aria-hidden': 'true' }));
  }
  for (const cue of routeElevationCues(trackId)) {
    const { x, y } = cue;
    const top = cue.direction === 'up';
    const tip = (y + (top ? -3 : 3)).toFixed(2);
    const base = (y + (top ? 2 : -2)).toFixed(2);
    element.append(svg('path', {
      d: `M${(x - 2.5).toFixed(2)},${base} L${x.toFixed(2)},${tip} L${(x + 2.5).toFixed(2)},${base} Z`,
      class: 'route-elevation-cue', 'data-direction': cue.direction, 'aria-hidden': 'true',
      style: 'fill:var(--map-player, #ffe9b4);stroke:#0b1a2c;stroke-width:.8;vector-effect:non-scaling-stroke;pointer-events:none',
    }));
  }
  for (const [kind, d] of [['start', 0], ['finish', raceTrack(trackId)!.length]] as const) {
    const p = routeMarker(trackId, d);
    element.append(svg('circle', { cx: p.x, cy: p.y, r: 2, class: `route-${kind}` }));
  }
  const markers = new Map<string, SVGElement>();
  if (live) for (const [i, id] of racers.entries()) {
    const marker = svg('circle', { r: id === 'YOU' ? 3.5 : 2.8, class: `route-driver route-driver-${id.toLowerCase()}`, 'data-racer': id });
    marker.append(svg('title'));
    element.append(marker);
    markers.set(id, marker);
  }
  const updateDrivers = (drivers: readonly RouteDriver[]): void => {
    const active = new Set(drivers.map(driver => driver.id));
    for (const [id, marker] of markers) {
      const visible = active.has(id);
      if (marker.getAttribute('visibility') !== (visible ? 'visible' : 'hidden')) marker.setAttribute('visibility', visible ? 'visible' : 'hidden');
    }
    for (const driver of drivers) {
      const marker = markers.get(driver.id);
      if (!marker) continue;
      const point = routeMarker(trackId, driver.distance);
      const ahead = routeMarker(trackId, driver.distance + 10);
      const dx = ahead.x - point.x, dy = ahead.y - point.y;
      const length = Math.hypot(dx, dy) || 1;
      const side = (driver.x ?? 0) * 0.6;
      const x = (point.x - dy / length * side).toFixed(2), y = (point.y + dx / length * side).toFixed(2);
      // Avoid forcing SVG layout/style work on frames whose tiny marker
      // movement is still subpixel at the current map size.
      if (marker.getAttribute('cx') !== x) marker.setAttribute('cx', x);
      if (marker.getAttribute('cy') !== y) marker.setAttribute('cy', y);
    }
  };
  if (live) updateDrivers(racers.map(id => ({ id, distance: 0 })));
  // Tooltips show the localized player label; data-racer keeps the identity key.
  const relabel = (locale: string = getLocale()): void => {
    element.setAttribute('aria-label', routeLabel(trackId, locale));
    for (const [id, marker] of markers) if (marker.firstChild) marker.firstChild.textContent = id === 'YOU' ? t('hud.you', undefined, locale) : id;
  };
  relabel();
  return { element, updateDrivers, relabel, destroy() { element.remove(); } };
}
