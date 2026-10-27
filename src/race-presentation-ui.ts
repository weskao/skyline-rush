import { reactive } from 'vue';
import type { VisualPreset } from './race-session.ts';
import type { normalizeRaceConfig } from './race-config.ts';

interface RaceSetup { trackId: string; mode: string; config: ReturnType<typeof normalizeRaceConfig> }
export const racePresentationView = reactive<{ visualPreset: VisualPreset; setup: RaceSetup | null }>({ visualPreset: 'track', setup: null });
export function updateRaceSetup({ trackId, mode, config }: RaceSetup): void {
  racePresentationView.setup = { trackId, mode, config };
}
let previousTrack = '';
export function racePresentationFor(mode: string, trackId: string) {
  if (!['custom', 'free'].includes(mode) || trackId !== previousTrack) racePresentationView.visualPreset = 'track';
  previousTrack = trackId;
  return { visualPreset: racePresentationView.visualPreset };
}
