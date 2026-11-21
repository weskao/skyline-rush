<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
const locale = ref(getLocale());
onUnmounted(onLocaleChange(value => { locale.value = value; }));
// Reading locale.value makes each label re-render on a language switch.
const tr = (key: string): string => t(key, undefined, locale.value);
import { icons, ICON_ATTRS } from './icons.ts';
import CloseButton from './CloseButton.vue';
import HudSourceArtwork from './HudSourceArtwork.vue';
import { panelsView } from './control-panels-view-state.ts';
import { audioView } from './audio-view-state.ts';
const sections = [
  ['driving', 'settings.driving', 'assist'], ['display', 'settings.display', 'display'],
  ['audio', 'audio.head', 'sound'], ['language', 'settings.language', 'globe'],
] as const;
const AUDIO_CHANNELS = [{ kind: 'music', label: 'Music' }, { kind: 'sfx', label: 'Sound effects' }] as const;
</script>
<template>
  <div class="settings">
    <button class="icon-button" id="settings-button" type="button" :aria-label="tr('settings.game')"
      :aria-expanded="panelsView.settingsOpen" aria-haspopup="dialog" aria-controls="settings-panel" :title="tr('settings.game')">
      <svg v-bind="ICON_ATTRS" v-html="icons.settings"></svg>
    </button>
    <dialog id="settings-panel" aria-labelledby="settings-title">
      <header class="settings-heading">
        <h2 id="settings-title">{{ tr('settings.game') }}</h2>
        <CloseButton id="settings-close" :label="tr('settings.close')" />
      </header>
      <div class="settings-layout">
        <nav class="settings-sections" :aria-label="tr('settings.game')">
          <button v-for="[id, label, glyph] in sections" :key="id" type="button" :data-settings-section="id"
            :id="id === 'driving' ? 'controls-button' : undefined" :aria-pressed="panelsView.section === id"
            :aria-controls="'settings-' + id">
            <svg v-bind="ICON_ATTRS" v-html="icons[glyph]"></svg>
            <span>{{ tr(label) }}</span>
          </button>
        </nav>
        <div class="settings-content">
          <section id="settings-driving" :hidden="panelsView.section !== 'driving'"><slot name="assist" /><slot name="driving" /></section>
          <section id="settings-display" :hidden="panelsView.section !== 'display'"><slot name="display" /><HudSourceArtwork /></section>
          <section id="settings-audio" :hidden="panelsView.section !== 'audio'">
            <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span>{{ audioView.muteAllText }}</span><kbd aria-hidden="true">M</kbd></button></div>
            <div class="audio-channel" v-for="{ kind, label } in AUDIO_CHANNELS" :key="kind">
              <button class="setting" role="switch" :data-audio="kind" :aria-checked="audioView[kind].enabled"><svg v-bind="ICON_ATTRS" v-html="icons[audioView[kind].enabled ? 'sound' : 'mute']"></svg><span :data-i18n="'audio.' + kind">{{ label }}</span><b aria-hidden="true">{{ audioView[kind].displayText }}</b></button>
              <input type="range" min="0" max="100" step="5" :value="audioView[kind].level" :aria-valuetext="audioView[kind].valueText" :style="{ '--fill': audioView[kind].level + '%' }" :aria-label="label + ' volume'" :data-i18n-aria-label="'audio.' + kind + 'Volume'">
            </div>
          </section>
          <section id="settings-language" :hidden="panelsView.section !== 'language'"><slot name="language" /></section>
        </div>
      </div>
    </dialog>
  </div>
</template>

<style src="./settings-panel.css"></style>
