import { reactive } from 'vue';
import type { VisualPreset } from './race-session.ts';
import type { normalizeRaceConfig } from './race-config.ts';

interface RaceSetup { trackId: string; mode: string; config: ReturnType<typeof normalizeRaceConfig> }
interface PresentedRace extends RaceSetup { session: { presentation: { visualPreset: VisualPreset } } }
export const racePresentationView = reactive<{ visualPreset: VisualPreset; setup: RaceSetup | null }>({ visualPreset: 'track', setup: null });
export function updateRaceSetup({ trackId, mode, config, session }: PresentedRace): void {
  racePresentationView.setup = { trackId, mode, config };
  racePresentationView.visualPreset = mode === 'custom' || mode === 'free' ? session.presentation.visualPreset : 'track';
}
export function racePresentationFor(mode: string, trackId: string) {
  return { visualPreset: (mode === 'custom' || mode === 'free') && trackId === racePresentationView.setup?.trackId
    ? racePresentationView.visualPreset : 'track' };
}
