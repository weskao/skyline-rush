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

/** A draw owns counter reset, optional live instrumentation and presentation readiness. */
export function createWorldFrameDraw(
  renderer: Pick<import('three').WebGLRenderer, 'info' | 'getContext'>,
  composer: Pick<import('three/addons/postprocessing/EffectComposer.js').EffectComposer, 'render'>,
  frames: Pick<ReturnType<typeof createWorldFrameReadiness>, 'wait' | 'presented'>,
  deepPerf: { draw(dt: number): void } | null,
) {
  return (race: DrawableRace, dt: number, snapshot = false, showcaseId: string | null = race.trackId): boolean => {
    renderer.info.reset(); // Exclude shader warmup draws and previous frames from the counters.
    if (deepPerf && !snapshot) deepPerf.draw(dt); else composer.render(dt);
    if (renderer.getContext().isContextLost()) return frames.wait(snapshot);
    if (!snapshot) frames.presented(race, showcaseId);
    return true;
  };
}
