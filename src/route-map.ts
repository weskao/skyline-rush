import { RACE_TRACKS } from './game.js';
import { trackOverview } from './track-paths.ts';
import { SKY_SPIRAL } from './sky-track.ts';
import { t, trackName, getLocale } from './i18n.ts';

const raceTracks = RACE_TRACKS as Record<string, { length: number }>;
const NS = 'http://www.w3.org/2000/svg';
interface RoutePoint { x: number; y: number }
interface RouteDriver { id: string; distance: number }
const cache = new Map<string, RoutePoint[]>();
const racers = ['YOU', 'NOVA', 'ORBIT', 'APEX'];
const clamp = (x: number): number => Math.max(0, Math.min(1, Number.isFinite(x) ? x : 0));
const svg = (tag: string, attrs: Record<string, string | number> = {}): SVGElement => {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, String(value));
  return node;
};
export function routeSamples(trackId: string): RoutePoint[] {
  if (!cache.has(trackId)) cache.set(trackId, trackOverview(trackId, 128));
  return cache.get(trackId)!;
}
export function routePolyline(trackId: string): string {
  return routeSamples(trackId).map(p => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`).join(' ');
}
// Mark only the elevated exit arc; all coordinates come from the cached centreline.
// No additional route geometry or per-frame SVG elements are constructed.
export function spiralUpperRoutePolyline(trackId: string): string {
  if (trackId !== 'spiral') return '';
  const start = (SKY_SPIRAL.start + SKY_SPIRAL.end) / 2;
  const samples = routeSamples(trackId).filter(p => p.distance > start && p.distance < SKY_SPIRAL.end);
  const format = (p: RoutePoint) => `${(p.x * 100).toFixed(2)},${(p.y * 100).toFixed(2)}`;
  const map = (distance: number) => format({ x: routeMarker(trackId, distance).x / 100, y: routeMarker(trackId, distance).y / 100 });
  return [map(start), ...samples.map(format), map(SKY_SPIRAL.end)].join(' ');
}
export function routeMarker(trackId: string, distance: number): RoutePoint {
  const samples = routeSamples(trackId);
  const total = raceTracks[trackId].length;
  const value = clamp(distance / total) * (samples.length - 1);
  const index = Math.min(Math.floor(value), samples.length - 2);
  const frac = value - index, a = samples[index], b = samples[index + 1];
  return { x: (a.x + (b.x - a.x) * frac) * 100, y: (a.y + (b.y - a.y) * frac) * 100 };
}
const routeLabel = (trackId: string, locale: string = getLocale()): string => t('route.aria', { name: trackName(trackId, locale) }, locale);
export function createRouteMap(trackId: string, { live = false }: { live?: boolean } = {}) {
  const element = svg('svg', { viewBox: '0 0 100 100', class: `route-overview theme-${trackId}`, role: 'img' }); // aria-label: relabel() below
  element.append(svg('polyline', { points: routePolyline(trackId), class: 'route-overview-line', fill: 'none' }));
  const upper = spiralUpperRoutePolyline(trackId);
  if (upper) element.append(svg('polyline', { points: upper, class: 'route-spiral-upper', fill: 'none', 'aria-hidden': 'true' }));
  for (const [kind, d] of [['start', 0], ['finish', raceTracks[trackId].length]] as const) {
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
    for (const driver of drivers) {
      const marker = markers.get(driver.id);
      if (!marker) continue;
      const point = routeMarker(trackId, driver.distance);
      const x = point.x.toFixed(2), y = point.y.toFixed(2);
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
