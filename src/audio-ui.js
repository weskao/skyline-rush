import { icon } from './icons.js';
import { t } from './i18n.js';
import { AUDIO_KEYS } from './audio-settings.js';

export function audioChannelPresentation(enabled, volume) {
  const percent = `${Math.round(volume * 100)}%`;
  return { level: enabled ? Math.round(volume * 100) : 0, percent, enabled };
}

export function setupAudioUI({ audio, volume, sound, audioSwitches, ui }) {
  const $ = selector => document.querySelector(selector);
  // A muted channel shows its slider at zero; its saved level comes back on unmute.
  function showChannel(button, on, level) {
    const slider = button.nextElementSibling, { level: displayedLevel, percent } = audioChannelPresentation(on, level);
    button.setAttribute('aria-checked', String(on));
    button.firstElementChild.outerHTML = icon(on ? 'sound' : 'mute');
    button.lastChild.textContent = on ? percent : t('audio.off');
    slider.value = displayedLevel;
    slider.setAttribute('aria-valuetext', on ? percent : t('audio.muted'));
    slider.style.setProperty('--fill', `${slider.value}%`);
  }
  
  function showAudio() {
    for (const button of audioSwitches) showChannel(button, audio[button.dataset.audio], volume[button.dataset.audio]);
    const on = audio.music || audio.sfx;
    ui['settings-button'].innerHTML = icon(on ? 'sound' : 'mute');
    $('#mute-all').firstChild.textContent = t(on ? 'audio.muteAll' : 'audio.unmuteAll');
  }
  
  
  
  function setAudio(kind, on, level = volume[kind]) {
    volume[kind] = level;
    audio[kind] = kind === 'music' ? sound.setMusic(on, level) : sound.setEnabled(on, level);
    const key = AUDIO_KEYS[kind];
    try {
      localStorage.setItem(key, audio[kind] ? 'on' : 'off');
      localStorage.setItem(`${key}-volume`, String(Math.round(level * 100)));
    } catch { /* Audio still works when storage is blocked. */ }
    showAudio();
  }
  
  function toggleSound() {
    const on = !(audio.music || audio.sfx);
    setAudio('music', on);
    setAudio('sfx', on);
    sound.cue('ui');
  }
  
  // Browsers that block autoplay start audio only after a user gesture, so saved choices are applied on the first one.
  function unlockAudio() {
    if (!sound.running() && (audio.music || audio.sfx)) {
      setAudio('music', audio.music);
      setAudio('sfx', audio.sfx);
    }
  }
  
  
  showAudio();
  return { showAudio, setAudio, toggleSound, unlockAudio };
}
