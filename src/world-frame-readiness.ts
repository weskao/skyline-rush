interface DrawableRace { phase: string; trackId: string }

/** Tracks presented frames. Trial renders may use the same canvas without publishing them. */
export function createWorldFrameReadiness(canvas: HTMLCanvasElement) {
  let loading = true;
  let homeRace: DrawableRace | null = null, homeTrack: string | null = null;
  let gridRace: DrawableRace | null = null;
  canvas.setAttribute('data-frame-loading', '');
  function wait(snapshot = false): false {
    if (!snapshot) {
      if (!loading) canvas.setAttribute('data-frame-loading', '');
      loading = true;
    }
    return false;
  }
  return {
    wait,
    invalidate(): void {
      homeRace = null;
      wait();
    },
    presented(race: DrawableRace, trackId: string | null): void {
      if (loading) canvas.removeAttribute('data-frame-loading');
      loading = false;
      if (race.phase === 'ready') {
        if (trackId === null || (homeRace === race && homeTrack === trackId)) return;
        homeRace = race;
        homeTrack = trackId;
        canvas.dispatchEvent(new CustomEvent('skyline:showcase-frame', { detail: trackId }));
      } else if (gridRace !== race) {
        gridRace = race;
        canvas.dispatchEvent(new CustomEvent('skyline:race-grid-frame', { detail: race.trackId }));
      }
    },
    racePending: (race: DrawableRace): boolean => gridRace !== race || loading,
  };
}
