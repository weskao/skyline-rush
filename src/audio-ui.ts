import { updateAudioView, type AudioChannelView } from './audio-view-state.ts';
import { t } from './i18n.ts';
import { AUDIO_KEYS, setVolume } from './audio-settings.ts';

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
}

export function audioChannelPresentation(enabled: boolean, volume: number) {
  const percent = Math.round(volume * 100) + '%';
  return { level: enabled ? Math.round(volume * 100) : 0, percent, enabled };
}

function channelView(on: boolean, volume: number): AudioChannelView {
  const { level, percent, enabled } = audioChannelPresentation(on, volume);
  return { enabled, level, percent, displayText: enabled ? percent : t('audio.off'), valueText: enabled ? percent : t('audio.muted') };
}

export function setupAudioUI({ audio, volume, sound }: AudioDependencies) {
  function showAudio(): void {
    const on = audio.music || audio.sfx;
    updateAudioView({
      music: channelView(audio.music, volume.music),
      sfx: channelView(audio.sfx, volume.sfx),
      settingsIcon: on ? 'sound' : 'mute',
      muteAllText: t(on ? 'audio.muteAll' : 'audio.unmuteAll'),
    });
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
  /** Show a level being dragged without saving it; the release saves it through setAudio. */
  function previewChannel(kind: Channel, on: boolean, level: number): void {
    updateAudioView({ [kind]: channelView(on, level) });
  }
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-audio]')) {
    const kind = button.dataset.audio as Channel, slider = button.nextElementSibling as HTMLInputElement;
    button.addEventListener('click', () => {
      setAudio(kind, !audio[kind]);
      sound.cue('ui');
    });
    // Heard live while dragging but saved on release, so a drag through zero still unmutes to the level before it.
    slider.addEventListener('input', () => {
      const level = Number(slider.value) / 100;
      if (kind === 'music') sound.setMusic(level > 0, level); else sound.setEnabled(level > 0, level);
      previewChannel(kind, level > 0, level || volume[kind]);
    });
    slider.addEventListener('change', () => {
      const next = setVolume(volume[kind], Number(slider.value) / 100);
      setAudio(kind, next.on, next.volume);
      if (kind === 'sfx') sound.cue('ui');
    });
  }
  document.querySelector('#mute-all')!.addEventListener('click', toggleSound);
  // Every event that grants user activation (a tap, drag, click or key) starts audio, so blocked autoplay never waits on a prompt.
  for (const type of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlockAudio, { capture: true });
  showAudio();
  unlockAudio(); // plays at once where the browser allows autoplay
  return { showAudio, toggleSound };
}
