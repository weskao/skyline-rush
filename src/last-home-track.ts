/** Last home-page course for this page load. Never written to localStorage or sessionStorage. */
let last: string | null = null;

export function rememberLastHomeTrack(id: string): void {
  if (id) last = id;
}

export function lastHomeTrack(): string | null {
  return last;
}

const RACED_PARAM = 'raced';

/** Back to home loads a new document. The raced course rides on that one navigation. */
export function backHomeHref(trackId: string): string {
  return `./?${RACED_PARAM}=${encodeURIComponent(trackId)}`;
}

export function bootHomeTrack(search: string, fallback: string, canPlay: (id: string) => boolean): string {
  const raced = new URLSearchParams(search).get(RACED_PARAM);
  return raced && canPlay(raced) ? raced : fallback;
}

/** Drop the one-shot param so the next reload opens the fallback course. */
export function withoutRacedQuery(search: string): string {
  const params = new URLSearchParams(search);
  params.delete(RACED_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

export function restoreHomeTrack(
  remembered: string | null,
  fallback: string,
  canPlay: (id: string) => boolean,
  isUpcoming: (id: string) => boolean,
): { upcoming: string | null; trackId: string } {
  const id = remembered || fallback;
  if (isUpcoming(id) && !canPlay(id)) return { upcoming: id, trackId: canPlay(fallback) ? fallback : 'coast' };
  if (canPlay(id)) return { upcoming: null, trackId: id };
  if (canPlay(fallback)) return { upcoming: null, trackId: fallback };
  return { upcoming: null, trackId: 'coast' };
}
