export const SUPPORTED_LOCALES = Object.freeze(['en', 'zh-TW'] as const);
export type Locale = typeof SUPPORTED_LOCALES[number];
interface LocaleStorage { getItem(key: string): string | null; setItem(key: string, value: string): void }
export const isLocale = (value: unknown): value is Locale =>
  typeof value === 'string' && SUPPORTED_LOCALES.includes(value as Locale);
const KEY = 'skyline-rush-locale';
export function saveLocale(locale: string, storage?: LocaleStorage): void {
  if (!isLocale(locale)) return;
  try { (storage ?? globalThis.localStorage).setItem(KEY, locale); } catch { /* in-memory preference still works */ }
}

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
