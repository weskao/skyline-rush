import { CIRCUIT_COPY } from './locales/circuit.ts';
import { RACE_TRACKS } from './game.js';
import { UI } from './locales/ui.ts';
import { GAME } from './locales/game.ts';
export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh-TW'] as const);
export type Locale = typeof SUPPORTED_LOCALES[number];
interface LocaleStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
const raceTracks = RACE_TRACKS as Record<string, { name?: string }>;
export const TRACK_NAMES: Readonly<Record<Locale, Record<string, string>>> = Object.freeze({
  en: { coast: 'Coast', neon: 'Neon Downtown', canyon: 'Canyon Skyway', aurora: 'Aurora Pass', spiral: 'Sky Spiral',
    taipei: 'Taipei Heritage', tokyo: 'Tokyo Afterdark', alpine: 'Alpine Rail Pass', coastal: 'Coastal Horizon', cosmic: 'Cosmic Orbit', 'harbor-circuit': 'Harbor Circuit' },
  'zh-TW': { coast: '海岸公路', neon: '霓虹都會', canyon: '峽谷天橋', aurora: '極光山道', spiral: '天際螺旋',
    taipei: '台北古都', tokyo: '東京夜行', alpine: '山岳鐵道', coastal: '海岸天際', cosmic: '星際軌道', 'harbor-circuit': '港灣環道' },
});
const KEY = 'skyline-rush-locale';
export const trackName = (trackId: string, locale: string = 'en'): string =>
  (TRACK_NAMES[isLocale(locale) ? locale : 'en']?.[trackId])
  ?? TRACK_NAMES.en[trackId] ?? raceTracks[trackId]?.name ?? String(trackId);
export function saveLocale(locale: string, storage?: LocaleStorage): void {
  if (!isLocale(locale)) return;
  try { (storage ?? globalThis.localStorage).setItem(KEY, locale); } catch { /* in-memory preference still works */ }
}

export const CATALOGS = Object.freeze(Object.fromEntries(
  SUPPORTED_LOCALES.map(l => [l, Object.freeze({ ...UI[l], ...GAME[l], ...CIRCUIT_COPY[l] })]),
)) as unknown as Readonly<Record<Locale, Record<string, string>>>;

// Any Chinese tag (zh, zh-CN, zh-Hans, zh-HK, zh-Hant...) maps to the one Chinese catalog we ship.
// First supported language in the system's preference order wins: any zh* -> zh-TW, en* -> en, unknown tags are skipped, none -> en.
export function detectLocale(languages?: Iterable<unknown>): Locale {
  for (const l of Array.isArray(languages) ? languages : Array.from(languages ?? [])) {
    const tag = String(l);
    if (/^zh(-|_|$)/i.test(tag)) return 'zh-TW';
    if (/^en(-|_|$)/i.test(tag)) return 'en';
  }
  return 'en';
}

export function savedLocale(storage?: LocaleStorage): Locale | null {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(KEY);
    return isLocale(value) ? value : null;
  } catch { return null; }
}
export const loadLocale = (storage?: LocaleStorage): Locale => savedLocale(storage) ?? 'en';
// Saved choice > system language > 'en'. Never writes: only an explicit click persists (saveLocale).
// An empty or missing navigator.languages (some embedded/older browsers) falls back to navigator.language.
const systemLanguages = (nav: Navigator | undefined = globalThis.navigator): readonly string[] =>
  (nav?.languages?.length ? nav.languages : [nav?.language].filter((x): x is string => Boolean(x)));
export const resolveInitialLocale = (storage?: LocaleStorage, languages: Iterable<unknown> = systemLanguages()): Locale =>
  savedLocale(storage) ?? detectLocale(languages);

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

export const formatDate = (date: Date | number, options?: Intl.DateTimeFormatOptions, locale: string = current): string =>
  new Intl.DateTimeFormat(locale, options).format(date);
export const formatNumber = (n: number, options?: Intl.NumberFormatOptions, locale: string = current): string =>
  new Intl.NumberFormat(locale, options).format(n);

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
