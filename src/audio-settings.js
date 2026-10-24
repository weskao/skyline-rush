// Audio preferences: on/off plus a volume per channel, kept in localStorage as `<key>` = on|off and `<key>-volume` = percent. Writes live in main.js.
export const AUDIO_KEYS = { music: 'skyline-rush-music', sfx: 'skyline-rush-sound' };

// `storage` is localStorage-like; a channel with nothing saved is on at full volume.
export function readAudio(storage = { getItem: () => null }) {
  const audio = {}, volume = {};
  for (const [kind, key] of Object.entries(AUDIO_KEYS)) {
    audio[kind] = storage.getItem(key) !== 'off';
    const percent = Number.parseInt(storage.getItem(`${key}-volume`), 10);
    // A stored level is never silent: silence is the off switch, so unmuting always has something to restore.
    volume[kind] = Number.isFinite(percent) ? Math.min(100, Math.max(5, percent)) / 100 : 1;
  }
  return { audio, volume };
}

// Dragging to zero mutes but keeps the last audible level, so unmuting restores it.
export const setVolume = (volume, value) => value > 0 ? { on: true, volume: value } : { on: false, volume };
