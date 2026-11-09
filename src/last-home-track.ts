/** Last home-page course for this page load. Never written to localStorage or sessionStorage. */
let last: string | null = null;

export function rememberLastHomeTrack(id: string): void {
  if (id) last = id;
}

export function lastHomeTrack(): string | null {
  return last;
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
