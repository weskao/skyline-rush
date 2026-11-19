const LAST_TRACK_KEY = 'skyline-rush-last-track';
let last: string | null = null;

export function rememberLastHomeTrack(id: string): void {
  if (!id) return;
  last = id;
  try { localStorage.setItem(LAST_TRACK_KEY, id); } catch { /* The choice lasts for this visit without storage. */ }
}

export function lastHomeTrack(): string | null {
  if (last) return last;
  try { return localStorage.getItem(LAST_TRACK_KEY); } catch { return null; }
}

const RACED_PARAM = 'raced';

/** Back to home loads a new document. The raced course rides on that one navigation. */
export function backHomeHref(trackId: string): string {
  return `./?${RACED_PARAM}=${encodeURIComponent(trackId)}`;
}

export function bootHomeTrack(search: string, remembered: string | null, canPlay: (id: string) => boolean): string | null {
  const raced = new URLSearchParams(search).get(RACED_PARAM);
  return raced && canPlay(raced) ? raced : remembered;
}

/** Drop the one-shot param so the next reload opens the saved Home course. */
export function withoutRacedQuery(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(RACED_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

export function restoreHomeTrack(
  remembered: string | null,
  fallback: string,
  canSelect: (id: string) => boolean,
  isUpcoming: (id: string) => boolean,
): { upcoming: string | null; trackId: string } {
  const id = remembered || fallback;
  if (isUpcoming(id) && !canSelect(id)) return { upcoming: id, trackId: canSelect(fallback) ? fallback : 'coast' };
  if (canSelect(id)) return { upcoming: null, trackId: id };
  if (canSelect(fallback)) return { upcoming: null, trackId: fallback };
  return { upcoming: null, trackId: 'coast' };
}
