import { RACE_TRACKS } from './game.js';
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
export function loadLocale(storage) {
  try {
    const value = (storage ?? globalThis.localStorage).getItem(KEY);
    return SUPPORTED_LOCALES.includes(value) ? value : 'en';
  } catch { return 'en'; }
}
export function saveLocale(locale, storage) {
  if (!SUPPORTED_LOCALES.includes(locale)) return;
  try { (storage ?? globalThis.localStorage).setItem(KEY, locale); } catch { /* in-memory preference still works */ }
}
