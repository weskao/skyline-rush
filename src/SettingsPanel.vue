<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { getLocale, onLocaleChange, t } from './i18n.ts';
const locale = ref(getLocale());
onUnmounted(onLocaleChange(value => { locale.value = value; }));
// Reading locale.value makes each label re-render on a language switch.
const tr = (key: string): string => t(key, undefined, locale.value);
import { icons, ICON_ATTRS } from './icons.ts';
import HudSourceArtwork from './HudSourceArtwork.vue';
import { panelsView } from './control-panels-view-state.ts';
import { audioView } from './audio-view-state.ts';
const AUDIO_CHANNELS = [{ kind: 'music', label: 'Music' }, { kind: 'sfx', label: 'Sound effects' }] as const;
</script>
<template>
      <div class="settings">
        <button class="icon-button" id="settings-button" :aria-label="tr('settings.game')" :aria-expanded="panelsView.settingsOpen" aria-controls="settings-panel" :title="tr('settings.game')"><svg v-bind="ICON_ATTRS" v-html="icons.settings"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" :aria-label="tr('settings.game')" :hidden="!panelsView.settingsOpen">
          <div class="settings-destinations">
            <button type="button" data-settings-destination="#controls-button">{{ tr('settings.driving') }}</button>
            <button type="button" data-settings-destination="#vfx-panel > summary">{{ tr('settings.display') }}</button>
            <button type="button" data-settings-destination="#locale-select + .custom-select button">{{ tr('settings.language') }}</button>
          </div>
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span>{{ audioView.muteAllText }}</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="{ kind, label } in AUDIO_CHANNELS" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" :aria-checked="audioView[kind].enabled"><svg v-bind="ICON_ATTRS" v-html="icons[audioView[kind].enabled ? 'sound' : 'mute']"></svg><span :data-i18n="'audio.' + kind">{{ label }}</span><b aria-hidden="true">{{ audioView[kind].displayText }}</b></button>
            <input type="range" min="0" max="100" step="5" :value="audioView[kind].level" :aria-valuetext="audioView[kind].valueText" :style="{ '--fill': audioView[kind].level + '%' }" :aria-label="label + ' volume'" :data-i18n-aria-label="'audio.' + kind + 'Volume'">
          </div>
          <HudSourceArtwork />
        </div>
      </div>
</template>
<style scoped>
/* This scoped id rule outranks .settings-panel, so it carries the viewport cap too. */
#settings-panel { max-height: min(calc(70dvh - 2px), 620px, calc(100dvh - 82px - env(safe-area-inset-bottom, 0px))); overflow-y: auto; }
.settings-destinations { display: grid; gap: 4px; margin-bottom: 8px; }
.settings-destinations button { min-height: 44px; padding: 0 10px; border: 1px solid #526c80; border-radius: 5px; text-align: start; background: #142738; }
.settings-destinations button:focus-visible { outline: 2px solid #a0edff; outline-offset: -2px; }
</style>
