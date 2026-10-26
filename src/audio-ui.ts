import { icon } from './icons.ts';
import { t } from './i18n.js';
import { AUDIO_KEYS } from './audio-settings.ts';

type Channel = 'music' | 'sfx';
type AudioSettings = Record<Channel, boolean>;
type VolumeSettings = Record<Channel, number>;

interface SoundEngine {
  setMusic(on: boolean, level: number): boolean;
  setEnabled(on: boolean, level: number): boolean;
  cue(name: string): void;
  running(): boolean;
}
interface AudioDependencies {
  audio: AudioSettings;
  volume: VolumeSettings;
  sound: SoundEngine;
  audioSwitches: HTMLButtonElement[];
  ui: Record<string, HTMLElement>;
}

export function audioChannelPresentation(enabled: boolean, volume: number) {
  const percent = Math.round(volume * 100) + '%';
  return { level: enabled ? Math.round(volume * 100) : 0, percent, enabled };
}

export function setupAudioUI({ audio, volume, sound, audioSwitches, ui }: AudioDependencies) {
  const $ = (selector: string): HTMLElement => document.querySelector<HTMLElement>(selector)!;
  function showChannel(button: HTMLButtonElement, on: boolean, level: number): void {
    const slider = button.nextElementSibling as HTMLInputElement;
    const { level: displayedLevel, percent } = audioChannelPresentation(on, level);
    button.setAttribute('aria-checked', String(on));
    if (button.firstElementChild) button.firstElementChild.outerHTML = icon(on ? 'sound' : 'mute');
    if (button.lastChild) button.lastChild.textContent = on ? percent : t('audio.off');
    slider.value = String(displayedLevel);
    slider.setAttribute('aria-valuetext', on ? percent : t('audio.muted'));
    slider.style.setProperty('--fill', slider.value + '%');
  }
  function showAudio(): void {
    for (const button of audioSwitches) {
      const kind = button.dataset.audio;
      if (kind === 'music' || kind === 'sfx') showChannel(button, audio[kind], volume[kind]);
    }
    const on = audio.music || audio.sfx;
    ui['settings-button'].innerHTML = icon(on ? 'sound' : 'mute');
    const firstChild = $('#mute-all').firstChild;
    if (firstChild) firstChild.textContent = t(on ? 'audio.muteAll' : 'audio.unmuteAll');
  }
  function setAudio(kind: Channel, on: boolean, level: number = volume[kind]): void {
    volume[kind] = level;
    audio[kind] = kind === 'music' ? sound.setMusic(on, level) : sound.setEnabled(on, level);
    const key = AUDIO_KEYS[kind];
    try {
      localStorage.setItem(key, audio[kind] ? 'on' : 'off');
      localStorage.setItem(key + '-volume', String(Math.round(level * 100)));
    } catch { /* In-memory audio remains operable when storage is blocked. */ }
    showAudio();
  }
  function toggleSound(): void {
    const on = !(audio.music || audio.sfx);
    setAudio('music', on);
    setAudio('sfx', on);
    sound.cue('ui');
  }
  function unlockAudio(): void {
    if (!sound.running() && (audio.music || audio.sfx)) {
      setAudio('music', audio.music);
      setAudio('sfx', audio.sfx);
    }
  }
  showAudio();
  return { showAudio, setAudio, toggleSound, unlockAudio };
}
