import { classicRoadRoute, type ClassicRoad } from './classic-road-routes.ts';
import { raceTrack } from './race-tracks.ts';
import { minimapGraph } from './course-minimap.ts';
import { createCourseRouteProjection } from './course-route-map.ts';
import { routeLength } from './course-route-frame.ts';
import { groundAt } from './course-items.ts';
import type { CourseRuntime } from './course-race.ts';
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
// Write only when the value changed: the live map updates every frame.
const setIfChanged = (node: SVGElement, name: string, value: string): void => {
  if (node.getAttribute(name) !== value) node.setAttribute(name, value);
};
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
// Streaming uses a rolling local map. Sample a new window once per 100 m sector,
// then project markers through the same world-space bounds on every update.
function streamingRoute(road: ClassicRoad, distance: number) {
  const sector = Math.floor(distance / 100), start = sector * 100 - 80;
  const samples = Array.from({ length: 36 }, (_, i) => road.point(start + i * 20));
  const xs = samples.map(p => p[0]), zs = samples.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), startZ = zs[0]!, endZ = zs.at(-1)!;
  const midX = (minX + maxX) / 2, width = Math.max(100, maxX - minX);
  const project = ([x, z]: readonly [number, number]) => ({ x: 50 + (x - midX) / width * 80, y: 92 - (z - startZ) / (endZ - startZ) * 84 });
  return { sector, start, end: start + 700, line: samples.map(p => pointText(project(p))).join(' '), marker: (d: number) => project(road.point(d)) };
}
export const hasStreamingRouteMap = (trackId: string, mode: string): boolean =>
  (mode === 'endless' || mode === 'elimination') && !!classicRoadRoute(trackId);

export function createRouteMap(trackId: string, { live = false, streaming = false }: { live?: boolean; streaming?: boolean } = {}) {
  const streamRoad = streaming ? classicRoadRoute(trackId) : undefined;
  let window: ReturnType<typeof streamingRoute> | undefined;
  const element = svg('svg', { viewBox: '0 0 100 100', class: `route-overview theme-${trackId}`, role: 'img' }); // aria-label: relabel() below
  const graph = minimapGraph(trackId);
  const graphMap = graph ? createCourseRouteProjection(graph, 64) : null;
  if (graphMap) for (const line of graphMap.lines) {
    element.append(svg('polyline', {
      points: line.points.map(p => pointText({ x: p.x * 100, y: p.y * 100 })).join(' '),
      class: line.ground ? 'route-overview-line' : 'route-overview-line route-flight-line',
      'data-edge': line.edgeId, fill: 'none', 'aria-hidden': 'true',
      ...(line.ground ? {} : { 'stroke-dasharray': '3 2' }),
    }));
  }
  const line = svg('polyline', { points: streamRoad || graphMap ? '' : routePolyline(trackId), class: 'route-overview-line', fill: 'none' });
  if (!graphMap) element.append(line);
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
  if (!streamRoad) for (const [kind, d] of [['start', 0], ['finish', raceTrack(trackId)!.length]] as const) {
    const edgeId = graph?.groundRoute[kind === 'start' ? 0 : graph.groundRoute.length - 1];
    const p = graphMap && graph && edgeId
      ? graphMap.marker(edgeId, kind === 'start' ? 0 : routeLength(graph, edgeId))
      : routeMarker(trackId, d);
    element.append(svg('circle', { cx: p.x * (graphMap ? 100 : 1), cy: p.y * (graphMap ? 100 : 1), r: 2, class: `route-${kind}` }));
  }
  const markers = new Map<string, SVGElement>();
  if (live) for (const [i, id] of racers.entries()) {
    const marker = svg('circle', { r: id === 'YOU' ? 3.5 : 2.8, class: `route-driver route-driver-${id.toLowerCase()}`, 'data-racer': id });
    marker.append(svg('title'));
    element.append(marker);
    markers.set(id, marker);
  }
  // The player is a rotating arrow plus a pulsing halo (CSS only) drawn above every rival dot.
  const pointer = live ? svg('g', { class: 'route-player-pointer', 'aria-hidden': 'true' }) : undefined;
  if (pointer) {
    // The existing SVG arrow remains visible if this transparent artwork fails to load.
    // BASE_URL keeps the public asset working on GitHub Pages subpaths and in Node tests.
    const artworkUrl = `${import.meta.env?.BASE_URL ?? '/'}feature-assets/minimap-player-marker/player-marker@3x.webp`;
    pointer.append(svg('circle', { r: 7, class: 'route-player-halo' }),
      svg('path', { d: 'M0,-9 L5.5,3 L0,.5 L-5.5,3 Z', class: 'route-player-arrow' }),
      svg('image', { href: artworkUrl, x: -11, y: -11, width: 22, height: 22, class: 'route-player-art' }));
    element.append(pointer);
  }
  const updateDrivers = (drivers: readonly RouteDriver[], course?: CourseRuntime): void => {
    if (streamRoad) {
      const distance = drivers.find(driver => driver.id === 'YOU')?.distance ?? 0;
      if (window?.sector !== Math.floor(distance / 100)) {
        window = streamingRoute(streamRoad, distance);
        setIfChanged(line, 'points', window.line);
      }
    }
    const range = window;
    const visible = range ? drivers.filter(driver => driver.distance >= range.start && driver.distance <= range.end) : drivers;
    const active = new Set(visible.map(driver => driver.id));
    for (const [id, marker] of markers) {
      setIfChanged(marker, 'visibility', active.has(id) ? 'visible' : 'hidden');
    }
    if (pointer) setIfChanged(pointer, 'visibility', active.has('YOU') ? 'visible' : 'hidden');
    for (const driver of visible) {
      const marker = markers.get(driver.id);
      if (!marker) continue;
      const travel = graphMap ? course?.cars.get(driver.id)?.travel : undefined;
      const at = graph && graphMap ? travel ? { edgeId: travel.currentEdgeId, localS: travel.localS } : groundAt(graph, driver.distance) : null;
      const next = graph && graphMap ? travel ? { edgeId: travel.currentEdgeId, localS: travel.localS + 10 } : groundAt(graph, driver.distance + 10) : null;
      const point = at && graphMap ? graphMap.marker(at.edgeId, at.localS) : window?.marker(driver.distance) ?? routeMarker(trackId, driver.distance);
      const ahead = next && graphMap ? graphMap.marker(next.edgeId, next.localS) : window?.marker(driver.distance + 10) ?? routeMarker(trackId, driver.distance + 10);
      if (at) { point.x *= 100; point.y *= 100; ahead.x *= 100; ahead.y *= 100; }
      const dx = ahead.x - point.x, dy = ahead.y - point.y;
      const length = Math.hypot(dx, dy) || 1;
      const side = (driver.x ?? 0) * 0.6;
      const x = (point.x - dy / length * side).toFixed(2), y = (point.y + dx / length * side).toFixed(2);
      // Avoid forcing SVG layout/style work on frames whose tiny marker
      // movement is still subpixel at the current map size.
      setIfChanged(marker, 'cx', x);
      setIfChanged(marker, 'cy', y);
      // Arrow tip points along the route; whole degrees keep it from rewriting every frame.
      if (pointer && driver.id === 'YOU') setIfChanged(pointer, 'transform', `translate(${x} ${y}) rotate(${Math.round(Math.atan2(dy, dx) * 180 / Math.PI + 90)})`);
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
