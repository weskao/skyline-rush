export type LocalizedText = string | { en: string; 'zh-TW'?: string };
export type LocalizedImage = string | { en: string; 'zh-TW'?: string } | null;
export interface ReleaseHighlight {
  id: string;
  kind: string;
  image?: LocalizedImage;
  title: LocalizedText;
  description: LocalizedText;
}
// A short muted clip and the still shown before it plays (and instead of it under reduced motion).
export interface ReleaseClip { src: LocalizedImage; poster: LocalizedImage }
// Landscape screens get the desktop recording, portrait phones the mobile one.
export interface ReleaseVideo { desktop: ReleaseClip; mobile: ReleaseClip }
export interface ReleaseEntry {
  version: string;
  date: string;
  image?: LocalizedImage;
  video?: ReleaseVideo | null;
  highlights: ReleaseHighlight[];
}
interface ReleaseStore { getItem(key: string): string | null; setItem(key: string, value: string): void }

import packageMeta from '../package.json' with { type: 'json' };
import { RELEASE_NOTES as WRITTEN_NOTES, UPCOMING } from './release-notes-data.ts';
const { version } = packageMeta;

export { UPCOMING };
// The next release's notes are written with this in place of a version. Until the release commit bumps package.json
// (while the running version still has its own entry) they show first as upcoming; from then on they carry that version.
export const resolveUpcoming = (notes: readonly ReleaseEntry[], current: string): readonly ReleaseEntry[] =>
  notes.some(release => release.version === current) ? notes
    : notes.map(release => release.version === UPCOMING ? { ...release, version: current } : release);
// The player-written entries live in release-notes-data.ts so adding a version never grows this logic module.
export const RELEASE_NOTES = resolveUpcoming(WRITTEN_NOTES, version);
export const NOTES_SEEN_KEY = 'skyline-rush-whats-new-seen-v1';
export const RECENT_RELEASE_LIMIT = 5;

const versionParts = (value: unknown): number[] => (/^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? '')) ?? [0, -1, -1, -1]).slice(1).map(Number);
// Numeric "major.minor.patch" order; anything unreadable sorts below every real version.
export function compareVersions(a: unknown, b: unknown): number {
  const [x, y] = [versionParts(a), versionParts(b)];
  return (x[0]! - y[0]!) || (x[1]! - y[1]!) || (x[2]! - y[2]!);
}
// Upcoming notes first, then newest first, never a version newer than the running build.
const upcomingFirst = (release: ReleaseEntry): number => Number(release.version === UPCOMING);
export const recentReleases = (current: string = version, notes: readonly ReleaseEntry[] = RELEASE_NOTES, limit: number = RECENT_RELEASE_LIMIT): ReleaseEntry[] =>
  notes.filter(release => release.version === UPCOMING || compareVersions(release.version, current) <= 0)
    .sort((a, b) => upcomingFirst(b) - upcomingFirst(a) || compareVersions(b.version, a.version)).slice(0, limit);
export const releaseForVersion = (v: string = version): ReleaseEntry | null => RELEASE_NOTES.find(release => release.version === v) ?? null;
export const CURRENT_RELEASE = recentReleases()[0] ?? null;

// Shows when the player last saw an older version; with no record only a returning player is told.
// Blocked storage cannot remember the visit, so it stays silent rather than reopening on every load.
export function shouldAnnounce(release: Pick<ReleaseEntry, 'version' | 'highlights'> | null, storage?: ReleaseStore | null, returningPlayer = false): boolean {
  if (!release?.highlights?.length) return false;
  let seen;
  try { seen = storage?.getItem(NOTES_SEEN_KEY); } catch { return false; }
  return seen == null ? returningPlayer : compareVersions(release.version, seen) > 0;
}
export function markAnnouncementSeen(release: Pick<ReleaseEntry, 'version'> | null, storage?: ReleaseStore | null): void {
  if (!release || release.version === UPCOMING) return;
  try { storage?.setItem(NOTES_SEEN_KEY, release.version); } catch { /* remembered in memory by the app */ }
}
// Display order inside a release: NEW first, then improvements, then fixes; unknown kinds last.
const KIND_ORDER: readonly string[] = ['new', 'improvement', 'fix'];
const kindRank = (kind: string): number => { const rank = KIND_ORDER.indexOf(kind); return rank < 0 ? KIND_ORDER.length : rank; };
// A stable sorted copy, so the written order holds within a kind and the shipped data stays untouched.
export const highlightsByKind = <T extends Pick<ReleaseHighlight, 'kind'>>(highlights: readonly T[]): T[] =>
  [...highlights].sort((a, b) => kindRank(a.kind) - kindRank(b.kind));
export const releaseText =(value: LocalizedText | LocalizedImage | null | undefined, locale: string): string =>
  typeof value === 'string' ? value : (value?.[locale as 'en' | 'zh-TW'] ?? value?.en ?? '');

// Only relative paths to files bundled under public/: no remote URLs, no traversal.
const bundledPath = (value: LocalizedImage | undefined, locale: string, extensions: string): string | null => {
  const path = releaseText(value, locale);
  return typeof path === 'string' && new RegExp(`^(?!\\/)(?!.*\\.\\.)[a-zA-Z0-9][a-zA-Z0-9/_.-]*\\.(?:${extensions})$`).test(path) ? path : null;
};
export const releaseImage = (value: LocalizedImage | undefined, locale: string): string | null =>
  bundledPath(value, locale, 'png|jpe?g|webp|avif|gif');

export function releaseHeroVideo(video: ReleaseVideo | null | undefined, locale: string, portrait: boolean):
  { src: string; poster: string; variant: keyof ReleaseVideo } | null {
  const variant = portrait ? 'mobile' : 'desktop';
  const src = bundledPath(video?.[variant]?.src, locale, 'mp4|webm');
  const poster = releaseImage(video?.[variant]?.poster, locale);
  return src && poster ? { src, poster, variant } : null;
}
