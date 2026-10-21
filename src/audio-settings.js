// Audio preferences: on/off plus a volume per channel. Cookie writes live in main.js; volumes are saved as `<name>-volume=<percent>`.
export const AUDIO_COOKIES = { music: 'skyline-rush-music', sfx: 'skyline-rush-sound' };

export function readAudio(cookie = '') {
  const saved = Object.fromEntries(cookie.split('; ').map(pair => pair.split('=')));
  const audio = {}, volume = {};
  for (const [kind, name] of Object.entries(AUDIO_COOKIES)) {
    audio[kind] = saved[name] !== 'off';
    const percent = Number.parseInt(saved[`${name}-volume`], 10);
    // A stored level is never silent: silence is the off switch, so unmuting always has something to restore.
    volume[kind] = Number.isFinite(percent) ? Math.min(100, Math.max(5, percent)) / 100 : 1;
  }
  return { audio, volume };
}

// Dragging to zero mutes but keeps the last audible level, so unmuting restores it.
export const setVolume = (volume, value) => value > 0 ? { on: true, volume: value } : { on: false, volume };
