/** Timing is tied to an actually rendered WebGL frame, never to a download completion callback. */
export type TrackLoadKind = 'showcase' | 'race';
export interface TrackLoadMeasurement { kind: TrackLoadKind; trackId: string; start: number; end: number; ms: number }
export function createTrackLoadRecorder(now: () => number, report: (result: TrackLoadMeasurement) => void) {
  let home: { id: string; at: number } | null = null, race: { id: string; at: number } | null = null;
  function complete(kind: TrackLoadKind, id: string): void {
    const pending = kind === 'showcase' ? home : race;
    if (!pending || pending.id !== id) return;
    const end = now();
    if (kind === 'showcase') home = null; else race = null;
    if (end >= pending.at) report({ kind, trackId: id, start: pending.at, end, ms: end - pending.at });
  }
  return {
    select(id: string): void { home = { id, at: now() }; },
    start(id: string): void { race = { id, at: now() }; },
    showcase(id: string): void { complete('showcase', id); },
    race(id: string): void { complete('race', id); },
    cancel(): void { home = race = null; },
  };
}

/** Records per-track first-frame timings in User Timing and on the canvas for real-browser QA. */
export function setupTrackLoadTelemetry(getTrackId: () => string) {
  const canvas = document.querySelector<HTMLCanvasElement>('#world')!;
  const recorder = createTrackLoadRecorder(() => performance.now(), result => {
    canvas.dataset[result.kind === 'showcase' ? 'homeLoadMs' : 'raceLoadMs'] = result.ms.toFixed(1);
    try {
      const name = `skyline-track-${result.kind}`;
      if (performance.getEntriesByName(name).length >= 32) performance.clearMeasures(name);
      performance.measure(name, { start: result.start, end: result.end });
    } catch { /* Timing stays available on the canvas even on limited browsers. */ }
  });
  canvas.addEventListener('skyline:showcase-frame', event => recorder.showcase((event as CustomEvent<string>).detail));
  canvas.addEventListener('skyline:race-grid-frame', event => recorder.race((event as CustomEvent<string>).detail));
  for (const id of ['start-button', 'restart-button']) document.getElementById(id)?.addEventListener('click', () => recorder.start(getTrackId()));
  document.addEventListener('visibilitychange', () => { if (document.hidden) recorder.cancel(); });
  return recorder;
}
