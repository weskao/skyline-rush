import { reactive } from 'vue';

export interface AudioChannelView {
  enabled: boolean;
  level: number;
  percent: string;
  displayText: string;
  valueText: string;
}
type Channel = 'music' | 'sfx';
interface AudioView extends Record<Channel, AudioChannelView> {
  settingsIcon: 'sound' | 'mute';
  muteAllText: string;
}
const initial: AudioChannelView = { enabled: true, level: 100, percent: '100%', displayText: '100%', valueText: '100%' };

// Vue is the sole owner of switch/slider/button presentation. Audio playback and storage remain in audio-ui.ts.
export const audioView = reactive<AudioView>({
  music: { ...initial },
  sfx: { ...initial },
  settingsIcon: 'sound',
  muteAllText: 'Mute all',
});

export function updateAudioView(changes: Partial<AudioView>): void {
  Object.assign(audioView, changes);
}
