import { CIRCUIT_COPY } from './locales/circuit.ts';
import { RACE_TRACKS } from './game.js';
import { UPCOMING_TRACKS, isUpcomingTrack, upcomingTrackName } from './upcoming-tracks.ts';
import { ENDLESS_COPY } from './locales/endless.ts';
import { UI } from './locales/ui.ts';
import { UI_OVERHAUL_COPY } from './locales/ui-overhaul.ts';
import { DRIVING_CONTROLS_COPY } from './locales/driving-controls-copy.ts';
import { GAME } from './locales/game.ts';
import { EVENT_LAB } from './locales/event-lab.ts';
import { CHALLENGE_MEDAL_COPY } from './locales/challenge-medals.ts';
import { RACE_CLOCK_COPY } from './locales/race-clock.ts';
import { SUPPORTED_LOCALES, isLocale, type Locale } from './locale-preference.ts';
export { SUPPORTED_LOCALES, saveLocale, loadLocale, detectLocale, savedLocale, resolveInitialLocale, type Locale } from './locale-preference.ts';
const raceTracks = RACE_TRACKS as Record<string, { name?: string }>;
// Every Coming Soon card, including ones not yet in the race registry. Copying a subset
// left dune-tempest and skyfall-archipelago labeled with their English slugs.
const upcomingNames = (locale: Locale): Record<string, string> => Object.fromEntries(
  Object.entries(UPCOMING_TRACKS).map(([id, track]) => [id, track.names[locale]]),
);
export const TRACK_NAMES: Readonly<Record<Locale, Record<string, string>>> = Object.freeze({
  en: { coast: 'Coast', neon: 'Neon Downtown', canyon: 'Canyon Skyway', aurora: 'Aurora Pass', spiral: 'Sky Spiral',
    taipei: 'Taipei Heritage', tokyo: 'Tokyo Afterdark', alpine: 'Alpine Rail Pass', coastal: 'Coastal Horizon', cosmic: 'Cosmic Orbit', 'harbor-circuit': 'Harbor Circuit', ...upcomingNames('en') },
  'zh-TW': { coast: '海岸公路', neon: '霓虹都會', canyon: '峽谷天橋', aurora: '極光山道', spiral: '天際螺旋',
    taipei: '台北古都', tokyo: '東京夜行', alpine: '山岳鐵道', coastal: '海岸天際', cosmic: '星際軌道', 'harbor-circuit': '港灣環道', ...upcomingNames('zh-TW') },
});
export const trackName = (trackId: string, locale: string = 'en'): string =>
  (TRACK_NAMES[isLocale(locale) ? locale : 'en']?.[trackId])
  ?? (isUpcomingTrack(trackId) ? upcomingTrackName(trackId, locale) : undefined)
  ?? TRACK_NAMES.en[trackId] ?? raceTracks[trackId]?.name ?? String(trackId);
export const CATALOGS = Object.freeze(Object.fromEntries(
  SUPPORTED_LOCALES.map(l => [l, Object.freeze({ ...UI[l], ...UI_OVERHAUL_COPY[l], ...DRIVING_CONTROLS_COPY[l], ...GAME[l], ...EVENT_LAB[l], ...ENDLESS_COPY[l], ...CIRCUIT_COPY[l], ...CHALLENGE_MEDAL_COPY[l], ...RACE_CLOCK_COPY[l] })]),
)) as unknown as Readonly<Record<Locale, Record<string, string>>>;

let current: Locale = 'en';
const listeners = new Set<(locale: Locale) => void>();
export const getLocale = (): Locale => current;
export function setLocale(locale: string): Locale {
  if (!isLocale(locale) || locale === current) return current;
  current = locale;
  for (const cb of [...listeners]) cb(current);
  return current;
}
export function onLocaleChange(cb: (locale: Locale) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const interpolate = (text: string, params?: Record<string, unknown>): string =>
  params ? text.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(params, k) ? String(params[k]) : m)) : text;

export function t(key: string, params?: Record<string, unknown>, locale: string = current): string {
  const text = CATALOGS[locale as Locale]?.[key] ?? CATALOGS.en[key];
  return text === undefined ? key : interpolate(text, params);
}

// Building a formatter costs ~70x using one. Keyed by locale and options, so a locale switch builds new ones;
// the code uses a handful of option sets, which keeps the map small.
const formatters = new Map<string, unknown>();
function formatter<T>(key: string, build: () => T): T {
  if (!formatters.has(key)) formatters.set(key, build());
  return formatters.get(key) as T;
}
export const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions, locale: string = current): string =>
  formatter(`date ${locale} ${JSON.stringify(options)}`, () => new Intl.DateTimeFormat(locale, options)).format(date);
export const formatNumber = (n: number, options?: Intl.NumberFormatOptions, locale: string = current): string =>
  formatter(`number ${locale} ${JSON.stringify(options)}`, () => new Intl.NumberFormat(locale, options)).format(n);

export function applyDocumentLocale(doc: Document | undefined = globalThis.document, locale: string = current): void {
  if (!doc) return;
  doc.documentElement.lang = locale;
  doc.title = t('doc.title', undefined, locale);
  doc.querySelector('meta[name="description"]')?.setAttribute('content', t('doc.description', undefined, locale));
}

const ATTRS = [['data-i18n-title', 'title'], ['data-i18n-aria-label', 'aria-label']] as const;
export function applyI18n(root: Document | Element | undefined = globalThis.document, locale: string = current): void {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.getAttribute('data-i18n')!, undefined, locale);
  for (const [data, attr] of ATTRS)
    for (const el of root.querySelectorAll(`[${data}]`)) el.setAttribute(attr, t(el.getAttribute(data)!, undefined, locale));
}
