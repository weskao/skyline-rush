import type { createSound } from './audio.js';
import { readAudio } from './audio-settings.ts';
import { onUserActivation } from './user-activation.ts';

export function startOpeningAudio(sound: ReturnType<typeof createSound>, button: HTMLButtonElement) {
  let prefs = readAudio();
  try { prefs = readAudio(localStorage); } catch { /* Keep audio usable without storage. */ }
  if (!prefs.audio.music) return () => {};
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const syncButton = () => { button.hidden = sound.running() || document.hidden; };
  const unlock = () => {
    if (!sound.running() && !document.hidden) sound.setMusic(true, prefs.volume.music);
    syncButton();
  };
  sound.setOpening(true);
  onUserActivation(unlock, listeners.signal);
  document.addEventListener('visibilitychange', () => {
    sound.setHidden(document.hidden);
    syncButton();
  }, options);
  window.addEventListener('pageshow', () => sound.setHidden(document.hidden), options);
  window.addEventListener('pagehide', () => sound.setHidden(true), options);
  const timer = window.setInterval(() => { sound.refreshOpeningMusic(); syncButton(); }, 750);
  unlock();

  return (enterLobby: boolean) => {
    listeners.abort();
    window.clearInterval(timer);
    button.hidden = true;
    if (!enterLobby) sound.setMusic(false);
    sound.setOpening(false);
  };
}
