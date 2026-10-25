<script setup lang="ts">
import { icons, ICON_ATTRS } from './icons.js';
import { panelsView } from './control-panels-view-state.js';
</script>
<template>
      <div class="settings">
        <button class="icon-button" id="settings-button" aria-label="Audio settings" data-i18n-aria-label="audio.settings" aria-expanded="false" aria-controls="settings-panel" title="Audio settings · M mutes all" data-i18n-title="audio.title"><svg v-bind="ICON_ATTRS" v-html="icons.sound"></svg></button>
        <div class="settings-panel" id="settings-panel" role="group" aria-label="Audio settings" data-i18n-aria-label="audio.settings" :hidden="!panelsView.settingsOpen">
          <div class="audio-head"><span data-i18n="audio.head">Audio</span><button class="mute-all" id="mute-all" aria-keyshortcuts="M"><span data-i18n="audio.muteAll">Mute all</span><kbd aria-hidden="true">M</kbd></button></div>
          <div class="audio-channel" v-for="[kind, label] in [['music', 'Music'], ['sfx', 'Sound effects']]" :key="kind">
            <button class="setting" role="switch" :data-audio="kind" aria-checked="true"><svg v-bind="ICON_ATTRS" v-html="icons.sound"></svg><span :data-i18n="`audio.${kind}`">{{ label }}</span><b aria-hidden="true">100%</b></button>
            <input type="range" min="0" max="100" step="5" value="100" :aria-label="`${label} volume`" :data-i18n-aria-label="`audio.${kind}Volume`">
          </div>
        </div>
      </div>
</template>
