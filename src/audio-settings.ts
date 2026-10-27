// Saved music/SFX preferences; audio mixing itself remains outside Vue.
export const AUDIO_KEYS = { music: 'skyline-rush-music', sfx: 'skyline-rush-sound' } as const;
export type AudioChannel = keyof typeof AUDIO_KEYS;
export interface AudioStorage {
  getItem(key: string): string | null;
}
export interface AudioPreferences {
  audio: Record<AudioChannel, boolean>;
  volume: Record<AudioChannel, number>;
}

// A new browser visit enables both channels at full volume. Malformed storage is never trusted.
export function readAudio(storage: AudioStorage = { getItem: () => null }): AudioPreferences {
  const audio = {} as AudioPreferences['audio'];
  const volume = {} as AudioPreferences['volume'];
  for (const [kind, key] of Object.entries(AUDIO_KEYS) as [AudioChannel, string][]) {
    audio[kind] = storage.getItem(key) !== 'off';
    const percent = Number.parseInt(storage.getItem(key + '-volume') ?? '', 10);
    // The off switch owns silence; zero stored volume restores a nonzero audible level.
    volume[kind] = Number.isFinite(percent) ? Math.min(100, Math.max(5, percent)) / 100 : 1;
  }
  return { audio, volume };
}

export function setVolume(volume: number, value: number): { on: boolean; volume: number } {
  return value > 0 ? { on: true, volume: value } : { on: false, volume };
}
