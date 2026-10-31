<script setup lang="ts">
import { icons, ICON_ATTRS } from './icons.ts';
import { panelsView } from './control-panels-view-state.ts';
import { audioView } from './audio-view-state.ts';
const AUDIO_CHANNELS = [{ kind: 'music', label: 'Music' }, { kind: 'sfx', label: 'Sound effects' }] as const;
</script>
<template>
      <div class="settings">
        <button class="icon-button" id="settings-button" aria-label="Audio settings" data-i18n-aria-label="audio.settings" :aria-expanded="panelsView.settingsOpen" aria-controls="settings-panel" title="Audio settings · M mutes all" data-i18n-title="audio.title"><svg v-bind="ICON_ATTRS" v-html="icons[audioView.settingsIcon]"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" aria-label="Audio settings" data-i18n-aria-label="audio.settings" :hidden="!panelsView.settingsOpen">
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span>{{ audioView.muteAllText }}</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="{ kind, label } in AUDIO_CHANNELS" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" :aria-checked="audioView[kind].enabled"><svg v-bind="ICON_ATTRS" v-html="icons[audioView[kind].enabled ? 'sound' : 'mute']"></svg><span :data-i18n="'audio.' + kind">{{ label }}</span><b aria-hidden="true">{{ audioView[kind].displayText }}</b></button>
            <input type="range" min="0" max="100" step="5" :value="audioView[kind].level" :aria-valuetext="audioView[kind].valueText" :style="{ '--fill': audioView[kind].level + '%' }" :aria-label="label + ' volume'" :data-i18n-aria-label="'audio.' + kind + 'Volume'">
          </div>
        </div>
      </div>
</template>
