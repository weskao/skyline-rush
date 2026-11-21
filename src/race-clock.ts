/** Presentation only. The simulation is the source of elapsed seconds. */
export type RaceClockState = 'ready' | 'running' | 'paused' | 'finished';
export function raceClockState(phase: string): RaceClockState {
  if (phase === 'racing') return 'running';
  if (phase === 'paused') return 'paused';
  if (phase === 'finished') return 'finished';
  return 'ready';
}

/** Racing HUD precision MM:SS.mmm, independent of results/history formatting. */
export function raceClockTime(seconds: number): string {
  const ms = Number.isFinite(seconds) ? Math.max(0, Math.round(seconds * 1000)) : 0;
  const minutes = Math.floor(ms / 60000);
  return `${String(minutes).padStart(2, '0')}:${String(Math.floor(ms % 60000 / 1000)).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}
