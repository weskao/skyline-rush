import { updateAudioView, type AudioChannelView } from './audio-view-state.ts';
import { t } from './i18n.ts';
import { AUDIO_KEYS, setVolume } from './audio-settings.ts';
import { onUserActivation } from './user-activation.ts';

type Channel = 'music' | 'sfx';
type AudioSettings = Record<Channel, boolean>;
type VolumeSettings = Record<Channel, number>;

interface SoundEngine {
  setMusic(on: boolean, level: number): boolean;
  setEnabled(on: boolean, level: number): boolean;
  cue(name: string): void;
  running(): boolean;
  setHidden(hidden: boolean): void;
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
  /** `save` is the player's own toggle or slider; an automatic unlock shows the engine's state but never saves it. */
  function setAudio(kind: Channel, on: boolean, level: number = volume[kind], save = true): void {
    volume[kind] = level;
    audio[kind] = kind === 'music' ? sound.setMusic(on, level) : sound.setEnabled(on, level);
    const key = AUDIO_KEYS[kind];
    if (save) try {
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
      // A failed engine start must not turn the saved choice off for every later visit.
      setAudio('music', audio.music, volume.music, false);
      setAudio('sfx', audio.sfx, volume.sfx, false);
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
  // Any tap, drag, click or key starts audio, so blocked autoplay never waits on a prompt.
  onUserActivation(unlockAudio);
  // A page can come back (bfcache, app switch) without a visibilitychange; resync the engine from the live flag.
  for (const type of ['pageshow', 'focus']) window.addEventListener(type, () => sound.setHidden(document.hidden));
  showAudio();
  unlockAudio(); // plays at once where the browser allows autoplay
  return { showAudio, toggleSound };
}
