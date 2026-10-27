import { updateAudioView, type AudioChannelView } from './audio-view-state.ts';
import { t } from './i18n.ts';
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

export function setupAudioUI({ audio, volume, sound }: AudioDependencies) {
  function showAudio(): void {
    const channels = {} as Record<Channel, AudioChannelView>;
    for (const kind of ['music', 'sfx'] as const) {
      const { level, percent, enabled } = audioChannelPresentation(audio[kind], volume[kind]);
      channels[kind] = {
        enabled, level, percent,
        displayText: enabled ? percent : t('audio.off'),
        valueText: enabled ? percent : t('audio.muted'),
      };
    }
    const on = audio.music || audio.sfx;
    updateAudioView({
      music: channels.music,
      sfx: channels.sfx,
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
  showAudio();
  return { showAudio, setAudio, toggleSound, unlockAudio };
}
