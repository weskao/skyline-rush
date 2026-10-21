import { RACE_TRACKS } from './game.js';
import { UI } from './locales/ui.js';
import { GAME } from './locales/game.js';
export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh-TW']);
export const TRACK_NAMES = Object.freeze({
  en: { coast: 'Coast', neon: 'Neon Downtown', canyon: 'Canyon Skyway', aurora: 'Aurora Pass', spiral: 'Sky Spiral',
    taipei: 'Taipei Heritage', tokyo: 'Tokyo Afterdark', alpine: 'Alpine Rail Pass', coastal: 'Coastal Horizon', cosmic: 'Cosmic Orbit' },
  'zh-TW': { coast: '海岸公路', neon: '霓虹都會', canyon: '峽谷天橋', aurora: '極光山道', spiral: '天際螺旋',
    taipei: '台北古都', tokyo: '東京夜行', alpine: '山岳鐵道', coastal: '海岸天際', cosmic: '星際軌道' },
});
const KEY = 'skyline-rush-locale';
export const trackName = (trackId, locale = 'en') =>
  (TRACK_NAMES[SUPPORTED_LOCALES.includes(locale) ? locale : 'en']?.[trackId])
  ?? TRACK_NAMES.en[trackId] ?? RACE_TRACKS[trackId]?.name ?? String(trackId);
export function saveLocale(locale, storage) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  try { (storage ?? globalThis.localStorage).setItem(KEY, locale); } catch { /* in-memory preference still works */ }
}

export const CATALOGS = Object.freeze(Object.fromEntries(SUPPORTED_LOCALES.map(l => [l, Object.freeze({ ...UI[l], ...GAME[l] })])));

// Any Chinese tag (zh, zh-CN, zh-Hans, zh-HK, zh-Hant...) maps to the one Chinese catalog we ship.
// First supported language in the system's preference order wins: any zh* -> zh-TW, en* -> en, unknown tags are skipped, none -> en.
export function detectLocale(languages) {
  for (const l of Array.isArray(languages) ? languages : Array.from(languages ?? [])) {
    const tag = String(l);
    if (/^zh(-|_|$)/i.test(tag)) return 'zh-TW';
    if (/^en(-|_|$)/i.test(tag)) return 'en';
  }
  return 'en';
}

export function savedLocale(storage) {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(KEY);
    return SUPPORTED_LOCALES.includes(value) ? value : null;
  } catch { return null; }
}
export const loadLocale = (storage) => savedLocale(storage) ?? 'en';
// Saved choice > system language > 'en'. Never writes: only an explicit click persists (saveLocale).
// An empty or missing navigator.languages (some embedded/older browsers) falls back to navigator.language.
const systemLanguages = (nav = globalThis.navigator) => (nav?.languages?.length ? nav.languages : [nav?.language].filter(Boolean));
export const resolveInitialLocale = (storage, languages = systemLanguages()) =>
  savedLocale(storage) ?? detectLocale(languages);

let current = 'en';
const listeners = new Set();
export const getLocale = () => current;
export function setLocale(locale) {
  if (!SUPPORTED_LOCALES.includes(locale) || locale === current) return current;
  current = locale;
  for (const cb of [...listeners]) cb(current);
  return current;
}
export function onLocaleChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const interpolate = (text, params) =>
  params ? text.replace(/\{(\w+)\}/g, (m, k) => (Object.hasOwn(params, k) ? String(params[k]) : m)) : text;

export function t(key, params, locale = current) {
  const text = CATALOGS[locale]?.[key] ?? CATALOGS.en[key];
  return text === undefined ? key : interpolate(text, params);
}

export const formatDate = (date, options, locale = current) => new Intl.DateTimeFormat(locale, options).format(date);
export const formatNumber = (n, options, locale = current) => new Intl.NumberFormat(locale, options).format(n);

export function applyDocumentLocale(doc = globalThis.document, locale = current) {
  if (!doc) return;
  doc.documentElement.lang = locale;
  doc.title = t('doc.title', undefined, locale);
  doc.querySelector('meta[name="description"]')?.setAttribute('content', t('doc.description', undefined, locale));
}

const ATTRS = [['data-i18n-title', 'title'], ['data-i18n-aria-label', 'aria-label']];
export function applyI18n(root = globalThis.document, locale = current) {
  if (!root) return;
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.getAttribute('data-i18n'), undefined, locale);
  for (const [data, attr] of ATTRS)
    for (const el of root.querySelectorAll(`[${data}]`)) el.setAttribute(attr, t(el.getAttribute(data), undefined, locale));
}
